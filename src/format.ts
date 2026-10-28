import type { City, Forecast, Unit } from "./types.ts";

export interface Condition {
  text: string;
  icon: string;
}

const CONDITIONS: Record<number, Condition> = {
  0: { text: "Despejado", icon: "☀️" },
  1: { text: "Mayormente despejado", icon: "🌤️" },
  2: { text: "Parcialmente nublado", icon: "⛅" },
  3: { text: "Nublado", icon: "☁️" },
  45: { text: "Niebla", icon: "🌫️" },
  48: { text: "Niebla con escarcha", icon: "🌫️" },
  51: { text: "Llovizna ligera", icon: "🌦️" },
  53: { text: "Llovizna moderada", icon: "🌦️" },
  55: { text: "Llovizna intensa", icon: "🌧️" },
  56: { text: "Llovizna helada ligera", icon: "🌧️" },
  57: { text: "Llovizna helada intensa", icon: "🌧️" },
  61: { text: "Lluvia ligera", icon: "🌦️" },
  63: { text: "Lluvia moderada", icon: "🌧️" },
  65: { text: "Lluvia intensa", icon: "🌧️" },
  66: { text: "Lluvia helada ligera", icon: "🌧️" },
  67: { text: "Lluvia helada intensa", icon: "🌧️" },
  71: { text: "Nieve ligera", icon: "🌨️" },
  73: { text: "Nieve moderada", icon: "🌨️" },
  75: { text: "Nieve intensa", icon: "❄️" },
  77: { text: "Granos de nieve", icon: "❄️" },
  80: { text: "Chubascos ligeros", icon: "🌦️" },
  81: { text: "Chubascos moderados", icon: "🌧️" },
  82: { text: "Chubascos intensos", icon: "⛈️" },
  85: { text: "Chubascos de nieve ligeros", icon: "🌨️" },
  86: { text: "Chubascos de nieve intensos", icon: "❄️" },
  95: { text: "Tormenta", icon: "⛈️" },
  96: { text: "Tormenta con granizo ligero", icon: "⛈️" },
  99: { text: "Tormenta con granizo intenso", icon: "⛈️" },
};

const UNKNOWN_CONDITION: Condition = { text: "Condición desconocida", icon: "❔" };

const numberFormat = new Intl.NumberFormat("es-ES", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const dayFormat = new Intl.DateTimeFormat("es-ES", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

export function describeWeather(code: number | undefined): Condition {
  if (typeof code !== "number") return UNKNOWN_CONDITION;
  return CONDITIONS[code] ?? UNKNOWN_CONDITION;
}

export function unitSymbol(unit: Unit): string {
  return unit === "fahrenheit" ? "°F" : "°C";
}

export function formatTemperature(value: number, unit: Unit): string {
  return `${numberFormat.format(value)} ${unitSymbol(unit)}`;
}

export function formatDay(isoDate: string, index: number): string {
  if (index === 0) return "Hoy";
  const date = new Date(`${isoDate}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return dayFormat.format(date).replace(/\.$/, "");
}

export function formatTime(iso: string): string {
  const match = /T(\d{2}:\d{2})/.exec(iso);
  return match?.[1] ?? "—";
}

export function cityRegion(city: City): string {
  return [city.admin1, city.country]
    .filter((part): part is string => typeof part === "string" && part.length > 0)
    .join(", ");
}

export function cityLabel(city: City): string {
  const region = cityRegion(city);
  return region ? `${city.name} (${region})` : city.name;
}

function formatRange(min: number | undefined, max: number | undefined, unit: Unit): string {
  if (typeof min !== "number" || typeof max !== "number") return "—";
  return `${formatTemperature(min, unit)} / ${formatTemperature(max, unit)}`;
}

export function renderWeather(city: City, forecast: Forecast, unit: Unit): string {
  const bar = "═".repeat(40);
  const region = cityRegion(city);
  const current = forecast.current;
  const condition = describeWeather(current.weather_code);
  const wind = numberFormat.format(current.wind_speed_10m);
  const lines: string[] = [
    bar,
    `  ${city.name}${region ? ` — ${region}` : ""}`,
    bar,
    `  Ahora: ${formatTemperature(current.temperature_2m, unit)} · ${condition.icon} ${condition.text}`,
    `  Viento: ${wind} ${forecast.current_units.wind_speed_10m} · Humedad: ${current.relative_humidity_2m}%`,
    `  Hora local: ${formatTime(current.time)}${forecast.timezone ? ` (${forecast.timezone})` : ""}`,
    "",
    "  Pronóstico de 7 días",
    `  ${"─".repeat(38)}`,
  ];

  forecast.daily.time.forEach((date, index) => {
    const dailyCondition = describeWeather(forecast.daily.weather_code[index]);
    const range = formatRange(
      forecast.daily.temperature_2m_min[index],
      forecast.daily.temperature_2m_max[index],
      unit,
    );
    lines.push(`  ${formatDay(date, index)}: ${dailyCondition.icon} ${dailyCondition.text}, ${range}`);
  });

  return lines.join("\n");
}

export function renderSummaryLine(city: City, forecast: Forecast, unit: Unit): string {
  const condition = describeWeather(forecast.current.weather_code);
  const today = formatRange(
    forecast.daily.temperature_2m_min[0],
    forecast.daily.temperature_2m_max[0],
    unit,
  );
  return `  • ${cityLabel(city)}: ${formatTemperature(forecast.current.temperature_2m, unit)} · ${condition.icon} ${condition.text} (hoy ${today})`;
}
