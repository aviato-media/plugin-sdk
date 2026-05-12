import { z } from 'zod'

export const AspectRatioSchema = z.enum(['square', 'portrait', 'landscape'])

export const ArtworkReferenceSchema = z.object({
  type: z.enum(['poster', 'backdrop', 'thumbnail', 'banner', 'logo']),
  url: z.string(),
  aspect: AspectRatioSchema.optional(),
  width: z.number().optional(),
  height: z.number().optional(),
})

export const ExternalIdSchema = z.object({
  provider: z.string(),
  id: z.string(),
  url: z.string().optional(),
})

export const ExternalLinkSchema = z.object({
  label: z.string(),
  url: z.string(),
})

export type AspectRatio = z.infer<typeof AspectRatioSchema>
export type ArtworkReference = z.infer<typeof ArtworkReferenceSchema>
export type ExternalId = z.infer<typeof ExternalIdSchema>
export type ExternalLink = z.infer<typeof ExternalLinkSchema>

export type EntityReference = {
  entityType: string
  name: string
  role: string
  complete: boolean
  imageUrl?: string
  searchTerms?: string
  externalIds?: ExternalId[]
  metadata?: Record<string, unknown>
  linkMetadata?: Record<string, unknown>
  sortOrder?: number
  artwork?: ArtworkReference[]
  externalLinks?: ExternalLink[]
  parentEntities?: EntityReference[]
}

export const EntityReferenceSchema: z.ZodType<EntityReference> = z.lazy(() =>
  z.object({
    entityType: z.string(),
    name: z.string(),
    role: z.string(),
    complete: z.boolean().default(false),
    imageUrl: z.string().optional(),
    searchTerms: z.string().optional(),
    externalIds: z.array(ExternalIdSchema).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    linkMetadata: z.record(z.string(), z.unknown()).optional(),
    sortOrder: z.number().optional(),
    artwork: z.array(ArtworkReferenceSchema).optional(),
    externalLinks: z.array(ExternalLinkSchema).optional(),
    parentEntities: z.array(EntityReferenceSchema).optional(),
  }),
)

export const EntityDetailParentSchema = z.object({
  entityType: z.string(),
  name: z.string(),
  externalIds: z.array(ExternalIdSchema).optional(),
})

export const EntityDetailRequestSchema = z.object({
  entityType: z.string(),
  name: z.string(),
  externalIds: z.array(ExternalIdSchema).optional(),
  parents: z.array(EntityDetailParentSchema).optional(),
})

export const EntityDetailResultSchema = z.object({
  success: z.boolean(),
  entity: EntityReferenceSchema.optional(),
  error: z.string().optional(),
  retryable: z.boolean().optional(),
  unsupported: z.boolean().optional(),
})

export type EntityDetailParent = z.infer<typeof EntityDetailParentSchema>
export type EntityDetailRequest = z.infer<typeof EntityDetailRequestSchema>
export type EntityDetailResult = z.infer<typeof EntityDetailResultSchema>
