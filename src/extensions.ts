/**
 * Well-known system extension groups.
 * Library plugins can reference these by alias (e.g. "system:video")
 * instead of listing every extension manually.
 */

const SYSTEM_EXTENSIONS: Record<string, string[]> = {
  'system:video': [
    '.mkv', '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v',
    '.ts', '.m2ts', '.mpg', '.mpeg', '.vob', '.ogv', '.3gp',
  ],
  'system:audio': [
    '.mp3', '.flac', '.ogg', '.opus', '.wav', '.aac', '.m4a', '.wma',
    '.alac', '.aiff', '.ape', '.dsf', '.dff', '.wv',
  ],
  'system:image': [
    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.tif', '.webp',
    '.heic', '.heif', '.raw', '.cr2', '.nef', '.arw',
  ],
  'system:text': [
    '.pdf', '.epub', '.txt',
  ],
}

/**
 * Resolve a single extension entry. If it starts with "system:", expand the alias.
 * Otherwise return it as-is (a raw extension like ".pdf").
 */
export function resolveExtension (entry: string): string[] {
  if (entry.startsWith('system:')) {
    const group = SYSTEM_EXTENSIONS[entry]
    if (!group) {
      // eslint-disable-next-line no-console
      console.warn(`Unknown system extension alias: ${entry}`)
      return []
    }
    return group
  }
  return [entry.startsWith('.') ? entry : `.${entry}`]
}

/**
 * Resolve an array of extension entries (mix of aliases and raw extensions)
 * into a flat, deduplicated array of dot-prefixed extensions.
 */
export function resolveExtensions (entries: string[]): string[] {
  const result = new Set<string>()
  for (const entry of entries) {
    for (const ext of resolveExtension(entry)) {
      result.add(ext)
    }
  }
  return [...result]
}

/**
 * Check if a system extension alias is valid.
 */
export function isSystemExtensionAlias (entry: string): boolean {
  return entry.startsWith('system:') && entry in SYSTEM_EXTENSIONS
}

/** All known system extension alias names */
export const SYSTEM_EXTENSION_ALIASES = Object.keys(SYSTEM_EXTENSIONS)
