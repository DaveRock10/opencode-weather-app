# Testing

Suite de pruebas de Weather CLI con el runner integrado de Bun.

## Comandos

```bash
bun test --isolate tests
bun run test:watch
bun run test:coverage
bun run verify        # typecheck + tests
bun run build         # ejecuta tests y solo compila si pasan
```

## Estructura

```text
tests/
├── helpers/          # fixtures, fetch mock, consola, temporales y subprocesos
├── utils/            # formato y colores
├── storage/          # configuración y operaciones sobre ciudades
├── api/              # cliente HTTP, geocodificación y pronóstico
├── presentation/     # input, output y menú
├── actions/          # una suite por acción del menú
└── integration/      # ejecución real de la CLI en un subproceso
```

## Reglas

- Usar `*.test.ts`; los helpers no se ejecutan como tests.
- Importar rutas relativas con extensión `.ts`.
- No llamar a la API real de Open-Meteo: usar `helpers/fetchMock.ts`.
- No escribir en `~/.weather-cli.json`: storage recibe rutas temporales y la integración usa `HOME`/`USERPROFILE` temporales.
- Al usar `mock.module`, importar el módulo bajo prueba de forma dinámica y restaurar con `mock.restore()`.
- Ejecutar siempre con `--isolate`: así los mocks de módulos no se filtran entre archivos.
- Los tests de acciones no deben pedir entrada real; se mockea `presentation/input.ts`.
