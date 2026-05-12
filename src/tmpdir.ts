// Per-plugin scratch directory helper.
//
// Plugins that materialize derivative files on disk (cover art, thumbnails,
// extracted streams) should write under `pluginTmpDir(id)` rather than a
// hardcoded `/tmp/...` path. Centralizing this means:
//   - cross-platform correctness (Windows has no `/tmp`)
//   - the server can clean up stale plugin scratch dirs in one place
//     (see packages/server/src/scheduler/plugin-tmp-cleanup.ts)
//   - tests and dev runs can override AVIATO_PLUGIN_TMP_DIR to redirect
//     scratch IO to a sandbox without modifying plugin code

import { mkdir } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'

const ROOT_OVERRIDE_ENV = 'AVIATO_PLUGIN_TMP_DIR'
const ROOT_NAME = 'aviato-plugins'

// Manifest validation already enforces this character set on plugin ids,
// but the SDK is consumed by third-party authors so we re-check here to
// guarantee no `..`/separator characters reach the path-join below.
const SAFE_ID_RE = /^[a-z0-9-]+$/

let cachedRoot: string | null = null

function pluginTmpRoot (): string {
  if (cachedRoot != null) {
    return cachedRoot
  }
  cachedRoot = process.env[ROOT_OVERRIDE_ENV] ?? join(tmpdir(), ROOT_NAME)
  return cachedRoot
}

/**
 * Returns `<root>/<pluginId>` and ensures it exists on disk. Idempotent —
 * safe to call on every operation. Async because every other fs call in
 * the codebase uses fs/promises (CLAUDE.md rule).
 *
 * Throws on a `pluginId` that contains anything outside [a-z0-9-] so a
 * misbehaving manifest can't traverse out of the scratch root.
 */
export async function pluginTmpDir (pluginId: string): Promise<string> {
  if (!SAFE_ID_RE.test(pluginId)) {
    throw new Error(`pluginTmpDir: invalid pluginId "${pluginId}"`)
  }
  const dir = join(pluginTmpRoot(), pluginId)
  await mkdir(dir, {
    recursive: true,
  })
  return dir
}
