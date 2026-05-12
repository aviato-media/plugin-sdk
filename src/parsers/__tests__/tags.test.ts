import { describe, expect, test } from 'bun:test'

import { parseTags, stripTags } from '../tags.js'

describe('parseTags', () => {
  test('parses {key-value} syntax', () => {
    expect(parseTags('Movie Title {edition-Extended Cut}')).toEqual({
      edition: 'Extended Cut',
    })
  })

  test('parses {key:value} syntax', () => {
    expect(parseTags('Movie {imdb:tt1234567}')).toEqual({
      imdb: 'tt1234567',
    })
  })

  test('parses multiple tags', () => {
    expect(parseTags('Movie {imdb-tt1234567} {edition-Directors Cut}')).toEqual({
      imdb: 'tt1234567',
      edition: 'Directors Cut',
    })
  })

  test('returns empty object when no tags', () => {
    expect(parseTags('Movie Title (2020)')).toEqual({})
  })

  test('handles tags with spaces in values', () => {
    expect(parseTags('{edition-Extended Directors Cut}')).toEqual({
      edition: 'Extended Directors Cut',
    })
  })

  test('handles tags with colons in values', () => {
    expect(parseTags('{custom:some:value:here}')).toEqual({
      custom: 'some:value:here',
    })
  })

  test('handles mixed syntax', () => {
    expect(parseTags('Title {imdb-tt123} {tmdb:456}')).toEqual({
      imdb: 'tt123',
      tmdb: '456',
    })
  })

  test('handles empty string', () => {
    expect(parseTags('')).toEqual({})
  })

  test('ignores malformed tags', () => {
    expect(parseTags('Movie {novalue} {-nokey} {}')).toEqual({})
  })
})

describe('stripTags', () => {
  test('strips tags from name', () => {
    expect(stripTags('Movie {edition-Extended Cut} (2020)')).toBe('Movie (2020)')
  })

  test('returns original when no tags', () => {
    expect(stripTags('Movie Title')).toBe('Movie Title')
  })

  test('strips multiple tags', () => {
    expect(stripTags('{imdb-tt123} Movie {edition-DC}')).toBe('Movie')
  })
})
