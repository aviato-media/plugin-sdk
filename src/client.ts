import { basename } from 'path'

import type {
  JsonRpcErrorResponse,
  JsonRpcNotification,
  JsonRpcRequest,
  JsonRpcResponse,
} from './types/jsonrpc.js'
import { JSON_RPC_ERRORS } from './types/jsonrpc.js'

type MethodHandler = (params: Record<string, unknown>) => unknown | Promise<unknown>

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

  constructor () {
    process.stdin.setEncoding('utf-8')
    process.stdin.on('data', (chunk: string) => {
      this.buffer += chunk
      this.processBuffer()
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

    let timedOut = false
    let timer: Timer | undefined
    if (opts?.timeout) {
      timer = setTimeout(() => {
        timedOut = true
        proc.kill()
      }, opts.timeout)
    }

    try {
      const [stdout, stderr, exitCode] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
        proc.exited,
      ])

      if (timedOut) {
        this.sendNotification('process.stopped', {
          pid,
          exitCode: null,
        })
        const error = new Error(`Process timed out after ${opts?.timeout}ms`)
        ;(error as any).stdout = stdout
        ;(error as any).stderr = stderr
        throw error
      }

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
        this.sendNotification('process.stopped', {
          pid,
          exitCode: null,
        })
      }
      throw err
    } finally {
      if (timer) {
        clearTimeout(timer)
      }
    }
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
        this.handleRequest(msg).catch(err => {
          process.stderr.write(`Unhandled error in request handler: ${err}\n`)
        })
      } catch {
        process.stderr.write(`Invalid JSON received: ${line}\n`)
      }
    }
  }

  private async handleRequest (msg: JsonRpcRequest): Promise<void> {
    // Notifications (no id) don't get responses
    const { id } = msg

    // Handle ping built-in
    if (msg.method === 'ping') {
      if (id !== undefined) {
        this.sendResponse(id, {
          pong: true,
        })
      }
      return
    }

    // Handle shutdown built-in
    if (msg.method === 'shutdown') {
      if (id !== undefined) {
        this.sendResponse(id, {
          ok: true,
        })
      }
      setTimeout(() => process.exit(0), 100)
      return
    }

    const handler = this.methods.get(msg.method)
    if (!handler) {
      if (id !== undefined) {
        this.sendError(id, JSON_RPC_ERRORS.METHOD_NOT_FOUND, `Method not found: ${msg.method}`)
      }
      return
    }

    try {
      const result = await handler(msg.params ?? {})
      if (id !== undefined) {
        this.sendResponse(id, result)
      }
    } catch (err) {
      if (id !== undefined) {
        this.sendError(id, JSON_RPC_ERRORS.INTERNAL_ERROR, (err as Error).message)
      }
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
