import { basename } from 'path'

import { createHostApi, type HostApi } from './host/index.js'
import type {
  JsonRpcErrorResponse,
  JsonRpcNotification,
  JsonRpcRequest,
  JsonRpcResponse,
} from './types/jsonrpc.js'
import { JSON_RPC_ERRORS } from './types/jsonrpc.js'

type MethodHandler = (params: Record<string, unknown>) => unknown | Promise<unknown>
type NotificationHandler = (params: Record<string, unknown>) => void

interface PendingCall {
  resolve: (v: unknown) => void
  reject: (e: Error) => void
  timer?: Timer
}

/** Error thrown when a host RPC call returns a JSON-RPC error response. */
export interface RpcError extends Error {
  code?: number
  data?: unknown
}

const DEFAULT_CALL_TIMEOUT_MS = 30_000

export interface SpawnOptions {
  label?: string
  metadata?: Record<string, unknown>
  cwd?: string
  stdout?: 'pipe' | 'ignore'
  stderr?: 'pipe' | 'ignore'
  env?: Record<string, string>
}

export interface RunOptions {
  label?: string
  metadata?: Record<string, unknown>
  cwd?: string
  timeout?: number
  env?: Record<string, string>
}

export interface RunResult {
  stdout: string
  stderr: string
  exitCode: number
}

export class PluginClient {
  private methods = new Map<string, MethodHandler>()
  private buffer = ''
  private pending = new Map<string, PendingCall>()
  private nextRequestId = 1
  private _lastSentId: string | number | null = null
  private notificationHandlers = new Map<string, Set<NotificationHandler>>()
  private callTimeoutMs: number
  private _host?: HostApi

  constructor (opts?: { callTimeoutMs?: number }) {
    this.callTimeoutMs = opts?.callTimeoutMs ?? DEFAULT_CALL_TIMEOUT_MS
    process.stdin.setEncoding('utf-8')
    process.stdin.on('data', (chunk: string) => {
      this.buffer += chunk
      this.processBuffer()
    })
    // If the host disconnects, fail any in-flight calls rather than hanging forever.
    process.stdin.on('end', () => {
      this.rejectAllPending(new Error('Connection closed before response was received'))
    })
    process.stdin.on('error', (err: Error) => {
      this.rejectAllPending(err)
    })
  }

  registerMethod (name: string, handler: MethodHandler): void {
    this.methods.set(name, handler)
  }

  sendNotification (method: string, params?: Record<string, unknown>): void {
    const notification: JsonRpcNotification = {
      jsonrpc: '2.0',
      method,
      params,
    }
    this.write(notification)
  }

  signalReady (): void {
    this.sendNotification('ready')
  }

  spawn (cmd: string, args: string[], opts?: SpawnOptions): ReturnType<typeof Bun.spawn> {
    const proc = Bun.spawn([cmd, ...args], {
      stdout: opts?.stdout ?? 'pipe',
      stderr: opts?.stderr ?? 'pipe',
      cwd: opts?.cwd,
      env: opts?.env ? {
        ...process.env,
        ...opts.env,
      } : undefined,
    })

    const label = opts?.label ?? basename(cmd)
    const { pid } = proc

    this.sendNotification('process.started', {
      pid,
      label,
      command: cmd,
      args,
      cwd: opts?.cwd,
      type: 'long-running',
      metadata: opts?.metadata ?? {},
    })

    proc.exited.then((exitCode) => {
      this.sendNotification('process.stopped', {
        pid,
        exitCode,
      })
    }).catch(() => {
      this.sendNotification('process.stopped', {
        pid,
        exitCode: null,
      })
    })

    return proc
  }

