import type { ExternalId } from '../types/entity.js'
import type { MetadataBundle } from '../types/metadata.js'

/** Get the best value for a well-known field, preferring confident sources. */
export function getBundleValue<T> (fields: Array<{ value: T,
  confidence: 'confident' | 'hint' }>): T | undefined {
  const confident = fields.find(f => f.confidence === 'confident')
  if (confident) {
    return confident.value
  }
  return fields[0]?.value
}

/** Get all confident canonical IDs from the bundle. */
export function getConfidentCanonicalIds (bundle: MetadataBundle): ExternalId[] {
  return bundle.canonicalIds
    .filter(f => f.confidence === 'confident')
    .map(f => f.value)
}

/** Merge confident freeform fields from bundle into metadata fields (doesn't overwrite existing keys). */
export function mergeConfidentFields (bundle: MetadataBundle, fields: Record<string, unknown>): void {
  for (const [key, contributions] of Object.entries(bundle.fields)) {
    const confident = contributions.find(c => c.confidence === 'confident')
    if (confident && !(key in fields)) {
      fields[key] = confident.value
    }
  }
}

/** Get the best value for a freeform field from the bundle's fields bag. */
export function getBundleField<T = unknown> (bundle: MetadataBundle, key: string): T | undefined {
  const contributions = bundle.fields[key]
  if (!contributions?.length) {
    return undefined
  }
  const confident = contributions.find(c => c.confidence === 'confident')
  if (confident) {
    return confident.value as T
  }
  return contributions[0]?.value as T
}
