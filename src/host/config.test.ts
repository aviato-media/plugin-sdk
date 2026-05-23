import { describe, expect, it } from 'bun:test'

import { PluginClient } from '../client.js'
import { createHostApi, type HostTransport } from './index.js'

// See client.test.ts: many short-lived clients attach stdin listeners.
process.stdin.setMaxListeners(0)

describe('host config API', () => {
  it('get() calls host.getConfig and resolves the typed result', async () => {
    const originalWrite = process.stdout.write.bind(process.stdout)
    process.stdout.write = (() => true) as typeof process.stdout.write
    try {
      const client = new PluginClient()
      const pending = client.host.config.get<{ apiKey: string }>()
      const sentId = client._lastRequestIdForTest()
      client.handleIncoming({
        jsonrpc: '2.0',
        id: sentId,
        result: {
          apiKey: 'secret',
          region: 'us',
        },
      })
      const config = await pending
      expect(config.apiKey).toBe('secret')
    } finally {
      process.stdout.write = originalWrite
    }
  })

  it('get() sends host.getConfig with empty params through any transport', async () => {
    const calls: Array<{ method: string,
      params: unknown }> = []
    const transport: HostTransport = {
      call: (async (method: string, params?: Record<string, unknown>) => {
        calls.push({
          method,
          params: params ?? {},
        })
        return { ok: true }
      }) as HostTransport['call'],
      onNotification: () => () => {},
    }

    const host = createHostApi(transport)
    await host.config.get()

    expect(calls).toEqual([{
      method: 'host.getConfig',
      params: {},
    }])
  })
})
