from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.settings import settings
from app.routers.db_health import router as health_router
from app.routers.sessions import router as sessions_router
from app.routers.visits import router as visits_router

app = FastAPI(title="CCLAS API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_list,
    allow_methods=["GET", "POST", "PUT"],
    allow_headers=["Content-Type", "X-Dashboard-Pin"],
)
app.include_router(health_router)
app.include_router(sessions_router)
app.include_router(visits_router)


@app.get("/")
async def root():
    return {"message": "CCLAS API", "docs": "/docs"}


# Sirve el frontend (PWA) desde el mismo servidor: http://localhost:8000/app/
FRONTEND_DIR = Path(__file__).resolve().parents[2] / "frontend"
if FRONTEND_DIR.exists():
    app.mount("/app", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
