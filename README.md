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

## Development

```bash
bun install
bun run typecheck
bun run lint
bun test
bun run build
```

## Releases

Releases are fully automated via [semantic-release](https://semantic-release.gitbook.io/). Every push to `main` runs CI; if the commits since the last release contain a release-worthy change (per [Conventional Commits](https://www.conventionalcommits.org/)), a new version is published to npm and a GitHub Release is created.

Commit message format:

- `fix: ...` &rarr; patch release
- `feat: ...` &rarr; minor release
- `feat!: ...` or footer `BREAKING CHANGE:` &rarr; major release
- `chore:`, `docs:`, `refactor:`, etc. &rarr; no release
