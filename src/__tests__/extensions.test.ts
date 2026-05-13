import { describe, expect, spyOn, test } from 'bun:test'

import {
  isSystemExtensionAlias,
  resolveExtension,
  resolveExtensions,
  SYSTEM_EXTENSION_ALIASES,
} from '../extensions.js'

describe('resolveExtension', () => {
  test('expands a known system alias', () => {
    const result = resolveExtension('system:video')
    expect(result).toContain('.mkv')
    expect(result).toContain('.mp4')
    expect(result.length).toBeGreaterThan(5)
  })

  test('expands system:audio', () => {
    expect(resolveExtension('system:audio')).toContain('.flac')
  })

  test('expands system:image', () => {
    expect(resolveExtension('system:image')).toContain('.jpg')
  })

  test('expands system:text', () => {
    expect(resolveExtension('system:text')).toEqual(['.pdf', '.epub', '.txt'])
  })

  test('warns and returns empty array for unknown system alias', () => {
    const warn = spyOn(console, 'warn').mockImplementation(() => {})
    const result = resolveExtension('system:bogus')
    expect(result).toEqual([])
    expect(warn).toHaveBeenCalledWith('Unknown system extension alias: system:bogus')
    warn.mockRestore()
  })

  test('returns dot-prefixed extension as-is', () => {
    expect(resolveExtension('.pdf')).toEqual(['.pdf'])
  })

  test('adds leading dot when missing', () => {
    expect(resolveExtension('pdf')).toEqual(['.pdf'])
  })
})

describe('resolveExtensions', () => {
  test('flattens and deduplicates a mix of aliases and raw extensions', () => {
    const result = resolveExtensions(['system:text', '.pdf', 'txt'])
    // .pdf and .txt should appear once each
    expect(result.filter(e => e === '.pdf').length).toBe(1)
    expect(result.filter(e => e === '.txt').length).toBe(1)
    expect(result).toContain('.epub')
  })

  test('returns empty array when input is empty', () => {
    expect(resolveExtensions([])).toEqual([])
  })
})

describe('isSystemExtensionAlias', () => {
  test('returns true for known system aliases', () => {
    expect(isSystemExtensionAlias('system:video')).toBe(true)
    expect(isSystemExtensionAlias('system:audio')).toBe(true)
    expect(isSystemExtensionAlias('system:image')).toBe(true)
    expect(isSystemExtensionAlias('system:text')).toBe(true)
  })

  test('returns false for unknown system alias', () => {
    expect(isSystemExtensionAlias('system:bogus')).toBe(false)
  })

  test('returns false for non-system entries', () => {
    expect(isSystemExtensionAlias('.pdf')).toBe(false)
    expect(isSystemExtensionAlias('pdf')).toBe(false)
    expect(isSystemExtensionAlias('')).toBe(false)
  })
})

describe('SYSTEM_EXTENSION_ALIASES', () => {
  test('exposes the canonical alias names', () => {
    expect(SYSTEM_EXTENSION_ALIASES).toEqual([
      'system:video',
      'system:audio',
      'system:image',
      'system:text',
    ])
  })
})
