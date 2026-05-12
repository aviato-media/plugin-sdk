import { z } from 'zod'

// ── Renderer vocabulary ──────────────────────────────────────────────
//
// Shared between entity renderers (entityRenderers[type]) and item
// renderers (itemRenderer). Slots bind a region of a rendered surface to
// a metadata source; extras declare additional below-the-fold sections.
// Both vocabularies are universal — the same slot keys mean the same
// things on entity pages and item detail pages.

export const SlotValueSchema = z.union([
  z.object({
    field: z.string(),
    format: z.enum(['date', 'year', 'raw', 'duration']).optional(),
  }),
  z.object({
    fields: z.array(z.string()).min(1),
    format: z.enum(['date', 'year', 'raw', 'duration']).optional(),
  }),
  z.object({
    template: z.string(),
  }),
  z.object({
    value: z.string(),
  }),
])

export const AssetSlotSchema = z.object({
  prefer: z.array(z.string()).min(1),
})

export const LinksSlotSchema = z.object({
  include: z.array(z.enum(['canonicalIds', 'externalLinks'])).min(1),
})

/**
 * Numeric rating slot. Distinct from SlotValue because it must produce a
 * number for the star/score widget — SlotValue resolution coerces to string.
 */
export const RatingSlotSchema = z.object({
  field: z.string(),
  fallbackField: z.string().optional(),
})

/**
 * Parent context slot — renders a clickable link to a linked parent entity
 * above the item title. Used for "Show name" on TV episodes, "Album" on
 * music tracks, "Series" on audiobooks. The host walks `item.entities`
 * for the first link whose `role` matches; `entityType` further filters
 * when the role is ambiguous (e.g. some indexers tag with `'series'`).
 */
export const ParentTitleSlotSchema = z.object({
  entityRole: z.union([z.string(), z.array(z.string()).min(1)]),
  entityType: z.string().optional(),
})

/**
 * A single piece of a segmented subtitle line. Either a plain SlotValue
 * (rendered as text) or a `template` segment that becomes a clickable
 * entity link. The link target is resolved from the host's linked
 * entities by `entityRole`; an optional `queryParam` appends a query
 * string sourced from a metadata field's value (used to deep-link into
 * a specific season tab on the show entity page).
 *
 * Order matters: the link-segment arm must be tried first because
 * SlotValueSchema's `{ template }` variant would otherwise absorb a
 * `{ template, linkToEntity }` object and silently strip the link key.
 */
export const SubtitleSegmentSchema = z.union([
  z.object({
    template: z.string(),
    linkToEntity: z.object({
      entityRole: z.union([z.string(), z.array(z.string()).min(1)]),
      entityType: z.string().optional(),
      queryParam: z.object({
        name: z.string(),
        field: z.string(),
      }).optional(),
    }),
  }),
  SlotValueSchema,
])

export const SubtitleSlotSchema = z.union([
  SlotValueSchema,
  z.object({
    segments: z.array(SubtitleSegmentSchema).min(1),
    separator: z.string().optional(),
  }),
])

export const RendererSlotsSchema = z.object({
  title: SlotValueSchema.optional(),
  parentTitle: ParentTitleSlotSchema.optional(),
  subtitle: SubtitleSlotSchema.optional(),
  caption: SlotValueSchema.optional(),
  chips: SlotValueSchema.optional(),
  overview: SlotValueSchema.optional(),
  rating: RatingSlotSchema.optional(),
  poster: AssetSlotSchema.optional(),
  backdrop: AssetSlotSchema.optional(),
  links: LinksSlotSchema.optional(),
  itemTitle: SlotValueSchema.optional(),
  itemSubtitle: SlotValueSchema.optional(),
  itemDescription: z.union([SlotValueSchema, z.object({ show: z.literal(false) })]).optional(),
  itemThumbnail: AssetSlotSchema.optional(),
})

export const RendererExtraSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('kv-grid'),
    title: z.string().optional(),
    fields: z.array(z.string()).min(1),
  }),
  z.object({
    type: z.literal('chips'),
    title: z.string().optional(),
    field: z.string(),
  }),
  /**
   * Renders entities linked to the surface (item or entity) by `role`,
   * laid out as avatar cards. Used for cast on movies/TV, authors on
   * books, narrators on audiobooks, artists on music tracks.
   */
  z.object({
    type: z.literal('entity-cards'),
    title: z.string().optional(),
    role: z.string(),
    entityType: z.string(),
    layout: z.enum(['avatars', 'cards']).optional(),
    limit: z.number().int().positive().optional(),
  }),
])

export type SlotValue = z.infer<typeof SlotValueSchema>
export type AssetSlot = z.infer<typeof AssetSlotSchema>
export type LinksSlot = z.infer<typeof LinksSlotSchema>
export type RatingSlot = z.infer<typeof RatingSlotSchema>
export type ParentTitleSlot = z.infer<typeof ParentTitleSlotSchema>
export type SubtitleSegment = z.infer<typeof SubtitleSegmentSchema>
export type SubtitleSlot = z.infer<typeof SubtitleSlotSchema>
export type RendererSlots = z.infer<typeof RendererSlotsSchema>
export type RendererExtra = z.infer<typeof RendererExtraSchema>
