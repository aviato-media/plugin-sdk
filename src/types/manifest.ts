import { z } from 'zod'

import { CapabilitySchema } from '../capabilities.js'
import { AccountsBlockSchema } from './accounts.js'
import { ConfigurationFieldSchema } from './configuration.js'
import { EngineSchema, NetworkPolicySchema } from './engine.js'
import { BundlingConfigSchema, LibraryPathEntrySchema } from './media-file-type.js'

// Re-export the leaf schemas the manifest composes so the `./manifest`
// subpath is self-contained for consumers that import only from it.
export type { Engine, NetworkPolicy } from './engine.js'
export { EngineSchema, NetworkPolicySchema } from './engine.js'

/**
 * Library item dedup config — declares which canonical-id providers are
 * authoritative for collapsing duplicate library items into a single item
 * with multiple media files (editions/versions).
 *
 * Dedup runs at the end of the index job, *after* the indexer resolves
 * canonical IDs. If any listed provider's `(provider, externalId)` pair
 * matches an existing item in the same library, the newer item is merged
 * into the older one (its files become additional versions of the survivor).
 *
 * Omit this block to opt out — the runtime falls back to URI-based item
 * grouping only, preserving today's behavior.
 */
export const LibraryDedupConfigSchema = z.object({
  /**
   * Canonical-id providers that authoritatively identify "the same item".
   * Typical values: `["tmdb", "imdb"]` for movies, `["tvdb", "tmdb"]` for TV,
   * `["musicbrainz_release_group"]` for music, `["isbn"]` for books.
   *
   * Order is not significant — any single match triggers a merge.
   */
  providers: z.array(z.string().min(1)).min(1),
})

export type LibraryDedupConfig = z.infer<typeof LibraryDedupConfigSchema>

/** Library capability config — declares bundling strategy and file discovery/classification rules */
export const LibraryCapabilityConfigSchema = z.object({
  /** Bundling strategy — how scanned files are grouped into library items */
  bundling: BundlingConfigSchema,
  /** Path rules for file classification (primary, trailer, extra, etc.) */
  paths: z.array(LibraryPathEntrySchema).min(1),
  /** Canonical-id-based dedup rules; omit to opt out. */
  dedup: LibraryDedupConfigSchema.optional(),
})

/** Filesystem capability config — declares filesystem-level capabilities */
export const FilesystemCapabilityConfigSchema = z.object({
  supportsWatch: z.boolean().optional(),
  supportsLocalFileAccess: z.boolean().optional(),
  supportsWrite: z.boolean().optional(),
})

export type FilesystemCapabilityConfig = z.infer<typeof FilesystemCapabilityConfigSchema>

/**
 * Convert capability config — declares which mime types this plugin can
 * accept as input. The server uses these globs (`video/*`, `audio/mpeg`,
 * etc.) to filter eligible plugins for the Convert/Optimize dialog
 * without an RPC round-trip per plugin.
 */
export const ConvertCapabilityConfigSchema = z.object({
  inputMimeTypes: z.array(z.string().min(1)).min(1),
})

export type ConvertCapabilityConfig = z.infer<typeof ConvertCapabilityConfigSchema>

/**
 * Hook/event/view name — dot-separated segments. Each segment is alphanumeric
 * (camelCase allowed, since dispatch sites use names like
 * `pipeline.probe.afterProcess`) or the wildcard `*` for glob subscriptions.
 */
const SUBSCRIPTION_NAME_RE = /^[a-zA-Z0-9*]+(\.[a-zA-Z0-9*]+)*$/

/** Hook subscription — declares a pipeline hook binding with execution order */
export const HookSubscriptionSchema = z.object({
  name: z.string().regex(SUBSCRIPTION_NAME_RE),
  order: z.number().int().min(0).max(100).optional(),
  /**
   * The hook handler needs the file to be readable from a local path on disk
   * (e.g. to invoke `ffprobe`, parse a sidecar `.nfo`, or generate thumbnails).
   *
   * Planned orchestrator behavior (the flag is persisted by the subscription
   * registry today; pipeline materialization is not yet wired up): when any
   * subscriber to a per-item pipeline hook sets this, the orchestrator will
   * materialize the file locally — via `filesystem.getLocalPath` if the source
   * filesystem plugin supports it, otherwise by fetching it to a scratch
   * directory before dispatching the hook. When no subscriber requires a local
   * file, the pipeline can ingest from a remote filesystem plugin without ever
   * copying bytes locally. Defaults to `false`.
   */
  requiresLocalFile: z.boolean().optional(),
})

