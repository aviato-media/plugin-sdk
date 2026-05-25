import type { Capability } from './capabilities.js'
import { PluginClient } from './client.js'
import type { PluginInstance } from './subscriptions.js'
import { createSubscriptionBuilders } from './subscriptions.js'
import type { ArtworkSearchRequest, ArtworkSearchResult } from './types/artwork-search.js'
import type { ExtensionMap } from './types/bundle.js'
import type { EntityDetailRequest, EntityDetailResult } from './types/entity.js'
import type { DiscoveredFile, ScanResult, ValidationResult } from './types/filesystem.js'
import type {
  IndexRequest,
  IndexResult,
  MatchDetailRequest,
  SearchRequest,
  SearchResult,
} from './types/indexer.js'
import type {
  FilterOption,
  GroupingOption,
  ItemDetail,
  ItemSummary,
  LibraryItem,
  LibrarySchema,
  SortOption,
} from './types/library.js'
import { LibrarySchemaSchema } from './types/library.js'
import type {
  MediaScanAlgorithmVersionResponse,
  MediaScanBatchRequest,
  MediaScanResponse,
  MediaScanSingleRequest,
} from './types/media-scan.js'
import type { UISchema } from './types/ui.js'

// ── Handler interfaces ──────────────────────────────────

export interface FilesystemEmitters {
  emitFile: (file: { uri: string,
    filename: string,
    size: number,
    mimeType?: string,
    modifiedAt: string }) => void
  emitFileRemoved: (uri: string) => void
  emitScanComplete: () => void
}

export interface FilesystemHandlers {
  validate: (config: Record<string, unknown>) => Promise<ValidationResult>
  scan: (config: Record<string, unknown>, extensionMap: ExtensionMap, emitters: FilesystemEmitters) => Promise<ScanResult>
  watch?: (config: Record<string, unknown>, extensionMap: ExtensionMap, libraryId: string, emitters: FilesystemEmitters) => Promise<void>
  unwatchLibrary?: (libraryId: string) => Promise<void>
  unwatch?: () => Promise<void>
  getLocalPath?: (uri: string) => Promise<string>
}

export interface IndexerHandlers {
  supports: (file: DiscoveredFile) => Promise<boolean>
  index: (request: IndexRequest) => Promise<IndexResult>
  search: (params: SearchRequest) => Promise<SearchResult>
  getMatchDetail: (params: MatchDetailRequest) => Promise<IndexResult>
  getEntityDetail?: (request: EntityDetailRequest) => Promise<EntityDetailResult>
}

export interface LibraryHandlers {
  getSchema: () => Promise<LibrarySchema>
  getSortOptions: () => Promise<SortOption[]>
  getFilterOptions: () => Promise<FilterOption[]>
  getGroupingOptions: () => Promise<GroupingOption[]>
  getItemSummary: (item: LibraryItem) => Promise<ItemSummary>
  getItemDetail: (item: LibraryItem) => Promise<ItemDetail>
}

export interface UIHandlers {
  getSchemas: () => Promise<UISchema[]>
}

export interface MediaScanHandlers {
  algorithmVersion: () => Promise<MediaScanAlgorithmVersionResponse>
  scanSingle: (request: MediaScanSingleRequest) => Promise<MediaScanResponse>
  scanBatch: (request: MediaScanBatchRequest) => Promise<MediaScanResponse>
}

export interface ArtworkSearchHandlers {
  search: (request: ArtworkSearchRequest) => Promise<ArtworkSearchResult>
}

export interface PluginHandlers {
  filesystem?: FilesystemHandlers
  indexer?: IndexerHandlers
  library?: LibraryHandlers
  // `ui` is a handler-level key only — it registers the `ui.getSchemas` RPC.
  // It is NOT a manifest capability (see capabilities.ts); plugins do not
  // declare `"ui"` in plugin.json `capabilities`.
  ui?: UIHandlers
  'media-scan'?: MediaScanHandlers
  'artwork-search'?: ArtworkSearchHandlers
  [key: string]: unknown
}

// ── Registration helpers ────────────────────────────────

function createEmitters (client: PluginClient, libraryId: string): FilesystemEmitters {
  return {
    emitFile: (file) => {
      client.sendNotification('filesystem.file', {
        libraryId,
        ...file,
      })
    },
    emitFileRemoved: (uri) => {
      client.sendNotification('filesystem.file.removed', {
        libraryId,
        uri,
      })
    },
    emitScanComplete: () => {
      client.sendNotification('filesystem.scan.complete', {
        libraryId,
      })
    },
  }
}

