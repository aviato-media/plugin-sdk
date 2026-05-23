import { afterEach, beforeEach, describe, expect, it, test } from 'bun:test'

import { PluginClient } from './client.js'
import { JSON_RPC_ERRORS } from './types/jsonrpc.js'

// Each PluginClient attaches a process.stdin listener; this suite creates many
// short-lived clients, so lift Node's listener cap to avoid spurious warnings.
// (Production plugins create a single long-lived client.)
process.stdin.setMaxListeners(0)

type StdinHandler = (chunk: string) => void

interface Capture {
  stdout: string[]
  stderr: string[]
  feed: (chunk: string) => void
  client: PluginClient
}

function setupClient (): Capture {
  const stdoutChunks: string[] = []
  const stderrChunks: string[] = []
  const handlers: StdinHandler[] = []

  const originalStdinOn = (process.stdin as any).on.bind(process.stdin)
  const originalStdinSetEncoding = (process.stdin as any).setEncoding.bind(process.stdin)
  const originalStdoutWrite = process.stdout.write.bind(process.stdout)
  const originalStderrWrite = process.stderr.write.bind(process.stderr)

  ;(process.stdin as any).setEncoding = (_enc: string) => process.stdin
  ;(process.stdin as any).on = (event: string, handler: StdinHandler) => {
    if (event === 'data') {
      handlers.push(handler)
    }
    return process.stdin
  }
  ;(process.stdout.write as any) = (chunk: any) => {
    stdoutChunks.push(String(chunk))
    return true
  }
  ;(process.stderr.write as any) = (chunk: any) => {
    stderrChunks.push(String(chunk))
    return true
  }

  const client = new PluginClient()

  ;(process.stdin as any).on = originalStdinOn
  ;(process.stdin as any).setEncoding = originalStdinSetEncoding

  const cleanup = () => {
    ;(process.stdout.write as any) = originalStdoutWrite
    ;(process.stderr.write as any) = originalStderrWrite
  }

  ;(client as any).__cleanup = cleanup

  return {
    stdout: stdoutChunks,
    stderr: stderrChunks,
    feed: (chunk: string) => {
      for (const h of handlers) {
        h(chunk)
      }
    },
    client,
  }
}

async function waitMicrotasks () {
  await new Promise<void>(resolve => setTimeout(resolve, 5))
}

function lastJsonMessage (out: string[]) {
  const last = out[out.length - 1]!.trim()
  return JSON.parse(last)
}

