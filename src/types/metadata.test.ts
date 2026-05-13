import { describe, expect, test } from 'bun:test'

import {
  MetadataBundleSchema,
  MetadataContributionSchema,
} from './metadata.js'

describe('MetadataContributionSchema', () => {
  test('accepts empty object', () => {
    expect(MetadataContributionSchema.safeParse({}).success).toBe(true)
  })

  test('accepts full contribution', () => {
    expect(MetadataContributionSchema.safeParse({
      title: {
        value: 'X',
        confidence: 'confident',
      },
      year: {
        value: 2020,
        confidence: 'hint',
      },
      canonicalIds: [{
        value: {
          provider: 'tmdb',
          id: '1',
        },
        confidence: 'confident',
      }],
      artwork: [{
        value: {
          type: 'poster',
          url: 'https://x',
        },
        confidence: 'hint',
      }],
      fields: {
        runtime: {
          value: 120,
          confidence: 'confident',
        },
      },
    }).success).toBe(true)
  })

  test('rejects bad confidence value', () => {
    expect(MetadataContributionSchema.safeParse({
      title: {
        value: 'X',
        confidence: 'maybe',
      },
    }).success).toBe(false)
  })
})

describe('MetadataBundleSchema', () => {
  test('accepts empty bundle', () => {
    expect(MetadataBundleSchema.safeParse({
      title: [],
      year: [],
      canonicalIds: [],
      artwork: [],
      fields: {},
    }).success).toBe(true)
  })

  test('accepts populated bundle', () => {
    expect(MetadataBundleSchema.safeParse({
      title: [{
        value: 'X',
        confidence: 'confident',
        source: 'tmdb',
      }],
      year: [{
        value: 2020,
        confidence: 'hint',
        source: 'tmdb',
      }],
      canonicalIds: [{
        value: {
          provider: 'tmdb',
          id: '1',
        },
        confidence: 'confident',
        source: 'tmdb',
      }],
      artwork: [{
        value: {
          type: 'poster',
          url: 'https://x',
        },
        confidence: 'confident',
        source: 'tmdb',
      }],
      fields: {
        runtime: [{
          value: 120,
          confidence: 'confident',
          source: 'tmdb',
        }],
      },
    }).success).toBe(true)
  })
})
