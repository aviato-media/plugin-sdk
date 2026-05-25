import { type AccountsApi, createAccountsApi } from './accounts.js'
import { type ConfigApi, createConfigApi } from './config.js'
import type { HostMethods, HostNotifications, PluginNotifications } from './contract.js'

/**
 * Minimal transport surface the host wrappers depend on. `PluginClient`
 * satisfies this structurally, which keeps the host layer decoupled from the
 * concrete transport implementation.
 */
export interface HostTransport {
  call<T = unknown> (method: string, params?: Record<string, unknown>, opts?: { timeoutMs?: number }): Promise<T>
  sendNotification (method: string, params?: Record<string, unknown>): void
  onNotification (method: string, handler: (params: Record<string, unknown>) => void): () => void
}

/**
 * Typed facade over the host transport. `call`/`onNotification` are checked
 * against the central contract; domain namespaces (e.g. `accounts`) add
 * ergonomic, generic-aware helpers on top.
 */
export interface HostApi {
  call<M extends keyof HostMethods> (
    method: M,
    params: HostMethods[M]['params'],
    opts?: { timeoutMs?: number },
  ): Promise<HostMethods[M]['result']>
  notify<N extends keyof PluginNotifications> (
    method: N,
    payload: PluginNotifications[N],
  ): void
  onNotification<N extends keyof HostNotifications> (
    method: N,
    handler: (payload: HostNotifications[N]) => void,
  ): () => void
  accounts: AccountsApi
  config: ConfigApi
}

export function createHostApi (transport: HostTransport): HostApi {
  return {
    call: (method, params, opts) =>
      transport.call(method, params as Record<string, unknown>, opts),
    notify: (method, payload) =>
      transport.sendNotification(method, payload as Record<string, unknown>),
    onNotification: (method, handler) =>
      transport.onNotification(method, handler as (params: Record<string, unknown>) => void),
    accounts: createAccountsApi(transport),
    config: createConfigApi(transport),
  }
}

export type { AccountsApi } from './accounts.js'
export type { ConfigApi } from './config.js'
export type { AccountChange, HostMethods, HostNotifications, PluginNotifications } from './contract.js'