export type HookSubscription = z.infer<typeof HookSubscriptionSchema>

/** Plugin subscriptions — events (fire-and-forget), hooks (blocking pipeline), views (parallel UI) */
export const PluginSubscriptionsSchema = z.object({
  events: z.array(z.string().regex(SUBSCRIPTION_NAME_RE)).optional(),
  hooks: z.array(HookSubscriptionSchema).optional(),
  views: z.array(z.string().regex(SUBSCRIPTION_NAME_RE)).optional(),
})

export type PluginSubscriptions = z.infer<typeof PluginSubscriptionsSchema>

/** Per-capability configuration in plugin manifest */
export const CapabilityConfigSchema = z.object({
  library: LibraryCapabilityConfigSchema.optional(),
  filesystem: FilesystemCapabilityConfigSchema.optional(),
  convert: ConvertCapabilityConfigSchema.optional(),
}).optional()

export type LibraryCapabilityConfig = z.infer<typeof LibraryCapabilityConfigSchema>
export type CapabilityConfig = z.infer<typeof CapabilityConfigSchema>

/** Rate limit window — e.g. { max: 40, window: "10s" } */
export const RateLimitWindowSchema = z.object({
  max: z.number().int().positive(),
  window: z.string().regex(/^\d+[smh]$/, 'Must be a duration like "1s", "10s", "1m", "1h"'),
})

export type RateLimitWindow = z.infer<typeof RateLimitWindowSchema>

/** Per-plugin rate limit configuration */
export const RateLimitSchema = z.object({
  maxConcurrency: z.number().int().positive().optional(),
  requests: z.array(RateLimitWindowSchema).optional(),
})

export type RateLimitConfig = z.infer<typeof RateLimitSchema>

/**
 * How a player control surfaces in the UI for this media type:
 *   'hidden'    — not rendered.
 *   'menu'      — exposed inside the PlayerSettings popover.
 *   'prominent' — rendered as a primary control in the player bar.
 *
 * Used for controls that only make sense for some media types (e.g. shuffle
 * and repeat are core to music but irrelevant for movies / TV).
 */
export const PlayerControlStyleSchema = z.enum(['hidden', 'menu', 'prominent'])

export type PlayerControlStyle = z.infer<typeof PlayerControlStyleSchema>

/**
 * Per-mediaType configuration declared by a plugin manifest. Used to surface
 * media-type-specific capabilities (e.g. episodic content) without requiring
 * UI consumers to hardcode mediaType string comparisons.
 *
 * Not strict — unrecognized fields are allowed through so a plugin built
 * against a newer SDK can register against an older Aviato runtime without
 * crashing on fields that have not been ported back yet.
 */
export const MediaTypeConfigSchema = z.object({
  // Content is organized as discrete episodes (TV shows, podcasts, anime,
  // serialized audio drama). Drives UI affordances such as the sleep
  // timer's "End of current episode" option and future auto-advance.
  episodic: z.boolean().optional(),
  // Whether the player's seek-back / seek-forward controls apply to this
  // media type. Defaults to true. Set to `false` for media types that
  // don't have a meaningful linear timeline (e.g. books).
  seekable: z.boolean().optional(),
  // Whether the "Are you still there?" idle-protection prompt is relevant
  // for this media type. Defaults to true. Set to `false` for media types
  // that aren't watched on a continuous timeline (e.g. books).
  idleProtection: z.boolean().optional(),
  // Queue UX style:
  //   'panel'   — Spotify-style side drawer listing the queue (audio).
  //   'up-next' — Netflix-style countdown overlay near end-of-item (video).
  // When omitted, no queue UI is surfaced for this media type.
  queueStyle: z.enum(['panel', 'up-next']).optional(),
  // Auto-advance to the next queued item when the current one ends.
  // When omitted, defaults to false (manual advance only).
  autoplay: z.boolean().optional(),
  // How the player builds a queue from a single play action:
  //   'eager' — fetch the full sibling list upfront (album, audiobook
  //             parts, collection).
  //   'lazy'  — keep only the next item queued and refill on advance.
  //             Used for series with potentially hundreds of episodes.
  // When omitted, no auto-built queue is created on play.
  queueStrategy: z.enum(['eager', 'lazy']).optional(),
  // How the shuffle control surfaces for this media type. Defaults to
  // 'hidden' — movies / TV / books leave it off; music opts in to
  // 'prominent' so the control sits next to the transport buttons.
  shuffleStyle: PlayerControlStyleSchema.optional(),
  // How the repeat control surfaces for this media type. Defaults to
  // 'hidden'. Same shape as `shuffleStyle`.
  repeatStyle: PlayerControlStyleSchema.optional(),
})