describe('PluginClient', () => {
  let cap: Capture

  beforeEach(() => {
    cap = setupClient()
  })

  afterEach(() => {
    ;(cap.client as any).__cleanup()
  })

  test('sendNotification writes a notification line', () => {
    cap.client.sendNotification('hello', {
      x: 1,
    })
    const msg = lastJsonMessage(cap.stdout)
    expect(msg).toEqual({
      jsonrpc: '2.0',
      method: 'hello',
      params: {
        x: 1,
      },
    })
  })

  test('signalReady sends a ready notification', () => {
    cap.client.signalReady()
    const msg = lastJsonMessage(cap.stdout)
    expect(msg.method).toBe('ready')
  })

  test('ping builtin returns pong', async () => {
    cap.feed(`${JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'ping',
    }) }\n`)
    await waitMicrotasks()
    const msg = lastJsonMessage(cap.stdout)
    expect(msg).toEqual({
      jsonrpc: '2.0',
      id: 1,
      result: {
        pong: true,
      },
    })
  })

  test('ping as notification (no id) sends no response', async () => {
    cap.stdout.length = 0
    cap.feed(`${JSON.stringify({
      jsonrpc: '2.0',
      method: 'ping',
    }) }\n`)
    await waitMicrotasks()
    expect(cap.stdout.length).toBe(0)
  })

  test('shutdown request returns ok and schedules exit', async () => {
    const originalExit = process.exit
    let exitCalled = false
    ;(process.exit as any) = () => {
      exitCalled = true
    }
    try {
      cap.feed(`${JSON.stringify({
        jsonrpc: '2.0',
        id: 7,
        method: 'shutdown',
      }) }\n`)
      await waitMicrotasks()
      const msg = lastJsonMessage(cap.stdout)
      expect(msg).toEqual({
        jsonrpc: '2.0',
        id: 7,
        result: {
          ok: true,
        },
      })
      await new Promise<void>(r => setTimeout(r, 150))
      expect(exitCalled).toBe(true)
    } finally {
      ;(process.exit as any) = originalExit
    }
  })

  test('shutdown notification (no id) still schedules exit but no response', async () => {
    const originalExit = process.exit
    ;(process.exit as any) = () => {}
    try {
      cap.stdout.length = 0
      cap.feed(`${JSON.stringify({
        jsonrpc: '2.0',
        method: 'shutdown',
      }) }\n`)
      await waitMicrotasks()
      expect(cap.stdout.length).toBe(0)
      await new Promise<void>(r => setTimeout(r, 150))
    } finally {
      ;(process.exit as any) = originalExit
    }
  })

  test('unknown method returns METHOD_NOT_FOUND error', async () => {
    cap.feed(`${JSON.stringify({
      jsonrpc: '2.0',
      id: 'x',
      method: 'nope',
    }) }\n`)
    await waitMicrotasks()
    const msg = lastJsonMessage(cap.stdout)
    expect(msg.error.code).toBe(JSON_RPC_ERRORS.METHOD_NOT_FOUND)
    expect(msg.error.message).toContain('Method not found')
  })

  test('unknown method as notification yields no error response', async () => {
    cap.stdout.length = 0
    cap.feed(`${JSON.stringify({
      jsonrpc: '2.0',
      method: 'nope',
    }) }\n`)
    await waitMicrotasks()
    expect(cap.stdout.length).toBe(0)
  })

  test('registered method returns success response', async () => {
    cap.client.registerMethod('echo', (params) => ({
      ...params,
      echoed: true,
    }))
    cap.feed(`${JSON.stringify({
      jsonrpc: '2.0',
      id: 9,
      method: 'echo',
      params: {
        a: 1,
      },
    }) }\n`)
    await waitMicrotasks()
    const msg = lastJsonMessage(cap.stdout)
    expect(msg).toEqual({
      jsonrpc: '2.0',
      id: 9,
      result: {
        a: 1,
        echoed: true,
      },
    })
  })

  test('handler throw with id returns INTERNAL_ERROR', async () => {
    cap.client.registerMethod('boom', () => {
      throw new Error('kaboom')
    })
    cap.feed(`${JSON.stringify({
      jsonrpc: '2.0',
      id: 5,
      method: 'boom',
    }) }\n`)
    await waitMicrotasks()
    const msg = lastJsonMessage(cap.stdout)
    expect(msg.error.code).toBe(JSON_RPC_ERRORS.INTERNAL_ERROR)
    expect(msg.error.message).toBe('kaboom')
  })

  test('handler throw without id is swallowed', async () => {
    cap.client.registerMethod('boom', () => {
      throw new Error('kaboom')
    })
    cap.stdout.length = 0
    cap.feed(`${JSON.stringify({
      jsonrpc: '2.0',
      method: 'boom',
    }) }\n`)
    await waitMicrotasks()
    expect(cap.stdout.length).toBe(0)
  })

  test('registered method without params receives empty object', async () => {
    let seen: Record<string, unknown> | undefined
    cap.client.registerMethod('peek', (p) => {
      seen = p
      return {}
    })
    cap.feed(`${JSON.stringify({
      jsonrpc: '2.0',
      id: 3,
      method: 'peek',
    }) }\n`)
    await waitMicrotasks()
    expect(seen).toEqual({})
  })

  test('multi-line buffer is split on newline', async () => {
    cap.client.registerMethod('one', () => ({
      ok: 1,
    }))
    cap.client.registerMethod('two', () => ({
      ok: 2,
    }))
    const a = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'one',
    })
    const b = JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'two',
    })
    cap.feed(`${a}\n${b}\n`)
    await waitMicrotasks()
    expect(cap.stdout.length).toBe(2)
  })

  test('partial line is held until newline arrives', async () => {
    cap.client.registerMethod('one', () => ({
      ok: 1,
    }))
    const a = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'one',
    })
    cap.stdout.length = 0
    cap.feed(a.slice(0, 5))
    await waitMicrotasks()
    expect(cap.stdout.length).toBe(0)
    cap.feed(`${a.slice(5) }\n`)
    await waitMicrotasks()
    expect(cap.stdout.length).toBe(1)
  })

  test('blank lines are skipped', async () => {
    cap.stdout.length = 0
    cap.feed('\n  \n\n')
    await waitMicrotasks()
    expect(cap.stdout.length).toBe(0)
    expect(cap.stderr.length).toBe(0)
  })

  test('invalid JSON is logged to stderr', async () => {
    cap.feed('not json{\n')
    await waitMicrotasks()
    expect(cap.stderr.join('')).toContain('Invalid JSON received')
  })

  test('run executes a command and returns stdout/exitCode', async () => {
    cap.stdout.length = 0
    const result = await cap.client.run('echo', ['hello-from-test'])
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('hello-from-test')

    const notifications = cap.stdout.map(line => JSON.parse(line.trim()))
    expect(notifications.find(n => n.method === 'process.started')).toBeDefined()
    expect(notifications.find(n => n.method === 'process.stopped')).toBeDefined()
  })

  test('run honors a custom label', async () => {
    cap.stdout.length = 0
    await cap.client.run('echo', ['x'], {
      label: 'custom',
      metadata: {
        a: 1,
      },
    })
    const started = cap.stdout
      .map(line => JSON.parse(line.trim()))
      .find(n => n.method === 'process.started')
    expect(started.params.label).toBe('custom')
    expect(started.params.metadata).toEqual({
      a: 1,
    })
    expect(started.params.type).toBe('short-lived')
  })

  test('run with env merges into process.env', async () => {
    const result = await cap.client.run('sh', ['-c', 'echo $TEST_VAR_XYZ'], {
      env: {
        TEST_VAR_XYZ: 'set-value',
      },
    })
    expect(result.stdout.trim()).toBe('set-value')
  })

  test('run times out and throws', async () => {
    cap.stdout.length = 0
    let err: Error | undefined
    try {
      await cap.client.run('sh', ['-c', 'sleep 5'], {
        timeout: 50,
      })
    } catch (e) {
      err = e as Error
    }
    expect(err).toBeDefined()
    expect(err!.message).toContain('timed out')
  })

  test('spawn emits started + stopped notifications', async () => {
    cap.stdout.length = 0
    const proc = cap.client.spawn('echo', ['spawned'])
    await proc.exited
    await waitMicrotasks()
    const notifications = cap.stdout.map(line => JSON.parse(line.trim()))
    const started = notifications.find(n => n.method === 'process.started')
    const stopped = notifications.find(n => n.method === 'process.stopped')
    expect(started.params.type).toBe('long-running')
    expect(started.params.label).toBe('echo')
    expect(stopped.params.exitCode).toBe(0)
  })

  test('spawn uses label/env/metadata when supplied', async () => {
    cap.stdout.length = 0
    const proc = cap.client.spawn('echo', ['z'], {
      label: 'my-label',
      env: {
        FOO: 'BAR',
      },
      metadata: {
        kind: 'demo',
      },
      stdout: 'pipe',
      stderr: 'pipe',
    })
    await proc.exited
    const started = cap.stdout
      .map(line => JSON.parse(line.trim()))
      .find(n => n.method === 'process.started')
    expect(started.params.label).toBe('my-label')
    expect(started.params.metadata).toEqual({
      kind: 'demo',
    })
  })
})

