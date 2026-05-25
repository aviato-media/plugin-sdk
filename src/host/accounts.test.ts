import { describe, expect, it } from 'bun:test'

import { PluginClient } from '../client.js'
import { createHostApi, type HostTransport } from './index.js'

// See client.test.ts: many short-lived clients attach stdin listeners.
process.stdin.setMaxListeners(0)

async function withSilentStdout (fn: () => void | Promise<void>): Promise<void> {
  const original = process.stdout.write.bind(process.stdout)
  process.stdout.write = (() => true) as typeof process.stdout.write
  try {
    await fn()
  } finally {
    process.stdout.write = original
  }
}

describe('host accounts API', () => {
  it('get() calls host.getAccount with the name and resolves the typed result', async () => {
    await withSilentStdout(async () => {
      const client = new PluginClient()
      const pending = client.host.accounts.get<{ accessKeyId: string }>('work')
      const sentId = client._lastRequestIdForTest()
      client.handleIncoming({
        jsonrpc: '2.0',
        id: sentId,
        result: {
          name: 'work',
          accessKeyId: 'AKIA-EXAMPLE',
        },
      })
      const account = await pending
      expect(account.name).toBe('work')
      expect(account.accessKeyId).toBe('AKIA-EXAMPLE')
    })
  })

  it('onChanged() subscribes to host.accountChanged and returns a working unsubscribe', () => {
    const client = new PluginClient()
    const seen: Array<{ name: string,
      change: string }> = []
    const unsubscribe = client.host.accounts.onChanged(p => seen.push(p))

    const notify = () => client.handleIncoming({
      jsonrpc: '2.0',
      method: 'host.accountChanged',
      params: {
        name: 'work',
        change: 'updated',
      },
    })

    notify()
    unsubscribe()
    notify()

    expect(seen).toEqual([{
      name: 'work',
      change: 'updated',
    }])
  })

  it('exposes a stable, cached host facade via client.host', () => {
    const client = new PluginClient()
    expect(client.host).toBe(client.host)
  })

  it('createHostApi works against any transport (decoupled from PluginClient)', async () => {
    const calls: Array<{ method: string,
      params: unknown }> = []
    const transport: HostTransport = {
      call: (async (method: string, params?: Record<string, unknown>) => {
        calls.push({
          method,
          params: params ?? {},
        })
        return { name: (params as { name: string }).name }
      }) as HostTransport['call'],
      sendNotification: () => {},
      onNotification: () => () => {},
    }

    const host = createHostApi(transport)
    const account = await host.accounts.get('work')

    expect(account.name).toBe('work')
    expect(calls).toEqual([{
      method: 'host.getAccount',
      params: { name: 'work' },
    }])
  })
})
