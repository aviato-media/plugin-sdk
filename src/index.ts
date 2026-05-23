export type { RpcError, RunOptions, RunResult, SpawnOptions } from './client.js'
export { PluginClient } from './client.js'
export type {
  AccountChange,
  AccountsApi,
  ConfigApi,
  HostApi,
  HostMethods,
  HostNotifications,
  HostTransport,
} from './host/index.js'
export { createHostApi } from './host/index.js'
export type { LogFn, Logger, LoggerOptions, LogLevel } from './logger.js'
export { createLogger, LOG_LEVELS } from './logger.js'
export type {
  ArtworkSearchHandlers,
  FilesystemEmitters,
  FilesystemHandlers,
  IndexerHandlers,
  LibraryHandlers,
  MediaScanHandlers,
  PluginHandlers,
  UIHandlers,
} from './plugin.js'
export {
  createPlugin,
} from './plugin.js'
export type {
  PluginEventEmitter,
  PluginHookEmitter,
  PluginInstance,
  PluginViewEmitter,
} from './subscriptions.js'
export { matchPattern } from './subscriptions.js'

// Re-export extensions utilities for plugin authors
export { isSystemExtensionAlias, resolveExtension, resolveExtensions, SYSTEM_EXTENSION_ALIASES } from './extensions.js'

// `pluginTmpDir` is intentionally NOT re-exported from this barrel — it
// imports `fs/promises` and `os`, which would poison browser bundles that
// transitively pull in plugin-sdk types/schemas. Plugin authors import it
// via the `@aviato-media/plugin-sdk/tmpdir` subpath instead.

// Re-export all types and zod schemas for plugin authors
export { getBundleField, getBundleValue, getConfidentCanonicalIds, mergeConfidentFields } from './metadata/index.js'
export type { MediaFileClassification, MediaFileRuleInput } from './parsers/index.js'
export { classifyMediaFile, collectAllExtensions, compilePaths, parseTags, partitionExtensionsByRole, stripTags } from './parsers/index.js'
export * from './types/index.js'
