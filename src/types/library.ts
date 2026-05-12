import { z } from 'zod'

import {
  RendererExtraSchema,
  RendererSlotsSchema,
  SlotValueSchema,
} from './renderer.js'

/**
 * Widget hints for rendering and editing a metadata field. The host picks an
 * input component for the editor and a renderer for the detail view based on
 * this value. When absent, the host defaults to 'text' for string properties,
 * 'number' for numeric properties, and 'tags' for array properties.
 */
export const FieldWidgetSchema = z.enum([
  'text',
  'textarea',
  'number',
  'date',
  'tags',
])

/**
 * Marks a field whose value(s) reference an entity. The synthesis pipeline
 * splits string values on common separators and creates one entity per name
 * via resolveEntityReference; the web renders each value as a link to the
 * entity page when a matching link exists on the item.
 *
 * `role` must equal the role used on item_entity_links so the renderer can
 * pair a value with its entity link.
 */
export const PropertyEntitySchema = z.object({
  type: z.string(),
  role: z.string(),
  /**
   * How to split a single string value into multiple entity names.
   * - 'name' (default): commas, ampersands, and " and " — for person /
   *   artist names where "Lennon & McCartney" should split.
   * - 'list': commas only — for tag-like lists (genres) where "&" and
   *   "and" can be part of a single value (e.g. "R&B", "Rock and Roll").
   * - 'none': no split — treat the whole string as one entity.
   * Array values are never split further regardless of this setting.
   */
  splitOn: z.enum(['name', 'list', 'none']).optional(),
})

const ItemPropertyDescriptorSchema = z.object({
  /** Human-readable label for editor + detail view. Defaults to the key. */
  label: z.string().optional(),
  /** Widget for the editor input + detail view rendering. */
  widget: FieldWidgetSchema.optional(),
  /** When true, the field appears in the editor and is allowed by PATCH. */
  editable: z.boolean().optional(),
  /** When false, the field is hidden from the editor even if editable. */
  displayInEditor: z.boolean().optional(),
  /** When true, the field appears as a view-only entry on the detail page. */
  displayInDetail: z.boolean().optional(),
  /** Sort order within the editor and detail view. Lower is earlier. */
  order: z.number().int().optional(),
  /** Marks the field as an entity reference (see PropertyEntitySchema). */
  entity: PropertyEntitySchema.optional(),
})

export const ItemPropertySchema = z.discriminatedUnion('type', [
  ItemPropertyDescriptorSchema.extend({
    type: z.literal('string'),
  }),
  ItemPropertyDescriptorSchema.extend({
    type: z.literal('number'),
  }),
  ItemPropertyDescriptorSchema.extend({
    type: z.literal('boolean'),
  }),
  ItemPropertyDescriptorSchema.extend({
    type: z.literal('array'),
    items: z.object({
      type: z.enum(['string', 'number', 'boolean']),
    }),
  }),
])

export const ItemSchemaDefinition = z.object({
  type: z.literal('object'),
  properties: z.record(z.string(), ItemPropertySchema),
})

export const LibraryViewByEntrySchema = z.string().refine(
  (val) => val === 'items' || val.startsWith('entity:'),
  {
    message: 'Must be "items" or "entity:<type>"',
  },
)

// ── Renderer composites ──────────────────────────────────────────────
// Plugins describe how their entity types AND items render via these
// declarations. The slot/extra vocabularies are shared (see renderer.ts);
// these composites bundle them into role-specific configs.

/**
 * Verb pair used for the "mark as watched" affordance. The web surfaces
 * these on poster context menus and item detail pages so the verb matches
 * the medium ("Read"/"Mark Unread" for books, "Watched"/"Mark Unwatched"
 * for video, etc.). When absent, the host falls back to
 * { done: 'Watched', undo: 'Mark Unwatched', inProgress: 'Watching' }.
 */
