import { describe, expect, test } from 'bun:test'

import type { LibraryPathEntry, MediaFileType } from '../../types/media-file-type.js'
import { classifyMediaFile, collectAllExtensions, compilePaths } from '../media-file-rules.js'

// ── Helpers ──────────────────────────────────────────────

function file (filename: string, relativePath?: string) {
  const ext = filename.includes('.') ? `.${filename.split('.').pop()}` : ''
  return {
    filename,
    relativePath: relativePath ?? filename,
    extension: ext,
  }
}

// ── Movie library rules (representative) ─────────────────

const moviePaths: LibraryPathEntry[] = [
  {
    extensions: ['system:video'],
  },
  {
    type: 'trailer',
    rules: ['*trailer*', '*trailers*/**/*', 'trailers/**/*'],
    extensions: ['system:video'],
  },
  {
    type: 'behind-the-scenes',
    rules: ['*behind?the?scenes*', '*behindthescenes*', 'behind?the?scenes/**/*', '*making?of*', '*bts*'],
    extensions: ['system:video'],
  },
  {
    type: 'deleted-scene',
    rules: ['*deleted?scene*', '*deletedscene*', 'deleted?scenes/**/*'],
    extensions: ['system:video'],
  },
  {
    type: 'extra',
    rules: ['extras/**/*', 'featurettes/**/*', 'other/**/*', '*featurette*', '*bonus*', '*interview*'],
    extensions: ['system:video'],
  },
  {
    type: 'companion',
    extensions: ['system:text'],
  },
] as LibraryPathEntry[]

const compiledMoviePaths = compilePaths(moviePaths)

// ── Core matching behaviour ──────────────────────────────

