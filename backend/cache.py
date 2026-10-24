"""Small helpers shared by the data sources: an in-memory cache and .env loading."""

import os
import time
from pathlib import Path

_cache = {}


async def cached(key, fetch, ttl):
    """Return a cached value for key, refreshing it with fetch() once it's older than ttl seconds.
    The value is stored with the time it was fetched, so the UI can say how fresh it is."""
    hit = _cache.get(key)
    if hit and time.time() - hit["fetched"] < ttl:
        return hit
    value = await fetch()
    _cache[key] = {"value": value, "fetched": time.time()}
    return _cache[key]


def load_env_file(path=Path(__file__).parent / ".env"):
    """Load KEY=VALUE lines from backend/.env without overriding real environment variables."""
    if not path.exists():
        return
    for line in path.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))
