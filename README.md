# @aviato-media/plugin-sdk

SDK for building plugins for [Aviato](https://avi.ato.software), a personal media management project by [Ato](https://ato.software).

## Requirements

Plugins run under the [Bun](https://bun.sh) runtime. The SDK uses `Bun.spawn` and other Bun-native APIs, so plain Node.js is not supported.

## Installation

```bash
bun add @aviato-media/plugin-sdk
```

## Usage

```ts
import { createPlugin, PluginClient } from '@aviato-media/plugin-sdk'

const plugin = createPlugin({
  // your plugin handlers
})

new PluginClient(plugin).start()
```

See `src/index.ts` for the full set of exported types and helpers.

## Logging

`createLogger` returns a small pino-compatible structured logger. Records are written one JSON line per call to `stderr`, where the Aviato host captures them and forwards each entry into the plugin's own rotating log file at the matching severity.

```ts
import { createLogger } from '@aviato-media/plugin-sdk'

const log = createLogger()

log.info('starting up')
log.warn({ url, status }, 'unexpected response')
log.error({ err }, 'fetch failed')

const sub = log.child({ requestId })
sub.debug('handling request')
```

The default level is `info`, overridable per call with `createLogger({ level: 'debug' })` or globally with the `AVIATO_PLUGIN_LOG_LEVEL` environment variable. The `pluginId` field is added automatically from `AVIATO_PLUGIN_ID` so every record is attributable.

Plain `console.log` and `process.stderr.write` continue to work — the host treats any non-JSON line as `info` text — but adopting `createLogger` gives you structured fields, level routing, and consistent serialization across all plugins.
