from sqlalchemy import Column, Float, ForeignKey, String
from sqlalchemy.orm import relationship
from app.core.database import Base


class Zone(Base):
    """Catálogo oficial de zonas (Z001–Z036). Las sesiones guardan el código, nunca texto libre."""
    __tablename__ = "zones"
    code = Column(String(4), primary_key=True)
    name = Column(String(80), nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    kiosks = relationship("Kiosk", back_populates="zone")
    sessions = relationship("AssessmentSession", back_populates="zone")


class Kiosk(Base):
    __tablename__ = "kiosks"
    code = Column(String(20), primary_key=True)
    name = Column(String(80), nullable=False)
    zone_code = Column(String(4), ForeignKey("zones.code", name="fk_kiosks_zone_code_zones"), nullable=True)

    zone = relationship("Zone", back_populates="kiosks")
    sessions = relationship("GameSession", back_populates="kiosk")
    visits = relationship("Visit", back_populates="kiosk")
