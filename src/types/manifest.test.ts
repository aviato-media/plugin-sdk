import { describe, expect, it } from 'bun:test'

import { EngineSchema, NetworkPolicySchema } from './engine.js'
import { getDeclaredMediaTypes, getMediaTypeConfig, PluginManifestSchema } from './manifest.js'

describe('PluginManifestSchema', () => {
  const baseManifest = {
    id: 'test-plugin',
    name: 'Test Plugin',
    version: '1.0.0',
    description: 'A test plugin',
    author: 'Aviato',
    license: 'MIT',
    engine: 'bun' as const,
    entry: 'src/index.ts',
    aviato: {
      minVersion: '0.1.0',
    },
    capabilities: ['library'],
  }

  it('accepts a full valid manifest', () => {
    const result = PluginManifestSchema.safeParse({
      ...baseManifest,
      mediaTypes: ['movies'],
      repository: 'https://example.com/repo',
      homepage: 'https://example.com',
      dependencies: ['dep'],
      installScript: 'scripts/install.sh',
      configuration: [{
        key: 'apiKey',
        label: 'API Key',
      }],
      capabilityConfig: {
        library: {
          bundling: { strategy: 'per-file' },
          paths: [{ extensions: ['.mkv'] }],
        },
      },
      subscriptions: {
        events: ['library.itemAdded'],
        hooks: [{
          name: 'pipeline.probe.afterProcess',
          order: 20,
        }],
        views: ['detail.*'],
      },
      rateLimit: {
        maxConcurrency: 2,
        requests: [{
          max: 40,
          window: '10s',
        }],
      },
      network: {
        bypassPrivacyProxy: true,
        reason: 'private endpoint',
      },
      accounts: {
        label: 'Accounts',
        schema: [{
          key: 'name',
          label: 'Name',
          input: 'text',
        }],
      },
    })
    expect(result.success).toBe(true)
  })

  it('accepts manifest without capabilityConfig', () => {
    const result = PluginManifestSchema.safeParse(baseManifest)
    expect(result.success).toBe(true)
  })

  it('rejects an unknown top-level key (strict)', () => {
    const result = PluginManifestSchema.safeParse({
      ...baseManifest,
      unknownTopLevelField: true,
    })
    expect(result.success).toBe(false)
  })

  it('rejects an unknown capability', () => {
    const result = PluginManifestSchema.safeParse({
      ...baseManifest,
      capabilities: ['not-a-real-capability'],
    })
    expect(result.success).toBe(false)
  })

  it('accepts an optional accounts block', () => {
    const result = PluginManifestSchema.safeParse({
      ...baseManifest,
      accounts: {
        label: 'Connected Accounts',
        schema: [{
          key: 'name',
          label: 'Name',
          input: 'text',
        }],
      },
    })
    expect(result.success).toBe(true)
  })

  it('rejects an accounts block missing the name field', () => {
    const result = PluginManifestSchema.safeParse({
      ...baseManifest,
      accounts: {
        label: 'Connected Accounts',
        schema: [{
          key: 'token',
          label: 'Token',
          input: 'text',
        }],
      },
    })
    expect(result.success).toBe(false)
  })

  it('accepts library capabilityConfig with bundling and paths', () => {
    const result = PluginManifestSchema.safeParse({
      ...baseManifest,
      capabilityConfig: {
        library: {
          bundling: {
            strategy: 'per-file',
          },
          paths: [{
            extensions: ['.mkv', '.mp4'],
          }],
        },
      },
    })
    expect(result.success).toBe(true)
  })

  it('accepts library capabilityConfig with dedup providers', () => {
    const result = PluginManifestSchema.safeParse({
      ...baseManifest,
      capabilityConfig: {
        library: {
          bundling: { strategy: 'per-file' },
          paths: [{ extensions: ['.mkv'] }],
          dedup: { providers: ['tmdb', 'imdb'] },
        },
      },
    })
    expect(result.success).toBe(true)
  })

  it('accepts convert capabilityConfig with inputMimeTypes', () => {
    const result = PluginManifestSchema.safeParse({
      ...baseManifest,
      capabilities: ['convert'],
      capabilityConfig: {
        convert: {
          inputMimeTypes: ['video/*', 'audio/mpeg'],
        },
      },
    })
    expect(result.success).toBe(true)
  })

  it('accepts filesystem capabilityConfig with supportsWatch', () => {
    const result = PluginManifestSchema.safeParse({
      ...baseManifest,
      capabilities: ['filesystem'],
      capabilityConfig: {
        filesystem: {
          supportsWatch: true,
        },
      },
    })
    expect(result.success).toBe(true)
  })

  it('accepts filesystem capabilityConfig with supportsWatch false', () => {
    const result = PluginManifestSchema.safeParse({
      ...baseManifest,
      capabilities: ['filesystem'],
      capabilityConfig: {
        filesystem: {
          supportsWatch: false,
        },
      },
    })
    expect(result.success).toBe(true)
  })

  it('accepts mediaTypes as a string array', () => {
    const result = PluginManifestSchema.safeParse({
      ...baseManifest,
      mediaTypes: ['movies', 'tv'],
    })
    expect(result.success).toBe(true)
  })

  it('accepts mediaTypes as an object with per-type config', () => {
    const result = PluginManifestSchema.safeParse({
      ...baseManifest,
      mediaTypes: {
        tv: {
          episodic: true,
        },
        movies: {},
      },
    })
    expect(result.success).toBe(true)
  })

  it('passes through unknown keys inside per-type config (forward-compat)', () => {
    // MediaTypeConfigSchema is intentionally not strict so a plugin built
    // against a newer SDK still validates against an older runtime.
    const result = PluginManifestSchema.safeParse({
      ...baseManifest,
      mediaTypes: {
        tv: {
          episodic: true,
          futureFlag: 'value',
        },
      },
    })
    expect(result.success).toBe(true)
  })

  it('accepts queue config fields on a per-type config', () => {
    const result = PluginManifestSchema.safeParse({
      ...baseManifest,
      mediaTypes: {
        tv: {
          episodic: true,
          queueStyle: 'up-next',
          autoplay: true,
          queueStrategy: 'lazy',
        },
        music: {
          queueStyle: 'panel',
          autoplay: true,
          queueStrategy: 'eager',
        },
        audiobooks: {
          queueStyle: 'panel',
          autoplay: true,
          queueStrategy: 'eager',
        },
      },
    })
    expect(result.success).toBe(true)
  })

  it('rejects unknown queueStyle value', () => {
    const result = PluginManifestSchema.safeParse({
      ...baseManifest,
      mediaTypes: {
        tv: {
          queueStyle: 'sidebar',
        },
      },
    })
    expect(result.success).toBe(false)
  })

  it('rejects unknown queueStrategy value', () => {
    const result = PluginManifestSchema.safeParse({
      ...baseManifest,
      mediaTypes: {
        tv: {
          queueStrategy: 'manual',
        },
      },
    })
    expect(result.success).toBe(false)
  })

  it('rejects non-boolean autoplay', () => {
    const result = PluginManifestSchema.safeParse({
      ...baseManifest,
      mediaTypes: {
        tv: {
          autoplay: 'yes',
        },
      },
    })
    expect(result.success).toBe(false)
  })

  it('all queue fields are independently optional', () => {
    // Plugins should be able to declare any subset (e.g. just autoplay)
    // without being forced to provide the others.
    const result = PluginManifestSchema.safeParse({
      ...baseManifest,
      mediaTypes: {
        movies: {
          autoplay: false,
        },
      },
    })
    expect(result.success).toBe(true)
  })

  it('accepts hook subscription with requiresLocalFile flag', () => {
    const result = PluginManifestSchema.safeParse({
      ...baseManifest,
      capabilities: [],
      subscriptions: {
        hooks: [
          {
            name: 'pipeline.probe.afterProcess',
            order: 20,
            requiresLocalFile: true,
          },
        ],
      },
    })
    expect(result.success).toBe(true)
  })

  it('accepts hook subscription without requiresLocalFile (defaults off)', () => {
    const result = PluginManifestSchema.safeParse({
      ...baseManifest,
      capabilities: [],
      subscriptions: {
        hooks: [
          { name: 'pipeline.index.afterProcess' },
        ],
      },
    })
    expect(result.success).toBe(true)
  })

  it('accepts hook subscription with requiresLocalFile false', () => {
    const result = PluginManifestSchema.safeParse({
      ...baseManifest,
      capabilities: [],
      subscriptions: {
        hooks: [
          {
            name: 'pipeline.index.afterProcess',
            requiresLocalFile: false,
          },
        ],
      },
    })
    expect(result.success).toBe(true)
  })

  it('rejects non-boolean requiresLocalFile', () => {
    const result = PluginManifestSchema.safeParse({
      ...baseManifest,
      capabilities: [],
      subscriptions: {
        hooks: [
          {
            name: 'pipeline.probe.afterProcess',
            requiresLocalFile: 'yes',
          },
        ],
      },
    })
    expect(result.success).toBe(false)
  })
})

