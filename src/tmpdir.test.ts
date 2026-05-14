import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { mkdtemp, rm, stat } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'

let scratchRoot: string

beforeAll(async () => {
  scratchRoot = await mkdtemp(join(tmpdir(), 'plugin-sdk-tmpdir-test-'))
  process.env.AVIATO_PLUGIN_TMP_DIR = scratchRoot
})

afterAll(async () => {
  delete process.env.AVIATO_PLUGIN_TMP_DIR
  await rm(scratchRoot, {
    recursive: true,
    force: true,
  })
})

describe('pluginTmpDir', () => {
  test('creates and returns a per-plugin directory', async () => {
    const { pluginTmpDir } = await import('./tmpdir.js')
    const dir = await pluginTmpDir('my-plugin')
    expect(dir).toBe(join(scratchRoot, 'my-plugin'))
    const st = await stat(dir)
    expect(st.isDirectory()).toBe(true)
  })

  test('is idempotent', async () => {
    const { pluginTmpDir } = await import('./tmpdir.js')
    const a = await pluginTmpDir('idem')
    const b = await pluginTmpDir('idem')
    expect(a).toBe(b)
    const st = await stat(a)
    expect(st.isDirectory()).toBe(true)
  })

  test('accepts scoped plugin ids', async () => {
    const { pluginTmpDir } = await import('./tmpdir.js')
    const dir = await pluginTmpDir('@aviato-media/plugin-name')
    expect(dir).toBe(join(scratchRoot, '@aviato-media', 'plugin-name'))
    const st = await stat(dir)
    expect(st.isDirectory()).toBe(true)
  })

  test('rejects unsafe plugin ids', async () => {
    const { pluginTmpDir } = await import('./tmpdir.js')
    await expect(pluginTmpDir('../escape')).rejects.toThrow(/invalid pluginId/)
    await expect(pluginTmpDir('with/slash')).rejects.toThrow(/invalid pluginId/)
    await expect(pluginTmpDir('@scope/with/extra')).rejects.toThrow(/invalid pluginId/)
    await expect(pluginTmpDir('@/missing-scope')).rejects.toThrow(/invalid pluginId/)
    await expect(pluginTmpDir('@scope/')).rejects.toThrow(/invalid pluginId/)
    await expect(pluginTmpDir('Capital')).rejects.toThrow(/invalid pluginId/)
    await expect(pluginTmpDir('')).rejects.toThrow(/invalid pluginId/)
  })
})
