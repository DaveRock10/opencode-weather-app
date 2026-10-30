## Weather CLI APP

El objetivo de esta aplicación es que creemos una aplicación de consola que pida que ingresemos la ciudad, Al final, generaremos un binario ejecutable.

### Opciones:

- Ingresar el nombre de una ciudad.
- Guardar la ciudad por defecto.
- Registrar varias otras ciudades para buscar el clima en esas otras ciudades.

## Stack

- Bun.js
- OpenMeteo

## Ejemplo de petición http:

1. Paso 1: Geocoding API.
2. Paso 2: OpenMeteo API.

```
https://geocoding-api.open-meteo.com/v1/search?name=Ottawa&count=1&language=es&format=json
https://api.open-meteo.com/v1/forecast?latitude=45.41117&longitude=-75.69812&current=temperature_2m
```

## Inicializar proyecto

```bash
bun init
```

## Testing

La suite usa el runner integrado de Bun y vive en `tests/`:

```bash
bun run test         # ejecuta todas las pruebas
bun run test:watch   # modo vigilancia
bun run test:coverage # reporte de cobertura
```

También puedes ejecutar `bun test --isolate tests` directamente. `--isolate` es necesario para que los mocks de módulos no se filtren entre archivos.

`bun run build` ejecuta las pruebas primero; si alguna falla, no se genera el binario.

## Releases

El workflow `.github/workflows/release.yml` crea el tag y el release de GitHub automáticamente:

1. Actualiza `version` en `package.json` (por ejemplo, `1.0.1`).
2. Haz push a `main`. El workflow solo se dispara cuando cambia `package.json`.
3. El Action ejecuta `bun run build` y compila los binarios para Linux, macOS y Windows.
4. Se publica el release `v<version>` con los binarios adjuntos.

Si el tag `v<version>` ya existe, el workflow termina sin crear un release duplicado. También se puede lanzar manualmente desde la pestaña **Actions** (`workflow_dispatch`).

Binarios publicados:

- `weather-linux-x64`
- `weather-linux-arm64`
- `weather-darwin-arm64`
- `weather-darwin-x64`
- `weather-windows-x64.exe`

### Ejemplo del menú

Esta es la apariencia que deseamos crear

```bash
════════════════════════════════════════
         WEATHER CLI
════════════════════════════════════════
  1. Clima de ciudad default
  2. Clima de todas las ciudades (1)
  3. Buscar y agregar ciudad
  4. Eliminar ciudad
  5. Establecer ciudad default
  6. Listar ciudades
  8. Ajustes (°C)
  9. Salir
════════════════════════════════════════
  Selecciona una opción: 5
```