export const WatchedVerbSchema = z.object({
  /** Past-tense label for completed items. e.g. "Watched", "Read", "Listened". */
  done: z.string(),
  /** Imperative label that toggles back to unwatched. e.g. "Mark Unwatched". */
  undo: z.string(),
  /** Continuous-tense label for in-progress items. e.g. "Watching", "Reading". */
  inProgress: z.string(),
})

export type WatchedVerb = z.infer<typeof WatchedVerbSchema>

/**
 * Per-library configuration for the global Continue Watching row and the
 * per-library Continue row on the library home page. The wrapper object is
 * the v2 extension point — future fields (e.g. `imageSlot`, entity-loaded
 * template strings for books) plug in without breaking older parsers.
 *
 * The host resolves `subtitle` against the item's `metadata` using the
 * shared SlotValue vocabulary (`field`, `fields`, `template`, `value`).
 * Plugins should declare data they already store on the item — the v1
 * resolver does not load referenced entities.
 */
/**
 * Title sources for a Continue Watching card. Plugins choose between:
 *   - reading the title from a linked entity by role (TV: the parent show
 *     entity carries the series name; the episode item itself does not),
 *   - or any of the standard SlotValue shapes (field/fields/template/value)
 *     when the value lives directly on `item.metadata`.
 */
export const ContinueWatchingTitleSchema = z.union([
  SlotValueSchema,
  z.object({
    /**
     * Read the title from a linked entity with one of these roles. The
     * helper walks the list in order and uses the first match — declare
     * multiple when different indexers in the same library link the parent
     * with different roles (TV: TMDB writes `role: 'show'` while other
     * indexers write `'series'`; declaring both keeps the title resolution
     * resilient across mixed-source libraries).
     *
     * Accepts a single role for the common case.
     *
     * Examples:
     *   TV → ['show', 'series']
     *   Audiobook → 'series'
     */
    entityRole: z.union([z.string(), z.array(z.string()).min(1)]),
  }),
])

export const ContinueWatchingConfigSchema = z.object({
  /**
   * Card title override. By default the card uses `item.title` (whatever
   * the indexer emitted), which for TV is typically the episode title. To
   * surface a different title — typically the parent entity's name —
   * declare it here.
   *
   * TV uses `{ entityRole: 'show' }` because the show name is stored on
   * the linked show entity, not the episode item's metadata.
   */
  title: ContinueWatchingTitleSchema.optional(),
  /**
   * Text rendered below the card image. Common shapes:
   *   TV    — { template: 'S{season} · E{episode} — {episodeTitle}' }
   *   Audio — { field: 'currentChapter' }
   * Absent → no subtitle line is rendered.
   */
  subtitle: SlotValueSchema.optional(),
})

export type ContinueWatchingConfig = z.infer<typeof ContinueWatchingConfigSchema>

/**
 * Library-wide visual hints that apply across all pages — not specific to
 * the item detail layout. Item-detail-page slot bindings (subtitle,
 * description, rating, backdrop) live in `itemRenderer.slots`.
 */
export const LibraryDisplaySchema = z.object({
  /**
   * Library-default poster card aspect for home rows, browse grids, and
   * entity grids. Cards in this library render at this aspect; individual
   * artwork whose own `aspect` (on `ArtworkReference`) doesn't match is
   * letterboxed (`object-contain`) inside the card. Defaults to `'portrait'`
   * when absent.
   */
  poster: z.object({
    aspect: z.enum(['square', 'portrait', 'landscape']),
  }).optional(),
  /**
   * Optional badges shown on library hero banners. The resolved value
   * (string) is split on commas to produce individual chip labels.
   */
  heroBadges: SlotValueSchema.optional(),
})

