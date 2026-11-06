import hmac
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Response
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.settings import settings
from app.core.zones_data import KIOSKS, ZONES
from app.models.access_points import AccessPoint, AccessPointType
from app.models.assessment_results import AssessmentResult, LiteracyClassification
from app.models.assessment_session import (
    AgeRange,
    AssessmentSession,
    CompletionStatus,
    SchoolingLevel,
    WorkStatus,
)
from app.models.rewards import Reward, TriggerType
from app.models.zone import Kiosk, Zone
from app.schemas.session import SessionIn, SessionOut
from app.services.scoring import classify

router = APIRouter(prefix="/api", tags=["sessions"])

OFFICIAL_KIOSK_MAP = {c: (n, z) for c, n, z in KIOSKS}
OFFICIAL_ZONE_MAP = dict(ZONES)


def _session_id_to_int(raw_id: str) -> int:
    digits = "".join(ch for ch in raw_id if ch.isdigit())
    if digits:
        return int(digits[-9:]) or 1
    return (abs(hash(raw_id)) % 2_000_000_000) + 1


def _ensure_catalog_entry(db: Session, kiosk_id: str, zone_code: str) -> None:
    if not db.get(Zone, "DECLINED"):
        db.add(Zone(code="DECLINED", name="Location declined"))
    for z_code, z_name in ZONES:
        if not db.get(Zone, z_code):
            db.add(Zone(code=z_code, name=z_name))
    if zone_code and not db.get(Zone, zone_code):
        db.add(Zone(code=zone_code, name=OFFICIAL_ZONE_MAP.get(zone_code, zone_code)))
    if not db.get(AccessPoint, kiosk_id):
        ap_name = OFFICIAL_KIOSK_MAP.get(kiosk_id, (kiosk_id, None))[0]
        ap_type = AccessPointType.WEB if kiosk_id == "DIRECT_WEB" else AccessPointType.KIOSK
        db.add(AccessPoint(code=kiosk_id, name=ap_name, type=ap_type))
    db.flush()


def require_pin(x_dashboard_pin: Optional[str] = Header(default=None)) -> None:
    if not x_dashboard_pin or not hmac.compare_digest(x_dashboard_pin, settings.dashboard_pin):
        raise HTTPException(status_code=401, detail="PIN inválido")


@router.post("/sessions", response_model=SessionOut)
def upsert_session(payload: SessionIn, response: Response, db: Session = Depends(get_db)):
    """Guarda (o actualiza) una sesión anónima en assessment_sessions + assessment_results + rewards."""
    if payload.kiosk_id not in OFFICIAL_KIOSK_MAP:
        raise HTTPException(status_code=422, detail="Kiosco o valores no válidos")

    zone_code = payload.zone_code or "DECLINED"
    location_declined = zone_code == "DECLINED"
    _ensure_catalog_entry(db, payload.kiosk_id, zone_code)

    data = payload.model_dump()
    total = sum(
        data[k]
        for k in (
            "c1_visual_signs_score",
            "c2_sentence_comprehension_score",
            "c3_mobile_icons_score",
            "c4_cybersecurity_score",
        )
    )
    classification = classify(total)
    classification_enum = (
        classification
        if isinstance(classification, LiteracyClassification)
        else LiteracyClassification(classification)
    )

    numeric_id = _session_id_to_int(payload.session_id)
    session_row = db.get(AssessmentSession, numeric_id)

    age_val = AgeRange(payload.age_range) if payload.age_range else AgeRange.AGE_25_34
    work_val = WorkStatus(payload.work_status) if payload.work_status else WorkStatus.INFORMAL
    school_val = (
        SchoolingLevel(payload.schooling_level)
        if payload.schooling_level
        else SchoolingLevel.SECONDARY_COMPLETE
    )
    status_val = CompletionStatus(payload.completion_status)

    if session_row:
        session_row.access_point_code = payload.kiosk_id
        session_row.assisted_mode = payload.assisted_mode
        session_row.age_range = age_val
        session_row.work_status = work_val
        session_row.schooling_level = school_val
        session_row.zone_code = zone_code
        session_row.location_declined = location_declined
        session_row.completion_status = status_val
        session_row.duration_seconds = payload.duration_seconds
        response.status_code = 200
    else:
        session_row = AssessmentSession(
            session_id=numeric_id,
            access_point_code=payload.kiosk_id,
            assisted_mode=payload.assisted_mode,
            age_range=age_val,
            work_status=work_val,
            schooling_level=school_val,
            zone_code=zone_code,
            location_declined=location_declined,
            completion_status=status_val,
            duration_seconds=payload.duration_seconds,
        )
        db.add(session_row)
        db.flush()
        response.status_code = 201

    result_row = db.get(AssessmentResult, numeric_id)
    if result_row:
        result_row.c1_visual_signs_score = payload.c1_visual_signs_score
        result_row.c2_sentence_comprehension_score = payload.c2_sentence_comprehension_score
        result_row.c3_mobile_icons_score = payload.c3_mobile_icons_score
        result_row.c4_cybersecurity_score = payload.c4_cybersecurity_score
        result_row.total_literacy_score = total
        result_row.literacy_classification = classification_enum
    else:
        result_row = AssessmentResult(
            session_id=numeric_id,
            c1_visual_signs_score=payload.c1_visual_signs_score,
            c2_sentence_comprehension_score=payload.c2_sentence_comprehension_score,
            c3_mobile_icons_score=payload.c3_mobile_icons_score,
            c4_cybersecurity_score=payload.c4_cybersecurity_score,
            total_literacy_score=total,
            literacy_classification=classification_enum,
        )
        db.add(result_row)

    trigger_str = (
        payload.iot_trigger_type
        if payload.reward_issued and payload.iot_trigger_type != "NONE"
        else ("WIFI_CREDENTIAL" if payload.reward_issued else "NONE")
    )
    reward_row = (
        db.query(Reward).filter(Reward.session_id == numeric_id).one_or_none()
    )
    if reward_row:
        reward_row.issued = payload.reward_issued
        reward_row.trigger_type = TriggerType(trigger_str)
    else:
        db.add(
            Reward(
                session_id=numeric_id,
                issued=payload.reward_issued,
                trigger_type=TriggerType(trigger_str),
            )
        )

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=422, detail="Kiosco o valores no válidos")

    return SessionOut(
        **data,
        total_literacy_score=total,
        internal_zone_classification=classification_enum.value,
    )


