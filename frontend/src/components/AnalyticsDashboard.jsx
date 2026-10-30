import { useEffect, useMemo, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { getAnalyticsSummary } from "../api/api";
import IntelligenceDashboard from "./admin/IntelligenceDashboard";
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
  RED: {
    label: "RED",
    level: "Intervención prioritaria",
    hint: "Nivel crítico",
    tag: "Prioridad",
    tone: "danger",
    color: "#c81e1e",
    priority: "Prioridad alta",
  },
  YELLOW: {
    label: "YELLOW",
    level: "En refuerzo",
    hint: "En desarrollo",
    tag: "En refuerzo",
    tone: "warning",
    color: "#b45309",
    priority: "Refuerzo",
  },
  GREEN: {
    label: "GREEN",
    level: "Autónomo",
    hint: "Competente",
    tag: "Autónomo",
    tone: "success",
    color: "#15803d",
    priority: "Seguimiento",
  },
};

function competencyStatus(ratio) {
  const percent = ratio * 100;
  if (percent < 45) return { label: "Prioridad", tone: "danger" };
  if (percent <= 70) return { label: "En refuerzo", tone: "warning" };
  return { label: "Estable", tone: "success" };
}

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
  const [activeTab, setActiveTab] = useState("general");
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
          <p className="analytics-eyebrow">Acceso institucional</p>
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
    ["RED", summary.classifications.red],
    ["YELLOW", summary.classifications.yellow],
    ["GREEN", summary.classifications.green],
  ];
  const classifiedTotal = classifications.reduce(
    (sum, [, count]) => sum + count,
    0,
  );
  const classificationShare = (count) =>
    classifiedTotal ? (count / classifiedTotal) * 100 : 0;
  const isLiveSource = source === LIVE_SOURCE;

  return (
    <main className="analytics-shell">
      <header className="analytics-command">
        <div className="analytics-command-inner">
          <div className="analytics-command-main">
            <div className="analytics-command-title">
              <p className="analytics-eyebrow">CCLAS · TELEMETRÍA</p>
              <h1>Impacto comunitario</h1>
            </div>
            <nav className="analytics-view-tabs" aria-label="Vistas del centro de analítica">
              <button
                type="button"
                className={`analytics-tab-btn ${activeTab === "general" ? "is-active" : ""}`}
                aria-current={activeTab === "general" ? "page" : undefined}
                onClick={() => setActiveTab("general")}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-7" /><path d="M22 20H2" /></svg>
                Resumen general
              </button>
              <button
                type="button"
                className={`analytics-tab-btn ${activeTab === "ai" ? "is-active" : ""}`}
                aria-current={activeTab === "ai" ? "page" : undefined}
                onClick={() => setActiveTab("ai")}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 21s-6-5.2-6-10a6 6 0 0 1 12 0c0 4.8-6 10-6 10z" /><circle cx="12" cy="11" r="2" /></svg>
                Análisis territorial
              </button>
            </nav>
          </div>

          <div className="analytics-command-side">
            <span className={`analytics-source-badge ${isLiveSource ? "is-live" : "is-simulated"}`}>
              <span className="status-dot" aria-hidden="true" />
              {isLiveSource ? "Datos conectados" : "Datos de demostración"}
            </span>
            <div className="analytics-command-actions">
              <button type="button" onClick={handleSimulation} title="Generar una muestra simulada de 50 sesiones" aria-label="Simular muestra de 50 sesiones">Simular muestra</button>
              <button type="button" onClick={loadLiveData} title="Restaurar los datos reales" aria-label="Restaurar datos reales">Restaurar</button>
              <button type="button" onClick={handleExportCsv} title="Exportar los datos en CSV" aria-label="Exportar CSV">CSV</button>
              <button type="button" onClick={handleExportJson} title="Exportar los datos en JSON" aria-label="Exportar JSON">JSON</button>
              <button type="button" className="is-lock" onClick={() => setAuthenticated(false)} title="Bloquear la vista" aria-label="Bloquear vista">Bloquear</button>
            </div>
          </div>
        </div>
      </header>

      <div className="analytics-body">
        {(loading || apiError) && (
          <p className="analytics-notice" role="status">
            {loading && <span>Sincronizando datos…</span>}
            {apiError && (
              <span className="analytics-toolbar-warning">
                Servicio no disponible: se muestran datos de demostración.
              </span>
            )}
          </p>
        )}

        {activeTab === "ai" ? (
          <IntelligenceDashboard forceSimulation={source === SIMULATED_SOURCE} />
        ) : (
          <>
            <section className="analytics-metric-strip" aria-label="Indicadores principales">
              <article className="analytics-metric is-primary">
                <span className="analytics-metric-label">Sesiones totales</span>
                <strong className="analytics-metric-value">{total}</strong>
                <small>Participación acumulada</small>
              </article>
              <article className="analytics-metric">
                <span className="analytics-metric-label">Tasa de finalización</span>
                <strong className="analytics-metric-value">
                  {round(metrics.completionRate)}
                  <span className="analytics-metric-unit">%</span>
                </strong>
                <div className="analytics-mini-track" aria-hidden="true">
                  <span style={{ width: `${Math.min(100, metrics.completionRate)}%` }} />
                </div>
                <small>
                  {summary.funnel.completed_sessions} de {total} sesiones
                </small>
              </article>
              <article className="analytics-metric">
                <span className="analytics-metric-label">Tasa de abandono</span>
                <strong className="analytics-metric-value">
                  {round(metrics.abandonmentRate)}
                  <span className="analytics-metric-unit">%</span>
                </strong>
                <div className="analytics-mini-track is-danger" aria-hidden="true">
                  <span style={{ width: `${Math.min(100, metrics.abandonmentRate)}%` }} />
                </div>
                <small>
                  {summary.funnel.abandoned_sessions} sesiones sin completar
                </small>
              </article>
              <article className="analytics-metric">
                <span className="analytics-metric-label">Puntaje global promedio</span>
                <strong className="analytics-metric-value">
                  {round(metrics.globalAverage)}
                  <span className="analytics-metric-scale">/ 9</span>
                </strong>
                <small>Promedio de competencias</small>
              </article>
            </section>

            <section className="analytics-bento">
              <article className="analytics-panel analytics-traffic-panel">
                <div className="analytics-panel-heading">
                  <div>
                    <p className="analytics-eyebrow">Distribución de niveles</p>
                    <h2>Semáforo de literacidad</h2>
                  </div>
                  <span className="analytics-panel-total">{summary.funnel.completed_sessions} completadas</span>
                </div>
                <div className="analytics-stack" role="img" aria-label="Distribución proporcional de niveles">
                  {classifications.map(([key, count]) => (
                    <span key={key} style={{ width: `${classificationShare(count)}%`, background: STATUS_META[key].color }} />
                  ))}
                </div>
                <ul className="analytics-ledger">
                  {classifications.map(([key, count]) => (
                    <li className="analytics-ledger-row" key={key}>
                      <span className="analytics-ledger-name">
                        <span className="analytics-ledger-dot" aria-hidden="true" style={{ background: STATUS_META[key].color }} />
                        <span>
                          <strong>{STATUS_META[key].level}</strong>
                          <small>{STATUS_META[key].hint}</small>
                        </span>
                      </span>
                      <span className="analytics-ledger-count">{count} <small>sesiones</small></span>
                      <b className="analytics-ledger-pct">{round(classificationShare(count))}%</b>
                    </li>
                  ))}
                </ul>
              </article>

              <article className="analytics-panel">
                <div className="analytics-panel-heading">
                  <div><p className="analytics-eyebrow">Flujo de participación</p><h2>Embudo de participación</h2></div>
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

              <article className="analytics-panel">
                <div className="analytics-panel-heading">
                  <div>
                    <p className="analytics-eyebrow">Competencias</p>
                    <h2>Matriz de competencias C1–C4</h2>
                  </div>
                </div>
                <div className="analytics-table-wrap">
                  <table className="analytics-table analytics-matrix">
                    <thead>
                      <tr>
                        <th>Cód.</th>
                        <th>Competencia</th>
                        <th>Avance</th>
                        <th>Puntaje</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {CATEGORY_META.map((category) => {
                        const value = Number(summary.category_averages[category.key] || 0);
                        const ratio = category.max ? value / category.max : 0;
                        const status = competencyStatus(ratio);
                        return (
                          <tr key={category.key}>
                            <td><strong className="analytics-code">{category.label}</strong></td>
                            <td>{category.name}</td>
                            <td className="analytics-matrix-track">
                              <div className="analytics-progress">
                                <span className={`is-${status.tone}`} style={{ width: `${Math.min(100, ratio * 100)}%` }} />
                              </div>
                            </td>
                            <td>{round(value)} / {category.max}.0</td>
                            <td><span className={`analytics-tag is-${status.tone}`}>{status.label}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </article>

              <article className="analytics-panel analytics-action-panel">
                <div className="analytics-panel-heading"><div><p className="analytics-eyebrow">Acciones prioritarias</p><h2>Plan de acción recomendado</h2></div></div>
                <ul className="analytics-action-list">
                  <li><span>01</span><div><strong>Priorizar {weakestCategory.label} · {weakestCategory.name}</strong><p>Diseñar un taller focalizado porque es la competencia con menor avance relativo.</p></div></li>
                  <li><span>02</span><div><strong>Desplegar facilitadores en {redZones.length ? `${redZones.length} zona${redZones.length === 1 ? "" : "s"}` : "las zonas"} de intervención prioritaria</strong><p>Concentrar acompañamiento presencial donde el semáforo indica intervención prioritaria.</p></div></li>
                  <li><span>03</span><div><strong>Reducir el abandono del {round(metrics.abandonmentRate)}%</strong><p>Activar recordatorios y seguimiento temprano para recuperar sesiones incompletas.</p></div></li>
                </ul>
              </article>

              <article className="analytics-panel analytics-zones-panel">
                <div className="analytics-panel-heading"><div><p className="analytics-eyebrow">Zonas de intervención</p><h2>Desglose territorial</h2></div></div>
                <div className="analytics-table-wrap">
                  <table className="analytics-table">
                    <thead><tr><th>Zona</th><th>Total</th><th>Fin.</th><th>Puntaje</th><th>Estado</th><th>Prioridad</th></tr></thead>
                    <tbody>{zones.map((zone) => <tr key={zone.code}><td><strong>{zone.code}</strong><span>{zone.name}</span></td><td>{zone.total}</td><td>{round(zone.completionRate)}%</td><td>{zone.score}</td><td><span className={`analytics-tag is-${STATUS_META[zone.status].tone}`}>{STATUS_META[zone.status].tag}</span></td><td>{STATUS_META[zone.status].priority}</td></tr>)}</tbody>
                  </table>
                </div>
              </article>

              <article className="analytics-panel analytics-map-panel">
                <div className="analytics-panel-heading"><div><p className="analytics-eyebrow">Cobertura territorial</p><h2>Mapa de cobertura</h2></div><span className="analytics-panel-total">Panamá</span></div>
                <MapContainer center={[9.05, -79.55]} zoom={9} scrollWheelZoom={false} className="analytics-map">
                  <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  {zones.map((zone) => (
                    <CircleMarker key={zone.code} center={zone.position} radius={12} pathOptions={{ color: STATUS_META[zone.status].color, fillColor: STATUS_META[zone.status].color, fillOpacity: 0.75 }}>
                      <Popup><strong>{zone.code} · {zone.name}</strong><br />{zone.total} sesiones · {round(zone.completionRate)}% finalización<br />Estado: {STATUS_META[zone.status].tag}</Popup>
                    </CircleMarker>
                  ))}
                </MapContainer>
              </article>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
