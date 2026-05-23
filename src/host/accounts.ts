import type { Account } from '../types/accounts.js'
import type { AccountChange } from './contract.js'
import type { HostTransport } from './index.js'

export interface AccountsApi {
  /** Fetch a host-managed account by name. */
  get<T extends Record<string, unknown> = Record<string, unknown>> (name: string): Promise<Account<T>>
  /** Subscribe to account lifecycle notifications. Returns an unsubscribe fn. */
  onChanged (handler: (change: { name: string,
    change: AccountChange }) => void): () => void
}

/**
 * Typed account helpers built on the generic host transport. This is the
 * template for additional domain wrappers — keep one file per domain and
 * register it in `createHostApi`.
 */
export function createAccountsApi (transport: HostTransport): AccountsApi {
  return {
    get: <T extends Record<string, unknown> = Record<string, unknown>> (name: string) =>
      transport.call<Account<T>>('host.getAccount', { name }),
    onChanged: handler =>
      transport.onNotification('host.accountChanged', params =>
        handler(params as { name: string,
          change: AccountChange })),
  }
}
