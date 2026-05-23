import type { HostTransport } from './index.js'

export interface ConfigApi {
  /** Fetch this plugin's resolved configuration values from the host. */
  get<T extends Record<string, unknown> = Record<string, unknown>> (): Promise<T>
}

/**
 * Typed configuration helpers built on the generic host transport. A second
 * domain wrapper alongside `accounts` — same shape, registered in
 * `createHostApi`.
 */
export function createConfigApi (transport: HostTransport): ConfigApi {
  return {
    get: <T extends Record<string, unknown> = Record<string, unknown>> () =>
      transport.call<T>('host.getConfig', {}),
  }
}
