import { describe, expect, test } from 'bun:test'

import {
  BundleDeltaSchema,
  BundleSchema,
} from './pipeline.js'

describe('BundleSchema', () => {
  test('accepts minimal bundle (files only)', () => {
    const minimal = {
      files: {
        media: [
          {
            uri: 'file:///media/movie.mkv',
            path: '/media/movie.mkv',
            filename: 'movie.mkv',
            extension: '.mkv',
            size: 1024,
          },
        ],
        auxiliary: [],
      },
    }
    const result = BundleSchema.safeParse(minimal)
    expect(result.success).toBe(true)
  })

  test('accepts fully populated bundle', () => {
    const full = {
      files: {
        media: [
          {
            uri: 'file:///media/movie.mkv',
            path: '/media/movie.mkv',
            filename: 'movie.mkv',
            extension: '.mkv',
            size: 4_000_000_000,
          },
        ],
        auxiliary: [
          {
            path: '/media/movie.nfo',
            extension: '.nfo',
            sourcePlugin: 'nfo-parser',
          },
        ],
      },
      ids: {
        tmdb: {
          id: '12345',
          confidence: 0.95,
        },
        imdb: true,
      },
      metadata: {
        title: 'Pied Piper: The Middle-Out Story',
        originalTitle: 'Pied Piper',
        year: 2024,
        duration: 7200,
        genres: ['Drama', 'Comedy'],
        overview: 'A tale of middle-out compression and the Weissman Score.',
        rating: 9.8,
        weissmanScore: 2.89,
      },
      assets: [
        {
          type: 'poster',
          uri: 'https://example.com/poster.jpg',
          source: 'tmdb',
        },
        {
          type: 'backdrop',
          path: '/media/backdrop.jpg',
          source: 'local',
          mimeType: 'image/jpeg',
        },
      ],
      subtitles: [
        {
          type: 'external',
          language: 'en',
          format: 'srt',
          path: '/media/movie.en.srt',
          source: 'local',
        },
        {
          type: 'embedded',
          language: 'ja',
          format: 'ass',
          streamIndex: 2,
          source: 'ffprobe',
        },
      ],
      entities: [
        {
          role: 'actor',
          name: 'Richard Hendricks',
          status: 'complete',
          metadata: {
            character: 'Himself',
          },
          ids: {
            tmdb: {
              id: '999',
              confidence: 1.0,
            },
          },
          source: 'tmdb',
        },
      ],
    }
    const result = BundleSchema.safeParse(full)
    expect(result.success).toBe(true)
  })

  test('rejects bundle without files', () => {
    const noFiles = {
      ids: {
        tmdb: true,
      },
      metadata: {
        title: 'Not Hotdog',
      },
    }
    const result = BundleSchema.safeParse(noFiles)
    expect(result.success).toBe(false)
  })

  test('ids accepts true shorthand', () => {
    const bundle = {
      files: {
        media: [
          {
            uri: 'file:///media/movie.mkv',
            path: '/media/movie.mkv',
            filename: 'movie.mkv',
            extension: '.mkv',
            size: 1024,
          },
        ],
        auxiliary: [],
      },
      ids: {
        imdb: true,
        tvdb: true,
      },
    }
    const result = BundleSchema.safeParse(bundle)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.ids?.imdb).toBe(true)
    }
  })

  test('ids accepts object with confidence', () => {
    const bundle = {
      files: {
        media: [
          {
            uri: 'file:///media/movie.mkv',
            path: '/media/movie.mkv',
            filename: 'movie.mkv',
            extension: '.mkv',
            size: 1024,
          },
        ],
        auxiliary: [],
      },
      ids: {
        tmdb: {
          id: '550',
          confidence: 0.85,
        },
      },
    }
    const result = BundleSchema.safeParse(bundle)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.ids?.tmdb).toEqual({
        id: '550',
        confidence: 0.85,
      })
    }
  })
})

describe('BundleDeltaSchema', () => {
  test('accepts empty delta', () => {
    const result = BundleDeltaSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  test('accepts delta with only assets', () => {
    const delta = {
      assets: [
        {
          type: 'poster',
          uri: 'https://example.com/poster.jpg',
          source: 'tmdb',
        },
      ],
    }
    const result = BundleDeltaSchema.safeParse(delta)
    expect(result.success).toBe(true)
  })

  test('accepts delta with errors', () => {
    const delta = {
      errors: ['Bachmanity Insanity: plugin crashed', 'Timeout waiting for Hooli API'],
    }
    const result = BundleDeltaSchema.safeParse(delta)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.errors).toHaveLength(2)
    }
  })
})
