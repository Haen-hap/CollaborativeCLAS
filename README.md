# CCLAS · Colaborativ Literacy Assessment System

Complete project: **frontend** (PWA game featuring Nina) + **backend** (FastAPI + PostgreSQL, the same backend as your project).

```text
CCLAS-Nina/
├── backend/      FastAPI API, models, migrations (Alembic), tests, seed
├── frontend/     Static PWA (HTML + CSS + JS, no build required)
└── Community_Literacy_Dummy_Database_v2.xlsx   (used for seeding)
```

## Run everything (single server)

Requires Python 3.11+ and PostgreSQL.

```bash
cd backend
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                                   # edit DATABASE_URL
alembic upgrade head
python -m scripts.seed --excel ../Community_Literacy_Dummy_Database_v2.xlsx   # optional
uvicorn app.main:app --reload
```

- Game: http://localhost:8000/app/
- API and documentation: http://localhost:8000/docs
- Kiosk: `/app/?kiosk=PTYK001` · Assisted mode: `&assisted=1`

The backend serves the `frontend/` folder at `/app`, so there is no need to run a separate server or configure CORS.

If you prefer to serve the frontend separately (`python3 -m http.server 8080` inside `frontend/`), edit `frontend/js/config.js` and set:

```javascript
window.CCLAS_API = "http://localhost:8000";
```

## How it works

- When a game is completed (or abandoned), the game sends the anonymous session to `POST /api/sessions`.
- If there is no network connection, the session is stored in a local queue (`cclas_outbox`) and sent when the connection is restored.
- The game has 13 questions (3+3+3+4). The backend and database expect the score from the Excel file (maximum 2+2+2+3 = 9), so the frontend **scales** each challenge before sending it. This avoids modifying the database migrations or CHECK constraints.
- RED ≤3 · YELLOW 4–6 · GREEN ≥7 (out of 9). The server recalculates the total score and classification.
- To view data: `GET /api/sessions` and `GET /api/metrics` with the header `X-Dashboard-Pin: 2026`.

## Pending items

- Official zone table Z001–Z036: currently uses the provisional catalog in `backend/app/core/zones_data.py` (the Excel file says Z020 = Ancón, while the backend says Z003; this needs to be confirmed with the client).
- The `/datos` dashboard (traffic-light map, action plan) from your React project has not been ported; the API is available.
- Actual IoT endpoint for the Smart Oasis Kiosk (currently a 4-digit code is provided).
- I have not tested the backend against a database here; run `pytest` on your machine.
