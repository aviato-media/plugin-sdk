import { describe, expect, test } from 'bun:test'

import * as types from './index.js'

describe('types barrel', () => {
  test('re-exports core schemas', () => {
    expect(types.JsonRpcRequestSchema).toBeDefined()
    expect(types.LibrarySchemaSchema).toBeDefined()
    expect(types.MetadataBundleSchema).toBeDefined()
    expect(types.MediaFileTypeEnum).toBeDefined()
    expect(types.ArtworkSearchRequestSchema).toBeDefined()
    expect(types.BundleSchema).toBeDefined()
    expect(types.DiscoveredFileSchema).toBeDefined()
    expect(types.FileInfoSchema).toBeDefined()
    expect(types.UISchemaSchema).toBeDefined()
    expect(types.RendererSlotsSchema).toBeDefined()
    expect(types.MediaProbeResultSchema).toBeDefined()
    expect(types.EntityReferenceSchema).toBeDefined()
    expect(types.JSON_RPC_ERRORS).toBeDefined()
  })
})