export const EntityRendererConfigSchema = z.object({
  view: z.enum(['horizontal-scroll', 'list', 'none']),
  viewOptions: z.object({
    groupBy: z.string().optional(),
    sortBy: z.string().optional(),
    groupLabel: z.string().optional(),
    groupParam: z.string().optional(),
    sortFormat: z.enum(['number', 'string', 'date']).optional(),
    source: z.enum(['items', 'children']).optional(),
    childType: z.string().optional(),
    itemAspect: z.enum(['landscape', 'square', 'portrait']).optional(),
    dedupeItemSubtitle: z.boolean().optional(),
  }).optional(),
  slots: RendererSlotsSchema,
  extras: z.array(RendererExtraSchema).optional(),
})

/**
 * Item renderer config — drives the item detail page below the header.
 * Parallel to entityRenderers but scoped to library items. `slots` reuses
 * the same vocabulary as entity renderers (intentional — the same keys
 * mean the same things on both surfaces). `extras` declares ordered
 * sections rendered below the slots (entity-cards, kv-grids, chips).
 *
 * Library-wide visual chrome (browse-card poster aspect, hero badges)
 * lives on the `display` field of LibrarySchema. When `itemRenderer` is
 * absent the host falls back to a generic layout.
 */
export const ItemRendererConfigSchema = z.object({
  slots: RendererSlotsSchema.optional(),
  extras: z.array(RendererExtraSchema).optional(),
})

export const LibrarySchemaSchema = z.object({
  name: z.string(),
  /**
   * The Phosphor icon name for the library.
   */
  icon: z.string(),
  /**
   * Library can provide an optional description shown on the Add Library process
   * When not specified, description will default to what is specified in plugin.json
   */
  description: z.string().optional(),
  itemSchema: ItemSchemaDefinition,
  /**
   * Optionally specify the specific media types for this library.
   * When not specified, mediaTypes will default to what is specified in plugin.json
   */
  mediaTypes: z.array(z.string()).optional(),
  searchableFields: z.array(z.string()),
  filterableFields: z.array(z.string()),
  /**
   * Declare how this library should be browsed.
   * Use 'items' to browse raw items, or 'entity:<type>' to browse by entity type.
   * Example: ['entity:show', 'items'] shows shows by default with a toggle to see episodes.
   */
  libraryViewBy: z.array(LibraryViewByEntrySchema).optional(),
  /**
   * Per-entry display label for the view switcher. Keys match the
   * `libraryViewBy` entries verbatim ('items' or 'entity:<type>').
   * When absent, the host falls back to a generic label
   * ('Items' for items, pluralised entity type for entities).
   * Example: { items: 'Episodes', 'entity:show': 'Shows' }.
   */
  libraryViewLabels: z.record(z.string(), z.string()).optional(),
  /**
   * Library-wide visual hints (browse-card aspect, hero badges).
   * Item-detail-page slot bindings live in `itemRenderer.slots`.
   */
  display: LibraryDisplaySchema.optional(),
  /**
   * Whether individual library items in this library can be re-identified via
   * Fix Match. Defaults to true. Set to false for libraries where item identity
   * derives from a parent entity (e.g. TV episodes — re-match the show, not
   * the episode).
   */
  allowItemRematch: z.boolean().optional(),
  /**
   * Per-entity-type field schemas. Used by entity detail pages and edit
   * dialogs to render fields for entities owned by this library (e.g. show,
   * season). Keys are entity type strings; values reuse the same field
   * descriptor shape as itemSchema.properties.
   */
  entitySchemas: z.record(z.string(), ItemSchemaDefinition).optional(),
  /**
   * Per-entity-type renderer configuration. Drives the entity detail page via
   * the host-side EntityRendererHost. Keys are entity type strings; values
   * pick a base view and fill the universal slot vocabulary.
   */
  entityRenderers: z.record(z.string(), EntityRendererConfigSchema).optional(),
  /**
   * Item renderer configuration. Drives the item detail page via the
   * host-side ItemRendererHost. When absent the host falls back to a
   * legacy bespoke layout.
   */
  itemRenderer: ItemRendererConfigSchema.optional(),
  /**
   * Verb labels for the "mark as watched" affordance. Plugins for books or
   * comics declare e.g. `{ done: 'Read', undo: 'Mark Unread', inProgress: 'Reading' }`
   * so the UI surfaces the right verb without branching on mediaType.
   */
  watchedVerb: WatchedVerbSchema.optional(),
  /**
   * Whether this library participates in the Continue Watching row (both the
   * global row on the home page and the per-library row on its own home page).
   * Defaults to `true` when absent. Plugins for media types where resuming
   * doesn't fit the user model — e.g. music, where finishing one song doesn't
   * imply wanting the next — should set this to `false`.
   */
  supportsContinueWatching: z.boolean().optional(),
  /**
   * Continue Watching display config (subtitle template, etc.). When absent,
   * the row shows the item title without a subtitle line.
   */
  continueWatching: ContinueWatchingConfigSchema.optional(),
})

