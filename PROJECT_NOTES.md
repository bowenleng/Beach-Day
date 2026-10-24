# Project Notes: Beach Day Planner

Direction and design notes for the project. For setup and run instructions, see [README.md](README.md).

## Goal

A web app that aggregates beach data (tide, UV, rip currents, crowds, weather) and gives each beach a score. People can use it to plan trips or to decide which beach to go to.

- Could average the score from historical data over the past year or another time frame.
- Could add wave/surfing data, or even fishing, in the future.
- NOAA has a lot of open-source live and historical data.

## Core ideas

- **User preferences**, for example:
  - Crowds preferred or not
  - High or low UV index (e.g. for tanning)
- **Map** showing beaches and their scores
- **Item checklist**: what to bring
- **Cost** to travel and plan (per person)
- **Warnings** for poor days
- **Projections** for some statistics
  - People plan vacations months in advance. Example: set the date to sometime in 2028 and see beaches that may match the selected conditions. Projections can be turned on or off.
  - Some stats shouldn't be projected even a month ahead because they're volatile, such as weather. A confidence value could be used in the score.
  - Stats that could be projected: crowd sizes, holidays.

## Potential features

### Account system
- **Why:** saving beaches. These could just be stored locally, though.
- **Why not:** may be too time-consuming. We'll probably do a primitive system, and the demo probably doesn't need an account creation process.

### Item checklist
- **Why:** a list of items so people don't forget essentials.
- **Why not:** does the list even change depending on the beach or conditions? Probably not, but a list might still be helpful.
- **Considerations:** which items should we list?

## Current state (prototype)

The app is split into pages. **Discover** (finding a beach) is built. Planning, budget and what to bring will be separate pages after it.

### Discover
- 12 Texas beaches on an OpenStreetMap map. No API key needed.
- Inputs: starting point (a city or "my location"), beach day (the next 16 days), and time at the beach.
- Preferences, saved in the browser: crowd tolerance, sun/UV preference and swimming level.
- Each beach gets a 0–100 match score from five weighted factors:
  - Swimming 35%: waves, official rip risk, water temperature, bacteria advisories, NWS water alerts
  - Crowds 25% (still an estimate, see below)
  - UV comfort 15%
  - Weather 15%: rain, temperature, wind, thunderstorms, NWS warnings
  - Travel 10%
- The beach card has three tabs: **Conditions**, **Safety** (NWS alerts, rip risk, water quality, flag guide) and **Sources** (where every number came from).
- Every number has a colored dot: measured, official, lab sample, forecast or estimate. The header "Live data" menu shows each source's status and freshness.
- Safety warnings always show, whatever the score.
- Saved beaches are kept in the browser (localStorage). There are no accounts.

### Data sources (all free)
| Data | Source | Notes |
|---|---|---|
| Weather, UV, wind forecast, sunrise/sunset | Open-Meteo forecast API | Hourly, 16 days |
| Wave and water-temp forecast | Open-Meteo marine API | Bay beaches have wave height scaled down |
| **Live** water temperature and wind | NOAA CO-OPS sensors | Today only; `obs_station` per beach |
| **Live** waves | NDBC buoys 42035, 42092, PHCT2 | Today only, beaches with a buoy close enough |
| Rip current risk, surf height | **NWS Surf Zone Forecasts** (Brownsville, Corpus Christi, Houston/Galveston when in season) | Covers about 2 days. Otherwise an estimate from waves, labeled as such |
| Alerts (rip current statements, beach hazards, storms, heat, flooding…) | NWS active alerts API | By NWS zone, `nws_zone` per beach |
| Water quality (Enterococcus bacteria) | Texas GLO Beach Watch ArcGIS layer | Worst result among sampling stations within 5 km |
| Tides | NOAA CO-OPS predictions | `tide_station` per beach |
| Drive time | TomTom (with traffic) if `TOMTOM_API_KEY` is set, else OSRM road routing, else straight-line estimate | |
| Crowds | **Estimate** from popularity, weekend/holiday, season, hour and weather | No real crowd data yet (planned) |
| Beach flags | Not published online in machine-readable form | Flag guide shown; Galveston links to its live flag page |

### Ideas for next steps
- Live crowd data. See the beach-cam computer vision idea.
- Projections beyond 16 days using historical averages (Open-Meteo archive).
- The planning page: budget per person, what to bring, warnings.
- Amenities from OpenStreetMap instead of hand-entered lists in `backend/beaches.py`.
