"""Carga el catálogo inicial de zonas y kioscos usando SQLAlchemy puro.

Uso (desde backend/, con la BD migrada):
    python -m scripts.seed
"""
from app.core.database import SessionLocal
from app.models.zone import Kiosk, Zone

ZONES: list[dict[str, str]] = [
    {"code": "Z001", "name": "Curundú"},
    {"code": "Z002", "name": "Bethania"},
    {"code": "Z003", "name": "Ancón"},
    {"code": "Z004", "name": "Bella Vista"},
    {"code": "Z005", "name": "Calidonia"},
    {"code": "Z006", "name": "El Chorrillo"},
    {"code": "Z007", "name": "Santa Ana"},
    {"code": "Z008", "name": "San Felipe"},
    {"code": "Z009", "name": "Pueblo Nuevo"},
    {"code": "Z010", "name": "San Francisco"},
    {"code": "Z011", "name": "Parque Lefevre"},
    {"code": "Z012", "name": "Río Abajo"},
    {"code": "Z013", "name": "Juan Díaz"},
    {"code": "Z014", "name": "Tocumen"},
    {"code": "Z015", "name": "Las Mañanitas"},
    {"code": "Z016", "name": "Pedregal"},
    {"code": "Z017", "name": "24 de Diciembre"},
    {"code": "Z018", "name": "Ernesto Córdoba Campos"},
    {"code": "Z019", "name": "Las Cumbres"},
    {"code": "Z020", "name": "Chilibre"},
    {"code": "Z021", "name": "Alcalde Díaz"},
    {"code": "Z022", "name": "Pacora"},
    {"code": "Z023", "name": "San Martín"},
    {"code": "Z024", "name": "Don Bosco"},
    {"code": "Z025", "name": "Belisario Frías"},
    {"code": "Z026", "name": "Belisario Porras"},
    {"code": "Z027", "name": "José Domingo Espinar"},
    {"code": "Z028", "name": "Mateo Iturralde"},
    {"code": "Z029", "name": "Omar Torrijos"},
    {"code": "Z030", "name": "Rufina Alfaro"},
    {"code": "Z031", "name": "Victoriano Lorenzo"},
    {"code": "Z032", "name": "Amelia Denis de Icaza"},
    {"code": "Z033", "name": "Arnulfo Arias"},
    {"code": "Z034", "name": "Samaria"},
    {"code": "Z035", "name": "Zona 035"},
    {"code": "Z036", "name": "Zona 036"},
]

KIOSKS: list[dict[str, str | None]] = [
    {"code": "PTYK001", "name": "Smart Kiosk Curundú", "zone_code": "Z001"},
    {"code": "PTYK002", "name": "Smart Kiosk Bethania", "zone_code": "Z002"},
    {"code": "PTYK003", "name": "Smart Kiosk Ancón", "zone_code": "Z003"},
    {"code": "DIRECT_WEB", "name": "Direct PWA Web Access", "zone_code": None},
]


def main() -> None:
    db = SessionLocal()
    try:
        for zone in ZONES:
            db.merge(Zone(**zone))
        for kiosk in KIOSKS:
            db.merge(Kiosk(**kiosk))
        db.commit()
        print(f"Zonas: {len(ZONES)} · Kioscos: {len(KIOSKS)}")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()

