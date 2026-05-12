import { extname } from 'path'
import picomatch from 'picomatch'

import { resolveExtensions } from '../extensions.js'
import type { LibraryPathEntry, MediaFileType } from '../types/media-file-type.js'

export interface MediaFileRuleInput {
  /** The filename (basename) of the file, e.g. "Trailer.mp4" */
  filename: string
  /** The file's path relative to the bundle root, e.g. "Trailers/Trailer 1.mp4" */
  relativePath: string
  /** The file extension with leading dot, e.g. ".mp4" */
  extension: string
}

export interface MediaFileClassification {
  /** The detected media file type */
  type: MediaFileType
  /** Optional description — set to filename (sans extension) for non-primary types */
  description?: string
}

/** Pre-compiled path entry for efficient repeated matching */
interface CompiledPathEntry {
  type: MediaFileType
  resolvedExts: string[]
  matchers: picomatch.Matcher[]
  hasRules: boolean
}

/**
 * Pre-compile library path entries for efficient repeated matching.
 * Call once per scan, then pass the result to classifyMediaFile for each file.
 */
export function compilePaths (paths: LibraryPathEntry[]): CompiledPathEntry[] {
  return paths.map(entry => ({
    type: (entry.type ?? 'primary') as MediaFileType,
    resolvedExts: resolveExtensions(entry.extensions),
    matchers: (entry.rules ?? []).map(rule => {
      try {
        return picomatch(rule, {
          nocase: true,
        })
      } catch {
        // eslint-disable-next-line no-console
        console.warn(`Invalid glob pattern in media file rule: ${rule}`)
        return null
      }
    }).filter((m): m is picomatch.Matcher => m !== null),
    hasRules: (entry.rules ?? []).length > 0,
  }))
}

/**
 * Classify a media file based on pre-compiled library path rules.
 *
 * Matching algorithm:
 * 1. Entries WITH rules are checked first (in declaration order). First match wins.
 * 2. If no ruled entry matches, the first entry WITHOUT rules whose extensions match is used.
 * 3. If nothing matches at all, returns { type: 'primary' }.
 *
 * All glob matching is case-insensitive.
 */
export function classifyMediaFile (
  compiled: CompiledPathEntry[],
  file: MediaFileRuleInput,
): MediaFileClassification {
  const ext = file.extension.toLowerCase()

  // Phase 1: check entries WITH rules (in order)
  for (const entry of compiled) {
    if (!entry.hasRules) {
      continue
    }

    if (!entry.resolvedExts.includes(ext)) {
      continue
    }

    const matched = entry.matchers.some(isMatch =>
      isMatch(file.relativePath) || isMatch(file.filename),
    )

    if (matched) {
      return {
        type: entry.type,
        ...(entry.type !== 'primary' && {
          description: stripExtension(file.filename),
        }),
      }
    }
  }

  // Phase 2: check entries WITHOUT rules (extension-only, first match)
  for (const entry of compiled) {
    if (entry.hasRules) {
      continue
    }

    if (entry.resolvedExts.includes(ext)) {
      return {
        type: entry.type,
        ...(entry.type !== 'primary' && {
          description: stripExtension(file.filename),
        }),
      }
    }
  }

  // Phase 3: nothing matched
  return {
    type: 'primary',
  }
}

/**
 * Collect all unique resolved extensions from a paths array.
 * Used by buildExtensionMap to determine which files the filesystem should pick up.
 */
export function collectAllExtensions (paths: LibraryPathEntry[]): string[] {
  const allExts = new Set<string>()
  for (const entry of paths) {
    for (const ext of resolveExtensions(entry.extensions)) {
      allExts.add(ext)
    }
  }
  return [...allExts]
}

/**
 * Partition resolved extensions by media role: extensions declared on a
 * `type: 'companion'` path entry vs. everything else (primary/extra/trailer/...).
 * If the same extension appears in both roles, the media role wins so playable
 * files are not demoted to companions.
 */
export function partitionExtensionsByRole (paths: LibraryPathEntry[]): {
  media: string[]
  companion: string[]
} {
  const media = new Set<string>()
  const companion = new Set<string>()
  for (const entry of paths) {
    const target = entry.type === 'companion' ? companion : media
    for (const ext of resolveExtensions(entry.extensions)) {
      target.add(ext)
    }
  }
  for (const ext of media) {
    companion.delete(ext)
  }
  return {
    media: [...media],
    companion: [...companion],
  }
}

function stripExtension (filename: string): string {
  const ext = extname(filename)
  return ext ? filename.slice(0, -ext.length) : filename
}
