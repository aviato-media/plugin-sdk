import { describe, expect, test } from 'bun:test'

import {
  ContinueWatchingConfigSchema,
  EntityRendererConfigSchema,
  FieldWidgetSchema,
  FilterOptionSchema,
  GroupingOptionSchema,
  ItemDetailSchema,
  ItemPropertySchema,
  ItemRendererConfigSchema,
  ItemSchemaDefinition,
  ItemSummarySchema,
  LibraryDisplaySchema,
  LibraryItemSchema,
  LibrarySchemaSchema,
  LibraryViewByEntrySchema,
  PropertyEntitySchema,
  SortOptionSchema,
  WatchedVerbSchema,
} from './library.js'

describe('FieldWidgetSchema', () => {
  test('accepts known widgets', () => {
    for (const w of ['text', 'textarea', 'number', 'date', 'tags']) {
      expect(FieldWidgetSchema.safeParse(w).success).toBe(true)
    }
  })

  test('rejects unknown widget', () => {
    expect(FieldWidgetSchema.safeParse('rich').success).toBe(false)
  })
})

describe('PropertyEntitySchema', () => {
  test('accepts minimum config', () => {
    expect(PropertyEntitySchema.safeParse({
      type: 'person',
      role: 'actor',
    }).success).toBe(true)
  })

  test('accepts splitOn variants', () => {
    for (const splitOn of ['name', 'list', 'none']) {
      expect(PropertyEntitySchema.safeParse({
        type: 'person',
        role: 'actor',
        splitOn,
      }).success).toBe(true)
    }
  })
})

describe('ItemPropertySchema', () => {
  test('accepts string property', () => {
    expect(ItemPropertySchema.safeParse({
      type: 'string',
      label: 'Title',
    }).success).toBe(true)
  })

  test('accepts array property with items type', () => {
    expect(ItemPropertySchema.safeParse({
      type: 'array',
      items: {
        type: 'string',
      },
    }).success).toBe(true)
  })

  test('rejects array missing items.type', () => {
    expect(ItemPropertySchema.safeParse({
      type: 'array',
    }).success).toBe(false)
  })
})

describe('ItemSchemaDefinition', () => {
  test('accepts a schema definition', () => {
    expect(ItemSchemaDefinition.safeParse({
      type: 'object',
      properties: {
        title: {
          type: 'string',
        },
      },
    }).success).toBe(true)
  })
})

describe('LibraryViewByEntrySchema', () => {
  test('accepts "items"', () => {
    expect(LibraryViewByEntrySchema.safeParse('items').success).toBe(true)
  })

  test('accepts entity:<type>', () => {
    expect(LibraryViewByEntrySchema.safeParse('entity:show').success).toBe(true)
  })

  test('rejects arbitrary string', () => {
    expect(LibraryViewByEntrySchema.safeParse('foo').success).toBe(false)
  })
})

describe('LibraryDisplaySchema', () => {
  test('accepts poster + heroBadges', () => {
    expect(LibraryDisplaySchema.safeParse({
      poster: {
        aspect: 'portrait',
      },
      heroBadges: {
        field: 'badges',
      },
    }).success).toBe(true)
  })
})

describe('WatchedVerbSchema', () => {
  test('accepts watched verbs', () => {
    expect(WatchedVerbSchema.safeParse({
      done: 'Watched',
      undo: 'Mark Unwatched',
      inProgress: 'Watching',
    }).success).toBe(true)
  })
})

describe('ContinueWatchingConfigSchema', () => {
  test('accepts entityRole title and template subtitle', () => {
    expect(ContinueWatchingConfigSchema.safeParse({
      title: {
        entityRole: 'show',
      },
      subtitle: {
        template: 'S{season} E{episode}',
      },
    }).success).toBe(true)
  })

  test('accepts array of entity roles', () => {
    expect(ContinueWatchingConfigSchema.safeParse({
      title: {
        entityRole: ['show', 'series'],
      },
    }).success).toBe(true)
  })

  test('accepts plain SlotValue title', () => {
    expect(ContinueWatchingConfigSchema.safeParse({
      title: {
        field: 'title',
      },
    }).success).toBe(true)
  })
})

