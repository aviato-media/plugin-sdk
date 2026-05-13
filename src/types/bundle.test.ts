import { describe, expect, test } from 'bun:test'

import {
  DiscoveredBundleSchema,
  ExtensionMapEntrySchema,
  ExtensionMapSchema,
} from './bundle.js'

describe('ExtensionMapEntrySchema', () => {
  test('accepts extensions only', () => {
    expect(ExtensionMapEntrySchema.safeParse({
      extensions: ['.srt'],
    }).success).toBe(true)
  })

  test('accepts extensions + patterns', () => {
    expect(ExtensionMapEntrySchema.safeParse({
      extensions: ['.srt'],
      patterns: ['*.{en,fr}.srt'],
    }).success).toBe(true)
  })
})

describe('ExtensionMapSchema', () => {
  test('defaults auxiliaries to empty object', () => {
    const parsed = ExtensionMapSchema.parse({
      primary: ['.mkv'],
    })
    expect(parsed.auxiliaries).toEqual({})
  })

  test('accepts primary + auxiliaries', () => {
    expect(ExtensionMapSchema.safeParse({
      primary: ['.mkv'],
      auxiliaries: {
        subtitles: {
          extensions: ['.srt'],
        },
      },
    }).success).toBe(true)
  })
})

describe('DiscoveredBundleSchema', () => {
  test('accepts bundle with no auxiliaries', () => {
    expect(DiscoveredBundleSchema.safeParse({
      uri: 'file:///x',
      mediaFiles: [],
      auxiliaries: {},
    }).success).toBe(true)
  })

  test('accepts bundle with auxiliaries', () => {
    expect(DiscoveredBundleSchema.safeParse({
      uri: 'file:///x',
      mediaFiles: [{
        uri: 'file:///x.mkv',
        filename: 'x.mkv',
        size: 1,
        modifiedAt: '2025',
      }],
      auxiliaries: {
        subs: [{
          uri: 'file:///x.srt',
          filename: 'x.srt',
          size: 1,
          modifiedAt: '2025',
        }],
      },
    }).success).toBe(true)
  })
})
