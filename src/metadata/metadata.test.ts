import { describe, expect, test } from 'bun:test'

import type { MetadataBundle } from '../types/metadata.js'
import {
  getBundleField,
  getBundleValue,
  getConfidentCanonicalIds,
  mergeConfidentFields,
} from './index.js'

describe('getBundleValue', () => {
  test('prefers the confident entry', () => {
    expect(getBundleValue([
      {
        value: 'a',
        confidence: 'hint',
      },
      {
        value: 'b',
        confidence: 'confident',
      },
    ])).toBe('b')
  })

  test('falls back to the first entry when no confident is present', () => {
    expect(getBundleValue([
      {
        value: 'first',
        confidence: 'hint',
      },
      {
        value: 'second',
        confidence: 'hint',
      },
    ])).toBe('first')
  })

  test('returns undefined for empty list', () => {
    expect(getBundleValue([])).toBeUndefined()
  })
})

const baseBundle = (): MetadataBundle => ({
  title: [],
  year: [],
  canonicalIds: [],
  artwork: [],
  fields: {},
})

describe('getConfidentCanonicalIds', () => {
  test('filters to confident entries only', () => {
    const bundle = baseBundle()
    bundle.canonicalIds = [
      {
        value: {
          provider: 'tmdb',
          id: '1',
        },
        confidence: 'confident',
        source: 'tmdb',
      },
      {
        value: {
          provider: 'imdb',
          id: 'tt2',
        },
        confidence: 'hint',
        source: 'imdb',
      },
    ]
    expect(getConfidentCanonicalIds(bundle)).toEqual([
      {
        provider: 'tmdb',
        id: '1',
      },
    ])
  })
})

describe('mergeConfidentFields', () => {
  test('writes confident contributions into fields, leaving existing keys alone', () => {
    const bundle = baseBundle()
    bundle.fields = {
      runtime: [{
        value: 120,
        confidence: 'confident',
        source: 'tmdb',
      }],
      genre: [{
        value: 'unused',
        confidence: 'hint',
        source: 'tmdb',
      }],
      title: [{
        value: 'override-attempt',
        confidence: 'confident',
        source: 'tmdb',
      }],
    }
    const out: Record<string, unknown> = {
      title: 'kept',
    }
    mergeConfidentFields(bundle, out)
    expect(out).toEqual({
      title: 'kept',
      runtime: 120,
    })
  })
})

describe('getBundleField', () => {
  test('returns confident value when present', () => {
    const bundle = baseBundle()
    bundle.fields = {
      runtime: [
        {
          value: 90,
          confidence: 'hint',
          source: 'imdb',
        },
        {
          value: 120,
          confidence: 'confident',
          source: 'tmdb',
        },
      ],
    }
    expect(getBundleField<number>(bundle, 'runtime')).toBe(120)
  })

  test('falls back to first contribution when no confident', () => {
    const bundle = baseBundle()
    bundle.fields = {
      runtime: [{
        value: 90,
        confidence: 'hint',
        source: 'imdb',
      }],
    }
    expect(getBundleField<number>(bundle, 'runtime')).toBe(90)
  })

  test('returns undefined when the key is missing or empty', () => {
    const bundle = baseBundle()
    expect(getBundleField(bundle, 'missing')).toBeUndefined()
    bundle.fields = {
      empty: [],
    }
    expect(getBundleField(bundle, 'empty')).toBeUndefined()
  })
})
