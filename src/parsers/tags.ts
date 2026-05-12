/**
 * Parse {key-value} and {key:value} tags from a string.
 * Returns a Record of all found tag key-value pairs.
 * Keys are any word characters; values are everything up to the closing brace.
 * Unknown keys are preserved -- plugins may define custom tags.
 */
export function parseTags (input: string): Record<string, string> {
  const tags: Record<string, string> = {}
  const pattern = /\{(\w+)[-:]([^}]+)\}/g
  let match: RegExpExecArray | null

  while ((match = pattern.exec(input)) !== null) {
    const key = match[1]
    const value = match[2].trim()
    if (key && value) {
      tags[key] = value
    }
  }

  return tags
}

/**
 * Remove all {key-value} and {key:value} tags from a string.
 * Collapses extra whitespace left behind.
 */
export function stripTags (input: string): string {
  return input.replace(/\{(\w+)[-:]([^}]+)\}/g, '').replace(/\s{2,}/g, ' ').trim()
}