describe('classifyMediaFile', () => {
  describe('no rules (empty paths)', () => {
    test('returns primary for any file when no paths defined', () => {
      const result = classifyMediaFile(compilePaths([]), file('Movie.mkv'))
      expect(result.type).toBe('primary')
      expect(result.description).toBeUndefined()
    })
  })

  describe('primary files (default)', () => {
    test('standard movie file', () => {
      const result = classifyMediaFile(compiledMoviePaths, file('Inception.2010.1080p.mkv'))
      expect(result.type).toBe('primary')
      expect(result.description).toBeUndefined()
    })

    test('movie file in bundle root', () => {
      const result = classifyMediaFile(compiledMoviePaths, file('Spider-Man.Into.the.Spider-Verse.2018.1080p.WEB-DL.DD5.1.H264-FGT.mkv'))
      expect(result.type).toBe('primary')
    })

    test('movie file with release group subfolder path', () => {
      const result = classifyMediaFile(
        compiledMoviePaths,
        file('Spider-Man.Into.the.Spider-Verse.2018.1080p.mkv', 'Spider-Man.Into.the.Spider-Verse.2018.1080p.WEB-DL.DD5.1.H264-FGT/Spider-Man.Into.the.Spider-Verse.2018.1080p.mkv'),
      )
      expect(result.type).toBe('primary')
    })

    test('mp4 file is primary', () => {
      const result = classifyMediaFile(compiledMoviePaths, file('movie.mp4'))
      expect(result.type).toBe('primary')
    })
  })

  // ── Trailer detection ────────────────────────────────

  describe('trailer detection', () => {
    test('Trailer.mp4 (exact filename)', () => {
      const result = classifyMediaFile(compiledMoviePaths, file('Trailer.mp4'))
      expect(result.type).toBe('trailer')
      expect(result.description).toBe('Trailer')
    })

    test('trailer.mkv (lowercase)', () => {
      const result = classifyMediaFile(compiledMoviePaths, file('trailer.mkv'))
      expect(result.type).toBe('trailer')
    })

    test('TRAILER.MP4 (uppercase)', () => {
      const result = classifyMediaFile(compiledMoviePaths, file('TRAILER.MP4', 'TRAILER.MP4'))
      expect(result.type).toBe('trailer')
    })

    test('Trailer-1.mp4', () => {
      const result = classifyMediaFile(compiledMoviePaths, file('Trailer-1.mp4'))
      expect(result.type).toBe('trailer')
      expect(result.description).toBe('Trailer-1')
    })

    test('Trailer 2.mp4', () => {
      const result = classifyMediaFile(compiledMoviePaths, file('Trailer 2.mp4'))
      expect(result.type).toBe('trailer')
      expect(result.description).toBe('Trailer 2')
    })

    test('Movie-trailer.mkv', () => {
      const result = classifyMediaFile(compiledMoviePaths, file('Movie-trailer.mkv'))
      expect(result.type).toBe('trailer')
    })

    test('file inside Trailers/ subfolder', () => {
      const result = classifyMediaFile(
        compiledMoviePaths,
        file('Official Trailer.mp4', 'Trailers/Official Trailer.mp4'),
      )
      expect(result.type).toBe('trailer')
    })

    test('file inside trailers/ subfolder (lowercase)', () => {
      const result = classifyMediaFile(
        compiledMoviePaths,
        file('clip.mp4', 'trailers/clip.mp4'),
      )
      expect(result.type).toBe('trailer')
    })
  })

  // ── Behind the scenes detection ──────────────────────

  describe('behind-the-scenes detection', () => {
    test('Behind The Scenes.mkv', () => {
      const result = classifyMediaFile(compiledMoviePaths, file('Behind The Scenes.mkv'))
      expect(result.type).toBe('behind-the-scenes')
      expect(result.description).toBe('Behind The Scenes')
    })

    test('behind-the-scenes.mp4 (hyphenated)', () => {
      const result = classifyMediaFile(compiledMoviePaths, file('behind-the-scenes.mp4'))
      expect(result.type).toBe('behind-the-scenes')
    })

    test('Behind.The.Scenes.mkv (dots)', () => {
      const result = classifyMediaFile(compiledMoviePaths, file('Behind.The.Scenes.mkv'))
      expect(result.type).toBe('behind-the-scenes')
    })

    test('Making Of.mp4', () => {
      const result = classifyMediaFile(compiledMoviePaths, file('Making Of.mp4'))
      expect(result.type).toBe('behind-the-scenes')
    })

    test('making-of-the-movie.mkv', () => {
      const result = classifyMediaFile(compiledMoviePaths, file('making-of-the-movie.mkv'))
      expect(result.type).toBe('behind-the-scenes')
    })

    test('BTS Footage.mp4', () => {
      const result = classifyMediaFile(compiledMoviePaths, file('BTS Footage.mp4'))
      expect(result.type).toBe('behind-the-scenes')
    })

    test('file in Behind The Scenes/ subfolder', () => {
      const result = classifyMediaFile(
        compiledMoviePaths,
        file('stunts.mp4', 'Behind The Scenes/stunts.mp4'),
      )
      expect(result.type).toBe('behind-the-scenes')
    })

    test('file in behind-the-scenes/ subfolder', () => {
      const result = classifyMediaFile(
        compiledMoviePaths,
        file('interview.mp4', 'behind-the-scenes/interview.mp4'),
      )
      expect(result.type).toBe('behind-the-scenes')
    })
  })

  // ── Deleted scene detection ──────────────────────────

  describe('deleted-scene detection', () => {
    test('Deleted Scene.mkv', () => {
      const result = classifyMediaFile(compiledMoviePaths, file('Deleted Scene.mkv'))
      expect(result.type).toBe('deleted-scene')
      expect(result.description).toBe('Deleted Scene')
    })

    test('deleted-scene-1.mp4', () => {
      const result = classifyMediaFile(compiledMoviePaths, file('deleted-scene-1.mp4'))
      expect(result.type).toBe('deleted-scene')
    })

    test('Deleted Scenes.mkv (plural)', () => {
      const result = classifyMediaFile(compiledMoviePaths, file('Deleted Scenes.mkv'))
      expect(result.type).toBe('deleted-scene')
    })

    test('file in Deleted Scenes/ subfolder', () => {
      const result = classifyMediaFile(
        compiledMoviePaths,
        file('scene-01.mkv', 'Deleted Scenes/scene-01.mkv'),
      )
      expect(result.type).toBe('deleted-scene')
    })
  })

  // ── Extra detection ──────────────────────────────────

  describe('extra detection', () => {
    test('featurette-visual-effects.mkv', () => {
      const result = classifyMediaFile(compiledMoviePaths, file('featurette-visual-effects.mkv'))
      expect(result.type).toBe('extra')
    })

    test('Bonus Content.mp4', () => {
      const result = classifyMediaFile(compiledMoviePaths, file('Bonus Content.mp4'))
      expect(result.type).toBe('extra')
    })

    test('Interview with Director.mkv', () => {
      const result = classifyMediaFile(compiledMoviePaths, file('Interview with Director.mkv'))
      expect(result.type).toBe('extra')
    })

    test('file in Extras/ subfolder', () => {
      const result = classifyMediaFile(
        compiledMoviePaths,
        file('blooper-reel.mp4', 'Extras/blooper-reel.mp4'),
      )
      expect(result.type).toBe('extra')
    })

    test('file in Featurettes/ subfolder', () => {
      const result = classifyMediaFile(
        compiledMoviePaths,
        file('vfx-breakdown.mkv', 'Featurettes/vfx-breakdown.mkv'),
      )
      expect(result.type).toBe('extra')
    })

    test('file in Other/ subfolder', () => {
      const result = classifyMediaFile(
        compiledMoviePaths,
        file('promo.mp4', 'Other/promo.mp4'),
      )
      expect(result.type).toBe('extra')
    })
  })

  // ── Companion detection (extension-only) ─────────────

  describe('companion detection', () => {
    test('booklet.pdf', () => {
      const result = classifyMediaFile(compiledMoviePaths, file('booklet.pdf'))
      expect(result.type).toBe('companion')
      expect(result.description).toBe('booklet')
    })

    test('liner-notes.epub', () => {
      const result = classifyMediaFile(compiledMoviePaths, file('liner-notes.epub'))
      expect(result.type).toBe('companion')
    })

    test('readme.txt', () => {
      const result = classifyMediaFile(compiledMoviePaths, file('readme.txt'))
      expect(result.type).toBe('companion')
    })

    test('companion in subfolder', () => {
      const result = classifyMediaFile(
        compiledMoviePaths,
        file('notes.pdf', 'Extras/notes.pdf'),
      )
      // PDF matches companion by extension (ruleless entry), but only if no ruled entry matched first.
      // The Extras/ subfolder would match the "extra" rule, but .pdf is not in system:video extensions.
      // So it falls through to companion.
      expect(result.type).toBe('companion')
    })
  })

  // ── Matching algorithm behaviour ─────────────────────

  describe('matching algorithm', () => {
    test('first matching ruled entry wins', () => {
      const paths: LibraryPathEntry[] = [
        {
          extensions: ['system:video'],
        },
        {
          type: 'trailer',
          rules: ['*trailer*'],
          extensions: ['system:video'],
        },
        {
          type: 'extra',
          rules: ['*trailer*'],
          extensions: ['system:video'],
        },
      ] as LibraryPathEntry[]

      const result = classifyMediaFile(compilePaths(paths), file('trailer.mkv'))
      expect(result.type).toBe('trailer')
    })

    test('ruled entries are checked before ruleless entries', () => {
      // Even though the ruleless primary entry comes first in the array,
      // the ruled trailer entry should match first
      const paths: LibraryPathEntry[] = [
        {
          extensions: ['system:video'],
        },
        {
          type: 'trailer',
          rules: ['*trailer*'],
          extensions: ['system:video'],
        },
      ] as LibraryPathEntry[]

      const result = classifyMediaFile(compilePaths(paths), file('Trailer.mkv'))
      expect(result.type).toBe('trailer')
    })

    test('extension mismatch prevents rule match', () => {
      const paths: LibraryPathEntry[] = [
        {
          extensions: ['.mkv'],
        },
        {
          type: 'trailer',
          rules: ['*trailer*'],
          extensions: ['.mp4'],
        },
      ] as LibraryPathEntry[]

      // File is .mkv but trailer rule only matches .mp4
      const result = classifyMediaFile(compilePaths(paths), file('Trailer.mkv'))
      expect(result.type).toBe('primary')
    })

    test('invalid glob pattern is skipped gracefully', () => {
      const paths: LibraryPathEntry[] = [
        {
          extensions: ['system:video'],
        },
        {
          type: 'trailer',
          rules: ['[invalid'],
          extensions: ['system:video'],
        },
      ] as LibraryPathEntry[]

      const result = classifyMediaFile(compilePaths(paths), file('trailer.mkv'))
      // Invalid glob — should fall through to primary
      // (picomatch may still parse this, so we just verify no crash)
      expect(result.type).toBeDefined()
    })

    test('case insensitive matching', () => {
      const paths: LibraryPathEntry[] = [
        {
          extensions: ['system:video'],
        },
        {
          type: 'extra',
          rules: ['Extras/**/*'],
          extensions: ['system:video'],
        },
      ] as LibraryPathEntry[]

      const result = classifyMediaFile(compilePaths(paths), file('clip.mkv', 'extras/clip.mkv'))
      expect(result.type).toBe('extra')
    })

    test('no description for primary type', () => {
      const result = classifyMediaFile(compiledMoviePaths, file('movie.mkv'))
      expect(result.type).toBe('primary')
      expect(result.description).toBeUndefined()
    })

    test('description strips extension for non-primary', () => {
      const result = classifyMediaFile(compiledMoviePaths, file('Trailer.mp4'))
      expect(result.description).toBe('Trailer')
    })

    test('description handles filenames without extension', () => {
      // Edge case — shouldn't happen in practice but shouldn't crash
      const paths: LibraryPathEntry[] = [
        {
          type: 'trailer',
          rules: ['*trailer*'],
          extensions: [''],
        },
      ] as LibraryPathEntry[]
      const result = classifyMediaFile(compilePaths(paths), file('trailer', 'trailer'))
      // Extension is empty string, should handle gracefully
      expect(result.type).toBeDefined()
    })
  })

  // ── Real-world scenarios ─────────────────────────────

  describe('real-world scenarios', () => {
    test('Spider-Man bundle: primary file', () => {
      const result = classifyMediaFile(
        compiledMoviePaths,
        file(
          'Spider-Man.Into.the.Spider-Verse.2018.1080p.WEB-DL.DD5.1.H264-FGT.mkv',
          'Spider-Man.Into.the.Spider-Verse.2018.1080p.WEB-DL.DD5.1.H264-FGT.mkv',
        ),
      )
      expect(result.type).toBe('primary')
    })

    test('Spider-Man bundle: Trailer.mp4 at root', () => {
      const result = classifyMediaFile(
        compiledMoviePaths,
        file('Trailer.mp4', 'Trailer.mp4'),
      )
      expect(result.type).toBe('trailer')
    })

    test('Plex-style extras folder structure', () => {
      // Plex convention: Behind The Scenes/, Deleted Scenes/, Featurettes/, etc.
      const files: Array<{ f: ReturnType<typeof file>,
        expected: MediaFileType }> = [
        {
          f: file('making-of.mkv', 'Behind The Scenes/making-of.mkv'),
          expected: 'behind-the-scenes',
        },
        {
          f: file('scene-1.mkv', 'Deleted Scenes/scene-1.mkv'),
          expected: 'deleted-scene',
        },
        {
          f: file('vfx.mkv', 'Featurettes/vfx.mkv'),
          expected: 'extra',
        },
        {
          f: file('promo.mkv', 'Other/promo.mkv'),
          expected: 'extra',
        },
        {
          f: file('trailer.mkv', 'Trailers/trailer.mkv'),
          expected: 'trailer',
        },
      ]

      for (const { f, expected } of files) {
        const result = classifyMediaFile(compiledMoviePaths, f)
        expect(result.type).toBe(expected)
      }
    })

    test('Jellyfin-style naming conventions', () => {
      const files: Array<{ f: ReturnType<typeof file>,
        expected: MediaFileType }> = [
        {
          f: file('movie-trailer.mkv'),
          expected: 'trailer',
        },
        {
          f: file('movie-behindthescenes.mkv'),
          expected: 'behind-the-scenes',
        },
        {
          f: file('movie-deletedscene.mkv'),
          expected: 'deleted-scene',
        },
        {
          f: file('movie-featurette.mkv'),
          expected: 'extra',
        },
        {
          f: file('movie-interview.mkv'),
          expected: 'extra',
        },
      ]

      for (const { f, expected } of files) {
        const result = classifyMediaFile(compiledMoviePaths, f)
        expect(result.type).toBe(expected)
      }
    })
  })

  // ── Music library scenarios ──────────────────────────

  describe('music library', () => {
    const musicPaths: LibraryPathEntry[] = [
      {
        extensions: ['system:audio'],
      },
      {
        type: 'companion',
        extensions: ['.pdf', '.lrc', '.cue'],
      },
    ] as LibraryPathEntry[]

    test('audio file is primary', () => {
      const result = classifyMediaFile(compilePaths(musicPaths), file('01 - Track.flac'))
      expect(result.type).toBe('primary')
    })

    test('pdf liner notes are companion', () => {
      const result = classifyMediaFile(compilePaths(musicPaths), file('Digital Booklet.pdf'))
      expect(result.type).toBe('companion')
      expect(result.description).toBe('Digital Booklet')
    })

    test('cue sheet is companion', () => {
      const result = classifyMediaFile(compilePaths(musicPaths), file('album.cue'))
      expect(result.type).toBe('companion')
    })

    test('lyrics file is companion', () => {
      const result = classifyMediaFile(compilePaths(musicPaths), file('01 - Track.lrc'))
      expect(result.type).toBe('companion')
    })
  })

  // ── Photos library scenarios ─────────────────────────

  describe('photos library', () => {
    const photoPaths: LibraryPathEntry[] = [
      {
        extensions: ['system:image'],
      },
      {
        type: 'companion',
        extensions: ['.xmp'],
      },
    ] as LibraryPathEntry[]

    test('image file is primary', () => {
      const result = classifyMediaFile(compilePaths(photoPaths), file('photo.jpg'))
      expect(result.type).toBe('primary')
    })

    test('xmp sidecar is companion', () => {
      const result = classifyMediaFile(compilePaths(photoPaths), file('photo.xmp'))
      expect(result.type).toBe('companion')
    })
  })
})

