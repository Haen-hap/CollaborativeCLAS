import hmac
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Response
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.settings import settings
from app.core.zones_data import KIOSKS, ZONES
from app.models.game_session import GameSession
from app.schemas.session import SessionIn, SessionOut
from app.services.scoring import classify

router = APIRouter(prefix="/api", tags=["sessions"])


def require_pin(x_dashboard_pin: Optional[str] = Header(default=None)) -> None:
    if not x_dashboard_pin or not hmac.compare_digest(x_dashboard_pin, settings.dashboard_pin):
        raise HTTPException(status_code=401, detail="PIN inválido")


@router.post("/sessions", response_model=SessionOut)
def upsert_session(payload: SessionIn, response: Response, db: Session = Depends(get_db)):
    """Guarda (o actualiza) una sesión anónima. Idempotente por session_id: la PWA puede reintentar sin duplicar."""
    data = payload.model_dump()
    total = sum(data[k] for k in (
        "c1_visual_signs_score", "c2_sentence_comprehension_score", "c3_mobile_icons_score", "c4_cybersecurity_score"))
    data["total_literacy_score"] = total
    data["internal_zone_classification"] = classify(total)

    row = db.get(GameSession, payload.session_id)
    if row:
        for k, v in data.items():
            setattr(row, k, v)
        response.status_code = 200
    else:
        row = GameSession(**data)
        db.add(row)
        response.status_code = 201
    try:
        db.commit()
    except IntegrityError:
        db.rollback()  # p. ej. kiosco que no existe en el catálogo
        raise HTTPException(status_code=422, detail="Kiosco o valores no válidos")
    db.refresh(row)
    return row


@router.get("/sessions", response_model=list[SessionOut], dependencies=[Depends(require_pin)])
def list_sessions(limit: int = 5000, db: Session = Depends(get_db)):
    return db.query(GameSession).order_by(GameSession.created_at.desc()).limit(min(limit, 20000)).all()


@router.get("/metrics", dependencies=[Depends(require_pin)])
def metrics(db: Session = Depends(get_db)):
    total = db.query(func.count(GameSession.session_id)).scalar() or 0
    completed = db.query(func.count()).select_from(GameSession).filter(GameSession.completion_status == "COMPLETED").scalar() or 0
    rewards = db.query(func.count()).select_from(GameSession).filter(GameSession.reward_issued.is_(True)).scalar() or 0
    avg_score = db.query(func.avg(GameSession.total_literacy_score)).scalar() or 0
    tiers = dict(db.query(GameSession.internal_zone_classification, func.count()).group_by(
        GameSession.internal_zone_classification).all())
    return {
        "total_sessions": total,
        "completion_rate": round(100 * completed / total, 1) if total else 0,
        "average_score": round(float(avg_score), 2),
        "rewards_dispensed": rewards,
        "tiers": {k: tiers.get(k, 0) for k in ("RED", "YELLOW", "GREEN")},
    }


@router.get("/zones")
def zones():
    return [{"code": c, "name": n} for c, n in ZONES]


@router.get("/kiosks")
def kiosks():
    return [{"code": c, "name": n, "zone_code": z} for c, n, z in KIOSKS]
