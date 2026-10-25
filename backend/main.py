import asyncio
import os
import time
from datetime import date, datetime, timedelta, timezone

import httpx
from fastapi import FastAPI, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware

import nws
import noaa
import reviews
import travel
import vision
import water_quality
from beaches import BEACHES
from cache import cached, load_env_file
from crowds import estimate_crowds

load_env_file()

FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
MARINE_URL = "https://marine-api.open-meteo.com/v1/marine"
TIMEZONE = "America/Chicago"
FORECAST_DAYS = 16
MINUTE = 60

app = FastAPI()

# Origins allowed to call this API; set FRONTEND_ORIGINS (comma-separated) when deploying
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("FRONTEND_ORIGINS", "http://localhost:5173,http://localhost:4173").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


def as_list(results):
    # Open-Meteo returns a single object instead of a list when given one location
    return results if isinstance(results, list) else [results]


async def fetch_weather(client):
    params = {
        "latitude": ",".join(str(b["lat"]) for b in BEACHES),
        "longitude": ",".join(str(b["lon"]) for b in BEACHES),
        "hourly": "temperature_2m,weather_code,precipitation_probability,uv_index,wind_speed_10m,wind_direction_10m",
        "daily": "sunrise,sunset",
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


class Sources:
    """Fetches each data source through the cache and records whether it worked, so the UI can
    show exactly where every number came from and which sources are down."""

    def __init__(self):
        self.status = {}

    async def load(self, source_id, label, url, key, fetch, ttl):
        try:
            hit = await cached(key, fetch, ttl)
        except Exception as e:
            self.status.setdefault(source_id, {"id": source_id, "label": label, "url": url, "ok": True, "errors": 0})
            self.status[source_id]["errors"] += 1
            self.status[source_id]["ok"] = False
            self.status[source_id]["detail"] = f"{type(e).__name__}: {e}"[:200]
            return None
        entry = self.status.setdefault(source_id, {"id": source_id, "label": label, "url": url, "ok": True, "errors": 0})
        fetched = datetime.fromtimestamp(hit["fetched"], timezone.utc).isoformat()
        entry["fetched"] = min(entry.get("fetched", fetched), fetched)
        return hit["value"]


def day_slice(series, day_index):
    """The 24 hourly values for one day out of a multi-day hourly series."""
    return series[day_index * 24:(day_index + 1) * 24]


def c_to_f(c):
    return None if c is None else round(c * 9 / 5 + 32, 1)


def recent(iso_time, hours=3):
    return datetime.now(timezone.utc) - datetime.fromisoformat(iso_time) < timedelta(hours=hours)


@app.get("/")
def root():
    return {"message": "Beach Day Planner API"}


@app.get("/beaches")
async def get_beaches(day: date = Query(None, description="YYYY-MM-DD, defaults to today on the Texas coast")):
    src = Sources()
    async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
        weather, marine = await asyncio.gather(
            src.load("weather", "Open-Meteo weather forecast", "https://open-meteo.com/", "weather",
                     lambda: fetch_weather(client), 30 * MINUTE),
            src.load("marine", "Open-Meteo marine forecast", "https://open-meteo.com/en/docs/marine-weather-api",
                     "marine", lambda: fetch_marine(client), 30 * MINUTE),
        )
        if not weather:
            raise HTTPException(status_code=502, detail="Weather forecast is unavailable right now")

        # Dates and "today" come from the forecast itself, which is in Texas local time
        utc_offset = weather[0]["utc_offset_seconds"]
        days = weather[0]["daily"]["time"]
        day = day or date.fromisoformat(days[0])
        if day.isoformat() not in days:
            raise HTTPException(status_code=400, detail=f"Date must be within the next {FORECAST_DAYS} days")
        day_index = days.index(day.isoformat())
        is_today = day_index == 0

        zones = {b["nws_zone"] for b in BEACHES}
        tide_stations = sorted({b["tide_station"] for b in BEACHES})
        obs_stations = sorted({b["obs_station"] for b in BEACHES}) if is_today else []

        surf, alerts, quality, buoys, tides, obs = await asyncio.gather(
            asyncio.gather(*[
                src.load("nws_surf", "NWS Surf Zone Forecasts", "https://www.weather.gov/beach/", f"srf-{o}",
                         lambda o=o: nws.fetch_surf_forecast(client, o, utc_offset), 30 * MINUTE)
                for o in nws.SURF_OFFICES
            ]),
            src.load("nws_alerts", "NWS active alerts", "https://alerts.weather.gov/", "alerts",
                     lambda: nws.fetch_alerts(client, zones), 5 * MINUTE),
            src.load("water_quality", "Texas Beach Watch (GLO) bacteria sampling", water_quality.SITE_URL,
                     "water-quality", lambda: water_quality.fetch_water_quality(client), 60 * MINUTE),
            src.load("buoys", "NDBC wave buoys", "https://www.ndbc.noaa.gov/", "buoys",
                     lambda: noaa.fetch_buoys(client), 10 * MINUTE) if is_today else asyncio.sleep(0),
            asyncio.gather(*[
                src.load("tides", "NOAA tide predictions", "https://tidesandcurrents.noaa.gov/", f"tides-{s}-{day}",
                         lambda s=s: noaa.fetch_tides(client, s, day), 6 * 60 * MINUTE)
                for s in tide_stations
            ]),
            asyncio.gather(*[
                src.load("sensors", "NOAA live water temperature & wind", "https://tidesandcurrents.noaa.gov/",
                         f"obs-{s}", lambda s=s: noaa.fetch_station_obs(client, s), 10 * MINUTE)
                for s in obs_stations
            ]),
        )

    surf_by_zone = {}
    for office_zones in surf:
        surf_by_zone.update(office_zones or {})
    issuing = sorted({z["office_name"] for z in surf_by_zone.values()})
    if "nws_surf" in src.status:
        src.status["nws_surf"]["detail"] = (
            f"Issued by {', '.join(issuing)}" if issuing else "No Surf Zone Forecasts are being issued right now"
        )
    tides_by_station = dict(zip(tide_stations, tides))
    obs_by_station = dict(zip(obs_stations, obs))

    results = []
    for beach, w, m in zip(BEACHES, weather, marine or [None] * len(BEACHES)):
        wh = w["hourly"]
        hourly = {
            "temp_f": day_slice(wh["temperature_2m"], day_index),
            "weather_code": day_slice(wh["weather_code"], day_index),
            "rain_chance": day_slice(wh["precipitation_probability"], day_index),
            "uv": day_slice(wh["uv_index"], day_index),
            "wind_mph": day_slice(wh["wind_speed_10m"], day_index),
            "wind_dir": day_slice(wh["wind_direction_10m"], day_index),
            "wave_ft": [None] * 24,
            "wave_period_s": [None] * 24,
            "water_f": [None] * 24,
        }
        if m:
            mh = m["hourly"]
            hourly["wave_ft"] = [
                None if v is None else round(v * 3.281 * (0.4 if beach["bay"] else 1), 1)
                for v in day_slice(mh["wave_height"], day_index)
            ]
            hourly["wave_period_s"] = day_slice(mh["wave_period"], day_index)
            hourly["water_f"] = [c_to_f(v) for v in day_slice(mh["sea_surface_temperature"], day_index)]
        hourly["crowd"] = estimate_crowds(beach, day, hourly)

        zone_surf = surf_by_zone.get(beach["nws_zone"])
        surf_info = None
        if zone_surf:
            surf_info = {k: zone_surf[k] for k in ("office", "office_name", "issued", "url")}
            surf_info["forecast"] = zone_surf["days"].get(day.isoformat())

        observed = None
        if is_today:
            station = obs_by_station.get(beach["obs_station"]) or {}
            buoy = (buoys or {}).get(beach["buoy"]) if beach["buoy"] else None
            observed = {
                "station": station.get("station"),
                "station_url": station.get("url"),
                "water": station.get("water"),
                "wind": station.get("wind"),
                "waves": buoy if buoy and recent(buoy["time"]) else None,
            }

        results.append({
            **{k: beach[k] for k in ("id", "name", "city", "lat", "lon", "tagline", "amenities", "bay", "nws_zone")},
            "patrol_url": beach.get("patrol_url"),
            "photo": beach.get("photo"),
            "cams": beach.get("cams", []),
            "date": day.isoformat(),
            "hourly": hourly,
            "sun": {
                "sunrise": w["daily"]["sunrise"][day_index][11:16],
                "sunset": w["daily"]["sunset"][day_index][11:16],
            },
            "tides": tides_by_station.get(beach["tide_station"]),
            "surf": surf_info,
            "alerts": nws.alerts_for_day((alerts or {}).get(beach["nws_zone"], []), day, utc_offset),
            "water_quality": water_quality.water_quality_near(quality, beach["lat"], beach["lon"]) if quality else None,
            "observed": observed,
        })

    return {
        "generated": datetime.now(timezone.utc).isoformat(),
        "days": days,
        "date": day.isoformat(),
        "utc_offset": utc_offset,
        "sources": list(src.status.values()),
        "beaches": results,
    }


@app.get("/travel")
async def get_travel(
    lat: float,
    lon: float,
    day: date = Query(None, description="Departure day, for traffic predictions"),
    hour: int = Query(None, ge=0, le=23, description="Departure hour, local time"),
    utc_offset: int = Query(-5 * 3600),
):
    """Drive times from (lat, lon) to every beach."""
    depart_at = None
    if day is not None and hour is not None:
        tz = timezone(timedelta(seconds=utc_offset))
        departure = datetime(day.year, day.month, day.day, hour, tzinfo=tz)
        if departure > datetime.now(timezone.utc) + timedelta(minutes=10):
            depart_at = departure.isoformat()

    origin = (round(lat, 3), round(lon, 3))
    ttl = 10 * MINUTE if os.environ.get("TOMTOM_API_KEY") else 24 * 60 * MINUTE
    async with httpx.AsyncClient(timeout=20) as client:
        hit = await cached(f"travel-{origin}-{depart_at}", lambda: travel.drive_times(client, origin, BEACHES, depart_at), ttl)
    return {**hit["value"], "depart_at": depart_at, "fetched": datetime.fromtimestamp(hit["fetched"], timezone.utc).isoformat()}


@app.get("/reviews")
async def get_reviews():
    """Google Maps and Yelp star ratings for every beach (display only, not part of the score)."""
    async with httpx.AsyncClient(timeout=20) as client:
        hit = await cached("reviews", lambda: reviews.fetch_reviews(client, BEACHES), 12 * 60 * MINUTE)
    return {**hit["value"], "fetched": datetime.fromtimestamp(hit["fetched"], timezone.utc).isoformat()}


_crowd_locks = {}


def find_cam(beach_id, cam):
    beach = next((b for b in BEACHES if b["id"] == beach_id), None)
    cams = beach.get("cams", []) if beach else []
    if not 0 <= cam < len(cams):
        raise HTTPException(status_code=404, detail="No such cam")
    frame_url = vision.youtube_frame_url(cams[cam]["embed"])
    if not frame_url:
        raise HTTPException(status_code=404, detail="AI crowd counting only works on YouTube cams for now")
    return frame_url


async def crowd_analysis(beach_id, cam):
    """The cached analysis for one cam, refreshed every 10 minutes. Concurrent requests for the
    same cam share one run, since a run takes several seconds of CPU."""
    frame_url = find_cam(beach_id, cam)
    key = f"crowd-{beach_id}-{cam}"
    lock = _crowd_locks.setdefault(key, asyncio.Lock())
    async with lock, httpx.AsyncClient(timeout=30) as client:
        async def run():
            result, jpg = await vision.analyze_frame(client, frame_url)
            return {"result": result, "jpg": jpg}

        return await cached(key, run, 10 * MINUTE)


@app.get("/crowd")
async def get_crowd(beach: str, cam: int = 0):
    """AI crowd count for one live cam: people boxes, a density map and the analyzed frame."""
    try:
        hit = await crowd_analysis(beach, cam)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Crowd analysis failed ({type(e).__name__})")
    fetched = datetime.fromtimestamp(hit["fetched"], timezone.utc).isoformat()
    return {**hit["value"]["result"], "frame": f"/crowd/frame?beach={beach}&cam={cam}&v={int(hit['fetched'])}",
            "fetched": fetched}


@app.get("/crowd/frame")
async def get_crowd_frame(beach: str, cam: int = 0):
    """The exact frame the crowd analysis ran on, so the overlay lines up with it."""
    hit = await crowd_analysis(beach, cam)
    return Response(hit["value"]["jpg"], media_type="image/jpeg", headers={"Cache-Control": "public, max-age=600"})