describe('PluginClient outbound calls', () => {
  it('sends a request to stdout and resolves on matching response', async () => {
    const writes: string[] = []
    const originalWrite = process.stdout.write.bind(process.stdout)
    process.stdout.write = ((chunk: any, ...args: any[]) => {
      writes.push(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString())
      return originalWrite(chunk, ...args)
    }) as typeof process.stdout.write

    try {
      const client = new PluginClient()
      const pending = client.call('host.getAccount', { name: 'work' })

      const reqLine = writes.find(l => l.includes('host.getAccount'))
      expect(reqLine).toBeTruthy()
      const req = JSON.parse(reqLine!.trim())
      expect(req.jsonrpc).toBe('2.0')
      expect(req.method).toBe('host.getAccount')
      expect(req.params).toEqual({ name: 'work' })
      expect(typeof req.id === 'number' || typeof req.id === 'string').toBe(true)

      client.handleIncoming({
        jsonrpc: '2.0',
        id: req.id,
        result: {
          name: 'work',
          region: 'us-east-1',
        },
      })

      const result = await pending
      expect(result).toEqual({
        name: 'work',
        region: 'us-east-1',
      })
    } finally {
      process.stdout.write = originalWrite
    }
  })

  it('rejects when the response carries an error', async () => {
    const originalWrite = process.stdout.write.bind(process.stdout)
    process.stdout.write = (() => true) as typeof process.stdout.write
    try {
      const client = new PluginClient()
      const pending = client.call('host.getAccount', { name: 'missing' })
      const sentId = client._lastRequestIdForTest()
      expect(sentId).toBeTruthy()
      client.handleIncoming({
        jsonrpc: '2.0',
        id: sentId,
        error: {
          code: -32004,
          message: 'AccountNotFound',
        },
      })
      await expect(pending).rejects.toMatchObject({ message: expect.stringMatching(/AccountNotFound/) })
    } finally {
      process.stdout.write = originalWrite
    }
  })

  it('does not interfere with incoming host→plugin requests (existing path)', async () => {
    // Smoke test: register a method and ensure handleIncoming still dispatches it.
    const originalWrite = process.stdout.write.bind(process.stdout)
    const writes: string[] = []
    process.stdout.write = ((chunk: any, ..._args: any[]) => {
      writes.push(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString())
      return true
    }) as typeof process.stdout.write
    try {
      const client = new PluginClient()
      client.registerMethod('echo', async (params) => ({ echoed: params }))
      // Simulate the server sending an incoming request.
      client.handleIncoming({
        jsonrpc: '2.0',
        id: 42,
        method: 'echo',
        params: { hello: 'world' },
      })
      // Allow the async handler to complete.
      await new Promise(r => setTimeout(r, 10))
      const respLine = writes.find(l => l.includes('"id":42'))
      expect(respLine).toBeTruthy()
      const resp = JSON.parse(respLine!.trim())
      expect(resp.result).toEqual({ echoed: { hello: 'world' } })
    } finally {
      process.stdout.write = originalWrite
    }
  })
})

