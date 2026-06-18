"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Sun,
  CloudSun,
  Cloud,
  CloudFog,
  CloudRain,
  CloudSnow,
  CloudLightning,
  Wind,
  Droplets,
  MapPin,
} from "lucide-react";

const LAT = 28.6139;
const LON = 77.209;
const CITY = "New Delhi";

const WMO_DESCRIPTIONS = {
  0: "Clear",
  1: "Mostly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Foggy",
  48: "Rime fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Heavy drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  80: "Showers",
  81: "Heavy showers",
  82: "Violent showers",
  95: "Thunderstorm",
  96: "Storm + hail",
  99: "Heavy storm",
};

// Icon picker for the *current* moment — trust the WMO weather code directly.
function getCurrentIcon(code, size = 36) {
  if (code === 0) return <Sun size={size} className="text-amber-500" />;
  if (code >= 1 && code <= 2) return <CloudSun size={size} className="text-amber-400" />;
  if (code === 3) return <Cloud size={size} className="text-slate-400" />;
  if (code === 45 || code === 48) return <CloudFog size={size} className="text-slate-400" />;
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82))
    return <CloudRain size={size} className="text-sky-500" />;
  if (code >= 71 && code <= 77) return <CloudSnow size={size} className="text-sky-300" />;
  if (code >= 95) return <CloudLightning size={size} className="text-violet-600" />;
  return <Cloud size={size} className="text-slate-400" />;
}

// Daily forecast icon — much more nuanced. The raw WMO weather_code for a
// daily forecast represents the *worst* condition of the day, so it shows
// rain even when there's only a 5% chance of a brief shower. We override
// that with precipitation_probability_max so the icon matches what the user
// actually feels when they look out the window.
function getDailyIcon(code, precipProb, size = 14) {
  // Storm overrides everything
  if (code >= 95) return <CloudLightning size={size} className="text-violet-600" />;
  // Snow stays accurate via code
  if (code >= 71 && code <= 77) return <CloudSnow size={size} className="text-sky-300" />;
  // Fog stays accurate via code
  if (code === 45 || code === 48) return <CloudFog size={size} className="text-slate-400" />;

  // Heavy/likely rain — only when probability says it'll really happen
  if (precipProb >= 70) return <CloudRain size={size} className="text-sky-600" />;
  // Possible rain — partly cloudy + light drop hint
  if (precipProb >= 40) return <CloudRain size={size} className="text-sky-400" />;
  // Some clouds — show the WMO cloud-iness even with low rain chance
  if (precipProb >= 20 || code === 3) return <Cloud size={size} className="text-slate-400" />;
  if (code === 1 || code === 2) return <CloudSun size={size} className="text-amber-400" />;
  // Clear
  return <Sun size={size} className="text-amber-500" />;
}

function getDayLabel(dateStr, index) {
  if (index === 0) return "Today";
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

async function fetchWeather() {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
    `&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum` +
    `&timezone=Asia/Kolkata&forecast_days=7` +
    `&wind_speed_unit=ms`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather API error: ${res.status}`);
  return res.json();
}

export default function WeatherWidget() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["weather", CITY],
    queryFn: fetchWeather,
    staleTime: 30 * 60 * 1000,
    refetchInterval: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white h-40 flex items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !data?.current || !data?.daily) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">{CITY}</p>
        <p className="text-xs text-slate-400">Couldn&apos;t load weather data.</p>
      </div>
    );
  }

  const current = data.current;
  const daily = data.daily;
  const dailyCondition = WMO_DESCRIPTIONS[current.weather_code] || "—";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <MapPin size={11} className="text-orange-500" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-700">
            {CITY}
          </span>
        </div>
      </div>

      {/* Current weather */}
      <div className="flex items-center gap-3 mb-3">
        {getCurrentIcon(current.weather_code, 36)}
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-black text-slate-900 leading-none">
            {Math.round(current.temperature_2m)}
          </span>
          <span className="text-base font-bold text-slate-500">°C</span>
        </div>
        <div className="ml-auto text-right">
          <p className="text-xs font-semibold text-slate-700">{dailyCondition}</p>
          <div className="flex items-center justify-end gap-2 mt-0.5 text-[10px] text-slate-500 font-medium">
            <span className="flex items-center gap-0.5">
              <Droplets size={9} className="text-sky-500" />
              {current.relative_humidity_2m}%
            </span>
            <span className="flex items-center gap-0.5">
              <Wind size={9} className="text-slate-400" />
              {Number(current.wind_speed_10m).toFixed(1)} m/s
            </span>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-slate-100 my-3" />

      {/* 7-day forecast — icon driven by precipitation probability, not the
          WMO "worst weather of the day" code which over-reports rain. */}
      <div className="grid grid-cols-7 gap-1">
        {daily.time.map((date, i) => {
          const hi = daily.temperature_2m_max[i];
          const lo = daily.temperature_2m_min[i];
          const precipProb = daily.precipitation_probability_max?.[i] ?? 0;
          const code = daily.weather_code[i];
          const isToday = i === 0;
          return (
            <div
              key={date}
              className={`flex flex-col items-center py-1.5 rounded-md ${
                isToday ? "bg-orange-50" : "hover:bg-slate-50"
              }`}
            >
              <p
                className={`text-[10px] font-semibold ${
                  isToday ? "text-orange-600" : "text-slate-500"
                }`}
              >
                {getDayLabel(date, i)}
              </p>
              <div className="my-0.5">{getDailyIcon(code, precipProb, 16)}</div>
              {/* Rain probability badge — only shown when meaningful */}
              {precipProb >= 20 && (
                <span className="text-[8px] font-semibold text-sky-600 leading-none">
                  {precipProb}%
                </span>
              )}
              <p className="text-[10px] font-bold text-slate-800 leading-tight mt-0.5">
                {Math.round(hi)}°
              </p>
              <p className="text-[10px] text-slate-400 leading-tight">{Math.round(lo)}°</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
