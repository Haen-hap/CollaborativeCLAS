# CCLAS · Colaborativ Literacy Assessment System

Complete project: **frontend** (PWA game featuring Nina + React Dashboard/Forms) + **backend** (FastAPI + PostgreSQL).

```text
CCLAS/
├── backend/      FastAPI API, models, migrations (Alembic), tests, seed
├── frontend/     PWA game (HTML + CSS + JS) + React Dashboard (/datos, /form, /login, /admin)
└── nginx/        Reverse proxy on port 80 for LAN/Hotspot deployment
```

## Run everything (Docker Compose)

The recommended setup runs via Docker Compose with Nginx reverse proxy on port 80:

```bash
docker compose up -d
```

- Portal & Nina assessment: `http://localhost/` or LAN IP `http://10.42.0.1/`
- React Participant Form: `http://localhost/form`
- Administrative Dashboard: `http://localhost/datos`
- Admin Login & Bootstrap: `http://localhost/login`
- OpenAPI Docs (Internal): `http://127.0.0.1:8000/docs`

## Run backend locally (single server)

Requires Python 3.11+ and PostgreSQL.

```bash
cd backend
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                                   # edit DATABASE_URL
alembic upgrade head
python -m scripts.seed                                 # seed reference zones and kiosks
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
- The game has 13 questions (3+3+3+4). The backend and database expect the score from the original specification (maximum 2+2+2+3 = 9), so the frontend **scales** each challenge before sending it.
- RED ≤3 · YELLOW 4–6 · GREEN ≥7 (out of 9). The server recalculates the total score and classification.
- Administrative access is guarded by a 2-factor model: Network-Gate CIDR allowlist + Email/PIN authentication (`admin_users` table).

---

## 👥 Engineering & Architecture Team
Docker Orchestration, Backend Architecture (FastAPI & PostgreSQL), i18n Engine & State Recovery.
Frontend PWA Layout, Visual Identity & UI Design.
