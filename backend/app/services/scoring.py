"""Reglas de puntaje del cliente (Excel v1.1): máximo 9 = R1(2) + R2(2) + R3(2) + R4(3)."""

MAX_BY_CHALLENGE = (2, 2, 2, 3)


def classify(total: int) -> str:
    """RED 0-3 · YELLOW 4-6 · GREEN 7-9"""
    if total <= 3:
        return "RED"
    if total <= 6:
        return "YELLOW"
    return "GREEN"
