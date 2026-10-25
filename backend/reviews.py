"""Google Maps and Yelp star ratings for each beach. Shown for reference only, not used in the score.

Uses the Google Places API (GOOGLE_PLACES_API_KEY) and the Yelp Fusion API (YELP_API_KEY) when
those keys are set. Without a Google key, the Google rating copied into beaches.py is used instead;
without a Yelp key, Yelp is just a search link with no rating."""

import asyncio
import math
import os
from urllib.parse import quote_plus

from beaches import GOOGLE_AS_OF

GOOGLE_URL = "https://places.googleapis.com/v1/places:searchText"
GOOGLE_FIELDS = "places.displayName,places.rating,places.userRatingCount,places.googleMapsUri,places.location"
YELP_URL = "https://api.yelp.com/v3/businesses/search"
MAX_KM = 10  # ignore a match this far from the beach; it's probably a different place


def km_between(lat1, lon1, lat2, lon2):
    to_rad = math.radians
    a = (math.sin(to_rad(lat2 - lat1) / 2) ** 2
         + math.cos(to_rad(lat1)) * math.cos(to_rad(lat2)) * math.sin(to_rad(lon2 - lon1) / 2) ** 2)
    return 6371 * 2 * math.asin(math.sqrt(a))


def query_for(beach):
    return beach.get("review_query") or f"{beach['name']}, {beach['city']}, TX"


def saved_google(beach):
    """The hand-copied Google rating for a beach, or just a Maps search link if there isn't one."""
    g = beach.get("google")
    if not g:
        return {"url": f"https://www.google.com/maps/search/?api=1&query={quote_plus(query_for(beach))}"}
    return {
        "rating": g["rating"],
        "count": g["count"],
        "name": g["place"],
        "url": f"https://www.google.com/maps/search/?api=1&query={quote_plus(g['place'])}&query_place_id={g['place_id']}",
        "as_of": GOOGLE_AS_OF,
    }


def search_links(beach):
    return {
        "google": saved_google(beach),
        "yelp": {"url": f"https://www.yelp.com/search?find_desc={quote_plus(beach['name'])}"
                        f"&find_loc={quote_plus(beach['city'] + ', TX')}"},
    }


async def google_rating(client, key, beach):
    body = {
        "textQuery": query_for(beach),
        "maxResultCount": 1,
        "locationBias": {"circle": {"center": {"latitude": beach["lat"], "longitude": beach["lon"]}, "radius": 5000.0}},
    }
    res = await client.post(GOOGLE_URL, json=body, headers={"X-Goog-Api-Key": key, "X-Goog-FieldMask": GOOGLE_FIELDS})
    res.raise_for_status()
    places = res.json().get("places") or []
    if not places or places[0].get("rating") is None:
        return None
    p = places[0]
    loc = p.get("location") or {}
    if loc and km_between(beach["lat"], beach["lon"], loc["latitude"], loc["longitude"]) > MAX_KM:
        return None
    return {"rating": p["rating"], "count": p.get("userRatingCount", 0), "url": p.get("googleMapsUri"),
            "name": (p.get("displayName") or {}).get("text")}


async def yelp_rating(client, key, beach):
    params = {"term": beach["name"], "latitude": beach["lat"], "longitude": beach["lon"],
              "radius": MAX_KM * 1000, "categories": "beaches", "limit": 1}
    res = await client.get(YELP_URL, params=params, headers={"Authorization": f"Bearer {key}"})
    res.raise_for_status()
    businesses = res.json().get("businesses") or []
    if not businesses:
        return None
    b = businesses[0]
    return {"rating": b["rating"], "count": b.get("review_count", 0), "url": b.get("url"), "name": b.get("name")}


async def fetch_reviews(client, beaches):
    """{providers: {google, yelp}, notes, beaches: {beach_id: {google: {...}, yelp: {...}}}}.
    Each site's entry always has a url; rating and count are only there when the API answered."""
    keys = {"google": os.environ.get("GOOGLE_PLACES_API_KEY"), "yelp": os.environ.get("YELP_API_KEY")}
    lookups = {"google": google_rating, "yelp": yelp_rating}
    out = {b["id"]: search_links(b) for b in beaches}
    providers, notes = {}, {}

    for site, key in keys.items():
        providers[site] = False
        if not key:
            continue
        results = await asyncio.gather(*[lookups[site](client, key, b) for b in beaches], return_exceptions=True)
        errors = [r for r in results if isinstance(r, Exception)]
        for b, r in zip(beaches, results):
            if r and not isinstance(r, Exception):
                out[b["id"]][site] = {**r, "url": r["url"] or out[b["id"]][site]["url"]}
                providers[site] = True
        if errors and not providers[site]:
            notes[site] = f"Request failed ({type(errors[0]).__name__}); check the API key"

    return {"providers": providers, "notes": notes, "beaches": out}
