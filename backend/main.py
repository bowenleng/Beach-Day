import time

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from beaches import BEACHES

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"
CACHE_SECONDS = 30 * 60

app = FastAPI()

# Enable CORS so the React frontend (dev and preview servers) can access this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:4173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_cache = {"time": 0.0, "data": None}


def fetch_uv():
    """Fetch the current UV and 7-day max UV for every beach in one Open-Meteo request."""
    params = {
        "latitude": ",".join(str(b["lat"]) for b in BEACHES),
        "longitude": ",".join(str(b["lon"]) for b in BEACHES),
        "current": "uv_index",
        "daily": "uv_index_max",
        "timezone": "America/Chicago",
        "forecast_days": 7,
    }
    res = httpx.get(OPEN_METEO_URL, params=params, timeout=15)
    res.raise_for_status()
    results = res.json()
    # A single location comes back as an object instead of a list
    if isinstance(results, dict):
        results = [results]

    beaches = []
    for beach, uv in zip(BEACHES, results):
        beaches.append({
            **beach,
            "uv_now": uv["current"]["uv_index"],
            "forecast": [
                {"date": day, "uv_max": uv_max}
                for day, uv_max in zip(uv["daily"]["time"], uv["daily"]["uv_index_max"])
            ],
        })
    return beaches


@app.get("/")
def root():
    return {"message": "Beach Day Planner API"}


@app.get("/beaches")
def get_beaches():
    if _cache["data"] is None or time.time() - _cache["time"] > CACHE_SECONDS:
        try:
            _cache["data"] = fetch_uv()
            _cache["time"] = time.time()
        except httpx.HTTPError as e:
            raise HTTPException(status_code=502, detail=f"Could not load UV data: {e}")
    return _cache["data"]
