import { z } from 'zod'

export const DolbyVisionInfoSchema = z.object({
  versionMajor: z.number(),
  versionMinor: z.number(),
  profile: z.number(),
  level: z.number(),
  rpuPresentFlag: z.number(),
  elPresentFlag: z.number(),
  blPresentFlag: z.number(),
  blSignalCompatibilityId: z.number(),
})

export type DolbyVisionInfo = z.infer<typeof DolbyVisionInfoSchema>

export const FileInfoVideoStreamSchema = z.object({
  index: z.number(),
  codec: z.string(),
  profile: z.string().optional(),
  language: z.string().optional(),
  title: z.string().optional(),
  isDefault: z.boolean(),
  width: z.number(),
  height: z.number(),
  bitrate: z.number().optional(),
  framerate: z.number().optional(),
  pixelFormat: z.string().optional(),
  colorTransfer: z.string().optional(),
  colorPrimaries: z.string().optional(),
  colorSpace: z.string().optional(),
  dolbyVision: DolbyVisionInfoSchema.optional(),
  stereo3dMode: z.string().optional(),
})

export const FileInfoAudioStreamSchema = z.object({
  index: z.number(),
  codec: z.string(),
  profile: z.string().optional(),
  language: z.string().optional(),
  title: z.string().optional(),
  isDefault: z.boolean(),
  channels: z.number(),
  sampleRate: z.number(),
  bitrate: z.number().optional(),
  bitDepth: z.number().optional(),
  atmos: z.boolean().optional(),
  dtsX: z.boolean().optional(),
})

export const FileInfoSubtitleStreamSchema = z.object({
  index: z.number(),
  codec: z.string(),
  profile: z.string().optional(),
  language: z.string().optional(),
  title: z.string().optional(),
  isDefault: z.boolean(),
  forced: z.boolean(),
})

export const FileInfoSchema = z.object({
  format: z.string(),
  duration: z.number(),
  size: z.number(),
  bitrate: z.number(),
  videoStreams: z.array(FileInfoVideoStreamSchema),
  audioStreams: z.array(FileInfoAudioStreamSchema),
  subtitleStreams: z.array(FileInfoSubtitleStreamSchema),
  tags: z.record(z.string(), z.string()).optional(),
  chapterCount: z.number().optional(),
})

export type FileInfo = z.infer<typeof FileInfoSchema>
export type FileInfoVideoStream = z.infer<typeof FileInfoVideoStreamSchema>
export type FileInfoAudioStream = z.infer<typeof FileInfoAudioStreamSchema>
export type FileInfoSubtitleStream = z.infer<typeof FileInfoSubtitleStreamSchema>
