import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import type { PluginClient } from './client.js'
import { createSubscriptionBuilders, matchPattern } from './subscriptions.js'

type RegisteredMethod = (params: Record<string, unknown>) => unknown | Promise<unknown>

function makeFakeClient (): {
  client: PluginClient,
  methods: Map<string, RegisteredMethod>
} {
  const methods = new Map<string, RegisteredMethod>()
  const client = {
    registerMethod (name: string, handler: RegisteredMethod) {
      methods.set(name, handler)
    },
  } as unknown as PluginClient
  return {
    client,
    methods,
  }
}

describe('matchPattern', () => {
  test('matches exact patterns', () => {
    expect(matchPattern('foo.bar', 'foo.bar')).toBe(true)
  })

  test('matches single-segment wildcards', () => {
    expect(matchPattern('foo.*', 'foo.bar')).toBe(true)
    expect(matchPattern('*.bar', 'foo.bar')).toBe(true)
  })

  test('does not match across different segment counts', () => {
    expect(matchPattern('foo.*', 'foo.bar.baz')).toBe(false)
    expect(matchPattern('foo', 'foo.bar')).toBe(false)
  })

  test('does not match different literals', () => {
    expect(matchPattern('foo.bar', 'foo.qux')).toBe(false)
  })
})

describe('createSubscriptionBuilders', () => {
  let originalStderrWrite: typeof process.stderr.write
  let stderrChunks: string[]

  beforeEach(() => {
    stderrChunks = []
    originalStderrWrite = process.stderr.write.bind(process.stderr)
    ;(process.stderr.write as any) = (chunk: any) => {
      stderrChunks.push(String(chunk))
      return true
    }
  })

  afterEach(() => {
    ;(process.stderr.write as any) = originalStderrWrite
  })

  test('events dispatch routes to exact and wildcard handlers', async () => {
    const { client, methods } = makeFakeClient()
    const builders = createSubscriptionBuilders(client)
    const seen: string[] = []
    builders.events.on('user.created', async (p) => {
      seen.push(`exact:${p.id as string}`)
    })
    builders.events.on('order.*', async (p) => {
      seen.push(`wild:${p.id as string}`)
    })
    const dispatch = methods.get('event.dispatch')!
    expect(dispatch).toBeDefined()

    await dispatch({
      name: 'user.created',
      payload: {
        id: 'u1',
      },
    })
    await dispatch({
      name: 'order.placed',
      payload: {
        id: 'o1',
      },
    })
    await dispatch({
      name: 'no.match',
    })
    expect(seen).toEqual(['exact:u1', 'wild:o1'])
  })

  test('event handler error is captured to stderr', async () => {
    const { client, methods } = makeFakeClient()
    const builders = createSubscriptionBuilders(client)
    builders.events.on('boom', () => {
      throw new Error('kaboom')
    })
    await methods.get('event.dispatch')!({
      name: 'boom',
    })
    expect(stderrChunks.join('')).toContain('Event handler error for boom')
  })

  test('hooks dispatch returns data or null', async () => {
    const { client, methods } = makeFakeClient()
    const builders = createSubscriptionBuilders(client)
    builders.hooks.on('transform', async (p) => ({
      out: (p.in as string).toUpperCase(),
    }))

    const dispatch = methods.get('hook.dispatch')!
    const matched = await dispatch({
      name: 'transform',
      payload: {
        in: 'x',
      },
    })
    expect(matched).toEqual({
      data: {
        out: 'X',
      },
    })

    const unmatched = await dispatch({
      name: 'other',
    })
    expect(unmatched).toEqual({
      data: null,
    })
  })

  test('views dispatch returns result or null', async () => {
    const { client, methods } = makeFakeClient()
    const builders = createSubscriptionBuilders(client)
    builders.views.on('detail', async (ctx) => ({
      ok: ctx.id,
    }))
    const dispatch = methods.get('view.dispatch')!
    expect(await dispatch({
      name: 'detail',
      context: {
        id: 7,
      },
    })).toEqual({
      result: {
        ok: 7,
      },
    })
    expect(await dispatch({
      name: 'missing',
    })).toEqual({
      result: null,
    })
  })

  test('dispatch defaults payload/context to empty when omitted', async () => {
    const { client, methods } = makeFakeClient()
    const builders = createSubscriptionBuilders(client)
    let received: Record<string, unknown> | undefined
    builders.events.on('e', (p) => {
      received = p
    })
    await methods.get('event.dispatch')!({
      name: 'e',
    })
    expect(received).toEqual({})
  })

  test('only registers each dispatch method once', () => {
    const { client, methods } = makeFakeClient()
    const builders = createSubscriptionBuilders(client)
    builders.events.on('a', () => {})
    builders.events.on('b', () => {})
    builders.hooks.on('h1', async () => null)
    builders.hooks.on('h2', async () => null)
    builders.views.on('v1', async () => null)
    builders.views.on('v2', async () => null)
    expect(methods.size).toBe(3)
  })

  test('event dispatch returns ok payload', async () => {
    const { client, methods } = makeFakeClient()
    const builders = createSubscriptionBuilders(client)
    builders.events.on('x', () => {})
    const result = await methods.get('event.dispatch')!({
      name: 'x',
    })
    expect(result).toEqual({
      ok: true,
    })
  })
})
