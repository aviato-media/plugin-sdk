// Per-plugin scratch directory helper.
//
// Plugins that materialize derivative files on disk (cover art, thumbnails,
// extracted streams) should write under `pluginTmpDir(id)` rather than a
// hardcoded `/tmp/...` path. Centralizing this means:
//   - cross-platform correctness (Windows has no `/tmp`)
//   - everything stays on the Aviato data volume, so renames between
//     scratch space and `<dataDir>/plugins` never cross devices (EXDEV)
//   - the server can clean up stale plugin scratch dirs in one place
//   - tests and dev runs can override AVIATO_PLUGIN_TMP_DIR to redirect
//     scratch IO to a sandbox without modifying plugin code
//
// Resolution order:
//   1. AVIATO_PLUGIN_TMP_DIR (explicit override, also what the host sets)
//   2. <AVIATO_DATA_PATH>/tmp/plugins (the path the server defaults to)
//   3. <os.tmpdir()>/aviato-plugins (last-resort fallback for plugins run
//      outside an Aviato host — unit-test runs of the SDK itself)

import { mkdir } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'

const ROOT_OVERRIDE_ENV = 'AVIATO_PLUGIN_TMP_DIR'
const DATA_PATH_ENV = 'AVIATO_DATA_PATH'
const ROOT_NAME = 'aviato-plugins'

// Manifest validation already enforces this character set on plugin ids,
// but the SDK is consumed by third-party authors so we re-check here to
// guarantee no `..`/separator characters reach the path-join below.
// Mirrors npm scoped-package naming: `name` or `@scope/name`, lowercase
// alphanumeric + hyphen segments. The single `/` in a scoped id is safe
// against traversal because `.` and additional separators are excluded.
const SAFE_ID_RE = /^(?:@[a-z0-9-]+\/)?[a-z0-9-]+$/

let cachedRoot: string | null = null

function pluginTmpRoot (): string {
  if (cachedRoot != null) {
    return cachedRoot
  }
  const override = process.env[ROOT_OVERRIDE_ENV]
  if (override) {
    cachedRoot = override
    return cachedRoot
  }
  const dataPath = process.env[DATA_PATH_ENV]
  if (dataPath) {
    cachedRoot = join(dataPath, 'tmp', 'plugins')
    return cachedRoot
  }
  cachedRoot = join(tmpdir(), ROOT_NAME)
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
