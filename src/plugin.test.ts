import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import { createPlugin } from './plugin.js'

type Method = (params: Record<string, unknown>) => unknown | Promise<unknown>

interface FakeProcess {
  stdout: string[]
  stderr: string[]
  feed: (chunk: string) => void
}

function suppressStdio (): FakeProcess {
  const stdoutChunks: string[] = []
  const stderrChunks: string[] = []
  const handlers: Array<(chunk: string) => void> = []

  const originalStdinOn = (process.stdin as any).on.bind(process.stdin)
  const originalStdinSetEncoding = (process.stdin as any).setEncoding.bind(process.stdin)
  const originalStdoutWrite = process.stdout.write.bind(process.stdout)
  const originalStderrWrite = process.stderr.write.bind(process.stderr)

  ;(process.stdin as any).setEncoding = () => process.stdin
  ;(process.stdin as any).on = (event: string, h: (chunk: string) => void) => {
    if (event === 'data') {
      handlers.push(h)
    }
    return process.stdin
  }
  ;(process.stdout.write as any) = (chunk: any) => {
    stdoutChunks.push(String(chunk))
    return true
  }
  ;(process.stderr.write as any) = (chunk: any) => {
    stderrChunks.push(String(chunk))
    return true
  }

  ;(suppressStdio as any).__restore = () => {
    ;(process.stdin as any).on = originalStdinOn
    ;(process.stdin as any).setEncoding = originalStdinSetEncoding
    ;(process.stdout.write as any) = originalStdoutWrite
    ;(process.stderr.write as any) = originalStderrWrite
  }

  return {
    stdout: stdoutChunks,
    stderr: stderrChunks,
    feed: (chunk) => {
      for (const h of handlers) {
        h(chunk)
      }
    },
  }
}

function getMethods (instance: ReturnType<typeof createPlugin>): Map<string, Method> {
  return (instance.client as any).methods
}

