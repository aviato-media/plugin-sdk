import { describe, expect, test } from 'bun:test'

import {
  BundlingConfigSchema,
  BundlingIdentitySchema,
  LibraryPathEntrySchema,
  MediaFileTypeEnum,
} from './media-file-type.js'

describe('MediaFileTypeEnum', () => {
  test('accepts all known values', () => {
    for (const v of ['primary', 'extra', 'trailer', 'deleted-scene', 'behind-the-scenes', 'companion']) {
      expect(MediaFileTypeEnum.safeParse(v).success).toBe(true)
    }
  })

  test('rejects unknown value', () => {
    expect(MediaFileTypeEnum.safeParse('foo').success).toBe(false)
  })
})

describe('LibraryPathEntrySchema', () => {
  test('accepts minimal entry', () => {
    expect(LibraryPathEntrySchema.safeParse({
      extensions: ['.mp4'],
    }).success).toBe(true)
  })

  test('accepts full entry', () => {
    expect(LibraryPathEntrySchema.safeParse({
      type: 'trailer',
      rules: ['*trailer*'],
      extensions: ['system:video'],
    }).success).toBe(true)
  })

  test('rejects empty extensions array', () => {
    expect(LibraryPathEntrySchema.safeParse({
      extensions: [],
    }).success).toBe(false)
  })
})

describe('BundlingIdentitySchema', () => {
  test('accepts pattern and defaults scope', () => {
    const parsed = BundlingIdentitySchema.parse({
      pattern: 'S(?<season>\\d+)E(?<episode>\\d+)',
    })
    expect(parsed.scope).toBe('directory')
  })
})

describe('BundlingConfigSchema', () => {
  test('accepts per-folder', () => {
    expect(BundlingConfigSchema.safeParse({
      strategy: 'per-folder',
    }).success).toBe(true)
  })

  test('accepts per-file with identity and perFileExtensions', () => {
    expect(BundlingConfigSchema.safeParse({
      strategy: 'per-file',
      identity: {
        pattern: 'S(?<season>\\d+)',
      },
      perFileExtensions: ['.m4b'],
    }).success).toBe(true)
  })

  test('rejects bad strategy', () => {
    expect(BundlingConfigSchema.safeParse({
      strategy: 'all-at-once',
    }).success).toBe(false)
  })
})
