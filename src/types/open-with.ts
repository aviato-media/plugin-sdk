import { z } from 'zod'

import { FileInfoSchema } from './file-info.js'

/**
 * Platform detected from a request's `User-Agent`.
 *
 * Used by `ui.openWith` hook subscribers to decide whether to surface an
 * external-player option (e.g. IINA on macOS, VLC iOS via x-callback) and
 * how to format the deep-link URL.
 *
 * `tvos` is treated as a distinct platform from `ios` because Apple TV
 * apps register a different set of URL schemes (and many iOS players have
 * no tvOS counterpart). Smart-TV form factors that aren't tvOS — Android
 * TV, Tizen, webOS — fall under their respective base platform with
 * `isTV: true`.
 */
export const UserAgentPlatformSchema = z.enum([
  'ios',
  'tvos',
  'android',
  'macos',
  'windows',
  'linux',
  'unknown',
])
export type UserAgentPlatform = z.infer<typeof UserAgentPlatformSchema>

export const UserAgentInfoSchema = z.object({
  /** The raw `User-Agent` request header value. */
  raw: z.string(),
  platform: UserAgentPlatformSchema,
  /** Phone-class device (typically also `isMobile: true`). */
  isMobile: z.boolean(),
  /** Tablet-class device (e.g. iPad, Android tablet). */
  isTablet: z.boolean(),
  /** Conventional desktop OS (macOS / Windows / Linux non-mobile / non-TV). */
  isDesktop: z.boolean(),
  /**
   * Television form factor — Apple TV (tvOS), Android TV / Google TV,
   * Tizen, webOS, Roku, etc. Useful for hiding controls that depend on
   * touch / mouse / keyboard input.
   */
  isTV: z.boolean(),
})
export type UserAgentInfo = z.infer<typeof UserAgentInfoSchema>

/**
 * A single entry rendered in the Open With dropdown. Plugins contribute
 * these by appending to the `openWith[]` accumulator on the payload they
 * return from a `ui.openWith` hook handler.
 *
 * `pluginId` is stamped by the server after dispatch using the hook
 * dispatcher's contribution log — plugins do NOT need to set it
 * themselves. The field is optional on the schema for that reason; on the
 * server's response it will always be populated.
 */
export const OpenWithOptionSchema = z.object({
  /** Stable identifier (e.g. `"vlc"`, `"iina"`). Used as a React key and analytics tag. */
  id: z.string(),
  /** Display label shown in the dropdown. */
  label: z.string(),
  /** Deep-link URL the client opens via `window.open()`. */
  url: z.string(),
  /** Optional tooltip / secondary text. */
  description: z.string().optional(),
  /** Server-attributed plugin id; do not set from plugin code. */
  pluginId: z.string().optional(),
})
export type OpenWithOption = z.infer<typeof OpenWithOptionSchema>

/**
 * Subtitle handed to `ui.openWith` plugins. External players can render
 * subtitle sidecars when their URL is fetchable (`type: 'external'`);
 * embedded streams are listed for context but get no URL because they
 * live inside the media container.
 */
export const OpenWithSubtitleSchema = z.object({
  id: z.string(),
  language: z.string(),
  label: z.string(),
  format: z.string(),
  type: z.enum(['embedded', 'external']),
  isDefault: z.boolean(),
  isForced: z.boolean(),
  url: z.string().optional(),
})
export type OpenWithSubtitle = z.infer<typeof OpenWithSubtitleSchema>

const OpenWithItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  libraryId: z.string(),
  mediaType: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

const OpenWithFileSchema = z.object({
  id: z.string(),
  uri: z.string(),
  filename: z.string(),
  extension: z.string(),
  mimeType: z.string().nullable(),
  fileInfo: FileInfoSchema.optional().nullable(),
})