describe('PluginClient onNotification', () => {
  const notify = (client: PluginClient, params: Record<string, unknown>) =>
    client.handleIncoming({
      jsonrpc: '2.0',
      method: 'host.accountChanged',
      params,
    })

  it('invokes a handler when a matching notification arrives', () => {
    const client = new PluginClient()
    const seen: Array<Record<string, unknown>> = []
    client.onNotification('host.accountChanged', p => seen.push(p))

    notify(client, {
      name: 'work',
      change: 'updated',
    })

    expect(seen).toEqual([{
      name: 'work',
      change: 'updated',
    }])
  })

  it('supports multiple subscribers for the same method', () => {
    const client = new PluginClient()
    let aCount = 0
    let bCount = 0
    client.onNotification('host.accountChanged', () => {
      aCount++
    })
    client.onNotification('host.accountChanged', () => {
      bCount++
    })

    notify(client, {
      name: 'work',
      change: 'created',
    })

    expect(aCount).toBe(1)
    expect(bCount).toBe(1)
  })

  it('only invokes handlers registered for the matching method', () => {
    const client = new PluginClient()
    let otherCount = 0
    client.onNotification('host.somethingElse', () => {
      otherCount++
    })

    notify(client, {
      name: 'work',
      change: 'updated',
    })

    expect(otherCount).toBe(0)
  })

  it('does not treat a message with an id as a notification (it is a request)', async () => {
    const client = new PluginClient()
    const seen: Array<Record<string, unknown>> = []
    client.onNotification('host.accountChanged', p => seen.push(p))

    client.handleIncoming({
      jsonrpc: '2.0',
      id: 99,
      method: 'host.accountChanged',
      params: {
        name: 'work',
        change: 'updated',
      },
    })

    // Allow any async dispatch to complete.
    await new Promise(r => setTimeout(r, 10))

    expect(seen).toEqual([])
  })

  it('stops invoking a handler after its unsubscribe is called', () => {
    const client = new PluginClient()
    let count = 0
    const unsubscribe = client.onNotification('host.accountChanged', () => {
      count++
    })

    notify(client, {
      name: 'work',
      change: 'updated',
    })
    expect(count).toBe(1)

    unsubscribe()
    notify(client, {
      name: 'work',
      change: 'updated',
    })
    expect(count).toBe(1)
  })

  it('isolates a throwing handler so other handlers still run', () => {
    const client = new PluginClient()
    let goodCount = 0
    client.onNotification('host.accountChanged', () => {
      throw new Error('boom')
    })
    client.onNotification('host.accountChanged', () => {
      goodCount++
    })

    expect(() => notify(client, {
      name: 'work',
      change: 'updated',
    })).not.toThrow()
    expect(goodCount).toBe(1)
  })
})

