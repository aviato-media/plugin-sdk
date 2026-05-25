import { z } from 'zod'

import { FileInfoSchema } from './file-info.js'
import { FormFieldSchema } from './ui.js'

/**
 * Public type contract for the `convert` plugin capability.
 *
 * A convert plugin re-encodes or transcodes a media file from one
 * format/quality to another. The server selects an output path
 * (next-to-source or Aviato data directory) and the plugin writes to
 * exactly that path.
 *
 * Two RPC methods:
 *   - `convert.getOptions(input)` — the plugin returns a dynamic
 *     `FormField[]` schema (e.g. Quality, Format, Resolution, Codec)
 *     so the dialog can render controls tailored to the input file.
 *   - `convert.convert(request)` — performs the conversion, writing to
 *     `request.outputPath`. The server registers the resulting file as
 *     a new version of the library item.
 *
 * Static manifest config: a convert plugin should declare which mime
 * types it accepts in `capabilityConfig.convert.inputMimeTypes`
 * (e.g. `["video/*"]`). The server uses this to filter eligible
 * plugins before opening the dialog without a per-plugin RPC.
 */

export const ConvertGetOptionsRequestSchema = z.object({
  /** Source file's mime type, e.g. `video/mp4`. */
  inputMimeType: z.string(),
  /** Optional probe payload — lets the plugin tailor options to the actual codec/resolution. */
  inputFileInfo: FileInfoSchema.optional(),
})
export type ConvertGetOptionsRequest = z.infer<typeof ConvertGetOptionsRequestSchema>

export const ConvertGetOptionsResponseSchema = z.object({
  fields: z.array(FormFieldSchema),
  /** Initial values keyed by field key — the dialog seeds the form with these. */
  defaults: z.record(z.string(), z.unknown()).optional(),
})
export type ConvertGetOptionsResponse = z.infer<typeof ConvertGetOptionsResponseSchema>

export const ConvertRequestSchema = z.object({
  /** Local filesystem path to the source file (already resolved by the server). */
  inputPath: z.string(),
  /** Server-selected destination path. The plugin MUST write here verbatim. */
  outputPath: z.string(),
  /** Source mime type — convenience copy of what `getOptions` saw. */
  mimeType: z.string(),
  /** Field values the user picked, keyed by the same `field.key` returned by `getOptions`. */
  options: z.record(z.string(), z.unknown()),
  /** Opaque correlation id — useful for plugin logs, for `convert.cancel`,
   *  and as the key the plugin sends back in `convert.progress` notifications. */
  sessionId: z.string(),
  /** Source duration in seconds, if the server already probed it. Plugins
   *  that report `convert.progress` use this to compute percentage without
   *  having to ffprobe the input themselves. */
  inputDurationSec: z.number().optional(),
})
export type ConvertRequest = z.infer<typeof ConvertRequestSchema>

export const ConvertResponseSchema = z.object({
  /** Echoed back to confirm where the file was written. Must equal `request.outputPath`. */
  outputPath: z.string(),
  /** Output file's mime type — used to populate `library_files.mimeType`. */
  mimeType: z.string(),
  /** Optional duration in seconds. The server will probe regardless, but this helps logs. */
  durationSec: z.number().optional(),
})
export type ConvertResponse = z.infer<typeof ConvertResponseSchema>

/**
 * Request payload for `convert.cancel`. The server fires this when a
 * running convert job is cancelled (admin UI, API, etc.). The plugin
 * should attempt to interrupt the in-flight `convert.convert` call
 * matching `sessionId` — typically by killing the ffmpeg child it
 * spawned. The corresponding `convert.convert` call will then reject
 * and the server will reap the partial output file.
 *
 * Plugins that can't interrupt their work may omit the `cancel`
 * handler; the server only invokes it when present.
 */
export const ConvertCancelRequestSchema = z.object({
  sessionId: z.string(),
})
export type ConvertCancelRequest = z.infer<typeof ConvertCancelRequestSchema>

/**
 * Notification sent FROM the plugin TO the server while a
 * `convert.convert` call is in flight. The server forwards it to admin
 * UIs over SSE so users can watch a conversion progress in real time.
 *
 * Method name: `convert.progress` (JSON-RPC notification — no response).
 * Plugins do NOT emit this by hand — the SDK passes a `ConvertEmitters`
 * argument to the `convert` handler; call `emitters.reportProgress(progress,
 * message)` and the SDK sends the typed notification (binding `sessionId`)
 * through the host facade.
 *
 * Notifications for a `sessionId` the server doesn't currently consider
 * active are silently dropped. Plugins should rate-limit (≤ ~2/sec is
 * fine — the server debounces SSE on top of that).
 */
export const ConvertProgressNotificationSchema = z.object({
  sessionId: z.string(),
  /** 0..1 fraction complete. Pass `null` if not computable yet. */
  progress: z.number().min(0).max(1).nullable(),
  /** Optional human-readable status (e.g. "encoding video stream"). */
  message: z.string().optional(),
})
export type ConvertProgressNotification = z.infer<typeof ConvertProgressNotificationSchema>
