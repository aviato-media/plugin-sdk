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
