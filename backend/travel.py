"""Drive times from a starting point to every beach.

Uses TomTom (live and predicted traffic) when TOMTOM_API_KEY is set, otherwise the free OSRM
road router (real roads, no traffic). If both fail it falls back to a straight-line estimate."""

import asyncio
import math
import os

TOMTOM_URL = "https://api.tomtom.com/routing/1/calculateRoute/{}/json"
OSRM_URL = "https://router.project-osrm.org/table/v1/driving/{}"
METERS_PER_MILE = 1609.34


def estimate(origin, beach):
    """Straight-line distance padded for roads, at highway-ish speeds."""
    to_rad = math.radians
    a = (math.sin(to_rad(beach["lat"] - origin[0]) / 2) ** 2
         + math.cos(to_rad(origin[0])) * math.cos(to_rad(beach["lat"])) * math.sin(to_rad(beach["lon"] - origin[1]) / 2) ** 2)
    miles = 3959 * 2 * math.asin(math.sqrt(a)) * 1.25
    return {"minutes": round(10 + miles / 55 * 60), "miles": round(miles), "source": "estimate"}


async def tomtom_route(client, key, origin, beach, depart_at):
    params = {"key": key, "traffic": "true", "travelMode": "car", "routeType": "fastest"}
    if depart_at:
        params["departAt"] = depart_at
    points = f"{origin[0]},{origin[1]}:{beach['lat']},{beach['lon']}"
    res = await client.get(TOMTOM_URL.format(points), params=params)
    res.raise_for_status()
    s = res.json()["routes"][0]["summary"]
    return {
        "minutes": round(s["travelTimeInSeconds"] / 60),
        "miles": round(s["lengthInMeters"] / METERS_PER_MILE),
        "delay_minutes": round(s.get("trafficDelayInSeconds", 0) / 60),
        "source": "tomtom",
    }


async def osrm_table(client, origin, beaches):
    """One request for all beaches using OSRM's table service."""
    coords = ";".join([f"{origin[1]},{origin[0]}"] + [f"{b['lon']},{b['lat']}" for b in beaches])
    res = await client.get(OSRM_URL.format(coords), params={"sources": 0, "annotations": "duration,distance"})
    res.raise_for_status()
    data = res.json()
    if data.get("code") != "Ok":
        raise ValueError(data.get("message", "OSRM error"))
    durations, distances = data["durations"][0][1:], data["distances"][0][1:]
    return {
        b["id"]: {"minutes": round(t / 60), "miles": round(d / METERS_PER_MILE), "source": "osrm"}
        for b, t, d in zip(beaches, durations, distances)
        if t is not None
    }


async def drive_times(client, origin, beaches, depart_at=None):
    """{beach_id: {minutes, miles, source, delay_minutes?}} plus which provider answered."""
    routes, provider, note = {}, "estimate", None
    key = os.environ.get("TOMTOM_API_KEY")

    if key:
        results = await asyncio.gather(
            *[tomtom_route(client, key, origin, b, depart_at) for b in beaches], return_exceptions=True
        )
        for b, r in zip(beaches, results):
            if not isinstance(r, Exception):
                routes[b["id"]] = r
        if routes:
            provider = "tomtom"
        else:
            note = "TomTom request failed; check the API key"

    missing = [b for b in beaches if b["id"] not in routes]
    if missing:
        try:
            routes.update(await osrm_table(client, origin, missing))
            if provider == "estimate":
                provider = "osrm"
        except Exception as e:
            note = note or f"Road routing unavailable ({type(e).__name__})"

    for b in beaches:
        routes.setdefault(b["id"], estimate(origin, b))
    return {"provider": provider, "traffic": provider == "tomtom", "note": note, "routes": routes}
