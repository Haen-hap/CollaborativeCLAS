from sqlalchemy import Column, Integer, String
from app.core.database import Base

class Location(Base):
    __tablename__ = "locations"
    id = Column(Integer, primary_key=True, index=True)
    site_name = Column(String(50),unique=True,nullable=False)
    latitude = Column(String(50),nullable=False)
    longitude = Column(String(50),nullable=False)

