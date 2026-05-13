import { describe, expect, test } from 'bun:test'

import {
  DolbyVisionInfoSchema,
  FileInfoAudioStreamSchema,
  FileInfoSchema,
  FileInfoSubtitleStreamSchema,
  FileInfoVideoStreamSchema,
} from './file-info.js'

describe('DolbyVisionInfoSchema', () => {
  test('accepts full info', () => {
    expect(DolbyVisionInfoSchema.safeParse({
      versionMajor: 1,
      versionMinor: 0,
      profile: 7,
      level: 6,
      rpuPresentFlag: 1,
      elPresentFlag: 0,
      blPresentFlag: 1,
      blSignalCompatibilityId: 1,
    }).success).toBe(true)
  })

  test('rejects missing fields', () => {
    expect(DolbyVisionInfoSchema.safeParse({
      versionMajor: 1,
    }).success).toBe(false)
  })
})

describe('FileInfoVideoStreamSchema', () => {
  test('accepts minimal stream', () => {
    expect(FileInfoVideoStreamSchema.safeParse({
      index: 0,
      codec: 'h264',
      isDefault: true,
      width: 1920,
      height: 1080,
    }).success).toBe(true)
  })

  test('accepts dolbyVision nested', () => {
    expect(FileInfoVideoStreamSchema.safeParse({
      index: 0,
      codec: 'hevc',
      isDefault: true,
      width: 3840,
      height: 2160,
      dolbyVision: {
        versionMajor: 1,
        versionMinor: 0,
        profile: 7,
        level: 6,
        rpuPresentFlag: 1,
        elPresentFlag: 0,
        blPresentFlag: 1,
        blSignalCompatibilityId: 1,
      },
    }).success).toBe(true)
  })
})

describe('FileInfoAudioStreamSchema', () => {
  test('accepts minimal stream', () => {
    expect(FileInfoAudioStreamSchema.safeParse({
      index: 1,
      codec: 'aac',
      isDefault: true,
      channels: 2,
      sampleRate: 48000,
    }).success).toBe(true)
  })

  test('accepts atmos and dtsX flags', () => {
    expect(FileInfoAudioStreamSchema.safeParse({
      index: 1,
      codec: 'truehd',
      isDefault: true,
      channels: 8,
      sampleRate: 48000,
      atmos: true,
      dtsX: false,
    }).success).toBe(true)
  })
})

describe('FileInfoSubtitleStreamSchema', () => {
  test('accepts subtitle stream', () => {
    expect(FileInfoSubtitleStreamSchema.safeParse({
      index: 2,
      codec: 'srt',
      isDefault: false,
      forced: false,
    }).success).toBe(true)
  })
})

describe('FileInfoSchema', () => {
  test('accepts full file info', () => {
    expect(FileInfoSchema.safeParse({
      format: 'matroska',
      duration: 7200,
      size: 4_000_000_000,
      bitrate: 4_400_000,
      videoStreams: [],
      audioStreams: [],
      subtitleStreams: [],
      tags: {
        encoder: 'x265',
      },
      chapterCount: 12,
    }).success).toBe(true)
  })

  test('rejects missing stream arrays', () => {
    expect(FileInfoSchema.safeParse({
      format: 'mp4',
      duration: 1,
      size: 1,
      bitrate: 1,
    }).success).toBe(false)
  })
})
