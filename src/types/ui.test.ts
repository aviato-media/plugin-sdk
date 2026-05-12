import { describe, expect, test } from 'bun:test'

import {
  UIActionSchemaSchema,
  UIFormSchemaSchema,
  UIMetadataSchemaSchema,
} from './ui.js'

describe('UIFormSchema', () => {
  test('validates a settings form', () => {
    const form = {
      slot: 'settings-panes',
      id: 'movies-settings',
      title: 'Movies',
      icon: 'film',
      type: 'form',
      fields: [
        {
          key: 'scanPaths',
          label: 'Scan Paths',
          input: 'string-list',
          required: true,
        },
        {
          key: 'language',
          label: 'Preferred Language',
          input: 'select',
          options: ['en', 'ja'],
        },
        {
          key: 'enableTrailers',
          label: 'Download Trailers',
          input: 'toggle',
          default: false,
        },
      ],
    }
    expect(() => UIFormSchemaSchema.parse(form)).not.toThrow()
  })

  test('rejects form missing required fields', () => {
    const form = {
      slot: 'settings-panes',
      type: 'form',
    }
    expect(() => UIFormSchemaSchema.parse(form)).toThrow()
  })
})

describe('UIMetadataSchema', () => {
  test('validates a metadata display', () => {
    const metadata = {
      slot: 'detail-metadata',
      id: 'movies-cast',
      title: 'Cast & Crew',
      type: 'metadata',
      layout: 'key-value',
      fields: [
        {
          key: 'director',
          label: 'Director',
        },
        {
          key: 'cast',
          label: 'Cast',
          layout: 'list',
          limit: 5,
        },
        {
          key: 'genres',
          label: 'Genres',
          layout: 'chips',
        },
      ],
    }
    expect(() => UIMetadataSchemaSchema.parse(metadata)).not.toThrow()
  })
})

describe('UIActionSchema', () => {
  test('validates an action button', () => {
    const action = {
      slot: 'detail-actions',
      id: 'refresh-action',
      type: 'action',
      label: 'Refresh metadata',
      icon: 'refresh-cw',
      confirm: 'Refresh metadata for this item?',
      rpcMethod: 'indexer.search',
    }
    expect(() => UIActionSchemaSchema.parse(action)).not.toThrow()
  })

  test('validates action without optional fields', () => {
    const action = {
      slot: 'detail-actions',
      id: 'scan-action',
      type: 'action',
      label: 'Scan',
      rpcMethod: 'filesystem.scan',
    }
    expect(() => UIActionSchemaSchema.parse(action)).not.toThrow()
  })
})