export const SortOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  field: z.string(),
  direction: z.enum(['asc', 'desc']),
})

export const FilterOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  field: z.string(),
  type: z.enum(['select', 'range', 'boolean', 'text']),
})

export const GroupingOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  field: z.string(),
})

export const ItemSummarySchema = z.object({
  title: z.string(),
  subtitle: z.string().optional(),
  imageUrl: z.string().optional(),
  badges: z.array(z.object({
    label: z.string(),
    color: z.string().optional(),
  })).optional(),
})

export const ItemDetailSchema = z.object({
  title: z.string(),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  fields: z.array(z.object({
    label: z.string(),
    value: z.string(),
  })),
  sections: z.array(z.object({
    title: z.string(),
    content: z.string(),
  })).optional(),
})

export const LibraryItemSchema = z.object({
  id: z.string(),
  libraryId: z.string(),
  uri: z.string(),
  title: z.string(),
  metadata: z.record(z.string(), z.unknown()),
  fileInfo: z.record(z.string(), z.unknown()),
  status: z.enum(['active', 'missing', 'error']),
  addedAt: z.string(),
  updatedAt: z.string(),
})

export type FieldWidget = z.infer<typeof FieldWidgetSchema>
export type PropertyEntity = z.infer<typeof PropertyEntitySchema>
export type ItemProperty = z.infer<typeof ItemPropertySchema>
export type ItemSchema = z.infer<typeof ItemSchemaDefinition>
export type LibraryViewByEntry = z.infer<typeof LibraryViewByEntrySchema>
export type LibraryDisplay = z.infer<typeof LibraryDisplaySchema>
export type LibrarySchema = z.infer<typeof LibrarySchemaSchema>
export type EntityRendererConfig = z.infer<typeof EntityRendererConfigSchema>
export type ItemRendererConfig = z.infer<typeof ItemRendererConfigSchema>
export type SortOption = z.infer<typeof SortOptionSchema>
export type FilterOption = z.infer<typeof FilterOptionSchema>
export type GroupingOption = z.infer<typeof GroupingOptionSchema>
export type ItemSummary = z.infer<typeof ItemSummarySchema>
export type ItemDetail = z.infer<typeof ItemDetailSchema>
export type LibraryItem = z.infer<typeof LibraryItemSchema>

/**
 * @deprecated Use `LibraryHandlers` (in `./plugin.ts`) instead. This type
 * declares an `({ item })` arg shape that doesn't match the runtime
 * contract — the SDK's registerMethod unwraps `params.item` before calling
 * the handler, so plugins implement `(item: LibraryItem)`. Kept exported
 * to avoid breaking any external references; remove once verified safe.
 */
export interface LibraryMethods {
  getSchema: () => LibrarySchema
  getSortOptions: () => SortOption[]
  getFilterOptions: () => FilterOption[]
  getGroupingOptions: () => GroupingOption[]
  getItemSummary: (params: { item: LibraryItem }) => ItemSummary
  getItemDetail: (params: { item: LibraryItem }) => ItemDetail
}
