# CCLAS · La Ruta de Nina (GBM)

Proyecto completo: **frontend** (juego PWA con Nina) + **backend** (FastAPI + PostgreSQL, el mismo de tu proyecto).

```
CCLAS-Nina/
├── backend/      API FastAPI, modelos, migraciones (alembic), tests, seed
└── frontend/     PWA estática (HTML + CSS + JS, sin compilar)
```

## Arrancar todo (un solo servidor)
Requiere Python 3.11+ y PostgreSQL.
```bash
cd backend
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                                   # edita DATABASE_URL
alembic upgrade head
python -m scripts.seed                                 # carga zonas y kioscos
uvicorn app.main:app --reload
```
- Juego: http://localhost:8000/app/  (prueba en modo móvil 360×640)
- API y documentación: http://localhost:8000/docs
- Kiosco: `/app/?kiosk=PTYK001` · asistido: `&assisted=1`

El backend sirve la carpeta `frontend/` en `/app`, así que no hace falta otro servidor ni configurar CORS.
Si prefieres servir el frontend aparte (`python3 -m http.server 8080` dentro de `frontend/`), edita
`frontend/js/config.js` y pon `window.CCLAS_API = "http://localhost:8000"`.

## Cómo se conectan
- Al terminar (o abandonar) una partida, el juego envía la sesión anónima a `POST /api/sessions`.
- Si no hay red, queda en una cola local (`cclas_outbox`) y se reenvía al volver la conexión.
- El juego tiene 13 preguntas (3+3+3+4). El backend y la base de datos esperan el puntaje del Excel
  (máximo 2+2+2+3 = 9), así que el frontend **escala** cada reto antes de enviar. Así no hubo que tocar
  las migraciones ni los CHECK de la base de datos.
- RED ≤3 · YELLOW 4–6 · GREEN ≥7 (sobre 9). El servidor recalcula el total y la clasificación.
- Para ver datos: `GET /api/sessions` y `GET /api/metrics` con el header `X-Dashboard-Pin: 2026`.

## Pendientes
- Tabla oficial de zonas Z001–Z036: hoy usa el catálogo provisional de `backend/app/core/zones_data.py`
  (el Excel dice Z020 = Ancón, el backend dice Z003; hay que confirmar con el cliente).
- El dashboard `/datos` (mapa semáforo, plan de acción) de tu proyecto React **no** está portado; la API sí existe.
- Endpoint real del IoT del Smart Oasis Kiosk (hoy se entrega un código de 4 dígitos).
- No probé el backend contra una base de datos desde aquí; corre `pytest` en tu máquina.
