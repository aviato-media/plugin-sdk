import { describe, expect, test } from 'bun:test'

import {
  CAPABILITIES,
  CAPABILITY_DESCRIPTIONS,
  CAPABILITY_LABELS,
  CAPABILITY_METADATA,
  CapabilitySchema,
} from './capabilities.js'

describe('capabilities', () => {
  test('CapabilitySchema accepts every known capability', () => {
    for (const id of CAPABILITIES) {
      expect(CapabilitySchema.parse(id)).toBe(id)
    }
  })

  test('rejects `ui` (not a manifest capability) and unknown values', () => {
    expect(CapabilitySchema.safeParse('ui').success).toBe(false)
    expect(CapabilitySchema.safeParse('bogus').success).toBe(false)
  })

  test('the canonical set is exactly the six manifest capabilities', () => {
    expect([...CAPABILITIES].sort()).toEqual(
      ['artwork-search', 'convert', 'filesystem', 'indexer', 'library', 'media-scan'],
    )
  })

  test('every id is unique', () => {
    const ids = CAPABILITY_METADATA.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  test('every capability has a non-empty label and description (anti-drift guard)', () => {
    for (const c of CAPABILITY_METADATA) {
      expect(c.label.length).toBeGreaterThan(0)
      expect(c.description.length).toBeGreaterThan(0)
      expect(CAPABILITY_LABELS[c.id]).toBe(c.label)
      expect(CAPABILITY_DESCRIPTIONS[c.id]).toBe(c.description)
    }
  })

  test('CAPABILITIES preserves CAPABILITY_METADATA order', () => {
    expect([...CAPABILITIES]).toEqual(CAPABILITY_METADATA.map((c) => c.id))
  })
})
