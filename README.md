# Beach Day Planner Website
## Overview
Hackathon project. A web app that scores Texas beaches so you can pick the best one for your day. It currently uses live UV data from [Open-Meteo](https://open-meteo.com/).

For project direction and design notes, see [PROJECT_NOTES.md](PROJECT_NOTES.md).

## Requirements
- [Node.js](https://nodejs.org) (includes npm)
- [uv](https://docs.astral.sh/uv/) for Python: `winget install astral-sh.uv`

No API keys are needed.

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