  async run (cmd: string, args: string[], opts?: RunOptions): Promise<RunResult> {
    const proc = Bun.spawn([cmd, ...args], {
      stdout: 'pipe',
      stderr: 'pipe',
      cwd: opts?.cwd,
      env: opts?.env ? {
        ...process.env,
        ...opts.env,
      } : undefined,
    })

    const label = opts?.label ?? basename(cmd)
    const { pid } = proc

    this.sendNotification('process.started', {
      pid,
      label,
      command: cmd,
      args,
      cwd: opts?.cwd,
      type: 'short-lived',
      metadata: opts?.metadata ?? {},
    })

    let timer: Timer | undefined
    let timedOut = false

    const work = Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ])

    const racers: Promise<[string, string, number]>[] = [work]
    if (opts?.timeout) {
      racers.push(new Promise((_, reject) => {
        timer = setTimeout(() => {
          timedOut = true
          proc.kill()
          reject(new Error(`Process timed out after ${opts.timeout}ms`))
        }, opts.timeout)
      }))
    }

    try {
      const [stdout, stderr, exitCode] = await Promise.race(racers)
      this.sendNotification('process.stopped', {
        pid,
        exitCode,
      })
      return {
        stdout,
        stderr,
        exitCode,
      }
    } catch (err) {
      if (!timedOut) {
        proc.kill()
      }
      this.sendNotification('process.stopped', {
        pid,
        exitCode: null,
      })
      throw err
    } finally {
      if (timer) {
        clearTimeout(timer)
      }
    }
  }

  public call<T = unknown> (
    method: string,
    params: Record<string, unknown> = {},
    opts?: { timeoutMs?: number },
  ): Promise<T> {
    const id = this.nextRequestId++
    this._lastSentId = id
    const key = String(id)
    const timeoutMs = opts?.timeoutMs ?? this.callTimeoutMs
    return new Promise<T>((resolve, reject) => {
      const entry: PendingCall = {
        resolve: resolve as (v: unknown) => void,
        reject,
      }
      if (timeoutMs > 0) {
        entry.timer = setTimeout(() => {
          if (this.pending.delete(key)) {
            reject(new Error(`Call to '${method}' timed out after ${timeoutMs}ms`))
          }
        }, timeoutMs)
        // Don't let a pending timeout keep the process alive on its own.
        entry.timer.unref()
      }
      this.pending.set(key, entry)
      try {
        this.write({
          jsonrpc: '2.0',
          id,
          method,
          params,
        })
      } catch (err) {
        this.clearPending(key)
        reject(err as Error)
      }
    })
  }

  /**
   * Subscribe to an inbound host→plugin notification by method name. Multiple
   * handlers may be registered for the same method. Returns a function that
   * unsubscribes the handler when called.
   */
  public onNotification (method: string, handler: NotificationHandler): () => void {
    let handlers = this.notificationHandlers.get(method)
    if (!handlers) {
      handlers = new Set()
      this.notificationHandlers.set(method, handlers)
    }
    handlers.add(handler)
    return () => {
      const set = this.notificationHandlers.get(method)
      if (set) {
        set.delete(handler)
        if (set.size === 0) {
          this.notificationHandlers.delete(method)
        }
      }
    }
  }

  /** Typed, contract-checked facade over this transport (e.g. `client.host.accounts.get(name)`). */
  public get host (): HostApi {
    return (this._host ??= createHostApi(this))
  }

  private emitNotification (method: string, params: Record<string, unknown>): void {
    const handlers = this.notificationHandlers.get(method)
    if (!handlers) {
      return
    }
    // Iterate a copy so a handler can unsubscribe itself during dispatch.
    for (const handler of [...handlers]) {
      try {
        handler(params)
      } catch (err) {
        process.stderr.write(`Notification handler for '${method}' threw: ${(err as Error).message}\n`)
      }
    }
  }

  private clearPending (key: string): void {
    const entry = this.pending.get(key)
    if (entry?.timer) {
      clearTimeout(entry.timer)
    }
    this.pending.delete(key)
  }

  private rejectAllPending (err: Error): void {
    const entries = [...this.pending.values()]
    this.pending.clear()
    for (const entry of entries) {
      if (entry.timer) {
        clearTimeout(entry.timer)
      }
      entry.reject(err)
    }
  }

  public _lastRequestIdForTest (): string | number | null {
    return this._lastSentId
  }

  public handleIncoming (msg: Record<string, unknown>): void {
    if (typeof msg !== 'object' || msg === null) {
      process.stderr.write(`Ignoring non-object JSON-RPC message: ${JSON.stringify(msg)}\n`)
      return
    }
    // Response to a plugin-initiated call: has an id but no method
    if (msg['id'] !== undefined && msg['method'] === undefined) {
      // Look up by string key so a host that echoes the id as a string still matches.
      const key = String(msg['id'])
      const waiter = this.pending.get(key)
      if (waiter) {
        this.clearPending(key)
        if (msg['error'] !== undefined) {
          const err = msg['error'] as {
            code?: number
            message?: string
            data?: unknown
          }
          const error: RpcError = new Error(err.message ?? 'JSON-RPC error')
          error.code = err.code
          error.data = err.data
          waiter.reject(error)
        } else {
          waiter.resolve(msg['result'])
        }
      }
      return
    }
    // Incoming host→plugin request or notification — delegate to dispatcher
    this.dispatchRequest(msg as unknown as JsonRpcRequest).catch(err => {
      process.stderr.write(`Unhandled error in request handler: ${err}\n`)
    })
  }

  private processBuffer (): void {
    const lines = this.buffer.split('\n')
    this.buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.trim()) {
        continue
      }
      try {
        const msg = JSON.parse(line)
        this.handleIncoming(msg)
      } catch {
        process.stderr.write(`Invalid JSON received: ${line}\n`)
      }
    }
  }

  private async dispatchRequest (msg: JsonRpcRequest): Promise<void> {
    const { id, method } = msg

    // Built-in request handlers
    if (method === 'ping') {
      if (id !== undefined) {
        this.sendResponse(id, {
          pong: true,
        })
      }
      return
    }

    if (method === 'shutdown') {
      if (id !== undefined) {
        this.sendResponse(id, {
          ok: true,
        })
      }
      setTimeout(() => process.exit(0), 100)
      return
    }

    // Notifications (no id) fan out to onNotification subscribers and get no response.
    if (id === undefined) {
      this.emitNotification(method, msg.params ?? {})
      return
    }

    // Requests (with id) are routed to a registered method handler.
    const handler = this.methods.get(method)
    if (!handler) {
      this.sendError(id, JSON_RPC_ERRORS.METHOD_NOT_FOUND, `Method not found: ${method}`)
      return
    }

    try {
      const result = await handler(msg.params ?? {})
      this.sendResponse(id, result)
    } catch (err) {
      this.sendError(id, JSON_RPC_ERRORS.INTERNAL_ERROR, (err as Error).message)
    }
  }

  private sendResponse (id: string | number, result: unknown): void {
    const response: JsonRpcResponse = {
      jsonrpc: '2.0',
      id,
      result,
    }
    this.write(response)
  }

  private sendError (id: string | number, code: number, message: string): void {
    const response: JsonRpcErrorResponse = {
      jsonrpc: '2.0',
      id,
      error: {
        code,
        message,
      },
    }
    this.write(response)
  }

  private write (msg: unknown): void {
    process.stdout.write(`${JSON.stringify(msg) }\n`)
  }
}