@router.get("/sessions", response_model=list[SessionOut], dependencies=[Depends(require_pin)])
def list_sessions(limit: int = 5000, db: Session = Depends(get_db)):
    rows = (
        db.query(AssessmentSession)
        .order_by(AssessmentSession.session_id.desc())
        .limit(min(limit, 20000))
        .all()
    )
    out: list[SessionOut] = []
    for s in rows:
        res = s.result
        rew = s.reward
        c1 = res.c1_visual_signs_score if res else 0
        c2 = res.c2_sentence_comprehension_score if res else 0
        c3 = res.c3_mobile_icons_score if res else 0
        c4 = res.c4_cybersecurity_score if res else 0
        total = res.total_literacy_score if res else 0
        cls_val = (
            res.literacy_classification.value
            if res and res.literacy_classification
            else classify(total).value
        )
        comp_status = (
            "COMPLETED"
            if s.completion_status == CompletionStatus.COMPLETED
            else "ABANDONED"
        )
        out.append(
            SessionOut(
                session_id=f"SES-{s.session_id}",
                kiosk_id=s.access_point_code,
                origin="UNKNOWN" if s.access_point_code == "DIRECT_WEB" else "KIOSK",
                assisted_mode=s.assisted_mode,
                age_range=s.age_range.value if s.age_range else None,
                work_status=s.work_status.value if s.work_status else None,
                schooling_level=s.schooling_level.value if s.schooling_level else None,
                zone_code=s.zone_code,
                c1_visual_signs_score=c1,
                c2_sentence_comprehension_score=c2,
                c3_mobile_icons_score=c3,
                c4_cybersecurity_score=c4,
                total_literacy_score=total,
                internal_zone_classification=cls_val,
                completion_status=comp_status,
                last_step=None,
                duration_seconds=s.duration_seconds,
                reward_issued=rew.issued if rew else False,
                iot_trigger_type=rew.trigger_type.value if rew else "NONE",
                repeat_device=False,
            )
        )
    return out


@router.get("/metrics", dependencies=[Depends(require_pin)])
def metrics(db: Session = Depends(get_db)):
    total = db.query(func.count(AssessmentSession.session_id)).scalar() or 0
    completed = (
        db.query(func.count(AssessmentSession.session_id))
        .filter(AssessmentSession.completion_status == CompletionStatus.COMPLETED)
        .scalar()
        or 0
    )
    rewards = (
        db.query(func.count(Reward.id))
        .filter(Reward.issued.is_(True))
        .scalar()
        or 0
    )
    avg_score = db.query(func.avg(AssessmentResult.total_literacy_score)).scalar() or 0
    raw_tiers = (
        db.query(AssessmentResult.literacy_classification, func.count())
        .group_by(AssessmentResult.literacy_classification)
        .all()
    )
    tiers = {
        (k.value if isinstance(k, LiteracyClassification) else str(k)): count
        for k, count in raw_tiers
    }
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