function registerFilesystem (client: PluginClient, handlers: FilesystemHandlers): void {
  client.registerMethod('filesystem.validate', async (params) => {
    return handlers.validate(params.config as Record<string, unknown>)
  })

  client.registerMethod('filesystem.scan', async (params) => {
    const emitters = createEmitters(client, params.libraryId as string)
    return handlers.scan(
      params.config as Record<string, unknown>,
      params.extensionMap as ExtensionMap,
      emitters,
    )
  })

  if (handlers.watch) {
    client.registerMethod('filesystem.watch', async (params) => {
      const emitters = createEmitters(client, params.libraryId as string)
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return handlers.watch!(
        params.config as Record<string, unknown>,
        params.extensionMap as ExtensionMap,
        params.libraryId as string,
        emitters,
      )
    })
  }

  if (handlers.unwatchLibrary) {
    client.registerMethod('filesystem.unwatchLibrary', async (params) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return handlers.unwatchLibrary!(params.libraryId as string)
    })
  }

  if (handlers.unwatch) {
    client.registerMethod('filesystem.unwatch', async () => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return handlers.unwatch!()
    })
  }

  if (handlers.getLocalPath) {
    client.registerMethod('filesystem.getLocalPath', async (params) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return handlers.getLocalPath!(params.uri as string)
    })
  }
}

function registerIndexer (client: PluginClient, handlers: IndexerHandlers): void {
  client.registerMethod('indexer.supports', async (params) => {
    return handlers.supports(params.file as DiscoveredFile)
  })

  client.registerMethod('indexer.index', async (params) => {
    return handlers.index(params as unknown as IndexRequest)
  })

  client.registerMethod('indexer.search', async (params) => {
    return handlers.search(params as unknown as SearchRequest)
  })

  client.registerMethod('indexer.getMatchDetail', async (params) => {
    return handlers.getMatchDetail(params as unknown as MatchDetailRequest)
  })

  if (handlers.getEntityDetail) {
    client.registerMethod('indexer.getEntityDetail', async (params) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return handlers.getEntityDetail!(params as EntityDetailRequest)
    })
  }
}

function registerLibrary (client: PluginClient, handlers: LibraryHandlers): void {
  client.registerMethod('library.getSchema', async () => {
    const schema = await handlers.getSchema()
    return LibrarySchemaSchema.parse(schema)
  })
  client.registerMethod('library.getSortOptions', async () => handlers.getSortOptions())
  client.registerMethod('library.getFilterOptions', async () => handlers.getFilterOptions())
  client.registerMethod('library.getGroupingOptions', async () => handlers.getGroupingOptions())

  client.registerMethod('library.getItemSummary', async (params) => {
    return handlers.getItemSummary(params.item as LibraryItem)
  })

  client.registerMethod('library.getItemDetail', async (params) => {
    return handlers.getItemDetail(params.item as LibraryItem)
  })
}

function registerUI (client: PluginClient, handlers: UIHandlers): void {
  client.registerMethod('ui.getSchemas', async () => {
    return handlers.getSchemas()
  })
}

function registerMediaScan (client: PluginClient, handlers: MediaScanHandlers): void {
  client.registerMethod('mediaScan.algorithmVersion', async () => {
    return handlers.algorithmVersion()
  })
  client.registerMethod('mediaScan.scanSingle', async (params) => {
    return handlers.scanSingle(params as unknown as MediaScanSingleRequest)
  })
  client.registerMethod('mediaScan.scanBatch', async (params) => {
    return handlers.scanBatch(params as unknown as MediaScanBatchRequest)
  })
}

function registerArtworkSearch (client: PluginClient, handlers: ArtworkSearchHandlers): void {
  client.registerMethod('artworkSearch.search', async (params) => {
    return handlers.search(params as unknown as ArtworkSearchRequest)
  })
}

// ── Main entry point ────────────────────────────────────

// Keyed by every manifest Capability, plus the handler-only `ui` key. Adding a
// new Capability without a registrar here is a compile error — the source of
// truth (capabilities.ts) and the runtime registrars cannot drift apart.
const capabilityRegistrars: Record<Capability | 'ui', (client: PluginClient, handlers: unknown) => void> = {
  filesystem: (c, h) => registerFilesystem(c, h as FilesystemHandlers),
  indexer: (c, h) => registerIndexer(c, h as IndexerHandlers),
  library: (c, h) => registerLibrary(c, h as LibraryHandlers),
  ui: (c, h) => registerUI(c, h as UIHandlers),
  'media-scan': (c, h) => registerMediaScan(c, h as MediaScanHandlers),
  'artwork-search': (c, h) => registerArtworkSearch(c, h as ArtworkSearchHandlers),
}

export function createPlugin (handlers: PluginHandlers): PluginInstance {
  const client = new PluginClient()

  // `handlers` is an open record (PluginHandlers has a string index signature),
  // so look up by arbitrary string and tolerate a miss for unknown keys.
  const registrars: Record<string, ((client: PluginClient, handlers: unknown) => void) | undefined> = capabilityRegistrars
  for (const [capability, capHandlers] of Object.entries(handlers)) {
    const registrar = registrars[capability]
    // `capHandlers` can be undefined when a plugin passes e.g.
    // `{ convert: enabled ? handlers : undefined }` — skip those so a
    // registrar never dereferences an absent handler at construction time.
    if (registrar && capHandlers) {
      registrar(client, capHandlers)
    }
  }

  const { events, hooks, views } = createSubscriptionBuilders(client)

  client.signalReady()
  return {
    client,
    events,
    hooks,
    views,
    host: client.host,
  }
}