describe('PluginClient call() robustness', () => {
  it('rejects with a timeout error when no response arrives', async () => {
    const originalWrite = process.stdout.write.bind(process.stdout)
    process.stdout.write = (() => true) as typeof process.stdout.write
    try {
      const client = new PluginClient()
      await expect(
        client.call('host.getAccount', { name: 'slow' }, { timeoutMs: 20 }),
      ).rejects.toThrow(/timed out after 20ms/)
    } finally {
      process.stdout.write = originalWrite
    }
  })

  it('matches the response even when the host echoes the id as a string', async () => {
    const originalWrite = process.stdout.write.bind(process.stdout)
    process.stdout.write = (() => true) as typeof process.stdout.write
    try {
      const client = new PluginClient()
      const pending = client.call('host.getAccount', { name: 'work' })
      const sentId = client._lastRequestIdForTest()
      client.handleIncoming({
        jsonrpc: '2.0',
        id: String(sentId),
        result: { ok: true },
      })
      await expect(pending).resolves.toEqual({ ok: true })
    } finally {
      process.stdout.write = originalWrite
    }
  })

  it('propagates the JSON-RPC error code and data on rejection', async () => {
    const originalWrite = process.stdout.write.bind(process.stdout)
    process.stdout.write = (() => true) as typeof process.stdout.write
    try {
      const client = new PluginClient()
      const pending = client.call('host.getAccount', { name: 'missing' })
      const sentId = client._lastRequestIdForTest()
      client.handleIncoming({
        jsonrpc: '2.0',
        id: sentId,
        error: {
          code: -32004,
          message: 'AccountNotFound',
          data: { name: 'missing' },
        },
      })
      await expect(pending).rejects.toMatchObject({
        message: 'AccountNotFound',
        code: -32004,
        data: { name: 'missing' },
      })
    } finally {
      process.stdout.write = originalWrite
    }
  })

  it('ignores non-object incoming messages without throwing', () => {
    const client = new PluginClient()
    // null/primitive JSON values must not crash the dispatcher.
    expect(() => client.handleIncoming(null as unknown as Record<string, unknown>)).not.toThrow()
    expect(() => client.handleIncoming(5 as unknown as Record<string, unknown>)).not.toThrow()
  })
})
