import { z } from 'zod'

import { DiscoveredFileSchema } from './filesystem.js'

export const ExtensionMapEntrySchema = z.object({
  extensions: z.array(z.string()),
  patterns: z.array(z.string()).optional(),
})

export const ExtensionMapSchema = z.object({
  primary: z.array(z.string()),
  auxiliaries: z.record(z.string(), ExtensionMapEntrySchema).default({}),
})

export const DiscoveredBundleSchema = z.object({
  uri: z.string(),
  mediaFiles: z.array(DiscoveredFileSchema),
  auxiliaries: z.record(z.string(), z.array(DiscoveredFileSchema)),
})

export type ExtensionMapEntry = z.infer<typeof ExtensionMapEntrySchema>
export type ExtensionMap = z.infer<typeof ExtensionMapSchema>
export type DiscoveredBundle = z.infer<typeof DiscoveredBundleSchema>