describe('createPlugin', () => {
  let proc: FakeProcess

  beforeEach(() => {
    proc = suppressStdio()
  })

  afterEach(() => {
    ;(suppressStdio as any).__restore?.()
  })

  test('signals ready on construction', () => {
    createPlugin({})
    const messages = proc.stdout.map(s => JSON.parse(s.trim()))
    expect(messages.find(m => m.method === 'ready')).toBeDefined()
  })

  test('registers filesystem methods including optional ones', async () => {
    const calls: string[] = []
    const instance = createPlugin({
      filesystem: {
        validate: async () => {
          calls.push('validate')
          return {
            valid: true,
          }
        },
        scan: async (config, _ext, emitters) => {
          calls.push('scan')
          emitters.emitFile({
            uri: 'file:///x',
            filename: 'x',
            size: 1,
            modifiedAt: '2025',
          })
          emitters.emitFileRemoved('file:///gone')
          emitters.emitScanComplete()
          return {
            totalFiles: 1,
            newFiles: 1,
            modifiedFiles: 0,
            removedFiles: 0,
            errors: [],
            durationMs: 0,
          }
        },
        watch: async () => {
          calls.push('watch')
        },
        unwatchLibrary: async () => {
          calls.push('unwatchLibrary')
        },
        unwatch: async () => {
          calls.push('unwatch')
        },
        getLocalPath: async (uri: string) => {
          calls.push(`getLocalPath:${uri}`)
          return '/local'
        },
      },
    })
    const methods = getMethods(instance)
    expect(methods.has('filesystem.validate')).toBe(true)
    expect(methods.has('filesystem.scan')).toBe(true)
    expect(methods.has('filesystem.watch')).toBe(true)
    expect(methods.has('filesystem.unwatchLibrary')).toBe(true)
    expect(methods.has('filesystem.unwatch')).toBe(true)
    expect(methods.has('filesystem.getLocalPath')).toBe(true)

    await methods.get('filesystem.validate')!({
      config: {},
    })
    await methods.get('filesystem.scan')!({
      libraryId: 'l',
      config: {},
      extensionMap: {
        primary: [],
        auxiliaries: {},
      },
    })
    await methods.get('filesystem.watch')!({
      libraryId: 'l',
      config: {},
      extensionMap: {
        primary: [],
        auxiliaries: {},
      },
    })
    await methods.get('filesystem.unwatchLibrary')!({
      libraryId: 'l',
    })
    await methods.get('filesystem.unwatch')!({})
    await methods.get('filesystem.getLocalPath')!({
      uri: 'file:///x',
    })
    expect(calls).toEqual([
      'validate',
      'scan',
      'watch',
      'unwatchLibrary',
      'unwatch',
      'getLocalPath:file:///x',
    ])

    const notifications = proc.stdout.map(s => JSON.parse(s.trim()))
    expect(notifications.find(n => n.method === 'filesystem.file')).toBeDefined()
    expect(notifications.find(n => n.method === 'filesystem.file.removed')).toBeDefined()
    expect(notifications.find(n => n.method === 'filesystem.scan.complete')).toBeDefined()
  })

  test('filesystem registers only required methods when optional ones are absent', () => {
    const instance = createPlugin({
      filesystem: {
        validate: async () => ({
          valid: true,
        }),
        scan: async () => ({
          totalFiles: 0,
          newFiles: 0,
          modifiedFiles: 0,
          removedFiles: 0,
          errors: [],
          durationMs: 0,
        }),
      },
    })
    const methods = getMethods(instance)
    expect(methods.has('filesystem.validate')).toBe(true)
    expect(methods.has('filesystem.scan')).toBe(true)
    expect(methods.has('filesystem.watch')).toBe(false)
    expect(methods.has('filesystem.unwatchLibrary')).toBe(false)
    expect(methods.has('filesystem.unwatch')).toBe(false)
    expect(methods.has('filesystem.getLocalPath')).toBe(false)
  })

  test('indexer registration with and without getEntityDetail', async () => {
    const instance = createPlugin({
      indexer: {
        supports: async () => true,
        index: async () => ({
          success: true,
        }),
        search: async () => ({
          results: [],
        }),
        getMatchDetail: async () => ({
          success: true,
        }),
        getEntityDetail: async () => ({
          success: true,
        }),
      },
    })
    const methods = getMethods(instance)
    expect(methods.has('indexer.supports')).toBe(true)
    expect(methods.has('indexer.index')).toBe(true)
    expect(methods.has('indexer.search')).toBe(true)
    expect(methods.has('indexer.getMatchDetail')).toBe(true)
    expect(methods.has('indexer.getEntityDetail')).toBe(true)

    expect(await methods.get('indexer.supports')!({
      file: {},
    })).toBe(true)
    await methods.get('indexer.index')!({
      file: {
        uri: 'x',
      },
    })
    await methods.get('indexer.search')!({
      query: 'q',
      libraryType: 'movies',
    })
    await methods.get('indexer.getMatchDetail')!({})
    await methods.get('indexer.getEntityDetail')!({})

    const inst2 = createPlugin({
      indexer: {
        supports: async () => true,
        index: async () => ({
          success: true,
        }),
        search: async () => ({
          results: [],
        }),
        getMatchDetail: async () => ({
          success: true,
        }),
      },
    })
    expect(getMethods(inst2).has('indexer.getEntityDetail')).toBe(false)
  })

  test('library registers and parses schema with LibrarySchemaSchema', async () => {
    const instance = createPlugin({
      library: {
        getSchema: async () => ({
          name: 'Movies',
          icon: 'film',
          itemSchema: {
            type: 'object',
            properties: {},
          },
          searchableFields: [],
          filterableFields: [],
        }),
        getSortOptions: async () => [],
        getFilterOptions: async () => [],
        getGroupingOptions: async () => [],
        getItemSummary: async () => ({
          title: 'X',
        }),
        getItemDetail: async () => ({
          title: 'X',
          fields: [],
        }),
      },
    })
    const methods = getMethods(instance)
    const schema = await methods.get('library.getSchema')!({})
    expect(schema).toMatchObject({
      name: 'Movies',
      icon: 'film',
    })
    expect(await methods.get('library.getSortOptions')!({})).toEqual([])
    expect(await methods.get('library.getFilterOptions')!({})).toEqual([])
    expect(await methods.get('library.getGroupingOptions')!({})).toEqual([])
    expect(await methods.get('library.getItemSummary')!({
      item: {},
    })).toEqual({
      title: 'X',
    })
    expect(await methods.get('library.getItemDetail')!({
      item: {},
    })).toEqual({
      title: 'X',
      fields: [],
    })
  })

  test('ui, media-scan, artwork-search registrations', async () => {
    const instance = createPlugin({
      ui: {
        getSchemas: async () => [],
      },
      'media-scan': {
        algorithmVersion: async () => ({
          algorithmVersion: '1',
        }),
        scanSingle: async () => ({
          fingerprints: [],
          chapters: [],
          skipped: [],
        }),
        scanBatch: async () => ({
          fingerprints: [],
          chapters: [],
          skipped: [],
        }),
      },
      'artwork-search': {
        search: async () => ({
          results: [],
        }),
      },
    })
    const methods = getMethods(instance)
    await methods.get('ui.getSchemas')!({})
    await methods.get('mediaScan.algorithmVersion')!({})
    await methods.get('mediaScan.scanSingle')!({})
    await methods.get('mediaScan.scanBatch')!({})
    await methods.get('artworkSearch.search')!({})
    expect(methods.has('ui.getSchemas')).toBe(true)
    expect(methods.has('mediaScan.algorithmVersion')).toBe(true)
    expect(methods.has('mediaScan.scanSingle')).toBe(true)
    expect(methods.has('mediaScan.scanBatch')).toBe(true)
    expect(methods.has('artworkSearch.search')).toBe(true)
  })

  test('exposes a typed host API wired to the client', () => {
    const instance = createPlugin({})
    expect(instance.host).toBeDefined()
    // The instance host is the same cached facade exposed on the client.
    expect(instance.host).toBe(instance.client.host)
    expect(typeof instance.host.accounts.get).toBe('function')
    expect(typeof instance.host.config.get).toBe('function')
    expect(typeof instance.host.onNotification).toBe('function')
  })

  test('unknown capability keys are ignored', () => {
    const instance = createPlugin({
      unknown: {} as any,
    })
    expect(instance.client).toBeDefined()
    expect(instance.events).toBeDefined()
    expect(instance.hooks).toBeDefined()
    expect(instance.views).toBeDefined()
  })

  test('a capability explicitly set to undefined is skipped (no crash)', () => {
    // Plugins commonly write `{ convert: enabled ? handlers : undefined }`.
    // Object.entries yields ['convert', undefined], so the loop must not run
    // the registrar — registerConvert dereferences handlers synchronously.
    const instance = createPlugin({
      convert: undefined,
    })
    const methods = getMethods(instance)
    expect(methods.has('convert.convert')).toBe(false)
    expect(methods.has('convert.getOptions')).toBe(false)
  })

  test('convert registers getOptions/convert and reportProgress emits a typed convert.progress', async () => {
    const instance = createPlugin({
      convert: {
        getOptions: async () => ({
          fields: [],
        }),
        convert: async (request, emitters) => {
          emitters.reportProgress(0.5, 'encoding video stream')
          emitters.reportProgress(null)
          return {
            outputPath: request.outputPath,
            mimeType: 'video/mp4',
          }
        },
      },
    })
    const methods = getMethods(instance)
    expect(methods.has('convert.getOptions')).toBe(true)
    expect(methods.has('convert.convert')).toBe(true)
    // cancel was not provided → not registered.
    expect(methods.has('convert.cancel')).toBe(false)

    await methods.get('convert.convert')!({
      inputPath: '/in.mkv',
      outputPath: '/out.mp4',
      mimeType: 'video/x-matroska',
      options: {},
      sessionId: 'sess-1',
    })

    const progress = proc.stdout
      .map(s => JSON.parse(s.trim()))
      .filter(n => n.method === 'convert.progress')
    expect(progress).toHaveLength(2)
    // SDK binds sessionId and routes through the host facade — the plugin
    // never hand-writes the method string or payload.
    expect(progress[0].params).toEqual({
      sessionId: 'sess-1',
      progress: 0.5,
      message: 'encoding video stream',
    })
    expect(progress[1].params).toEqual({
      sessionId: 'sess-1',
      progress: null,
    })
  })

  test('convert.cancel is registered only when the handler is provided', async () => {
    const cancelled: string[] = []
    const instance = createPlugin({
      convert: {
        getOptions: async () => ({
          fields: [],
        }),
        convert: async (request) => ({
          outputPath: request.outputPath,
          mimeType: 'video/mp4',
        }),
        cancel: async (request) => {
          cancelled.push(request.sessionId)
        },
      },
    })
    const methods = getMethods(instance)
    expect(methods.has('convert.cancel')).toBe(true)
    const result = await methods.get('convert.cancel')!({
      sessionId: 'sess-9',
    })
    expect(result).toBeNull()
    expect(cancelled).toEqual(['sess-9'])
  })

  test('cancel keeps its `this` for class-based handlers', async () => {
    const killed: string[] = []
    class Transcoder {
      readonly tag = 'transcoder'
      async getOptions () {
        return {
          fields: [],
        }
      }
      async convert (request: { outputPath: string }) {
        return {
          outputPath: request.outputPath,
          mimeType: 'video/mp4',
        }
      }
      async cancel (request: { sessionId: string }) {
        // Dereferencing `this` throws if the method was detached.
        killed.push(`${this.tag}:${request.sessionId}`)
      }
    }
    const instance = createPlugin({
      convert: new Transcoder(),
    })
    const methods = getMethods(instance)
    await methods.get('convert.cancel')!({
      sessionId: 'sess-2',
    })
    expect(killed).toEqual(['transcoder:sess-2'])
  })
})
