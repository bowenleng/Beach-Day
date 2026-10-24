"""Bacteria (Enterococcus) sampling results from the Texas General Land Office's Beach Watch program.
This is the public map layer behind https://www.texasbeachwatch.com/"""

import math

LAYER_URL = "https://gisweb.glo.texas.gov/arcgis/rest/services/BW/BW2025_Summary/MapServer/0/query"
SITE_URL = "https://www.texasbeachwatch.com/"
MAX_DISTANCE_KM = 5
LEVEL_RANK = {"Low": 0, "Medium": 1, "High": 2}


async def fetch_water_quality(client):
    """Every sampling station's most recent result."""
    params = {
        "where": "1=1",
        "outFields": "Station_ID,Name,stationname,Advisory,cfu,Measurement,Date,Lat_DD,Long_DD",
        "returnGeometry": "false",
        "f": "json",
    }
    res = await client.get(LAYER_URL, params=params)
    res.raise_for_status()
    stations = []
    for f in res.json().get("features", []):
        a = f["attributes"]
        if a.get("Lat_DD") is None or not a.get("Advisory"):
            continue
        month, day, year = a["Date"].split("/")
        stations.append({
            "id": a["Station_ID"].strip(),
            "name": f'{a["Name"]} – {a["stationname"]}'.strip(" –"),
            "level": a["Advisory"],
            "result": a["Measurement"],
            "date": f"{year}-{int(month):02d}-{int(day):02d}",
            "lat": a["Lat_DD"],
            "lon": a["Long_DD"],
        })
    return stations


def distance_km(lat1, lon1, lat2, lon2):
    to_rad = math.radians
    a = (math.sin(to_rad(lat2 - lat1) / 2) ** 2
         + math.cos(to_rad(lat1)) * math.cos(to_rad(lat2)) * math.sin(to_rad(lon2 - lon1) / 2) ** 2)
    return 6371 * 2 * math.asin(math.sqrt(a))


def water_quality_near(stations, lat, lon):
    """Worst current result among sampling stations within MAX_DISTANCE_KM of a beach, or None."""
    nearby = []
    for s in stations:
        d = distance_km(lat, lon, s["lat"], s["lon"])
        if d <= MAX_DISTANCE_KM:
            nearby.append({**s, "distance_km": round(d, 1)})
    if not nearby:
        return None
    nearby.sort(key=lambda s: (-LEVEL_RANK.get(s["level"], 0), s["distance_km"]))
    worst = nearby[0]
    return {**worst, "stations_checked": len(nearby), "url": SITE_URL}
