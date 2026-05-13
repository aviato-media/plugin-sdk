import { describe, expect, spyOn, test } from 'bun:test'

import type { LibraryPathEntry } from '../../types/media-file-type.js'
import { compilePaths, partitionExtensionsByRole } from '../media-file-rules.js'

describe('compilePaths invalid glob', () => {
  test('warns and skips matchers that picomatch rejects', () => {
    const warn = spyOn(console, 'warn').mockImplementation(() => {})
    // empty-string patterns are rejected by picomatch with a throw
    const paths = [
      {
        type: 'extra',
        rules: [''],
        extensions: ['.mp4'],
      },
    ] as unknown as LibraryPathEntry[]
    const compiled = compilePaths(paths)
    expect(compiled[0]!.matchers).toEqual([])
    expect(compiled[0]!.hasRules).toBe(true)
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  test('defaults type to primary when omitted', () => {
    const paths: LibraryPathEntry[] = [
      {
        extensions: ['.mp4'],
      },
    ]
    const compiled = compilePaths(paths)
    expect(compiled[0]!.type).toBe('primary')
    expect(compiled[0]!.hasRules).toBe(false)
  })
})

describe('partitionExtensionsByRole', () => {
  test('separates companion extensions from media extensions', () => {
    const paths: LibraryPathEntry[] = [
      {
        extensions: ['system:video'],
      },
      {
        type: 'companion',
        extensions: ['.pdf', '.txt'],
      },
    ]
    const { media, companion } = partitionExtensionsByRole(paths)
    expect(media).toContain('.mkv')
    expect(media).toContain('.mp4')
    expect(companion).toEqual(expect.arrayContaining(['.pdf', '.txt']))
    expect(companion).not.toContain('.mp4')
  })

  test('media role wins when an extension appears on both sides', () => {
    const paths: LibraryPathEntry[] = [
      {
        type: 'trailer',
        extensions: ['.mp4'],
      },
      {
        type: 'companion',
        extensions: ['.mp4', '.pdf'],
      },
    ]
    const { media, companion } = partitionExtensionsByRole(paths)
    expect(media).toContain('.mp4')
    expect(companion).not.toContain('.mp4')
    expect(companion).toContain('.pdf')
  })

  test('treats entries without type as media', () => {
    const paths: LibraryPathEntry[] = [
      {
        extensions: ['.mkv'],
      },
    ]
    const { media, companion } = partitionExtensionsByRole(paths)
    expect(media).toContain('.mkv')
    expect(companion).toEqual([])
  })

  test('returns empty arrays for empty input', () => {
    const { media, companion } = partitionExtensionsByRole([])
    expect(media).toEqual([])
    expect(companion).toEqual([])
  })
})
