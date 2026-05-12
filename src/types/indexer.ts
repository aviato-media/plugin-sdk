import { z } from 'zod'

import type { EntityDetailRequest, EntityDetailResult } from './entity.js'
import { ArtworkReferenceSchema, EntityReferenceSchema, ExternalIdSchema } from './entity.js'
import type { DiscoveredFile } from './filesystem.js'
import { DiscoveredFileSchema } from './filesystem.js'
import { MetadataBundleSchema } from './metadata.js'

export const LibraryItemMetadataSchema = z.object({
  title: z.string(),
  fields: z.record(z.string(), z.unknown()),
  canonicalIds: z.array(ExternalIdSchema).optional(),
  entities: z.array(EntityReferenceSchema).optional(),
  artwork: z.array(ArtworkReferenceSchema).optional(),
})

export const IndexResultSchema = z.object({
  success: z.boolean(),
  metadata: LibraryItemMetadataSchema.optional(),
  warnings: z.array(z.string()).optional(),
  error: z.string().optional(),
  retryable: z.boolean().optional(),
})

export const IndexOptionsSchema = z.object({
  libraryId: z.string(),
  libraryType: z.string(),
  /** Resolved media type from the library plugin manifest (e.g. "movies", "tv", "music") */
  mediaType: z.string().optional(),
  forceRefresh: z.boolean().optional(),
  /** ISO 3166-1 alpha-2 country code for preferred content certification system (e.g. "US", "GB") */
  certificationCountry: z.string().optional(),
})

export const IndexRequestSchema = z.object({
  file: DiscoveredFileSchema,
  options: IndexOptionsSchema,
  metadata: MetadataBundleSchema,
})

export const SearchRequestSchema = z.object({
  query: z.string(),
  year: z.number().optional(),
  libraryType: z.string(),
  mediaType: z.string().optional(),
})

export const SearchCandidateSchema = z.object({
  title: z.string(),
  year: z.number().optional(),
  overview: z.string().optional(),
  imageUrl: z.string().optional(),
  canonicalIds: z.array(ExternalIdSchema),
  confidence: z.number().optional(),
})

export const SearchResultSchema = z.object({
  results: z.array(SearchCandidateSchema),
})

export const MatchDetailRequestSchema = z.object({
  canonicalIds: z.array(ExternalIdSchema),
  libraryType: z.string(),
  mediaType: z.string().optional(),
  /** ISO 3166-1 alpha-2 country code for preferred content certification system */
  certificationCountry: z.string().optional(),
})

export type LibraryItemMetadata = z.infer<typeof LibraryItemMetadataSchema>
export type IndexResult = z.infer<typeof IndexResultSchema>
export type IndexOptions = z.infer<typeof IndexOptionsSchema>
export type IndexRequest = z.infer<typeof IndexRequestSchema>
export type SearchRequest = z.infer<typeof SearchRequestSchema>
export type SearchCandidate = z.infer<typeof SearchCandidateSchema>
export type SearchResult = z.infer<typeof SearchResultSchema>
export type MatchDetailRequest = z.infer<typeof MatchDetailRequestSchema>

export interface IndexerMethods {
  supports: (params: { file: DiscoveredFile }) => boolean
  index: (request: IndexRequest) => IndexResult
  search: (params: SearchRequest) => SearchResult
  getMatchDetail: (params: MatchDetailRequest) => IndexResult
  getEntityDetail?: (params: EntityDetailRequest) => EntityDetailResult
}
