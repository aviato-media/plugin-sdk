import { describe, expect, test } from 'bun:test'

import {
  isVideoFile,
  OpenWithOptionSchema,
  OpenWithPayloadSchema,
  parseUserAgent,
} from './open-with.js'

describe('isVideoFile', () => {
  test('matches video/* MIME types', () => {
    expect(isVideoFile({
      mimeType: 'video/x-matroska',
      extension: '',
    })).toBe(true)
  })

  test('matches common video extensions', () => {
    for (const ext of ['mp4', 'mkv', 'mov', 'webm', '.m4v']) {
      expect(isVideoFile({
        mimeType: null,
        extension: ext,
      })).toBe(true)
    }
  })

  test('rejects audio and document files', () => {
    expect(isVideoFile({
      mimeType: 'audio/mpeg',
      extension: 'mp3',
    })).toBe(false)
    expect(isVideoFile({
      mimeType: 'application/epub+zip',
      extension: 'epub',
    })).toBe(false)
  })

  test('is case-insensitive on extension', () => {
    expect(isVideoFile({
      mimeType: null,
      extension: 'MKV',
    })).toBe(true)
  })
})

describe('parseUserAgent', () => {
  test('iPhone → ios + mobile', () => {
    const r = parseUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15')
    expect(r.platform).toBe('ios')
    expect(r.isMobile).toBe(true)
    expect(r.isDesktop).toBe(false)
    expect(r.isTV).toBe(false)
  })

  test('iPad legacy → ios + tablet', () => {
    const r = parseUserAgent('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15')
    expect(r.platform).toBe('ios')
    expect(r.isTablet).toBe(true)
  })

  test('iPadOS 13+ desktop UA via Touch hint → ios + tablet', () => {
    const r = parseUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Touch')
    expect(r.platform).toBe('ios')
    expect(r.isTablet).toBe(true)
  })

  test('Apple TV → tvos + isTV', () => {
    const r = parseUserAgent('AppleTV6,2/11.1')
    expect(r.platform).toBe('tvos')
    expect(r.isTV).toBe(true)
    expect(r.isDesktop).toBe(false)
  })

  test('tvOS Safari UA', () => {
    const r = parseUserAgent('Mozilla/5.0 (TV; CPU OS 17_0 like Mac OS X) tvOS/17.0')
    expect(r.platform).toBe('tvos')
    expect(r.isTV).toBe(true)
  })

  test('Android phone → android + mobile + !TV', () => {
    const r = parseUserAgent('Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Mobile')
    expect(r.platform).toBe('android')
    expect(r.isMobile).toBe(true)
    expect(r.isTV).toBe(false)
  })

  test('Android TV → android + isTV + !mobile', () => {
    const r = parseUserAgent('Mozilla/5.0 (Linux; Android 13; SmartTV; Mibox4) Android TV')
    expect(r.platform).toBe('android')
    expect(r.isTV).toBe(true)
    expect(r.isMobile).toBe(false)
    expect(r.isTablet).toBe(false)
  })

  test('Tizen Smart-TV → unknown + isTV', () => {
    const r = parseUserAgent('Mozilla/5.0 (SMART-TV; Linux; Tizen 6.0) AppleWebKit/537.36')
    expect(r.isTV).toBe(true)
  })

  test('webOS LG TV → isTV', () => {
    const r = parseUserAgent('Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 Large Screen WebAppManager')
    expect(r.isTV).toBe(true)
  })

  test('macOS Safari → macos + isDesktop', () => {
    const r = parseUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3) AppleWebKit/605.1.15 Safari')
    expect(r.platform).toBe('macos')
    expect(r.isDesktop).toBe(true)
    expect(r.isMobile).toBe(false)
    expect(r.isTV).toBe(false)
  })

  test('Windows → windows + isDesktop', () => {
    const r = parseUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
    expect(r.platform).toBe('windows')
    expect(r.isDesktop).toBe(true)
  })

  test('Linux X11 → linux + isDesktop', () => {
    const r = parseUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36')
    expect(r.platform).toBe('linux')
    expect(r.isDesktop).toBe(true)
  })

  test('empty UA → unknown, no form factor flags set', () => {
    const r = parseUserAgent('')
    expect(r.platform).toBe('unknown')
    expect(r.raw).toBe('')
    expect(r.isDesktop).toBe(false)
    expect(r.isMobile).toBe(false)
    expect(r.isTablet).toBe(false)
    expect(r.isTV).toBe(false)
  })
})

describe('schema validation', () => {
  test('OpenWithOption accepts a minimal entry without pluginId', () => {
    const parsed = OpenWithOptionSchema.parse({
      id: 'vlc',
      label: 'VLC',
      url: 'vlc://example',
    })
    expect(parsed.pluginId).toBeUndefined()
  })

  test('OpenWithPayload accepts an empty subtitles + openWith arrays', () => {
    expect(() => OpenWithPayloadSchema.parse({
      itemId: 'i',
      item: {
        id: 'i',
        title: 't',
        libraryId: 'l',
      },
      file: {
        id: 'f',
        uri: 'file:///x',
        filename: 'x.mkv',
        extension: 'mkv',
        mimeType: null,
        fileInfo: null,
      },
      streamUrl: 'https://example/x',
      subtitles: [],
      userAgent: {
        raw: '',
        platform: 'unknown',
        isMobile: false,
        isTablet: false,
        isDesktop: false,
        isTV: false,
      },
      server: {
        baseUrl: 'https://example',
        externallyReachable: true,
      },
      openWith: [],
    })).not.toThrow()
  })
})
