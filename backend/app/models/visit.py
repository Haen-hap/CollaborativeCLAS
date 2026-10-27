from sqlalchemy import Boolean, CheckConstraint, Column, Date, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import relationship
from app.core.canonical import COUNTER_CHECKS, VISIT_CHECKS
from app.core.database import Base


class Visit(Base):
    """Una entrada anónima al sitio. NO guarda nombre, cédula, IP ni datos del dispositivo (Ley 81).

    Quien rechaza la privacidad o es menor de 18 no deja fila: solo suma a DailyCounter.
    """
    __tablename__ = "visits"
    __table_args__ = tuple(CheckConstraint(e, name=n) for n, e in VISIT_CHECKS.items())

    visit_id = Column(String(40), primary_key=True)  # id aleatorio generado en el navegador
    kiosk_id = Column(String(20), ForeignKey("kiosks.code", name="fk_visits_kiosk_id_kiosks"), nullable=False, index=True)
    origin = Column(String(10), nullable=False, default="UNKNOWN")
    assisted_mode = Column(Boolean, nullable=False, default=False)
    outcome = Column(String(12), nullable=False, default="ENTERED")
    session_id = Column(String(40), nullable=True, index=True)  # enlace a game_sessions (sin FK: el envío puede llegar en otro orden)
    first_seen_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    kiosk = relationship("Kiosk", back_populates="visits")


class DailyCounter(Base):
    """Conteo agregado de quienes se negaron o son menores: sin fila individual."""
    __tablename__ = "daily_counters"
    __table_args__ = tuple(CheckConstraint(e, name=n) for n, e in COUNTER_CHECKS.items())

    day = Column(Date, primary_key=True)
    kiosk_id = Column(String(20), ForeignKey("kiosks.code", name="fk_daily_counters_kiosk_id_kiosks"), primary_key=True)
    outcome = Column(String(16), primary_key=True)
    entries = Column(Integer, nullable=False, default=0)
