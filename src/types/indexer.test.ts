import { describe, expect, test } from 'bun:test'

import {
  IndexOptionsSchema,
  IndexRequestSchema,
  IndexResultSchema,
  LibraryItemMetadataSchema,
  MatchDetailRequestSchema,
  SearchCandidateSchema,
  SearchRequestSchema,
  SearchResultSchema,
} from './indexer.js'

const discoveredFile = {
  uri: 'file:///x.mkv',
  filename: 'x.mkv',
  size: 1,
  modifiedAt: '2025-01-01',
}

const emptyBundle = {
  title: [],
  year: [],
  canonicalIds: [],
  artwork: [],
  fields: {},
}

describe('LibraryItemMetadataSchema', () => {
  test('accepts minimal', () => {
    expect(LibraryItemMetadataSchema.safeParse({
      title: 'X',
      fields: {},
    }).success).toBe(true)
  })

  test('accepts full', () => {
    expect(LibraryItemMetadataSchema.safeParse({
      title: 'X',
      fields: {
        runtime: 120,
      },
      canonicalIds: [{
        provider: 'tmdb',
        id: '1',
      }],
      entities: [],
      artwork: [],
    }).success).toBe(true)
  })
})

describe('IndexResultSchema', () => {
  test('accepts success result', () => {
    expect(IndexResultSchema.safeParse({
      success: true,
      metadata: {
        title: 'X',
        fields: {},
      },
    }).success).toBe(true)
  })

  test('accepts failure with retry hint', () => {
    expect(IndexResultSchema.safeParse({
      success: false,
      error: 'no match',
      retryable: true,
      warnings: ['fuzzy'],
    }).success).toBe(true)
  })
})

describe('IndexOptionsSchema', () => {
  test('accepts minimal options', () => {
    expect(IndexOptionsSchema.safeParse({
      libraryId: 'l',
      libraryType: 'movies',
    }).success).toBe(true)
  })

  test('accepts all options', () => {
    expect(IndexOptionsSchema.safeParse({
      libraryId: 'l',
      libraryType: 'movies',
      mediaType: 'movies',
      forceRefresh: true,
      certificationCountry: 'US',
    }).success).toBe(true)
  })
})

describe('IndexRequestSchema', () => {
  test('accepts full request', () => {
    expect(IndexRequestSchema.safeParse({
      file: discoveredFile,
      options: {
        libraryId: 'l',
        libraryType: 'movies',
      },
      metadata: emptyBundle,
    }).success).toBe(true)
  })
})

describe('SearchRequestSchema / SearchCandidateSchema / SearchResultSchema', () => {
  test('SearchRequest accepts minimal', () => {
    expect(SearchRequestSchema.safeParse({
      query: 'Inception',
      libraryType: 'movies',
    }).success).toBe(true)
  })

  test('SearchCandidate', () => {
    expect(SearchCandidateSchema.safeParse({
      title: 'X',
      canonicalIds: [{
        provider: 'tmdb',
        id: '1',
      }],
    }).success).toBe(true)
  })

  test('SearchResult', () => {
    expect(SearchResultSchema.safeParse({
      results: [],
    }).success).toBe(true)
  })
})

describe('MatchDetailRequestSchema', () => {
  test('accepts request', () => {
    expect(MatchDetailRequestSchema.safeParse({
      canonicalIds: [{
        provider: 'tmdb',
        id: '1',
      }],
      libraryType: 'movies',
      mediaType: 'movies',
      certificationCountry: 'US',
    }).success).toBe(true)
  })
})
