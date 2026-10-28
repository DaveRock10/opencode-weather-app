# AGENTS.md

## Runtime

- **Bun only** (no Node/npm/pnpm/yarn/ts-node/dotenv). `.env` is auto-loaded by Bun.
- Commands: `bun install`, `bun run <script>`, `bun test`, `bunx <pkg>`.
- Typecheck: `bunx tsc --noEmit` (tsconfig has `noEmit: true`). `package.json` also defines `"typecheck": "bun check"`.
- Entry point: `index.ts` (currently a stub). `src/` does not exist yet.

## TypeScript gotchas

- `allowImportingTsExtensions: true` + `verbatimModuleSyntax: true` → **relative imports must include `.ts` extensions** (e.g. `./foo.ts`).
- **Type-only imports must use `import type { ... }`**.
- Strict mode on, plus `noUncheckedIndexedAccess` and `noImplicitOverride`. `types: ["bun"]` only — do not add `@types/node`.

## App intent (from README)

- Spanish UI CLI (menu style shown in README).
- OpenMeteo flow (no API key): geocode `https://geocoding-api.open-meteo.com/v1/search?name=<city>&count=1&language=es&format=json`, then forecast `https://api.open-meteo.com/v1/forecast?latitude=<lat>&longitude=<lon>&current=temperature_2m`.
- Features: default city, saved cities list, add/remove/set-default, units (°C), 7-day forecast, quit.
- Target deliverable: standalone binary via `bun build --compile src/index.ts --outfile weather` (run `./weather` with no Bun runtime).

## Notes

- `bun-instructions.md` — it's generic bun rules file, use it when the task actually need it.
- Keep UI text in Spanish to match README if implementing the CLI.