// ── collectAllExtensions ──────────────────────────────────

describe('collectAllExtensions', () => {
  test('collects extensions from all path entries', () => {
    const paths: LibraryPathEntry[] = [
      {
        extensions: ['.mkv', '.mp4'],
      },
      {
        type: 'companion',
        extensions: ['.pdf'],
      },
    ] as LibraryPathEntry[]

    const exts = collectAllExtensions(paths)
    expect(exts).toContain('.mkv')
    expect(exts).toContain('.mp4')
    expect(exts).toContain('.pdf')
  })

  test('resolves system aliases', () => {
    const paths: LibraryPathEntry[] = [
      {
        extensions: ['system:video'],
      },
    ] as LibraryPathEntry[]

    const exts = collectAllExtensions(paths)
    expect(exts).toContain('.mkv')
    expect(exts).toContain('.mp4')
    expect(exts.length).toBeGreaterThan(5)
  })

  test('deduplicates extensions', () => {
    const paths: LibraryPathEntry[] = [
      {
        extensions: ['.mkv', '.mp4'],
      },
      {
        type: 'trailer',
        rules: ['*trailer*'],
        extensions: ['.mkv', '.mp4'],
      },
    ] as LibraryPathEntry[]

    const exts = collectAllExtensions(paths)
    const mkvCount = exts.filter(e => e === '.mkv').length
    expect(mkvCount).toBe(1)
  })

  test('handles mixed aliases and raw extensions', () => {
    const paths: LibraryPathEntry[] = [
      {
        extensions: ['system:video', '.pdf'],
      },
    ] as LibraryPathEntry[]

    const exts = collectAllExtensions(paths)
    expect(exts).toContain('.mkv')
    expect(exts).toContain('.pdf')
  })
})
