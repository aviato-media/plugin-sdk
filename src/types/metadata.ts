import { z } from 'zod'

import { ArtworkReferenceSchema, ExternalIdSchema } from './entity.js'

const ConfidenceSchema = z.enum(['confident', 'hint'])

export const MetadataContributionSchema = z.object({
  title: z
    .object({
      value: z.string(),
      confidence: ConfidenceSchema,
    })
    .optional(),
  year: z
    .object({
      value: z.number(),
      confidence: ConfidenceSchema,
    })
    .optional(),
  canonicalIds: z
    .array(
      z.object({
        value: ExternalIdSchema,
        confidence: ConfidenceSchema,
      }),
    )
    .optional(),
  artwork: z
    .array(
      z.object({
        value: ArtworkReferenceSchema,
        confidence: ConfidenceSchema,
      }),
    )
    .optional(),
  fields: z
    .record(
      z.string(),
      z.object({
        value: z.unknown(),
        confidence: ConfidenceSchema,
      }),
    )
    .optional(),
})

export const MetadataBundleSchema = z.object({
  title: z.array(
    z.object({
      value: z.string(),
      confidence: ConfidenceSchema,
      source: z.string(),
    }),
  ),
  year: z.array(
    z.object({
      value: z.number(),
      confidence: ConfidenceSchema,
      source: z.string(),
    }),
  ),
  canonicalIds: z.array(
    z.object({
      value: ExternalIdSchema,
      confidence: ConfidenceSchema,
      source: z.string(),
    }),
  ),
  artwork: z.array(
    z.object({
      value: ArtworkReferenceSchema,
      confidence: ConfidenceSchema,
      source: z.string(),
    }),
  ),
  fields: z.record(
    z.string(),
    z.array(
      z.object({
        value: z.unknown(),
        confidence: ConfidenceSchema,
        source: z.string(),
      }),
    ),
  ),
})

export type MetadataContribution = z.infer<typeof MetadataContributionSchema>
export type MetadataBundle = z.infer<typeof MetadataBundleSchema>