/**
 * Payload dispatched on `ui.openWith`. The hook is a serial pipeline: each
 * subscribed plugin receives this shape, may append entries to `openWith[]`,
 * and returns the mutated payload (or `null` to pass through unchanged).
 *
 * `streamUrl` and subtitle URLs are pre-built by the server with auth
 * already attached (`?token=...`), so plugins should treat them as opaque.
 */
export const OpenWithPayloadSchema = z.object({
  itemId: z.string(),
  item: OpenWithItemSchema,
  file: OpenWithFileSchema,
  streamUrl: z.string(),
  subtitles: z.array(OpenWithSubtitleSchema),
  userAgent: UserAgentInfoSchema,
  openWith: z.array(OpenWithOptionSchema),
})
export type OpenWithPayload = z.infer<typeof OpenWithPayloadSchema>

// ── Helpers ────────────────────────────────────────────

const VIDEO_EXTENSIONS = new Set([
  'mp4', 'mkv', 'mov', 'avi', 'wmv', 'webm', 'm4v', 'ts', 'mts', 'm2ts',
  'flv', 'ogv', '3gp', '3g2', 'mpg', 'mpeg', 'vob',
])

/**
 * Returns true when the given file is a video — either by MIME type
 * (`video/*`) or by extension. Use this in `ui.openWith` subscribers to
 * skip non-video items (audio, ebooks, photos) instead of contributing
 * an option that wouldn't make sense.
 */
export function isVideoFile (file: Pick<OpenWithPayload['file'], 'mimeType' | 'extension'>): boolean {
  if (file.mimeType && file.mimeType.startsWith('video/')) {
    return true
  }
  const ext = file.extension.toLowerCase().replace(/^\./, '')
  return VIDEO_EXTENSIONS.has(ext)
}

/**
 * Parses a request `User-Agent` header into a `UserAgentInfo`. Lives in
 * the SDK so the Aviato server and any plugin's tests share one source of
 * truth for platform / form-factor detection.
 *
 * TV detection covers Apple TV (`AppleTV` / `tvOS`), Android TV, Tizen,
 * webOS, and generic SmartTV strings. iPadOS 13+ is detected via the
 * desktop-class Safari UA carrying a touch hint.
 */
export function parseUserAgent (ua: string): UserAgentInfo {
  const raw = ua ?? ''
  const lower = raw.toLowerCase()
  const isAppleTV = /appletv|tvos/.test(lower)
  const isAndroidTV = /android/.test(lower) && /(\bandroid tv\b|googletv|smart-tv)/.test(lower)
  const isOtherTV = /tizen|web0s|webos|netcast|googletv|smart-tv|crkey|hbbtv/.test(lower)
  const isTV = isAppleTV || isAndroidTV || isOtherTV
  const isIPhone = /iphone|ipod/.test(lower)
  const isIPad = /ipad/.test(lower)
    || (/macintosh/.test(lower) && /mobile|touch/.test(lower))
  const isAndroidMobile = /android/.test(lower) && /mobile/.test(lower) && !isAndroidTV
  const isAndroidTablet = /android/.test(lower) && !/mobile/.test(lower) && !isAndroidTV

  let platform: UserAgentPlatform = 'unknown'
  if (isAppleTV) {
    platform = 'tvos'
  } else if (isIPhone || isIPad) {
    platform = 'ios'
  } else if (/android/.test(lower)) {
    platform = 'android'
  } else if (/mac os x|macintosh/.test(lower)) {
    platform = 'macos'
  } else if (/windows nt/.test(lower)) {
    platform = 'windows'
  } else if (/linux|x11/.test(lower)) {
    platform = 'linux'
  }

  const isMobile = isIPhone || isAndroidMobile
  const isTablet = isIPad || isAndroidTablet
  const isDesktop = !isTV && !isMobile && !isTablet
    && (platform === 'macos' || platform === 'windows' || platform === 'linux')

  return {
    raw,
    platform,
    isMobile,
    isTablet,
    isDesktop,
    isTV,
  }
}
