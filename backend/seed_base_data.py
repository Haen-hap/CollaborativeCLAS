from sqlalchemy import text

from app.core.database import SessionLocal


ACCESS_POINTS = [
    {"code": "DIRECT_WEB", "name": "Direct web access", "type": "WEB"},
    {"code": "PTYK001", "name": "Kiosk 001", "type": "KIOSK"},
    {"code": "PTYK002", "name": "Kiosk 002", "type": "KIOSK"},
    {"code": "PTYK003", "name": "Kiosk 003", "type": "KIOSK"},
]

ZONES = [{"code": "DECLINED", "name": "Location declined"}] + [
    {"code": f"Z{number:03d}", "name": f"Zone {number}"}
    for number in range(1, 37)
]


def main():
    db = SessionLocal()

    try:
        for access_point in ACCESS_POINTS:
            db.execute(
                text(
                    """
                    INSERT INTO access_points (code, name, type)
                    VALUES (:code, :name, :type)
                    ON CONFLICT (code) DO NOTHING
                    """
                ),
                access_point,
            )

        for zone in ZONES:
            db.execute(
                text(
                    """
                    INSERT INTO zones (code, name)
                    VALUES (:code, :name)
                    ON CONFLICT (code) DO NOTHING
                    """
                ),
                zone,
            )

        db.commit()
        print("Inserted access points and zones.")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()