describe('EntityRendererConfigSchema / ItemRendererConfigSchema', () => {
  test('Entity renderer minimal', () => {
    expect(EntityRendererConfigSchema.safeParse({
      view: 'list',
      slots: {},
    }).success).toBe(true)
  })

  test('Entity renderer with viewOptions and extras', () => {
    expect(EntityRendererConfigSchema.safeParse({
      view: 'horizontal-scroll',
      viewOptions: {
        groupBy: 'season',
        sortBy: 'episode',
        groupLabel: 'Season',
        groupParam: 'season',
        sortFormat: 'number',
        source: 'children',
        childType: 'episode',
        itemAspect: 'landscape',
        dedupeItemSubtitle: true,
      },
      slots: {},
      extras: [{
        type: 'chips',
        field: 'genres',
      }],
    }).success).toBe(true)
  })

  test('Item renderer is optional fields', () => {
    expect(ItemRendererConfigSchema.safeParse({}).success).toBe(true)
  })
})

describe('LibrarySchemaSchema', () => {
  test('accepts minimal library schema', () => {
    expect(LibrarySchemaSchema.safeParse({
      name: 'Movies',
      icon: 'film',
      itemSchema: {
        type: 'object',
        properties: {},
      },
      searchableFields: ['title'],
      filterableFields: ['genre'],
    }).success).toBe(true)
  })

  test('accepts full library schema', () => {
    expect(LibrarySchemaSchema.safeParse({
      name: 'Movies',
      icon: 'film',
      description: 'Movies library',
      itemSchema: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
          },
        },
      },
      mediaTypes: ['movies'],
      searchableFields: ['title'],
      filterableFields: ['genre'],
      libraryViewBy: ['items', 'entity:show'],
      libraryViewLabels: {
        items: 'Episodes',
        'entity:show': 'Shows',
      },
      display: {
        poster: {
          aspect: 'portrait',
        },
      },
      allowItemRematch: false,
      entitySchemas: {
        show: {
          type: 'object',
          properties: {},
        },
      },
      entityRenderers: {
        show: {
          view: 'list',
          slots: {},
        },
      },
      itemRenderer: {},
      watchedVerb: {
        done: 'Read',
        undo: 'Mark Unread',
        inProgress: 'Reading',
      },
      supportsContinueWatching: false,
      continueWatching: {
        title: {
          entityRole: 'show',
        },
      },
    }).success).toBe(true)
  })
})

describe('SortOption / FilterOption / GroupingOption', () => {
  test('SortOption', () => {
    expect(SortOptionSchema.safeParse({
      id: 's',
      label: 'Title',
      field: 'title',
      direction: 'asc',
    }).success).toBe(true)
  })

  test('FilterOption', () => {
    expect(FilterOptionSchema.safeParse({
      id: 'f',
      label: 'Genre',
      field: 'genre',
      type: 'select',
    }).success).toBe(true)
  })

  test('GroupingOption', () => {
    expect(GroupingOptionSchema.safeParse({
      id: 'g',
      label: 'Year',
      field: 'year',
    }).success).toBe(true)
  })
})

describe('ItemSummary / ItemDetail / LibraryItem', () => {
  test('ItemSummary minimal + with badges', () => {
    expect(ItemSummarySchema.safeParse({
      title: 'X',
    }).success).toBe(true)
    expect(ItemSummarySchema.safeParse({
      title: 'X',
      badges: [{
        label: '4K',
        color: 'red',
      }],
    }).success).toBe(true)
  })

  test('ItemDetail with sections', () => {
    expect(ItemDetailSchema.safeParse({
      title: 'X',
      fields: [{
        label: 'Director',
        value: 'Nolan',
      }],
      sections: [{
        title: 'About',
        content: 'foo',
      }],
    }).success).toBe(true)
  })

  test('LibraryItem requires the canonical fields', () => {
    expect(LibraryItemSchema.safeParse({
      id: '1',
      libraryId: 'l',
      uri: 'file:///x',
      title: 'X',
      metadata: {},
      fileInfo: {},
      status: 'active',
      addedAt: '2025',
      updatedAt: '2025',
    }).success).toBe(true)
  })
})
