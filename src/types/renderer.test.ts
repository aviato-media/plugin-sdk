import { describe, expect, test } from 'bun:test'

import {
  AssetSlotSchema,
  LinksSlotSchema,
  ParentTitleSlotSchema,
  RatingSlotSchema,
  RendererExtraSchema,
  RendererSlotsSchema,
  SlotValueSchema,
  SubtitleSegmentSchema,
  SubtitleSlotSchema,
} from './renderer.js'

describe('SlotValueSchema', () => {
  test('accepts each variant', () => {
    expect(SlotValueSchema.safeParse({
      field: 'title',
    }).success).toBe(true)
    expect(SlotValueSchema.safeParse({
      fields: ['a', 'b'],
      format: 'date',
    }).success).toBe(true)
    expect(SlotValueSchema.safeParse({
      template: '{x}',
    }).success).toBe(true)
    expect(SlotValueSchema.safeParse({
      value: 'hello',
    }).success).toBe(true)
  })

  test('rejects empty fields array', () => {
    expect(SlotValueSchema.safeParse({
      fields: [],
    }).success).toBe(false)
  })
})

describe('AssetSlotSchema / LinksSlotSchema / RatingSlotSchema / ParentTitleSlotSchema', () => {
  test('AssetSlot requires non-empty prefer', () => {
    expect(AssetSlotSchema.safeParse({
      prefer: ['hero'],
    }).success).toBe(true)
    expect(AssetSlotSchema.safeParse({
      prefer: [],
    }).success).toBe(false)
  })

  test('LinksSlot accepts canonicalIds and externalLinks', () => {
    expect(LinksSlotSchema.safeParse({
      include: ['canonicalIds', 'externalLinks'],
    }).success).toBe(true)
  })

  test('RatingSlot accepts field + fallback', () => {
    expect(RatingSlotSchema.safeParse({
      field: 'rating',
      fallbackField: 'avgRating',
    }).success).toBe(true)
  })

  test('ParentTitleSlot accepts string or array of roles', () => {
    expect(ParentTitleSlotSchema.safeParse({
      entityRole: 'show',
    }).success).toBe(true)
    expect(ParentTitleSlotSchema.safeParse({
      entityRole: ['show', 'series'],
      entityType: 'show',
    }).success).toBe(true)
  })
})

describe('SubtitleSegmentSchema / SubtitleSlotSchema', () => {
  test('SubtitleSegment link variant must be tried first', () => {
    const link = {
      template: 'S{season}',
      linkToEntity: {
        entityRole: 'show',
        queryParam: {
          name: 'season',
          field: 'season',
        },
      },
    }
    expect(SubtitleSegmentSchema.safeParse(link).success).toBe(true)
  })

  test('SubtitleSegment also accepts SlotValue', () => {
    expect(SubtitleSegmentSchema.safeParse({
      field: 'subtitle',
    }).success).toBe(true)
  })

  test('SubtitleSlot accepts segments form', () => {
    expect(SubtitleSlotSchema.safeParse({
      segments: [{
        field: 'subtitle',
      }],
      separator: ' · ',
    }).success).toBe(true)
  })
})

describe('RendererSlotsSchema', () => {
  test('accepts a fully populated slots object', () => {
    expect(RendererSlotsSchema.safeParse({
      title: {
        field: 'title',
      },
      parentTitle: {
        entityRole: 'show',
      },
      subtitle: {
        field: 'subtitle',
      },
      caption: {
        value: 'cap',
      },
      chips: {
        field: 'genres',
      },
      overview: {
        field: 'overview',
      },
      rating: {
        field: 'rating',
      },
      poster: {
        prefer: ['poster'],
      },
      backdrop: {
        prefer: ['backdrop'],
      },
      links: {
        include: ['canonicalIds'],
      },
      itemTitle: {
        field: 'title',
      },
      itemSubtitle: {
        field: 'subtitle',
      },
      itemDescription: {
        show: false,
      },
      itemThumbnail: {
        prefer: ['thumb'],
      },
    }).success).toBe(true)
  })
})

describe('RendererExtraSchema', () => {
  test('accepts kv-grid', () => {
    expect(RendererExtraSchema.safeParse({
      type: 'kv-grid',
      title: 'Info',
      fields: ['runtime'],
    }).success).toBe(true)
  })

  test('accepts chips', () => {
    expect(RendererExtraSchema.safeParse({
      type: 'chips',
      field: 'genres',
    }).success).toBe(true)
  })

  test('accepts entity-cards', () => {
    expect(RendererExtraSchema.safeParse({
      type: 'entity-cards',
      role: 'actor',
      entityType: 'person',
      layout: 'avatars',
      limit: 10,
    }).success).toBe(true)
  })

  test('rejects unknown extra type', () => {
    expect(RendererExtraSchema.safeParse({
      type: 'unknown',
    }).success).toBe(false)
  })
})
