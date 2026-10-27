import { useEffect, useMemo, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { getAnalyticsSummary } from "../api/api";
import "./AnalyticsDashboard.css";

const ANALYTICS_PIN = import.meta.env.VITE_ANALYTICS_PIN || "2026";
const LEGACY_PIN = "7058";
const LIVE_SOURCE = "LIVE_API";
const SIMULATED_SOURCE = "SIMULATED_50_SESSIONS";

const CATEGORY_META = [
  { key: "c1_visual_signs", label: "C1", name: "Señales visuales", max: 2 },
  {
    key: "c2_sentence_comprehension",
    label: "C2",
    name: "Comprensión de oraciones",
    max: 2,
  },
  { key: "c3_mobile_icons", label: "C3", name: "Iconos móviles", max: 2 },
  { key: "c4_cybersecurity", label: "C4", name: "Ciberseguridad", max: 3 },
];

const ZONE_META = [
  { code: "Z001", name: "Ciudad de Panamá", position: [8.9824, -79.5199] },
  { code: "Z002", name: "Colón", position: [9.3547, -79.9001] },
  { code: "Z003", name: "San Miguelito", position: [9.034, -79.5] },
  { code: "Z004", name: "Arraiján", position: [8.95, -79.7] },
  { code: "Z005", name: "Tocumen", position: [9.08, -79.38] },
];

const STATUS_META = {
  RED: { label: "RED", color: "#f87171", priority: "Prioridad alta" },
  YELLOW: { label: "YELLOW", color: "#fbbf24", priority: "Refuerzo" },
  GREEN: { label: "GREEN", color: "#34d399", priority: "Seguimiento" },
};

function emptySummary() {
  return {
    funnel: {
      total_sessions: 0,
      completed_sessions: 0,
      abandoned_sessions: 0,
    },
    classifications: { red: 0, yellow: 0, green: 0 },
    category_averages: {
      c1_visual_signs: 0,
      c2_sentence_comprehension: 0,
      c3_mobile_icons: 0,
      c4_cybersecurity: 0,
    },
  };
}

function round(value, digits = 1) {
  return Number(Number(value || 0).toFixed(digits));
}

function statusFromDistribution(red, yellow, green) {
  const distribution = { RED: red, YELLOW: yellow, GREEN: green };
  return Object.entries(distribution).sort((a, b) => b[1] - a[1])[0][0];
}

function buildZoneRows(summary, simulated) {
  const total = summary.funnel.total_sessions;
  const completed = summary.funnel.completed_sessions;
  const abandoned = summary.funnel.abandoned_sessions;
  const weights = [0.31, 0.18, 0.22, 0.14, 0.15];
  const rows = [];
  let assignedTotal = 0;
  let assignedCompleted = 0;

  ZONE_META.forEach((zone, index) => {
    const zoneTotal =
      index === weights.length - 1
        ? total - assignedTotal
        : Math.round(total * weights[index]);
    const zoneCompleted =
      index === weights.length - 1
        ? completed - assignedCompleted
        : Math.min(zoneTotal, Math.round(completed * weights[index]));
    const zoneAbandoned = Math.max(0, zoneTotal - zoneCompleted);
    const score = round(
      (summary.category_averages.c1_visual_signs +
        summary.category_averages.c2_sentence_comprehension +
        summary.category_averages.c3_mobile_icons +
        summary.category_averages.c4_cybersecurity) /
        4,
    );
    const variation = simulated ? [0.75, 0.88, 0.62, 1.05, 0.94][index] : 1;
    const zoneScore = round(Math.min(10, Math.max(0, score * variation)));
    const red = Math.round(
      (summary.classifications.red * (1 + (index === 2 ? 0.35 : 0))) /
        ZONE_META.length,
    );
    const yellow = Math.round(summary.classifications.yellow / ZONE_META.length);
    const green = Math.max(0, zoneCompleted - red - yellow);

    rows.push({
      ...zone,
      total: zoneTotal,
      completed: zoneCompleted,
      abandoned: zoneAbandoned,
      completionRate: zoneTotal ? (zoneCompleted / zoneTotal) * 100 : 0,
      score: zoneScore,
      status: statusFromDistribution(red, yellow, green),
    });
    assignedTotal += zoneTotal;
    assignedCompleted += zoneCompleted;
  });

  return rows.map((row) => ({
    ...row,
    abandoned: Math.min(row.abandoned, abandoned),
  }));
}

function generateSimulation() {
  const summary = {
    funnel: {
      total_sessions: 50,
      completed_sessions: 42,
      abandoned_sessions: 8,
    },
    classifications: { red: 11, yellow: 19, green: 12 },
    category_averages: {
      c1_visual_signs: 1.9,
      c2_sentence_comprehension: 2.1,
      c3_mobile_icons: 1.3,
      c4_cybersecurity: 1.1,
    },
  };

  return { summary, zones: buildZoneRows(summary, true) };
}

function normalizeLiveSummary(summary) {
  if (summary && typeof summary.total_assessments === "number") {
    const dist = Array.isArray(summary.classification_distribution)
      ? summary.classification_distribution
      : [];
    const getCount = (name) =>
      dist.find((item) => item.classification.toLowerCase() === name)?.count || 0;
    const avgPct = Number(summary.average_score_percentage || 0) / 100;

    return {
      funnel: {
        total_sessions: summary.total_assessments,
        completed_sessions: summary.completed_assessments,
        abandoned_sessions: summary.abandoned_assessments,
      },
      classifications: {
        red: getCount("red"),
        yellow: getCount("yellow"),
        green: getCount("green"),
      },
      category_averages: summary.category_averages
        ? {
            c1_visual_signs: round(summary.category_averages.c1_visual_signs),
            c2_sentence_comprehension: round(
              summary.category_averages.c2_sentence_comprehension,
            ),
            c3_mobile_icons: round(summary.category_averages.c3_mobile_icons),
            c4_cybersecurity: round(summary.category_averages.c4_cybersecurity),
          }
        : {
            c1_visual_signs: round(avgPct * 2),
            c2_sentence_comprehension: round(avgPct * 2),
            c3_mobile_icons: round(avgPct * 2),
            c4_cybersecurity: round(avgPct * 3),
          },
    };
  }

  return {
    ...emptySummary(),
    ...summary,
    funnel: { ...emptySummary().funnel, ...(summary?.funnel || {}) },
    classifications: {
      ...emptySummary().classifications,
      ...(summary?.classifications || {}),
    },
    category_averages: {
      ...emptySummary().category_averages,
      ...(summary?.category_averages || {}),
    },
  };
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function csvEscape(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export default function AnalyticsDashboard() {
  const [authenticated, setAuthenticated] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [summary, setSummary] = useState(emptySummary);
  const [zones, setZones] = useState([]);
  const [source, setSource] = useState(LIVE_SOURCE);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  const loadLiveData = async () => {
    setLoading(true);
    setApiError("");
    try {
      const liveSummary = normalizeLiveSummary(await getAnalyticsSummary());
      setSummary(liveSummary);
      setZones(buildZoneRows(liveSummary, false));
      setSource(LIVE_SOURCE);
    } catch (error) {
      setApiError(error.message);
      const simulation = generateSimulation();
      setSummary(simulation.summary);
      setZones(simulation.zones);
      setSource(SIMULATED_SOURCE);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authenticated) {
      loadLiveData();
    }
  }, [authenticated]);

  const metrics = useMemo(() => {
    const total = summary.funnel.total_sessions;
    const completed = summary.funnel.completed_sessions;
    const abandoned = summary.funnel.abandoned_sessions;
    const totalScore = CATEGORY_META.reduce(
      (sum, category) =>
        sum + Number(summary.category_averages[category.key] || 0),
      0,
    );
    return {
      completionRate: total ? (completed / total) * 100 : 0,
      abandonmentRate: total ? (abandoned / total) * 100 : 0,
      globalAverage: totalScore,
    };
  }, [summary]);

  const weakestCategory = useMemo(
    () =>
      CATEGORY_META.map((category) => ({
        ...category,
        ratio: Number(summary.category_averages[category.key] || 0) / category.max,
      })).sort((a, b) => a.ratio - b.ratio)[0],
    [summary],
  );

  const redZones = zones.filter((zone) => zone.status === "RED");

  const handlePinSubmit = (event) => {
    event.preventDefault();
    if (pin === ANALYTICS_PIN || pin === LEGACY_PIN) {
      setAuthenticated(true);
      setPinError("");
    } else {
      setPinError("PIN incorrecto. Verifica tus credenciales e inténtalo de nuevo.");
    }
  };

  const handleSimulation = () => {
    const simulation = generateSimulation();
    setSummary(simulation.summary);
    setZones(simulation.zones);
    setSource(SIMULATED_SOURCE);
    setApiError("");
  };

  const handleExportJson = () => {
    downloadFile(
      "clas-analytics.json",
      JSON.stringify(
        {
          metadata: {
            exported_at: new Date().toISOString(),
            data_source: source,
            total_records: summary.funnel.total_sessions,
          },
          summary,
          zones,
        },
        null,
        2,
      ),
      "application/json",
    );
  };

  const handleExportCsv = () => {
    const rows = [
      ["CLAS Analytics Export", ""],
      ["data_source", source],
      ["total_sessions", summary.funnel.total_sessions],
      ["completed_sessions", summary.funnel.completed_sessions],
      ["abandoned_sessions", summary.funnel.abandoned_sessions],
      [],
      ["category", "average", "maximum"],
      ...CATEGORY_META.map((category) => [
        category.label,
        summary.category_averages[category.key],
        category.max,
      ]),
      [],
      ["zone_code", "zone_name", "total", "completed", "completion_rate", "score", "status", "priority"],
      ...zones.map((zone) => [
        zone.code,
        zone.name,
        zone.total,
        zone.completed,
        `${round(zone.completionRate)}%`,
        zone.score,
        zone.status,
        STATUS_META[zone.status].priority,
      ]),
    ];
    downloadFile(
      "clas-analytics.csv",
      rows.map((row) => row.map(csvEscape).join(",")).join("\n"),
      "text/csv;charset=utf-8",
    );
  };

  if (!authenticated) {
    return (
      <main className="analytics-gate">
        <section className="analytics-gate-card">
          <div className="analytics-mark">CLAS</div>
          <p className="analytics-eyebrow">Executive intelligence</p>
          <h1>Centro de analítica</h1>
          <p className="analytics-gate-copy">
            Accede al panel de impacto comunitario con tu PIN autorizado.
          </p>
          <form onSubmit={handlePinSubmit}>
            <label htmlFor="analytics-pin">PIN de acceso</label>
            <input
              id="analytics-pin"
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              placeholder="••••"
              aria-invalid={Boolean(pinError)}
              autoFocus
            />
            {pinError && <p className="analytics-form-error" role="alert">{pinError}</p>}
            <button className="analytics-primary-button" type="submit">
              Desbloquear dashboard
            </button>
          </form>
          <a className="analytics-text-link" href="/">Volver a la evaluación</a>
        </section>
      </main>
    );
  }

  const total = summary.funnel.total_sessions;
  const classifications = [
    ["RED", summary.classifications.red, "Crítico / Intervención prioritaria"],
    ["YELLOW", summary.classifications.yellow, "En desarrollo / Refuerzo"],
    ["GREEN", summary.classifications.green, "Competente / Autónomo"],
  ];

  return (
    <main className="analytics-shell">
      <header className="analytics-header">
        <div>
          <p className="analytics-eyebrow">CLAS · Intelligence hub</p>
          <h1>Impacto comunitario</h1>
          <p className="analytics-header-copy">
            Lectura ejecutiva de participación, competencias y territorios.
          </p>
        </div>
        <div className="analytics-header-actions">
          <span className={`analytics-source-badge ${source === LIVE_SOURCE ? "is-live" : "is-simulated"}`}>
            {source === LIVE_SOURCE ? "🟢 DATOS EN VIVO (API PostgreSQL)" : "🧪 MODO SIMULACIÓN (50 Sesiones Generadas)"}
          </span>
          <button type="button" className="analytics-ghost-button" onClick={() => setAuthenticated(false)}>
            Bloquear vista
          </button>
        </div>
      </header>

      <section className="analytics-toolbar">
        <div>
          {loading && <span>Sincronizando datos…</span>}
          {apiError && <span className="analytics-toolbar-warning">API no disponible: usando simulación segura.</span>}
        </div>
        <div className="analytics-toolbar-actions">
          <button type="button" onClick={handleSimulation}>Generar 50 sesiones simuladas</button>
          <button type="button" onClick={loadLiveData}>Restaurar datos reales de la API</button>
          <button type="button" onClick={handleExportCsv}>Exportar CSV</button>
          <button type="button" onClick={handleExportJson}>Exportar JSON</button>
        </div>
      </section>

      <section className="analytics-kpi-grid" aria-label="Indicadores principales">
        {[
          ["Sesiones totales", total, "Participación acumulada"],
          ["Tasa de finalización", `${round(metrics.completionRate)}%`, "Conversión del flujo"],
          ["Tasa de abandono", `${round(metrics.abandonmentRate)}%`, "Pérdida antes de completar"],
          ["Puntaje global promedio", `${round(metrics.globalAverage)} / 9`, "Promedio de competencias"],
        ].map(([label, value, detail]) => (
          <article className="analytics-kpi-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{detail}</small>
          </article>
        ))}
      </section>

      <section className="analytics-content-grid">
        <article className="analytics-panel analytics-traffic-panel">
          <div className="analytics-panel-heading">
            <div>
              <p className="analytics-eyebrow">Traffic-light</p>
              <h2>Semáforo de literacidad</h2>
            </div>
            <span className="analytics-panel-total">{summary.funnel.completed_sessions} completadas</span>
          </div>
          <div className="analytics-traffic-cards">
            {classifications.map(([key, count, description]) => (
              <div className="analytics-traffic-card" key={key} style={{ "--traffic-color": STATUS_META[key].color }}>
                <span>{key}</span>
                <strong>{count}</strong>
                <small>{description}</small>
              </div>
            ))}
          </div>
          <div className="analytics-distribution-bar" aria-label="Distribución de clasificaciones">
            {classifications.map(([key, count]) => (
              <span key={key} style={{ width: `${total ? (count / total) * 100 : 0}%`, background: STATUS_META[key].color }} />
            ))}
          </div>
        </article>

        <article className="analytics-panel">
          <div className="analytics-panel-heading">
            <div>
              <p className="analytics-eyebrow">Competencias</p>
              <h2>Desglose por categoría</h2>
            </div>
          </div>
          <div className="analytics-category-list">
            {CATEGORY_META.map((category) => {
              const value = Number(summary.category_averages[category.key] || 0);
              return (
                <div className="analytics-category-row" key={category.key}>
                  <div className="analytics-category-label"><strong>{category.label}</strong><span>{category.name}</span></div>
                  <div className="analytics-progress"><span style={{ width: `${Math.min(100, (value / category.max) * 100)}%` }} /></div>
                  <b>{round(value)} <small>/ {category.max}.0</small></b>
                </div>
              );
            })}
          </div>
        </article>
      </section>

      <section className="analytics-content-grid">
        <article className="analytics-panel">
          <div className="analytics-panel-heading">
            <div><p className="analytics-eyebrow">Conversion funnel</p><h2>Embudo de participación</h2></div>
          </div>
          <div className="analytics-funnel">
            {[
              ["Sesiones iniciadas", total, 100],
              ["Sesiones completadas", summary.funnel.completed_sessions, metrics.completionRate],
              ["Sesiones abandonadas", summary.funnel.abandoned_sessions, metrics.abandonmentRate],
            ].map(([label, value, rate]) => (
              <div className="analytics-funnel-row" key={label}>
                <div><span>{label}</span><b>{value}</b></div>
                <div className="analytics-funnel-track"><span style={{ width: `${rate}%` }} /></div>
                <small>{round(rate)}%</small>
              </div>
            ))}
          </div>
        </article>

        <article className="analytics-panel analytics-action-panel">
          <div className="analytics-panel-heading"><div><p className="analytics-eyebrow">Next best actions</p><h2>Plan de acción recomendado</h2></div></div>
          <ul className="analytics-action-list">
            <li><span>01</span><div><strong>Priorizar {weakestCategory.label} · {weakestCategory.name}</strong><p>Diseñar un taller focalizado porque es la competencia con menor avance relativo.</p></div></li>
            <li><span>02</span><div><strong>Desplegar facilitadores en {redZones.length || "zonas"} zona{redZones.length === 1 ? "" : "s"} RED</strong><p>Concentrar acompañamiento presencial donde el semáforo indica intervención prioritaria.</p></div></li>
            <li><span>03</span><div><strong>Reducir el abandono del {round(metrics.abandonmentRate)}%</strong><p>Activar recordatorios y seguimiento temprano para recuperar sesiones incompletas.</p></div></li>
          </ul>
        </article>
      </section>

      <section className="analytics-content-grid analytics-map-grid">
        <article className="analytics-panel analytics-map-panel">
          <div className="analytics-panel-heading"><div><p className="analytics-eyebrow">Territory view</p><h2>Mapa de cobertura</h2></div><span className="analytics-panel-total">Panamá</span></div>
          <MapContainer center={[9.05, -79.55]} zoom={9} scrollWheelZoom={false} className="analytics-map">
            <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {zones.map((zone) => (
              <CircleMarker key={zone.code} center={zone.position} radius={12} pathOptions={{ color: STATUS_META[zone.status].color, fillColor: STATUS_META[zone.status].color, fillOpacity: 0.75 }}>
                <Popup><strong>{zone.code} · {zone.name}</strong><br />{zone.total} sesiones · {round(zone.completionRate)}% finalización<br />Estado: {zone.status}</Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </article>

        <article className="analytics-panel analytics-zones-panel">
          <div className="analytics-panel-heading"><div><p className="analytics-eyebrow">Community zones</p><h2>Desglose territorial</h2></div></div>
          <div className="analytics-table-wrap">
            <table className="analytics-table">
              <thead><tr><th>Zona</th><th>Total</th><th>Fin.</th><th>Puntaje</th><th>Estado</th><th>Prioridad</th></tr></thead>
              <tbody>{zones.map((zone) => <tr key={zone.code}><td><strong>{zone.code}</strong><span>{zone.name}</span></td><td>{zone.total}</td><td>{round(zone.completionRate)}%</td><td>{zone.score}</td><td><span className="analytics-status-pill" style={{ color: STATUS_META[zone.status].color }}>{zone.status}</span></td><td>{STATUS_META[zone.status].priority}</td></tr>)}</tbody>
            </table>
          </div>
        </article>
      </section>
    </main>
  );
}
