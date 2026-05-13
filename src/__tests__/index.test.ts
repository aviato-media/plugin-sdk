import { describe, expect, test } from 'bun:test'

import * as sdk from '../index.js'

describe('plugin-sdk barrel', () => {
  test('exposes the public surface', () => {
    expect(sdk.PluginClient).toBeDefined()
    expect(sdk.createPlugin).toBeDefined()
    expect(sdk.matchPattern).toBeDefined()
    expect(sdk.isSystemExtensionAlias).toBeDefined()
    expect(sdk.resolveExtension).toBeDefined()
    expect(sdk.resolveExtensions).toBeDefined()
    expect(sdk.SYSTEM_EXTENSION_ALIASES).toBeDefined()
    expect(sdk.classifyMediaFile).toBeDefined()
    expect(sdk.collectAllExtensions).toBeDefined()
    expect(sdk.compilePaths).toBeDefined()
    expect(sdk.parseTags).toBeDefined()
    expect(sdk.partitionExtensionsByRole).toBeDefined()
    expect(sdk.stripTags).toBeDefined()
    expect(sdk.getBundleField).toBeDefined()
    expect(sdk.getBundleValue).toBeDefined()
    expect(sdk.getConfidentCanonicalIds).toBeDefined()
    expect(sdk.mergeConfidentFields).toBeDefined()
    expect(sdk.JSON_RPC_ERRORS).toBeDefined()
  })
})
