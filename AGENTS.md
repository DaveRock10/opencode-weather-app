# AGENTS.md

Weather CLI built with **Bun + TypeScript**. Implemented and refactored into a layered `src/` structure (see `references/file-system.md`): `actions/`, `presentation/`, `storage/`, `types/`, `api/`, `utils/`.

## Runtime: Bun, not Node

Use Bun for everything. Do not introduce `node`, `npm`, `pnpm`, `yarn`, `ts-node`, or `dotenv`.

- Run: `bun run src/index.ts`
- Install: `bun install`
- Test: `bun test` (tests en `/tests` con `bun:test`; cubren `utils/`, `presentation/`, `storage/`, `api/` y `actions/`). Los tests de storage/actions aíslan el filesystem mockeando `constants.ts` a un temp dir (`tests/helpers/withTempConfig.ts`); los de api/actions mockean `globalThis.fetch`. **Importante**: los tests que mockean módulos vía `mock.module` deben hacer `await import()` dinámico del SUT tras registrar el mock (ESM hoists los imports estáticos antes del `mock.module`).
- Execute a package: `bunx <pkg>`
- Bun auto-loads `.env` — do not add a dotenv loader.

## Build gating

`bun run build` ejecuta `bun test && bun build --compile ...`. Si cualquier test falla, **no se compila** el binario `weather`. No uses `bun build` directo (saltaría el gate); usa siempre `bun run build`.

## Typecheck

No script is defined. Typecheck with:

```bash
bunx tsc --noEmit
```

`tsconfig.json` has `noEmit: true`, so `tsc` never emits files.

## TypeScript gotchas (enforced by tsconfig)

- `allowImportingTsExtensions: true` + `verbatimModuleSyntax: true` → **imports must include the `.ts` extension** (e.g. `import { foo } from "./foo.ts"`).
- Type-only imports must use `import type { ... }`.
- Strict mode is on, plus `noUncheckedIndexedAccess` and `noImplicitOverride`.
- `types: ["bun"]` → Bun globals are available; do not add `@types/node`.

## Final deliverable

The README's goal is a **standalone executable binary**. Build it with:

```bash
bun build --compile src/index.ts --outfile weather
```

Run the resulting `./weather` binary directly (no Bun runtime needed).

## App architecture (per README)

Interactive console menu (UI strings in **Spanish**). Two-step OpenMeteo flow, no API key required:

1. Geocoding: `https://geocoding-api.open-meteo.com/v1/search?name=<city>&count=1&language=es&format=json`
2. Forecast: `https://api.open-meteo.com/v1/forecast?latitude=<lat>&longitude=<lon>&current=temperature_2m`

Features: default city, list of additional saved cities, add/remove city, set default, unit settings (°C), 7-day forecast, quit. Persistence is split into two JSON files under `~/.config/weather-cli/`: `cities.json` (default + saved cities) and `settings.json` (unit). On first run after the refactor, the legacy single `data.json` is migrated automatically (one-shot) into the two new files.

## Conventions

- UI text and `README.md` are in Spanish — match that for user-facing strings.
- Output artifacts (`dist/`, `out/`, `*.tgz`, `coverage/`, `.env*`) are gitignored.
- `bun-instructions.md` is a generic Cursor rule with much that doesn't apply (frontend, `Bun.serve`, sqlite/redis/postgres, HTML imports). Ignore it unless the task actually needs those.
- Puedes usar `@bun-instructions.md` para obtener instrucciones de Bun.
