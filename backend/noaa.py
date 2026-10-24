"""NOAA data: tide predictions and live sensors (CO-OPS), and live wave buoys (NDBC)."""

import asyncio
from datetime import datetime, timezone

TIDES_URL = "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter"
BUOYS_URL = "https://www.ndbc.noaa.gov/data/latest_obs/latest_obs.txt"
STATION_PAGE = "https://tidesandcurrents.noaa.gov/stationhome.html?id={}"
BUOY_PAGE = "https://www.ndbc.noaa.gov/station_page.php?station={}"


async def fetch_tides(client, station, day):
    """Hourly tide heights and the day's highs/lows (feet, MLLW) for one station."""
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
        "station": station,
        "url": STATION_PAGE.format(station),
        "hourly": [float(p["v"]) for p in hourly.json()["predictions"]][:24],
        "extremes": [
            {"time": p["t"][11:16], "height": float(p["v"]), "type": "high" if p["type"] == "H" else "low"}
            for p in hilo.json()["predictions"]
        ],
    }


async def fetch_station_obs(client, station):
    """Latest measured water temperature (°F) and wind (mph) at a CO-OPS station.
    Either part is None when that sensor isn't reporting."""
    params = {"station": station, "date": "latest", "units": "english", "time_zone": "lst_ldt",
              "format": "json", "application": "beach_day_planner"}
    water, wind = await asyncio.gather(
        client.get(TIDES_URL, params={**params, "product": "water_temperature"}),
        client.get(TIDES_URL, params={**params, "product": "wind"}),
    )
    result = {"station": station, "url": STATION_PAGE.format(station), "water": None, "wind": None}
    w = water.json().get("data")
    if w and w[0].get("v"):
        result["water"] = {"f": float(w[0]["v"]), "time": w[0]["t"]}
    d = wind.json().get("data")
    if d and d[0].get("s"):
        knots_to_mph = 1.15078
        result["wind"] = {
            "mph": round(float(d[0]["s"]) * knots_to_mph),
            "gust_mph": round(float(d[0]["g"]) * knots_to_mph) if d[0].get("g") else None,
            "direction": d[0].get("dr"),
            "time": d[0]["t"],
        }
    return result


async def fetch_buoys(client):
    """Latest observation from every NDBC station -> {station: {wave_ft, period_s, time}} for those
    currently measuring waves. One small text file covers all of them."""
    res = await client.get(BUOYS_URL)
    res.raise_for_status()
    buoys = {}
    for line in res.text.splitlines():
        if line.startswith("#"):
            continue
        cols = line.split()
        if len(cols) < 14 or cols[11] == "MM":
            continue
        observed = datetime(int(cols[3]), int(cols[4]), int(cols[5]), int(cols[6]), int(cols[7]), tzinfo=timezone.utc)
        buoys[cols[0]] = {
            "station": cols[0],
            "url": BUOY_PAGE.format(cols[0]),
            "wave_ft": round(float(cols[11]) * 3.281, 1),
            "period_s": None if cols[12] == "MM" else float(cols[12]),
            "time": observed.isoformat(),
            "lat": float(cols[1]),
            "lon": float(cols[2]),
        }
    return buoys
