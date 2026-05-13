# Contributing

Thanks for your interest in contributing to `@aviato-media/plugin-sdk`. Issues and pull requests are welcome.

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
