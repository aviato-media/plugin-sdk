import { describe, expect, test } from 'bun:test'

import {
  ArtworkReferenceSchema,
  AspectRatioSchema,
  EntityDetailParentSchema,
  EntityDetailRequestSchema,
  EntityDetailResultSchema,
  EntityReferenceSchema,
  ExternalIdSchema,
  ExternalLinkSchema,
} from './entity.js'

describe('AspectRatioSchema', () => {
  test('accepts known values', () => {
    expect(AspectRatioSchema.parse('square')).toBe('square')
    expect(AspectRatioSchema.parse('portrait')).toBe('portrait')
    expect(AspectRatioSchema.parse('landscape')).toBe('landscape')
  })

  test('rejects unknown value', () => {
    expect(AspectRatioSchema.safeParse('wide').success).toBe(false)
  })
})

describe('ArtworkReferenceSchema', () => {
  test('accepts minimal reference', () => {
    expect(ArtworkReferenceSchema.safeParse({
      type: 'poster',
      url: 'https://x/p.jpg',
    }).success).toBe(true)
  })

  test('accepts full reference', () => {
    expect(ArtworkReferenceSchema.safeParse({
      type: 'backdrop',
      url: 'https://x/b.jpg',
      aspect: 'landscape',
      width: 1920,
      height: 1080,
    }).success).toBe(true)
  })

  test('rejects bad type', () => {
    expect(ArtworkReferenceSchema.safeParse({
      type: 'cover',
      url: 'x',
    }).success).toBe(false)
  })
})

describe('ExternalIdSchema / ExternalLinkSchema', () => {
  test('ExternalId accepts minimal value', () => {
    expect(ExternalIdSchema.safeParse({
      provider: 'tmdb',
      id: '550',
    }).success).toBe(true)
  })

  test('ExternalId accepts url', () => {
    expect(ExternalIdSchema.safeParse({
      provider: 'tmdb',
      id: '550',
      url: 'https://www.themoviedb.org/movie/550',
    }).success).toBe(true)
  })

  test('ExternalLink requires label and url', () => {
    expect(ExternalLinkSchema.safeParse({
      label: 'IMDB',
      url: 'https://imdb.com',
    }).success).toBe(true)
    expect(ExternalLinkSchema.safeParse({
      label: 'IMDB',
    }).success).toBe(false)
  })
})

describe('EntityReferenceSchema', () => {
  test('accepts a basic entity', () => {
    const result = EntityReferenceSchema.safeParse({
      entityType: 'person',
      name: 'Brad Pitt',
      role: 'actor',
      complete: true,
    })
    expect(result.success).toBe(true)
  })

  test('defaults complete to false', () => {
    const parsed = EntityReferenceSchema.parse({
      entityType: 'person',
      name: 'Brad Pitt',
      role: 'actor',
    })
    expect(parsed.complete).toBe(false)
  })

  test('accepts nested parentEntities', () => {
    const result = EntityReferenceSchema.safeParse({
      entityType: 'episode',
      name: 'Pilot',
      role: 'episode',
      parentEntities: [{
        entityType: 'show',
        name: 'Show',
        role: 'show',
      }],
    })
    expect(result.success).toBe(true)
  })
})

describe('EntityDetail schemas', () => {
  test('EntityDetailParent', () => {
    expect(EntityDetailParentSchema.safeParse({
      entityType: 'show',
      name: 'Show',
    }).success).toBe(true)
  })

  test('EntityDetailRequest', () => {
    expect(EntityDetailRequestSchema.safeParse({
      entityType: 'show',
      name: 'Show',
      externalIds: [{
        provider: 'tmdb',
        id: '1',
      }],
      parents: [{
        entityType: 'network',
        name: 'HBO',
      }],
    }).success).toBe(true)
  })

  test('EntityDetailResult success and failure', () => {
    expect(EntityDetailResultSchema.safeParse({
      success: true,
    }).success).toBe(true)
    expect(EntityDetailResultSchema.safeParse({
      success: false,
      error: 'boom',
      retryable: true,
      unsupported: false,
    }).success).toBe(true)
  })
})