describe('EngineSchema', () => {
  it('accepts the four known engines', () => {
    for (const engine of ['bun', 'node', 'python', 'binary']) {
      expect(EngineSchema.safeParse(engine).success).toBe(true)
    }
  })

  it('rejects an unknown engine', () => {
    expect(EngineSchema.safeParse('deno').success).toBe(false)
  })
})

describe('NetworkPolicySchema', () => {
  it('accepts an empty policy', () => {
    expect(NetworkPolicySchema.safeParse({}).success).toBe(true)
  })

  it('accepts bypassPrivacyProxy with a reason', () => {
    expect(NetworkPolicySchema.safeParse({
      bypassPrivacyProxy: true,
      reason: 'VPN-only endpoint',
    }).success).toBe(true)
  })

  it('rejects a non-boolean bypassPrivacyProxy', () => {
    expect(NetworkPolicySchema.safeParse({ bypassPrivacyProxy: 'yes' }).success).toBe(false)
  })
})

describe('mediaTypes helpers', () => {
  it('getDeclaredMediaTypes returns array form unchanged', () => {
    expect(getDeclaredMediaTypes(['movies', 'tv'])).toEqual(['movies', 'tv'])
  })

  it('getDeclaredMediaTypes extracts keys from object form', () => {
    expect(getDeclaredMediaTypes({
      tv: {
        episodic: true,
      },
      movies: {},
    })).toEqual(['tv', 'movies'])
  })

  it('getDeclaredMediaTypes returns [] for undefined', () => {
    expect(getDeclaredMediaTypes(undefined)).toEqual([])
  })

  it('getMediaTypeConfig returns the per-type config from object form', () => {
    expect(getMediaTypeConfig({
      tv: {
        episodic: true,
      },
    }, 'tv')).toEqual({
      episodic: true,
    })
  })

  it('getMediaTypeConfig returns {} for array form', () => {
    expect(getMediaTypeConfig(['movies', 'tv'], 'tv')).toEqual({})
  })

  it('getMediaTypeConfig returns {} for unknown mediaType', () => {
    expect(getMediaTypeConfig({
      tv: {
        episodic: true,
      },
    }, 'movies')).toEqual({})
  })

  it('getMediaTypeConfig round-trips queue config fields', () => {
    expect(getMediaTypeConfig({
      tv: {
        episodic: true,
        queueStyle: 'up-next',
        autoplay: true,
        queueStrategy: 'lazy',
      },
    }, 'tv')).toEqual({
      episodic: true,
      queueStyle: 'up-next',
      autoplay: true,
      queueStrategy: 'lazy',
    })
  })
})
