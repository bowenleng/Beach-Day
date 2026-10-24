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
- Inputs: starting city, beach day (the next 7 days), and time at the beach.
- Preferences, saved in the browser: crowd tolerance, sun/UV preference and swimming level.
- Each beach gets a 0–100 match score from five weighted factors:
  - Swimming 35%: wave height, rip risk, water temperature
  - Crowds 25%
  - UV comfort 15%
  - Weather 15%: rain, temperature, wind, thunderstorms
  - Travel 10%
- The "Why this score?" card shows the breakdown. Safety warnings always show, whatever the score.
- Saved beaches are kept in the browser (localStorage). There are no accounts.

### Data sources (all free, no keys)
| Data | Source | Notes |
|---|---|---|
| Weather, UV, wind | Open-Meteo forecast API | Hourly, 7 days |
| Waves, water temp | Open-Meteo marine API | Bay beaches have wave height scaled down |
| Tides | NOAA CO-OPS predictions | Nearest station per beach (set in `backend/beaches.py`) |
| Rip current risk | **Estimate** from wave height and period | Not the official NWS rip current forecast |
| Crowds | **Estimate** from popularity, weekend/holiday, season, hour and weather | No real crowd data yet |
| Travel time | **Estimate** from straight-line distance | No traffic |

### Ideas for next steps
- Use the official NWS surf zone forecast for rip current risk.
- Real crowd data, such as parking or foot-traffic APIs.
- Projections beyond 7 days using historical averages.
- The planning page: budget per person, what to bring, warnings.
- Double-check the hand-entered beach amenities in `backend/beaches.py`.
