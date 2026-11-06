from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.core.settings import settings
import app.models  # noqa: F401
from app.routers import analytics, assessments, db_health, sessions
from app.routers.visits import router as visits_router

app = FastAPI(title="CCLAS API")


@app.exception_handler(RequestValidationError)
async def request_validation_handler(
    request: Request,
    exc: RequestValidationError,
):
    if any(error.get("type") == "extra_forbidden" for error in exc.errors()):
        return JSONResponse(status_code=422, content={"detail": "Invalid request data"})
    return JSONResponse(status_code=422, content={"detail": exc.errors()})


origins = list(
    {
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        *settings.cors_list,
    }
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(db_health.router)
app.include_router(analytics.router)
app.include_router(analytics.router, prefix="/api")
app.include_router(assessments.router)
app.include_router(sessions.router)
app.include_router(visits_router)


@app.get("/")
async def root():
    return {"message": "CCLAS API", "docs": "/docs"}


# Sirve el frontend (PWA) desde el mismo servidor: http://localhost:8000/app/
FRONTEND_DIR = Path(__file__).resolve().parents[2] / "frontend"
if FRONTEND_DIR.exists():
    app.mount("/app", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
