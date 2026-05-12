import { z } from 'zod'

/** Valid media file types */
export const MediaFileTypeEnum = z.enum(['primary', 'extra', 'trailer', 'deleted-scene', 'behind-the-scenes', 'companion'])
export type MediaFileType = z.infer<typeof MediaFileTypeEnum>

/** A single path entry that defines which files to pick up and how to classify them */
export const LibraryPathEntrySchema = z.object({
  /** Media file type — defaults to 'primary' when not specified */
  type: MediaFileTypeEnum.optional(),
  /** Glob rules matched case-insensitively against the file's relative path within the bundle */
  rules: z.array(z.string()).optional(),
  /** File extensions to match — supports system aliases (e.g. "system:video") and raw extensions (e.g. ".pdf") */
  extensions: z.array(z.string()).min(1),
})

export type LibraryPathEntry = z.infer<typeof LibraryPathEntrySchema>

/** Identity-based grouping — files whose filenames produce the same named captures are grouped into one item */
export const BundlingIdentitySchema = z.object({
  /** Regex with named capture groups, matched against the filename (e.g. "S(?<season>\\d+)E(?<episode>\\d+)") */
  pattern: z.string(),
  /** Scope for identity matching — only match files within the same directory */
  scope: z.enum(['directory']).default('directory'),
})

/** Bundling strategy — how files are grouped into library items */
export const BundlingConfigSchema = z.object({
  /** How files are initially grouped: per-folder (movies) or per-file (tv/music) */
  strategy: z.enum(['per-folder', 'per-file']),
  /** Optional identity pattern — files with matching identity = same item (enables version grouping) */
  identity: BundlingIdentitySchema.optional(),
  /** Extensions that are always bundled per-file regardless of the base strategy (e.g. [".m4b"]) */
  perFileExtensions: z.array(z.string()).optional(),
})

export type BundlingIdentity = z.infer<typeof BundlingIdentitySchema>
export type BundlingConfig = z.infer<typeof BundlingConfigSchema>
