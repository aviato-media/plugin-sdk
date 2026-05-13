import { describe, expect, test } from 'bun:test'

import {
  AudioCodecSchema,
  AudioStreamInfoSchema,
  ContainerFormatSchema,
  HardwareAccelerationSchema,
  MediaProbeResultSchema,
  MediaStreamInfoSchema,
  SubtitleFormatSchema,
  SubtitleStreamInfoSchema,
  TranscodeProfileSchema,
  VideoCodecSchema,
  VideoStreamInfoSchema,
} from './media.js'

describe('codec enums', () => {
  test('VideoCodec accepts known values', () => {
    expect(VideoCodecSchema.safeParse('h264').success).toBe(true)
    expect(VideoCodecSchema.safeParse('av1').success).toBe(true)
    expect(VideoCodecSchema.safeParse('xyz').success).toBe(false)
  })

  test('AudioCodec', () => {
    expect(AudioCodecSchema.safeParse('aac').success).toBe(true)
    expect(AudioCodecSchema.safeParse('xyz').success).toBe(false)
  })

  test('SubtitleFormat', () => {
    expect(SubtitleFormatSchema.safeParse('srt').success).toBe(true)
    expect(SubtitleFormatSchema.safeParse('xyz').success).toBe(false)
  })

  test('ContainerFormat', () => {
    expect(ContainerFormatSchema.safeParse('mkv').success).toBe(true)
    expect(ContainerFormatSchema.safeParse('xyz').success).toBe(false)
  })

  test('HardwareAcceleration', () => {
    expect(HardwareAccelerationSchema.safeParse('vaapi').success).toBe(true)
    expect(HardwareAccelerationSchema.safeParse('cuda').success).toBe(false)
  })
})

describe('MediaStreamInfoSchema and extensions', () => {
  test('MediaStreamInfo accepts base shape', () => {
    expect(MediaStreamInfoSchema.safeParse({
      index: 0,
      codecType: 'video',
      codec: 'h264',
      isDefault: true,
    }).success).toBe(true)
  })

  test('VideoStreamInfo enforces codecType=video', () => {
    expect(VideoStreamInfoSchema.safeParse({
      index: 0,
      codecType: 'video',
      codec: 'h264',
      isDefault: true,
      width: 1920,
      height: 1080,
    }).success).toBe(true)
    expect(VideoStreamInfoSchema.safeParse({
      index: 0,
      codecType: 'audio',
      codec: 'h264',
      isDefault: true,
      width: 1,
      height: 1,
    }).success).toBe(false)
  })

  test('AudioStreamInfo enforces codecType=audio', () => {
    expect(AudioStreamInfoSchema.safeParse({
      index: 0,
      codecType: 'audio',
      codec: 'aac',
      isDefault: true,
      channels: 2,
      sampleRate: 48000,
    }).success).toBe(true)
  })

  test('SubtitleStreamInfo enforces codecType=subtitle', () => {
    expect(SubtitleStreamInfoSchema.safeParse({
      index: 0,
      codecType: 'subtitle',
      codec: 'srt',
      isDefault: false,
      forced: false,
    }).success).toBe(true)
  })
})

describe('MediaProbeResultSchema', () => {
  test('accepts probe result with empty streams', () => {
    expect(MediaProbeResultSchema.safeParse({
      format: 'matroska',
      duration: 0,
      size: 0,
      bitrate: 0,
      videoStreams: [],
      audioStreams: [],
      subtitleStreams: [],
    }).success).toBe(true)
  })
})

describe('TranscodeProfileSchema', () => {
  test('accepts minimal profile', () => {
    expect(TranscodeProfileSchema.safeParse({
      videoCodec: 'h264',
      audioCodec: 'aac',
      container: 'mp4',
      hwAccel: 'none',
    }).success).toBe(true)
  })
})
