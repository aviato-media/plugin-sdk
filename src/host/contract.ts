import type { Account } from '../types/accounts.js'
import type { ConvertProgressNotification } from '../types/convert.js'

export type AccountChange = 'created' | 'updated' | 'deleted'

/**
 * Central contract for requests a plugin can make to the host (plugin→host).
 *
 * Each entry maps a JSON-RPC method name to its `params` and `result` types.
 * Add a new host method by adding an entry here — `client.host.call(method, …)`
 * is then fully type-checked and autocompletes against it.
 */
export interface HostMethods {
  'host.getAccount': {
    params: { name: string }
    result: Account
  }
  'host.getConfig': {
    params: Record<string, never>
    result: Record<string, unknown>
  }
}

/**
 * Central contract for notifications the host sends to a plugin (host→plugin).
 *
 * Each entry maps a JSON-RPC method name to its payload type. Subscribe with
 * `client.host.onNotification(method, handler)` for a type-checked payload.
 */
export interface HostNotifications {
  'host.accountChanged': {
    name: string
    change: AccountChange
  }
}

/**
 * Central contract for notifications a plugin sends to the host (plugin→host).
 *
 * Each entry maps a JSON-RPC notification method name to its payload type.
 * Emit one through the typed facade — `client.host.notify(method, payload)` —
 * which is type-checked and autocompletes against this map. Adding a new
 * outbound notification means adding an entry here; plugins never hand-write
 * the method string or an untyped payload.
 */
export interface PluginNotifications {
  'convert.progress': ConvertProgressNotification
}
