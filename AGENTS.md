# AGENTS.md

## Runtime

- **Bun only** (no Node/npm/pnpm/yarn/ts-node/dotenv). `.env` is auto-loaded by Bun.
- Commands: `bun install`, `bun run start`, `bun run build`, `bun check`, `bun test`, `bunx <pkg>`.
- Entry point: `src/index.ts`. The old root `index.ts` stub has been removed.
- Typecheck: `bun check` (equivalent to `bunx tsc --noEmit`; tsconfig has `noEmit: true`).

## Project structure

- `src/index.ts` — menu loop and global error handling.
- `src/menu.ts` — actions for each menu option.
- `src/ui.ts` — prompts, menu rendering, messages and pauses.
- `src/theme.ts` — ANSI palette and color detection.
- `src/api.ts` — OpenMeteo geocoding and forecast clients.
- `src/storage.ts` — config load/save in `~/.weather-cli.json`.
- `src/format.ts` — units, dates, weather conditions and render helpers.
- `src/types.ts` — shared types.

## TypeScript gotchas

- `allowImportingTsExtensions: true` + `verbatimModuleSyntax: true` → **relative imports must include `.ts` extensions** (e.g. `./foo.ts`).
- **Type-only imports must use `import type { ... }`**.
- Strict mode on, plus `noUncheckedIndexedAccess` and `noImplicitOverride`. `types: ["bun"]` only — do not add `@types/node`.

## App behavior

- Spanish UI CLI. Menu numbering matches the README: 1–5, 8. Ajustes, 9. Salir.
- Config is stored in `~/.weather-cli.json` and written atomically:
```json
{
  "unit": "celsius",
  "defaultCityId": 6094817,
  "cities": [
    { "id": 6094817, "name": "Ottawa", "country": "Canadá", "admin1": "Ontario", "latitude": 45.41117, "longitude": -75.69812 }
  ]
}
```
- Cities keep the geocoding `id`; default/remove operations use that id, not the name.
- OpenMeteo flow (no API key):
  1. Geocode: `https://geocoding-api.open-meteo.com/v1/search?name=<city>&count=1&language=es&format=json`
  2. Forecast: `https://api.open-meteo.com/v1/forecast?latitude=<lat>&longitude=<lon>&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=7`
- Features: default city weather, all-cities summary, add/remove/set-default, °C/°F units, current weather + 7-day forecast, quit.
- Network errors are shown in Spanish; one failing city does not abort the all-cities query.
- Colors: cyan for menu and prompts, yellow for temperatures, green for success, red for errors. Respect `NO_COLOR`; `FORCE_COLOR` forces colors for testing. Piped output stays plain unless forced.
- Keep all UI text in Spanish.

## Build

- `bun run build` compiles a standalone binary: `weather.exe` on Windows, `weather` on Unix/Linux.
- The binary runs without Bun installed. Both artifacts are gitignored.

## Notes

- `bun-instructions.md` is a generic Bun rules file; use it when the task actually needs it.
