"""Catálogo de zonas y kioscos.

PROVISIONAL: el cliente aún no entregó la tabla oficial Z001–Z036. Solo Z014 = Tocumen está
confirmado por la especificación. Mantener sincronizado con frontend/src/lib/zones.js.
"""
ZONE_NAMES = [
    "Curundú", "Bethania", "Ancón", "Bella Vista", "Calidonia", "El Chorrillo", "Santa Ana", "San Felipe",
    "Pueblo Nuevo", "San Francisco", "Parque Lefevre", "Río Abajo", "Juan Díaz", "Tocumen", "Las Mañanitas",
    "Pedregal", "24 de Diciembre", "Ernesto Córdoba Campos", "Las Cumbres", "Chilibre", "Alcalde Díaz",
    "Pacora", "San Martín", "Don Bosco", "Belisario Frías", "Belisario Porras", "José Domingo Espinar",
    "Mateo Iturralde", "Omar Torrijos", "Rufina Alfaro", "Victoriano Lorenzo", "Amelia Denis de Icaza",
    "Arnulfo Arias", "Samaria", "Zona 035", "Zona 036",
]
ZONES = [(f"Z{i + 1:03d}", name) for i, name in enumerate(ZONE_NAMES)]

# (código, nombre, zona del kiosco)
KIOSKS = [
    ("PTYK001", "Smart Kiosk Curundú", "Z001"),
    ("PTYK002", "Smart Kiosk Bethania", "Z002"),
    ("PTYK003", "Smart Kiosk Ancón", "Z003"),
    ("DIRECT_WEB", "Direct PWA Web Access", None),
]
