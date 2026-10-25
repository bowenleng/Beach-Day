# Beach Day: Project Notes

**Find the best Texas beach for your day.** Beach Day ranks 13 Texas Gulf Coast beaches for the day, time window and kind of beach trip you choose. It uses live public data on weather, waves, rip currents, water quality, tides, drive times and crowds.

For setup and run instructions, see [README.md](README.md).

---

## The problem

Choosing a beach on the Texas coast means checking a weather app, a surf report, the NWS rip current forecast, bacteria test results, tide tables and a map, then guessing how crowded it will be. None of these sources talk to each other, and none of them know what *you* want from the day. A family wading with small kids and a surfer chasing waves should get different answers on the same morning.

## What it does

You describe your trip in one sentence:

> Leaving **Houston** on **Saturday**, from **10 am–3 pm**, driving up to **2 hours**.

Then you set four preferences: crowds (quiet, normal or lively), sun (gentle, sunny or strong), water (staying dry, wading or swimming) and waves (calm, some or big).

Beach Day scores every reachable beach from 0 to 100 and explains its top pick in plain language ("Flat, calm water, likely quiet, only 1 hr away. But: strong sun.").

## Features

- **Ranked list and map.** Every beach within your drive limit is ranked. On the map, each beach is a circle colored by its score. Beaches past your limit appear as small muted dots, with a one-click option to include them.
- **Top pick.** The best beach leads the page with a photo, its score on an animated tide gauge, the rip current outlook and a Directions link.
- **Conditions for your window.** The page shows weather, wind, UV, waves, water temperature, rip current risk, crowds, tide and daylight for the hours you'll be there. While today's window is under way, live NOAA sensor and buoy readings appear next to the forecast.
- **Lifeguard flags.** Each beach, and each hazard, gets the flag color a lifeguard would likely fly based on the forecast. A flag guide explains what each color means.
- **Safety first.** NWS alerts, bacteria advisories, thunderstorm and UV warnings always show, whatever the score.
- **Score breakdown.** Shows every part of the score: its score out of 100, its weight, the points it adds, and any long-drive penalty.
- **Where the numbers come from.** Shows the source of every value and whether it's official, measured, forecast or estimated.
- **Live cams with AI crowd levels.** 12 live cams across 5 beaches play on the page. Each one shows a Quiet, Moderate or Busy level, counted by computer vision on the server.
- **Fast browsing.** Up and down buttons step through the ranking, and the open tab stays put as you switch beaches. You can flip through every beach's cams without scrolling.
- **Ratings.** Google and Yelp star ratings are shown for reference. They aren't part of the score.
- **No accounts.** Preferences are saved in the browser.
- **Responsive layout.** Works on phones, tablets and desktops.

## How the score works

Each beach gets five part scores, each from 0 to 100 and each measured against your preferences:

| Part | Weight | What it measures |
|---|---|---|
| Water | 30% | Waves against what you want, rip current risk, bacteria, water temperature and NWS water alerts. Hazards cost more the more time you'll spend in the water. |
| Crowds | 20% | Expected crowd against how busy you like it |
| Drive | 20% | Round-trip drive compared to your hours on the sand |
| Sun | 15% | Peak UV against the sun you want |
| Weather | 15% | Rain chance, temperature, wind, thunderstorms and weather warnings |

The total is the weighted sum. A beach also loses up to 30 points when the round trip takes longer than your time on the sand. A score of 75 or more is a great day, 60–74 is mixed, and under 60 is rough. Ties go to the shorter drive.

Beaches past your drive limit, with 10 minutes of grace, or ones you'd reach with less than an hour left in your window, are listed separately instead of ranked.

## Data sources

Every source is free, and none needs an API key unless noted.

| Data | Source |
|---|---|
| Weather, UV, wind, sunrise and sunset (16 days, hourly) | [Open-Meteo](https://open-meteo.com/) forecast API |
| Wave and water temperature forecasts | Open-Meteo marine API (wave heights scaled down for bay beaches) |
| Rip current risk and surf height | [NWS](https://www.weather.gov/beach/) Surf Zone Forecasts (Brownsville, Corpus Christi, Houston/Galveston) |
| Alerts (rip currents, beach hazards, storms, heat, flooding) | NWS alerts API, by forecast zone |
| Tides | [NOAA CO-OPS](https://tidesandcurrents.noaa.gov/) predictions |
| Live water temperature and wind | NOAA CO-OPS sensors |
| Live wave heights | NDBC buoys 42035, 42092 and PHCT2 |
| Water quality (Enterococcus bacteria) | [Texas Beach Watch](https://www.texasbeachwatch.com/) (Texas GLO ArcGIS layer), worst result within 5 km |
| Drive times | TomTom with traffic (optional key), then OSRM road routing, then a straight-line estimate |
| Star ratings | Google Places and Yelp Fusion (optional keys) |
| Map | Esri World Light Gray Base tiles, recolored to the app's palette |
| Photos | Wikimedia Commons and Flickr, credited in the app |
| Live cams | YouTube, Ozolio, Brownrice and ipcamlive players, embedded from their owners |

## Computer vision crowd counting

The browser won't let a page read pixels from another site's video player, so the backend fetches a still frame from each cam itself. Each provider needs a different method: YouTube's live thumbnail, Ozolio's poster image, and Brownrice's and ipcamlive's snapshot links.

Two models run on each frame on the CPU:

- **YOLOX-S** (ONNX Runtime) detects individual people. It works best when only a few people are in view.
- **DM-Count** (LiteRT) estimates a crowd density map. It works best on dense crowds, where a detector misses people who overlap.

Distant people on a wide beach cam are only a few pixels tall. To keep them visible, the frame is split into overlapping tiles that are analyzed at full resolution, and duplicate detections are merged afterward. The count is the larger of the two models' results. Night frames are skipped, and results are cached for 10 minutes per cam.

## Tech stack

- **Frontend:** React 19, Vite, Leaflet with react-leaflet, and plain CSS with color tokens. Fonts are Big Shoulders Display and Public Sans.
- **Backend:** Python 3.11, FastAPI and httpx, which makes all the data requests in parallel. Results are cached in memory, and uv manages dependencies.
- **Computer vision:** ONNX Runtime, LiteRT, NumPy and Pillow.

## Challenges

- **Cams that block embedding.** Many beach cams, including HDOnTap's Port Aransas condo cams, tell browsers they may only play on their own sites. We kept only cams whose owners allow embedding.
- **Getting frames without an API.** None of the cam providers document a way to get still frames. Each method had to be found in the player's own code and checked for freshness.
- **Data that's sometimes missing.** NWS surf forecasts cover only about two days and aren't always issued for Galveston. Each value falls back to the next-best source, and estimates are labeled as estimates.
- **Honest scoring.** A score can hide important details, so safety warnings are shown separately and never folded into a good score.

## Limitations

- The crowd part of the score comes from a model based on the day, season, hour and weather. The AI cam counts are shown, but they aren't used in the score yet.
- AI counts include people on patios, roads and piers, and the Quiet/Moderate/Busy thresholds are the same for every cam.
- Beach flag colors are our reading of the forecast. No machine-readable feed of the flags actually flying exists.
- Amenities were entered by hand.

## What we'd build next

- Feed the AI cam counts into the crowd score, with per-cam calibration and masks so roads and patios aren't counted.
- Long-range projections from historical data, so people can plan trips months ahead.
- Trip planning: cost per person, a what-to-bring checklist and reminders.
- Amenities from OpenStreetMap.
- More beaches and more cams, starting with asking cam owners for permission to embed.
