import { z } from 'zod'

/**
 * SINGLE SOURCE OF TRUTH for plugin manifest capabilities.
 *
 * A capability is a contract a plugin fulfills, declared in plugin.json's
 * `capabilities` array. The Aviato server validates manifests against this,
 * the Aviato web UI renders filters/badges from it, and the marketplace
 * (ato.software) renders descriptions from it — all by importing THIS module
 * (directly, or transitively via `@aviato/common`).
 *
 * To add a capability:
 *   1. Add an entry below (id + label + description).
 *   2. Add its handler interface + registrar in `plugin.ts` if it has an RPC
 *      surface (the `capabilityRegistrars` type will fail to compile otherwise).
 *   3. Bump this package's version and publish.
 * Every consumer picks it up on dependency bump — there are no hand-maintained
 * capability lists to keep in sync anywhere else.
 *
 * NOTE: `ui` is intentionally NOT a capability. Plugin UI contributions flow
 * through `subscriptions.views` in the manifest, not the capabilities array.
 * The `ui` handler key in `plugin.ts` wires the `ui.getSchemas` RPC and is a
 * separate, handler-level concept.
 */
export const CAPABILITY_METADATA = [
  {
    id: 'filesystem',
    label: 'Filesystem',
    description:
      'Discovers, reads, and watches media files from a storage backend (local disk, network share, or cloud).',
  },
  {
    id: 'indexer',
    label: 'Indexer',
    description:
      'Resolves media against a third-party metadata source and returns canonical matches.',
  },
  {
    id: 'library',
    label: 'Library',
    description:
      'Defines a library type — how scanned files are bundled into items and presented.',
  },
  {
    id: 'media-scan',
    label: 'Media Scan',
    description:
      'Extracts metadata from the media file itself (probe, embedded tags, sidecar files).',
  },
  {
    id: 'artwork-search',
    label: 'Artwork Search',
    description:
      'Searches external sources for artwork (posters, covers, thumbnails) for library items.',
  },
] as const satisfies ReadonlyArray<{ id: string,
  label: string,
  description: string }>

/** Union of all capability ids, e.g. `'filesystem' | 'indexer' | …`. */
export type Capability = typeof CAPABILITY_METADATA[number]['id']

/** Tuple of capability ids — suitable for `z.enum` and UI iteration. */
export const CAPABILITIES = CAPABILITY_METADATA.map((c) => c.id) as unknown as readonly [Capability, ...Capability[]]

/** Zod enum for validating a single capability id. */
export const CapabilitySchema = z.enum(CAPABILITIES)

/** id → human label, e.g. `'media-scan'` → `'Media Scan'`. */
export const CAPABILITY_LABELS = Object.fromEntries(
  CAPABILITY_METADATA.map((c) => [c.id, c.label]),
) as Record<Capability, string>

/** id → user-facing description. */
export const CAPABILITY_DESCRIPTIONS = Object.fromEntries(
  CAPABILITY_METADATA.map((c) => [c.id, c.description]),
) as Record<Capability, string>
