"""Carga zonas y kioscos; opcionalmente importa las sesiones simuladas del cliente.

Uso (desde backend/, con la BD migrada):
    python -m scripts.seed
    python -m scripts.seed --excel ../Community_Literacy_Dummy_Database_v2.xlsx
"""
import argparse

from app.core.database import SessionLocal
from app.core.zones_data import KIOSKS, ZONES
from app.models.game_session import GameSession
from app.models.zone import Kiosk, Zone
from app.schemas.session import SessionIn
from app.services.scoring import classify


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--excel", help="Ruta al Excel del cliente (hoja Raw_Sessions_Data)")
    args = ap.parse_args()
    db = SessionLocal()
    try:
        for code, name in ZONES:
            db.merge(Zone(code=code, name=name))
        for code, name, zone in KIOSKS:
            db.merge(Kiosk(code=code, name=name, zone_code=zone))
        db.commit()
        print(f"Zonas: {len(ZONES)} · Kioscos: {len(KIOSKS)}")

        if args.excel:
            from scripts.excel_rows import read_excel
            n = mismatches = 0
            for raw in read_excel(args.excel):
                s = SessionIn.model_validate(raw)
                total = (s.c1_visual_signs_score + s.c2_sentence_comprehension_score
                         + s.c3_mobile_icons_score + s.c4_cybersecurity_score)
                if classify(total) != raw["internal_zone_classification"]:
                    mismatches += 1
                db.merge(GameSession(**s.model_dump(), total_literacy_score=total,
                                     internal_zone_classification=classify(total)))
                n += 1
            db.commit()
            print(f"Sesiones importadas: {n} · clasificaciones distintas a las del Excel: {mismatches}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
