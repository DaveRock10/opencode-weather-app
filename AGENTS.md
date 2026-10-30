# AGENTS.md

## Runtime

- **Bun only** (no Node/npm/pnpm/yarn/ts-node/dotenv). `.env` is auto-loaded by Bun.
- Commands: `bun install`, `bun run start`, `bun run build`, `bun check`, `bun test`, `bunx <pkg>`.
- Entry point: `src/index.ts`. The old root `index.ts` stub has been removed.
- Typecheck: `bun check` (equivalent to `bunx tsc --noEmit`; tsconfig has `noEmit: true`).

## Project structure

- `src/index.ts` — menu loop and global error handling.
- `src/actions/` — one file per user action: `getWeather.ts`, `getAllWeather.ts`, `addCity.ts`, `removeCity.ts`, `setDefaultCity.ts`, `listCities.ts`, `changeUnits.ts`.
- `src/presentation/` — `menu.ts` (rendering and option dispatch), `input.ts` (readline, prompts, validation), `output.ts` (messages and city listing).
- `src/storage/` — `settingsStorage.ts` (config load/save in `~/.weather-cli.json`) and `citiesStorage.ts` (city add/remove/default operations).
- `src/api/` — `client.ts` (shared fetch + `ApiError`), `geocoding.ts`, `weather.ts`.
- `src/utils/` — `format.ts` (units, dates, conditions and render helpers), `constants.ts`, `colors.ts` (ANSI palette and color detection).
- `src/types/` — `City.ts`, `Config.ts`, `Weather.ts`, `MenuOption.ts`.
- `tests/` — Bun test suites mirroring `src/`, plus `helpers/` (fixtures, fetch mock, temp dirs, subprocess runner) and `integration/cli.test.ts`.

## TypeScript gotchas

- `allowImportingTsExtensions: true` + `verbatimModuleSyntax: true` → **relative imports must include `.ts` extensions** (e.g. `./foo.ts`).
- **Type-only imports must use `import type { ... }`**.
- Strict mode on, plus `noUncheckedIndexedAccess` and `noImplicitOverride`. `types: ["bun"]` only — do not add `@types/node`.

## App behavior

- Spanish UI CLI. Menu numbering matches the README: 1–6, 8. Ajustes, 9. Salir.
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
- Features: default city weather, all-cities summary, add/remove/list/set-default cities, °C/°F units, current weather + 7-day forecast, quit.
- Network errors are shown in Spanish; one failing city does not abort the all-cities query.
- Colors: cyan for menu and prompts, yellow for temperatures, green for success, red for errors. Respect `NO_COLOR`; `FORCE_COLOR` forces colors for testing. Piped output stays plain unless forced.
- Keep all UI text in Spanish.

## Testing

- `bun test --isolate tests` runs the full suite; `bun test --isolate --watch tests` and `bun test --isolate --coverage tests` are available as `bun run test:watch` and `bun run test:coverage`.
- Tests live in `tests/` and mirror the `src/` layout. Use `*.test.ts` for suites and keep reusable code in `tests/helpers/`.
- Never call the real Open-Meteo API: mock `globalThis.fetch` with `tests/helpers/fetchMock.ts`.
- Never touch the user's `~/.weather-cli.json`: storage tests pass a temporary file path to `loadConfig`/`saveConfig`, and CLI integration tests spawn the app with `HOME`/`USERPROFILE` pointing to a temp directory.
- Action/menu suites use `mock.module` with absolute paths from `tests/helpers/mockPath.ts`; import the module under test dynamically and call `mock.restore()` when done.
- `--isolate` is required: module mocks must not leak between test files.
- `bun check` also typechecks `tests/`.

## Build

- `bun run build` runs `bun test --isolate tests` first and only compiles if the suite passes.
- It produces a standalone binary: `weather.exe` on Windows, `weather` on Unix/Linux.
- The binary runs without Bun installed. Both artifacts are gitignored.

## Notes

- `bun-instructions.md` is a generic Bun rules file; use it when the task actually needs it.
