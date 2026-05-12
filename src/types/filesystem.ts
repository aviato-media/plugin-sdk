import { z } from 'zod'

import type { ExtensionMap } from './bundle.js'

export const DiscoveredFileSchema = z.object({
  uri: z.string(),
  filename: z.string(),
  size: z.number(),
  mimeType: z.string().optional(),
  modifiedAt: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const ScanResultSchema = z.object({
  totalFiles: z.number(),
  newFiles: z.number(),
  modifiedFiles: z.number(),
  removedFiles: z.number(),
  errors: z.array(z.string()),
  durationMs: z.number(),
})

export const FileChangeEventSchema = z.object({
  type: z.enum(['added', 'modified', 'removed']),
  file: DiscoveredFileSchema,
})

export const ValidationResultSchema = z.object({
  valid: z.boolean(),
  errors: z.array(z.string()).optional(),
})

export type DiscoveredFile = z.infer<typeof DiscoveredFileSchema>
export type ScanResult = z.infer<typeof ScanResultSchema>
export type FileChangeEvent = z.infer<typeof FileChangeEventSchema>
export type ValidationResult = z.infer<typeof ValidationResultSchema>

// File-level notification params (replaces bundle-level)
export const FileNotificationSchema = z.object({
  libraryId: z.string(),
  uri: z.string(),
  filename: z.string(),
  size: z.number(),
  mimeType: z.string().optional(),
  modifiedAt: z.string(),
})

export const FileRemovedNotificationSchema = z.object({
  libraryId: z.string(),
  uri: z.string(),
})

export const ScanCompleteNotificationSchema = z.object({
  libraryId: z.string(),
})

export type FileNotification = z.infer<typeof FileNotificationSchema>
export type FileRemovedNotification = z.infer<typeof FileRemovedNotificationSchema>
export type ScanCompleteNotification = z.infer<typeof ScanCompleteNotificationSchema>

export interface FilesystemMethods {
  validate: (params: { config: Record<string, unknown> }) => ValidationResult
  scan: (params: { config: Record<string, unknown>,
    extensionMap: ExtensionMap }) => ScanResult
  watch: (params: { config: Record<string, unknown>,
    extensionMap: ExtensionMap,
    libraryId: string }) => void
  unwatchLibrary: (params: { libraryId: string }) => void
  unwatch: () => void
  getLocalPath: (params: { uri: string }) => string
}
