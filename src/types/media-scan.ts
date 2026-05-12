/**
 * Public type contract for the `media-scan` plugin capability.
 *
 * A media-scan plugin runs after ingestion and analyses the contents of
 * a media file. Plugins return generic, typed `fingerprints` (cached on
 * the server keyed by `(fileId, pluginId, type)`) and optional output
 * buckets (`chapters` today; future versions can grow more buckets like
 * `faces`, `objects`, `scenes`).
 *
 * The server implementation (in `packages/server/src/libraries/media-scan/`)
 * holds a parallel set of Zod schemas for runtime validation. Keep these
 * types in sync with that file by hand.
 */

/**
 * One fingerprint the server already has cached for this file. The plugin
 * may reuse the blob verbatim when `algorithmVersion` matches its current
 * version. Mismatched or absent entries trigger re-fingerprinting.
 */
export interface MediaScanCachedFingerprint {
  type: string
  algorithmVersion: string
  fingerprint?: string | null
  metadata?: Record<string, unknown> | null
}

export interface MediaScanFileInput {
  fileId: string
  itemId: string
  /** Local filesystem path; already resolved by the server. */
  path: string
  /** Duration in seconds, from the ingestion probe. */
  duration: number
  cachedFingerprints: MediaScanCachedFingerprint[]
}

/**
 * A new fingerprint the plugin computed and wants the server to cache.
 * Persisted into `media_file_scan_fingerprints` keyed on
 * `(fileId, pluginId, type)`.
 */
export interface MediaScanNewFingerprint {
  fileId: string
  type: string
  algorithmVersion: string
  fingerprint?: string | null
  metadata?: Record<string, unknown> | null
}

/**
 * A chapter row for the server to persist. Only `intro` and `credits`
 * roles are owned by media-scan plugins today (the chapter persistence
 * step preserves any pre-existing `chapter`/`scene` rows). The role enum
 * is open in case future plugins emit different chapter kinds.
 */
export interface MediaScanChapter {
  fileId: string
  role: 'intro' | 'credits' | 'chapter' | 'scene'
  startTime: number
  endTime: number
  title?: string | null
  metadata?: Record<string, unknown> | null
}

/**
 * Per-file diagnostic for files the plugin chose not to write output for.
 * Surfaces in pipeline task deltas and admin logs. The reason is a free
 * string; reuse one of the canonical values where possible:
 * `single_episode | too_short | fingerprint_failed | no_match_found |
 * no_video_stream`.
 */
export interface MediaScanSkipped {
  fileId: string
  reason: string
  message?: string
}

/**
 * Response shape from `mediaScan.scanSingle` and `mediaScan.scanBatch`.
 * Future buckets (faces, objects, scenes) can be appended without
 * breaking older plugins; missing buckets are treated as empty.
 */
export interface MediaScanResponse {
  fingerprints: MediaScanNewFingerprint[]
  chapters: MediaScanChapter[]
  skipped: MediaScanSkipped[]
}

export interface MediaScanBatchRequest {
  /** Free-form correlation key for logs (e.g. "season:<entityId>"). */
  groupKey: string
  hints?: Record<string, unknown>
  files: MediaScanFileInput[]
}

export interface MediaScanSingleRequest {
  hints?: Record<string, unknown>
  file: MediaScanFileInput
}

export interface MediaScanAlgorithmVersionResponse {
  algorithmVersion: string
}
