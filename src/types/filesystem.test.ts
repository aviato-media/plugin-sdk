import { describe, expect, test } from 'bun:test'

import {
  DiscoveredFileSchema,
  FileChangeEventSchema,
  FileNotificationSchema,
  FileRemovedNotificationSchema,
  ScanCompleteNotificationSchema,
  ScanResultSchema,
  ValidationResultSchema,
} from './filesystem.js'

describe('DiscoveredFileSchema', () => {
  test('accepts minimal', () => {
    expect(DiscoveredFileSchema.safeParse({
      uri: 'file:///x.mkv',
      filename: 'x.mkv',
      size: 1,
      modifiedAt: '2025-01-01T00:00:00Z',
    }).success).toBe(true)
  })

  test('accepts mime and metadata', () => {
    expect(DiscoveredFileSchema.safeParse({
      uri: 'file:///x.mkv',
      filename: 'x.mkv',
      size: 1,
      modifiedAt: '2025-01-01',
      mimeType: 'video/x-matroska',
      metadata: {
        owner: 'me',
      },
    }).success).toBe(true)
  })
})

describe('ScanResultSchema', () => {
  test('accepts full scan result', () => {
    expect(ScanResultSchema.safeParse({
      totalFiles: 100,
      newFiles: 5,
      modifiedFiles: 2,
      removedFiles: 1,
      errors: ['oh no'],
      durationMs: 1500,
    }).success).toBe(true)
  })

  test('rejects negative-no-fields case', () => {
    expect(ScanResultSchema.safeParse({}).success).toBe(false)
  })
})

describe('FileChangeEventSchema', () => {
  test('accepts each event type', () => {
    const file = {
      uri: 'file:///x',
      filename: 'x',
      size: 1,
      modifiedAt: '2025',
    }
    for (const type of ['added', 'modified', 'removed'] as const) {
      expect(FileChangeEventSchema.safeParse({
        type,
        file,
      }).success).toBe(true)
    }
  })

  test('rejects unknown type', () => {
    expect(FileChangeEventSchema.safeParse({
      type: 'foo',
      file: {
        uri: 'x',
        filename: 'x',
        size: 1,
        modifiedAt: 'x',
      },
    }).success).toBe(false)
  })
})

describe('ValidationResultSchema', () => {
  test('accepts valid result with no errors', () => {
    expect(ValidationResultSchema.safeParse({
      valid: true,
    }).success).toBe(true)
  })

  test('accepts result with errors', () => {
    expect(ValidationResultSchema.safeParse({
      valid: false,
      errors: ['missing path'],
    }).success).toBe(true)
  })
})

describe('notification schemas', () => {
  test('FileNotification', () => {
    expect(FileNotificationSchema.safeParse({
      libraryId: 'l1',
      uri: 'file:///x',
      filename: 'x',
      size: 1,
      modifiedAt: '2025',
    }).success).toBe(true)
  })

  test('FileRemovedNotification', () => {
    expect(FileRemovedNotificationSchema.safeParse({
      libraryId: 'l1',
      uri: 'file:///x',
    }).success).toBe(true)
  })

  test('ScanCompleteNotification', () => {
    expect(ScanCompleteNotificationSchema.safeParse({
      libraryId: 'l1',
    }).success).toBe(true)
  })
})
