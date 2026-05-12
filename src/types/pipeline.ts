import { z } from 'zod'

import { FileInfoSchema } from './file-info.js'

export const IdValueSchema = z.union([
  z.literal(true),
  z.object({
    id: z.string(),
    confidence: z.number().min(0).max(1).optional(),
    url: z.string().optional(),
  }),
])

export const IdsSchema = z.record(z.string(), IdValueSchema)

export const BundleAuxiliaryFileSchema = z.object({
  path: z.string(),
  extension: z.string(),
  sourcePlugin: z.string(),
})

export const BundleMediaFileSchema = z.object({
  id: z.string().optional(),
  uri: z.string(),
  path: z.string(),
  filename: z.string(),
  extension: z.string(),
  size: z.number(),
  mimeType: z.string().optional(),
  modifiedAt: z.string().optional(),
  type: z.string().default('primary'),
  edition: z.string().optional(),
  partNumber: z.number().optional(),
  description: z.string().optional(),
  tags: z.record(z.string(), z.string()).optional(),
  fileInfo: FileInfoSchema.optional(),
  localPath: z.string().optional(),
})

export type BundleMediaFile = z.infer<typeof BundleMediaFileSchema>

export const BundleFilesSchema = z.object({
  media: z.array(BundleMediaFileSchema),
  auxiliary: z.array(BundleAuxiliaryFileSchema),
})

export const BundleAssetSchema = z.object({
  type: z.string(),
  uri: z.string().optional(),
  path: z.string().optional(),
  source: z.string(),
  mimeType: z.string().optional(),
  mediaFileId: z.string().optional(),
})

export const BundleSubtitleSchema = z.object({
  type: z.enum(['external', 'embedded']),
  language: z.string().optional(),
  format: z.string(),
  path: z.string().optional(),
  streamIndex: z.number().optional(),
  source: z.string(),
  mediaFileUri: z.string().optional(),
})

export const BundleEntitySchema = z.object({
  role: z.string(),
  name: z.string(),
  status: z.enum(['complete', 'pending']),
  metadata: z.record(z.string(), z.string()).optional(),
  ids: IdsSchema.optional(),
  source: z.string(),
})

/**
 * Bundle chapter — a logical division of a media file. For audio/video this
 * is seconds; for ebooks it is page numbers (1-indexed; fractional values
 * permitted for renderers that subdivide pages, e.g. EPUB CFI).
 *
 * `mediaFileUri` (or `mediaFileId`) targets a specific file in the bundle.
 * Plugins should set `mediaFileUri` since file IDs are not stable across
 * scans; the persistence layer resolves it to the current file id.
 */
export const BundleChapterSchema = z.object({
  mediaFileUri: z.string().optional(),
  mediaFileId: z.string().optional(),
  startTime: z.number(),
  endTime: z.number().nullable().optional(),
  title: z.string().nullable().optional(),
  role: z.enum(['intro', 'credits', 'chapter', 'scene']).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
})

export type BundleChapter = z.infer<typeof BundleChapterSchema>

export const BundleMetadataSchema = z.object({
  title: z.string().optional(),
  originalTitle: z.string().optional(),
  year: z.number().optional(),
  season: z.number().optional(),
  episode: z.number().optional(),
  duration: z.number().optional(),
  genres: z.array(z.string()).optional(),
  overview: z.string().optional(),
  rating: z.number().optional(),
}).catchall(z.unknown())

export const BundleSchema = z.object({
  files: BundleFilesSchema,
  tags: z.record(z.string(), z.string()).optional(),
  ids: IdsSchema.optional(),
  metadata: BundleMetadataSchema.optional(),
  assets: z.array(BundleAssetSchema).optional(),
  subtitles: z.array(BundleSubtitleSchema).optional(),
  entities: z.array(BundleEntitySchema).optional(),
  chapters: z.array(BundleChapterSchema).optional(),
})

export type Bundle = z.infer<typeof BundleSchema>
export type BundleAsset = z.infer<typeof BundleAssetSchema>
export type BundleMetadata = z.infer<typeof BundleMetadataSchema>

export const BundleMediaFileDeltaSchema = z.object({
  uri: z.string(),
  type: z.string().optional(),
  edition: z.string().optional(),
  partNumber: z.number().optional(),
  description: z.string().optional(),
  tags: z.record(z.string(), z.string()).optional(),
  fileInfo: FileInfoSchema.optional(),
})

export type BundleMediaFileDelta = z.infer<typeof BundleMediaFileDeltaSchema>

export const BundleDeltaSchema = z.object({
  tags: z.record(z.string(), z.string()).optional(),
  ids: IdsSchema.optional(),
  metadata: BundleMetadataSchema.partial().optional(),
  mediaFiles: z.array(BundleMediaFileDeltaSchema).optional(),
  assets: z.array(BundleAssetSchema).optional(),
  subtitles: z.array(BundleSubtitleSchema).optional(),
  entities: z.array(BundleEntitySchema).optional(),
  chapters: z.array(BundleChapterSchema).optional(),
  errors: z.array(z.string()).optional(),
})

export type BundleDelta = z.infer<typeof BundleDeltaSchema>

export const PipelineJobStatusSchema = z.enum(['pending', 'running', 'complete', 'error', 'cancelled'])
export type PipelineJobStatus = z.infer<typeof PipelineJobStatusSchema>

export const PipelineTaskStatusSchema = z.enum(['pending', 'running', 'success', 'error', 'skipped'])
export type PipelineTaskStatus = z.infer<typeof PipelineTaskStatusSchema>
