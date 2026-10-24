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

- Texas beaches only, shown on a map.
- Live UV data from [Open-Meteo](https://open-meteo.com/) (free, no API key), fetched by the backend.
- The score is based only on UV and the user's sun preference (more sun vs. less sun).
- The what-to-bring checklist is saved in the browser (localStorage). It adds extra items on high-UV days.
- Next data sources to add: tides and rip currents (NOAA), weather, crowds.
