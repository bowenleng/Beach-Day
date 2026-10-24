# Beach Day Planner Website
## Overview
Hackathon project. A web app that scores Texas beaches against your preferences so you can pick the best one for your day. It combines live data from [Open-Meteo](https://open-meteo.com/) (forecasts), [NOAA](https://tidesandcurrents.noaa.gov/) (tides, live water temperature, wind and wave buoys), the [National Weather Service](https://www.weather.gov/beach/) (rip current forecasts and alerts) and [Texas Beach Watch](https://www.texasbeachwatch.com/) (bacteria sampling). The map uses [OpenStreetMap](https://www.openstreetmap.org/). See [PROJECT_NOTES.md](PROJECT_NOTES.md) for the full list of sources.

For project direction and design notes, see [PROJECT_NOTES.md](PROJECT_NOTES.md).

## Requirements
- [Node.js](https://nodejs.org) (includes npm)
- [uv](https://docs.astral.sh/uv/) for Python: `winget install astral-sh.uv`

No API keys are needed. Optionally, for drive times with live traffic, get a free [TomTom](https://developer.tomtom.com/) key, copy `backend/.env.example` to `backend/.env` and set `TOMTOM_API_KEY`. Without it, drive times use real roads but no traffic. `GOOGLE_PLACES_API_KEY` and `YELP_API_KEY` add Google Maps and Yelp star ratings to each beach; without them the app just links to those sites.

## Running the website
Run the backend and frontend in two separate terminals.

If PowerShell blocks scripts, first run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` in that terminal.

### Backend (terminal 1)
```
cd backend
uv run fastapi dev main.py
```
The API runs at http://127.0.0.1:8000. `uv run` installs the Python dependencies automatically the first time.

### Frontend (terminal 2)
```
cd frontend
npm install
npm run dev
```
Then open http://localhost:5173. The page reloads automatically when you edit files in `src`.

Press Ctrl+C in a terminal to stop that server.