export type MediaTypeConfig = z.infer<typeof MediaTypeConfigSchema>

/**
 * Plugin mediaTypes can be declared two ways:
 *   - simple array form:  `["movies", "tv"]`
 *   - object form:        `{ "tv": { "episodic": true }, "movies": {} }`
 *
 * The object form lets a plugin attach per-mediaType configuration. Use
 * `getDeclaredMediaTypes` / `getMediaTypeConfig` helpers below to read
 * either form uniformly.
 */
export const PluginMediaTypesSchema = z.union([
  z.array(z.string()),
  z.record(z.string(), MediaTypeConfigSchema),
])

export type PluginMediaTypes = z.infer<typeof PluginMediaTypesSchema>

/** Zod schema for plugin.json validation */
export const PluginManifestSchema = z.object({
  // Canonical form is `@publisher/plugin-name`. Bare `plugin-name` is
  // accepted for backwards compatibility with legacy plugins.
  id: z.string().regex(/^(@[a-z0-9-]+\/)?[a-z0-9-]+$/),
  name: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+/),
  capabilities: z.array(CapabilitySchema).min(0),
  mediaTypes: PluginMediaTypesSchema.optional(),
  description: z.string(),
  author: z.string(),
  license: z.string(),
  repository: z.string().url().optional(),
  homepage: z.string().url().optional(),
  engine: EngineSchema,
  entry: z.string().min(1),
  aviato: z.object({
    minVersion: z.string(),
  }),
  dependencies: z.array(z.string()).optional(),
  /**
   * Optional path (relative to the plugin directory) to a post-install
   * script the marketplace will execute when the plugin is downloaded.
   * Reserved for the upcoming plugin-marketplace work — declared here so
   * plugin authors can ship the field today and consumers can adopt it
   * without a manifest schema bump. Not invoked by the runtime today.
   *
   * Convention: bash for *nix targets, .ps1 for windows.
   */
  installScript: z.string().optional(),
  configuration: z.array(ConfigurationFieldSchema).optional(),
  /**
   * Optional accounts block — declares the per-account credential schema a
   * plugin manages (e.g. a metadata provider with multiple API keys). The
   * `schema` array must include a `name` text field used as the account label.
   */
  accounts: AccountsBlockSchema.optional(),
  capabilityConfig: CapabilityConfigSchema,
  subscriptions: PluginSubscriptionsSchema.optional(),
  rateLimit: RateLimitSchema.optional(),
  /**
   * Outbound network policy declared by the plugin. Today only one field:
   * `bypassPrivacyProxy` opts the plugin out of the Aviato Privacy Proxy
   * when an admin has it enabled. Set this on plugins that *must* see the
   * real server WAN (e.g. a filesystem plugin reaching a private VPN-only
   * S3 endpoint). The optional `reason` is surfaced to admins so they
   * understand why the plugin opted out.
   */
  network: NetworkPolicySchema.optional(),
}).strict()

/** Plugin manifest — parsed from plugin.json */
export type PluginManifest = z.infer<typeof PluginManifestSchema>

/** Extract the list of mediaType strings declared by a plugin, from either form. */
export function getDeclaredMediaTypes (mediaTypes: PluginMediaTypes | undefined): string[] {
  if (!mediaTypes) {
    return []
  }
  if (Array.isArray(mediaTypes)) {
    return mediaTypes
  }
  return Object.keys(mediaTypes)
}

/**
 * Look up the configuration declared for a specific mediaType. Returns an
 * empty object for plugins that use the array form (no per-type config) and
 * for unknown mediaType keys.
 */
export function getMediaTypeConfig (
  mediaTypes: PluginMediaTypes | undefined,
  mediaType: string,
): MediaTypeConfig {
  if (!mediaTypes || Array.isArray(mediaTypes)) {
    return {}
  }
  return mediaTypes[mediaType] ?? {}
}
