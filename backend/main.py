import asyncio
import time
from datetime import date, datetime

import httpx
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from beaches import BEACHES
from crowds import estimate_crowds

FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
MARINE_URL = "https://marine-api.open-meteo.com/v1/marine"
TIDES_URL = "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter"
TIMEZONE = "America/Chicago"
FORECAST_DAYS = 7
CACHE_SECONDS = 30 * 60

app = FastAPI()

# Enable CORS so the React frontend (dev and preview servers) can access this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:4173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_cache = {}


async def cached(key, fetch):
    """Return a cached value for key, refreshing it with fetch() every CACHE_SECONDS."""
    hit = _cache.get(key)
    if hit and time.time() - hit[0] < CACHE_SECONDS:
        return hit[1]
    value = await fetch()
    _cache[key] = (time.time(), value)
    return value


def as_list(results):
    # Open-Meteo returns a single object instead of a list when given one location
    return results if isinstance(results, list) else [results]


async def fetch_weather(client):
    params = {
        "latitude": ",".join(str(b["lat"]) for b in BEACHES),
        "longitude": ",".join(str(b["lon"]) for b in BEACHES),
        "hourly": "temperature_2m,weather_code,precipitation_probability,uv_index,wind_speed_10m",
        "temperature_unit": "fahrenheit",
        "wind_speed_unit": "mph",
        "timezone": TIMEZONE,
        "forecast_days": FORECAST_DAYS,
    }
    res = await client.get(FORECAST_URL, params=params)
    res.raise_for_status()
    return as_list(res.json())


async def fetch_marine(client):
    params = {
        "latitude": ",".join(str(b["lat"]) for b in BEACHES),
        "longitude": ",".join(str(b["lon"]) for b in BEACHES),
        "hourly": "wave_height,wave_period,sea_surface_temperature",
        "timezone": TIMEZONE,
        "forecast_days": FORECAST_DAYS,
    }
    res = await client.get(MARINE_URL, params=params)
    res.raise_for_status()
    return as_list(res.json())


async def fetch_tides(client, station, day):
    """Hourly tide heights and the day's highs/lows (feet, MLLW) for one NOAA station."""
    base = {
        "product": "predictions",
        "station": station,
        "begin_date": day.strftime("%Y%m%d"),
        "range": 24,
        "datum": "MLLW",
        "units": "english",
        "time_zone": "lst_ldt",
        "format": "json",
        "application": "beach_day_planner",
    }
    hourly, hilo = await asyncio.gather(
        client.get(TIDES_URL, params={**base, "interval": "h"}),
        client.get(TIDES_URL, params={**base, "interval": "hilo"}),
    )
    hourly.raise_for_status()
    hilo.raise_for_status()
    return {
        "hourly": [float(p["v"]) for p in hourly.json()["predictions"]][:24],
        "extremes": [
            {"time": p["t"][11:16], "height": float(p["v"]), "type": "high" if p["type"] == "H" else "low"}
            for p in hilo.json()["predictions"]
        ],
    }


def day_slice(series, day_index):
    """The 24 hourly values for one day out of a multi-day hourly series."""
    return series[day_index * 24:(day_index + 1) * 24]


def c_to_f(c):
    return None if c is None else round(c * 9 / 5 + 32, 1)


@app.get("/")
def root():
    return {"message": "Beach Day Planner API"}


@app.get("/beaches")
async def get_beaches(day: date = Query(None, description="YYYY-MM-DD, defaults to today")):
    today = datetime.now().date()
    day = day or today
    day_index = (day - today).days
    if not 0 <= day_index < FORECAST_DAYS:
        raise HTTPException(status_code=400, detail=f"Date must be within the next {FORECAST_DAYS} days")

    stations = sorted({b["tide_station"] for b in BEACHES})
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            weather, marine, *tides = await asyncio.gather(
                cached("weather", lambda: fetch_weather(client)),
                cached("marine", lambda: fetch_marine(client)),
                *[cached(f"tides-{s}-{day}", lambda s=s: fetch_tides(client, s, day)) for s in stations],
            )
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Could not load beach data: {e}")
    tides_by_station = dict(zip(stations, tides))

    results = []
    for beach, w, m in zip(BEACHES, weather, marine):
        wh, mh = w["hourly"], m["hourly"]
        hourly = {
            "temp_f": day_slice(wh["temperature_2m"], day_index),
            "weather_code": day_slice(wh["weather_code"], day_index),
            "rain_chance": day_slice(wh["precipitation_probability"], day_index),
            "uv": day_slice(wh["uv_index"], day_index),
            "wind_mph": day_slice(wh["wind_speed_10m"], day_index),
            "wave_ft": [
                None if v is None else round(v * 3.281 * (0.4 if beach["bay"] else 1), 1)
                for v in day_slice(mh["wave_height"], day_index)
            ],
            "wave_period_s": day_slice(mh["wave_period"], day_index),
            "water_f": [c_to_f(v) for v in day_slice(mh["sea_surface_temperature"], day_index)],
        }
        hourly["crowd"] = estimate_crowds(beach, day, hourly)
        results.append({
            **{k: beach[k] for k in ("id", "name", "city", "lat", "lon", "tagline", "amenities", "bay")},
            "date": day.isoformat(),
            "hourly": hourly,
            "tides": tides_by_station[beach["tide_station"]],
        })
    return results
