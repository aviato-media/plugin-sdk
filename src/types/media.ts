import { z } from 'zod'

export const VideoCodecSchema = z.enum(['h264', 'h265', 'vp9', 'av1', 'mpeg4', 'mpeg2', 'unknown'])
export const AudioCodecSchema = z.enum(['aac', 'ac3', 'eac3', 'flac', 'mp3', 'opus', 'vorbis', 'dts', 'unknown'])
export const SubtitleFormatSchema = z.enum(['srt', 'ass', 'vtt', 'pgs', 'dvdsub', 'unknown'])
export const ContainerFormatSchema = z.enum(['mp4', 'mkv', 'avi', 'webm', 'mov', 'ts', 'flv', 'unknown'])
export const HardwareAccelerationSchema = z.enum(['none', 'vaapi', 'nvenc', 'qsv'])

export const MediaStreamInfoSchema = z.object({
  index: z.number(),
  codecType: z.enum(['video', 'audio', 'subtitle']),
  codec: z.string(),
  profile: z.string().optional(),
  language: z.string().optional(),
  title: z.string().optional(),
  isDefault: z.boolean(),
})

export const VideoStreamInfoSchema = MediaStreamInfoSchema.extend({
  codecType: z.literal('video'),
  width: z.number(),
  height: z.number(),
  bitrate: z.number().optional(),
  framerate: z.number().optional(),
  pixelFormat: z.string().optional(),
})

export const AudioStreamInfoSchema = MediaStreamInfoSchema.extend({
  codecType: z.literal('audio'),
  channels: z.number(),
  sampleRate: z.number(),
  bitrate: z.number().optional(),
})

export const SubtitleStreamInfoSchema = MediaStreamInfoSchema.extend({
  codecType: z.literal('subtitle'),
  forced: z.boolean(),
})

export const MediaProbeResultSchema = z.object({
  format: z.string(),
  duration: z.number(),
  size: z.number(),
  bitrate: z.number(),
  videoStreams: z.array(VideoStreamInfoSchema),
  audioStreams: z.array(AudioStreamInfoSchema),
  subtitleStreams: z.array(SubtitleStreamInfoSchema),
})

export const TranscodeProfileSchema = z.object({
  videoCodec: z.string(),
  audioCodec: z.string(),
  container: z.string(),
  videoBitrate: z.number().optional(),
  audioBitrate: z.number().optional(),
  audioChannels: z.number().optional(),
  maxWidth: z.number().optional(),
  maxHeight: z.number().optional(),
  hwAccel: HardwareAccelerationSchema,
})

export type VideoCodec = z.infer<typeof VideoCodecSchema>
export type AudioCodec = z.infer<typeof AudioCodecSchema>
export type SubtitleFormat = z.infer<typeof SubtitleFormatSchema>
export type ContainerFormat = z.infer<typeof ContainerFormatSchema>
export type HardwareAcceleration = z.infer<typeof HardwareAccelerationSchema>
export type MediaStreamInfo = z.infer<typeof MediaStreamInfoSchema>
export type VideoStreamInfo = z.infer<typeof VideoStreamInfoSchema>
export type AudioStreamInfo = z.infer<typeof AudioStreamInfoSchema>
export type SubtitleStreamInfo = z.infer<typeof SubtitleStreamInfoSchema>
export type MediaProbeResult = z.infer<typeof MediaProbeResultSchema>
export type TranscodeProfile = z.infer<typeof TranscodeProfileSchema>
