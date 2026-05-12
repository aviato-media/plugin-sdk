import { z } from 'zod'

import { ArtworkReferenceSchema, ExternalIdSchema } from './entity.js'

/**
 * Request shape for the `artworkSearch.search` JSON-RPC method.
 *
 * The server fans out the same request to every plugin that declares the
 * `artwork-search` capability and aggregates the responses for the picker
 * UI. Plugins are expected to filter `canonicalIds` to providers they
 * recognize and use `title`/`year` as a fuzzy fallback when no recognized
 * id is present.
 */
export const ArtworkSearchRequestSchema = z.object({
  /** External ids the entity/item is currently matched against. */
  canonicalIds: z.array(ExternalIdSchema),
  /** mediaType slug from the library declaration (e.g. `movies`, `tv`). */
  mediaType: z.string(),
  /** Display title — included so providers without a recognized id can do a fuzzy search. */
  title: z.string(),
  /** Release year, when known. */
  year: z.number().optional(),
  /** Restrict the response to specific artwork types — defaults to all when omitted. */
  types: z.array(ArtworkReferenceSchema.shape.type).optional(),
  /** BCP-47 language preference (e.g. `en`, `ja`). Plugins may treat as advisory. */
  language: z.string().optional(),
})

export type ArtworkSearchRequest = z.infer<typeof ArtworkSearchRequestSchema>

/**
 * One candidate image returned by an artwork-search plugin. The server
 * stamps `source` with the responding plugin's id when the plugin omits
 * it, so plugins don't need to repeat their own id in every row.
 */
export const ArtworkCandidateSchema = z.object({
  type: ArtworkReferenceSchema.shape.type,
  url: z.string(),
  /** Optional smaller preview URL — used by the picker to keep the grid lightweight. */
  thumbnailUrl: z.string().optional(),
  language: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  /** Vote/rating signals from the upstream provider, if any. */
  voteAverage: z.number().optional(),
  voteCount: z.number().optional(),
  /** Plugin id that produced this row. Filled in server-side when omitted. */
  source: z.string().optional(),
})

export type ArtworkCandidate = z.infer<typeof ArtworkCandidateSchema>

export const ArtworkSearchResultSchema = z.object({
  results: z.array(ArtworkCandidateSchema),
})

export type ArtworkSearchResult = z.infer<typeof ArtworkSearchResultSchema>
