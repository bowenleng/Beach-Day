"""National Weather Service data: Surf Zone Forecasts (official rip current risk) and active alerts.
Docs: https://www.weather.gov/documentation/services-web-api"""

import re
from datetime import date, datetime, timedelta, timezone

API = "https://api.weather.gov"
# NWS asks every client to identify itself
HEADERS = {"User-Agent": "BeachDayPlanner/0.2 (github.com/bowenleng/Beach-Day-Planner-App)", "Accept": "application/geo+json"}

# Offices that cover the Texas coast. Houston/Galveston only issues its Surf Zone Forecast in season.
SURF_OFFICES = ["BRO", "CRP", "HGX"]
OFFICE_NAMES = {"BRO": "Brownsville", "CRP": "Corpus Christi", "HGX": "Houston/Galveston"}

WEEKDAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]
FIELDS = {
    "rip current risk": "rip_risk",
    "surf height": "surf_height",
    "thunderstorm potential": "thunder",
    "uv index": "uv",
    "water temperature": "water_temp",
    "weather": "weather",
    "winds": "winds",
}


def expand_ugc(line):
    """'TXZ451-454-455-250000-' -> ['TXZ451', 'TXZ454', 'TXZ455']. Handles 'TXZ451>455' ranges too."""
    zones, prefix = [], None
    for token in line.strip().strip("-").split("-"):
        m = re.fullmatch(r"([A-Z]{2}[ZC])?(\d{3})(?:>(\d{3}))?", token)
        if not m:
            continue  # the trailing ddhhmm expiration time
        prefix = m.group(1) or prefix
        start, end = int(m.group(2)), int(m.group(3) or m.group(2))
        zones += [f"{prefix}{n:03d}" for n in range(start, end + 1)]
    return zones


def period_date(name, issued):
    """The calendar date a daytime period like 'TODAY' or 'SUNDAY' refers to, or None for night periods."""
    if "NIGHT" in name:
        return None
    if name in ("TODAY", "REST OF TODAY", "THIS MORNING", "THIS AFTERNOON"):
        return issued
    for i in range(8):
        d = issued + timedelta(days=i)
        if WEEKDAYS[d.weekday()] == name:
            return d
    return None


def parse_segment(text, issued):
    """One zone group of a Surf Zone Forecast -> {date: {rip_risk, surf_height, ...}}."""
    days = {}
    detailed, _, extended = text.partition(".EXTENDED...")

    # Detailed periods: ".TODAY..." followed by "Rip Current Risk*......Moderate." lines
    for block in re.split(r"^\.(?=[A-Z])", detailed, flags=re.M)[1:]:
        name, _, body = block.partition("...")
        d = period_date(name.strip(), issued)
        if not d:
            continue
        values, key = {}, None
        for line in body.splitlines():
            m = re.match(r"^([A-Za-z ]+?)\**\.{2,}\s*(.*)$", line)
            if m:
                key = FIELDS.get(m.group(1).strip().lower())
                if key:
                    values[key] = m.group(2).strip()
            elif key and line.startswith(" ") and not re.search(r"\.{2,}", line):
                values[key] += " " + line.strip()  # wrapped continuation line
            else:
                key = None
        days[d.isoformat()] = {k: v.rstrip(".") for k, v in values.items()}

    # Extended outlook: ".MONDAY...Surf height 3 to 4 feet. Partly sunny..." (no rip risk this far out)
    for m in re.finditer(r"^\.([A-Z ]+?)\.\.\.(.*?)(?=^\.[A-Z]|\Z|^&&)", extended, flags=re.M | re.S):
        d = period_date(m.group(1).strip(), issued)
        surf = re.search(r"Surf height ([^.]+)\.", " ".join(m.group(2).split()))
        if d and surf and d.isoformat() not in days:
            days[d.isoformat()] = {"surf_height": surf.group(1)}
    return days


async def fetch_surf_forecast(client, office, utc_offset):
    """Latest Surf Zone Forecast for one office -> {zone: {...}} or {} when none is being issued."""
    res = await client.get(f"{API}/products/types/SRF/locations/{office}", headers=HEADERS)
    res.raise_for_status()
    products = res.json().get("@graph", [])
    if not products:
        return {}
    product = (await client.get(products[0]["@id"], headers=HEADERS)).json()
    issued_at = datetime.fromisoformat(product["issuanceTime"])
    # Older than 2 days means the office has stopped issuing it for the season
    if datetime.now(timezone.utc) - issued_at > timedelta(days=2):
        return {}
    issued_local = (issued_at + timedelta(seconds=utc_offset)).date()

    zones = {}
    for segment in product["productText"].split("$$"):
        ugc = re.search(r"^([A-Z]{2}Z[\d>\-]+-)\s*$", segment, flags=re.M)
        if not ugc:
            continue
        info = {
            "office": office,
            "office_name": OFFICE_NAMES[office],
            "issued": product["issuanceTime"],
            "url": f"https://www.weather.gov/beach/{office.lower()}",
            "days": parse_segment(segment, issued_local),
        }
        for zone in expand_ugc(ugc.group(1)):
            zones[zone] = info
    return zones


async def fetch_alerts(client, zones):
    """Active NWS alerts for the given zones -> {zone: [alert, ...]}."""
    res = await client.get(f"{API}/alerts/active", params={"zone": ",".join(sorted(zones))}, headers=HEADERS)
    res.raise_for_status()
    by_zone = {z: [] for z in zones}
    for feature in res.json().get("features", []):
        p = feature["properties"]
        alert = {
            "id": p["id"],
            "event": p["event"],
            "headline": p.get("headline"),
            "severity": p.get("severity"),
            "urgency": p.get("urgency"),
            "onset": p.get("onset") or p.get("effective"),
            "ends": p.get("ends") or p.get("expires"),
            "description": p.get("description"),
            "instruction": p.get("instruction"),
            "sender": p.get("senderName"),
            "url": f"https://alerts.weather.gov/search?id={p['id']}",
        }
        for zone_url in p.get("affectedZones", []):
            zone = zone_url.rsplit("/", 1)[-1]
            if zone in by_zone:
                by_zone[zone].append(alert)
    return by_zone


def alerts_for_day(alerts, day: date, utc_offset):
    """Alerts that are in effect at some point during the given local day."""
    tz = timezone(timedelta(seconds=utc_offset))
    start = datetime.combine(day, datetime.min.time(), tz)
    end = start + timedelta(days=1)
    result = []
    for a in alerts:
        onset = datetime.fromisoformat(a["onset"]) if a["onset"] else start
        ends = datetime.fromisoformat(a["ends"]) if a["ends"] else end
        if onset < end and ends > start:
            result.append(a)
    return result
