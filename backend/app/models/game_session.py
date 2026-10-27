from sqlalchemy import Boolean, CheckConstraint, Column, DateTime, ForeignKey, Integer, SmallInteger, String, func
from sqlalchemy.orm import relationship
from app.core.canonical import GAME_SESSION_CHECKS
from app.core.database import Base


class GameSession(Base):
    """Una partida anónima. Sin PII (Ley 81 de Panamá). Todos los campos demográficos son códigos canónicos."""
    __tablename__ = "game_sessions"
    __table_args__ = tuple(CheckConstraint(expr, name=name) for name, expr in GAME_SESSION_CHECKS.items())

    session_id = Column(String(40), primary_key=True)
    kiosk_id = Column(String(20), ForeignKey("kiosks.code", name="fk_game_sessions_kiosk_id_kiosks"), nullable=False, index=True)
    origin = Column(String(10), nullable=False, default="UNKNOWN")  # KIOSK | UNKNOWN | MOCK
    assisted_mode = Column(Boolean, nullable=False, default=False)
    age_range = Column(String(10))
    work_status = Column(String(15))
    schooling_level = Column(String(25))
    zone_code = Column(String(10), index=True)  # Z001–Z036 | DECLINED
    c1_visual_signs_score = Column(SmallInteger, nullable=False, default=0)
    c2_sentence_comprehension_score = Column(SmallInteger, nullable=False, default=0)
    c3_mobile_icons_score = Column(SmallInteger, nullable=False, default=0)
    c4_cybersecurity_score = Column(SmallInteger, nullable=False, default=0)
    total_literacy_score = Column(SmallInteger, nullable=False, default=0)
    internal_zone_classification = Column(String(6), nullable=False)  # RED | YELLOW | GREEN
    completion_status = Column(String(10), nullable=False)  # COMPLETED | ABANDONED
    last_step = Column(String(15))
    duration_seconds = Column(Integer, nullable=False, default=0)
    reward_issued = Column(Boolean, nullable=False, default=False)
    iot_trigger_type = Column(String(20), nullable=False, default="NONE")
    repeat_device = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    kiosk = relationship("Kiosk", back_populates="sessions")
