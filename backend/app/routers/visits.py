from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Path, Response
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.canonical import OPT_OUT_OUTCOMES, VISIT_OUTCOMES, VISIT_RANK
from app.core.database import get_db
from app.models.visit import DailyCounter, Visit
from app.routers.sessions import require_pin
from app.schemas.visit import VISIT_ID_PATTERN, VisitIn, VisitOut

router = APIRouter(prefix="/api", tags=["visits"])


def _bump_counter(db: Session, kiosk_id: str, outcome: str) -> None:
    key = (date.today(), kiosk_id, outcome)
    row = db.get(DailyCounter, key)
    if row:
        row.entries += 1
    else:
        db.add(DailyCounter(day=key[0], kiosk_id=kiosk_id, outcome=outcome, entries=1))


@router.put("/visits/{visit_id}")
def put_visit(payload: VisitIn, response: Response, visit_id: str = Path(pattern=VISIT_ID_PATTERN),
              db: Session = Depends(get_db)):
    """Registra o actualiza una entrada. Idempotente por visit_id y el estado solo avanza (ENTERED < ... < COMPLETED)."""
    try:
        if payload.outcome in OPT_OUT_OUTCOMES:
            # Rechazó la privacidad o es menor de 18: se borra cualquier fila y solo queda el contador del día
            existing = db.get(Visit, visit_id)
            if existing:
                db.delete(existing)
            _bump_counter(db, payload.kiosk_id, payload.outcome)
            db.commit()
            return {"recorded": "counter", "outcome": payload.outcome}

        row = db.get(Visit, visit_id)
        if row is None:
            row = Visit(visit_id=visit_id, kiosk_id=payload.kiosk_id, origin=payload.origin,
                        assisted_mode=payload.assisted_mode, outcome=payload.outcome, session_id=payload.session_id)
            db.add(row)
            response.status_code = 201
        elif VISIT_RANK[payload.outcome] >= VISIT_RANK[row.outcome]:
            row.outcome = payload.outcome
            row.session_id = payload.session_id or row.session_id
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=422, detail="Kiosco o valores no válidos")
    db.refresh(row)
    return VisitOut.model_validate(row)


@router.get("/visits", response_model=list[VisitOut], dependencies=[Depends(require_pin)])
def list_visits(limit: int = 5000, db: Session = Depends(get_db)):
    return db.query(Visit).order_by(Visit.first_seen_at.desc()).limit(min(limit, 20000)).all()


@router.get("/visits/summary", dependencies=[Depends(require_pin)])
def visits_summary(days: int = 30, db: Session = Depends(get_db)):
    """Totales de entradas (con y sin fila) por resultado, por kiosco y por día."""
    outcomes = {k: 0 for k in VISIT_OUTCOMES + OPT_OUT_OUTCOMES}
    by_kiosk: dict[str, int] = {}
    daily: dict[str, int] = {}

    for k, n in db.query(Visit.outcome, func.count()).group_by(Visit.outcome):
        outcomes[k] += n
    for k, n in db.query(DailyCounter.outcome, func.sum(DailyCounter.entries)).group_by(DailyCounter.outcome):
        outcomes[k] += int(n or 0)
    for k, n in db.query(Visit.kiosk_id, func.count()).group_by(Visit.kiosk_id):
        by_kiosk[k] = by_kiosk.get(k, 0) + n
    for k, n in db.query(DailyCounter.kiosk_id, func.sum(DailyCounter.entries)).group_by(DailyCounter.kiosk_id):
        by_kiosk[k] = by_kiosk.get(k, 0) + int(n or 0)
    day_col = func.date(Visit.first_seen_at)
    for d, n in db.query(day_col, func.count()).group_by(day_col):
        daily[str(d)] = daily.get(str(d), 0) + n
    for d, n in db.query(DailyCounter.day, func.sum(DailyCounter.entries)).group_by(DailyCounter.day):
        daily[str(d)] = daily.get(str(d), 0) + int(n or 0)

    last = sorted(daily.items())[-min(max(days, 1), 365):]
    return {"entries_total": sum(outcomes.values()), "outcomes": outcomes, "by_kiosk": by_kiosk,
            "daily": [{"day": d, "entries": n} for d, n in last]}
