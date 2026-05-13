import { describe, expect, test } from 'bun:test'

import {
  ArtworkCandidateSchema,
  ArtworkSearchRequestSchema,
  ArtworkSearchResultSchema,
} from './artwork-search.js'

describe('ArtworkSearchRequestSchema', () => {
  test('accepts minimal request', () => {
    expect(ArtworkSearchRequestSchema.safeParse({
      canonicalIds: [],
      mediaType: 'movies',
      title: 'Inception',
    }).success).toBe(true)
  })

  test('accepts full request with year, types, language', () => {
    expect(ArtworkSearchRequestSchema.safeParse({
      canonicalIds: [{
        provider: 'tmdb',
        id: '1',
      }],
      mediaType: 'movies',
      title: 'Inception',
      year: 2010,
      types: ['poster', 'backdrop'],
      language: 'en',
    }).success).toBe(true)
  })

  test('rejects unknown artwork type', () => {
    expect(ArtworkSearchRequestSchema.safeParse({
      canonicalIds: [],
      mediaType: 'movies',
      title: 'X',
      types: ['cover'],
    }).success).toBe(false)
  })
})

describe('ArtworkCandidateSchema', () => {
  test('accepts minimal candidate', () => {
    expect(ArtworkCandidateSchema.safeParse({
      type: 'poster',
      url: 'https://x',
    }).success).toBe(true)
  })

  test('accepts full candidate', () => {
    expect(ArtworkCandidateSchema.safeParse({
      type: 'backdrop',
      url: 'https://x',
      thumbnailUrl: 'https://x/thumb',
      language: 'en',
      width: 100,
      height: 200,
      voteAverage: 5.5,
      voteCount: 10,
      source: 'tmdb',
    }).success).toBe(true)
  })
})

describe('ArtworkSearchResultSchema', () => {
  test('accepts empty results', () => {
    expect(ArtworkSearchResultSchema.safeParse({
      results: [],
    }).success).toBe(true)
  })
})
