import { useEffect, useMemo, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { getAnalyticsSummary } from "../api/api";
import { LanguageSelector, useI18n } from "../utils/i18n";
import IntelligenceDashboard from "./admin/IntelligenceDashboard";
import "./AnalyticsDashboard.css";

const ANALYTICS_PIN = import.meta.env.VITE_ANALYTICS_PIN || "2026";
const LEGACY_PIN = "7058";
const LIVE_SOURCE = "LIVE_API";
const SIMULATED_SOURCE = "SIMULATED_50_SESSIONS";

const CATEGORY_META = [
  { key: "c1_visual_signs", label: "C1", nameKey: "analytics.competency.c1", max: 2 },
  {
    key: "c2_sentence_comprehension",
    label: "C2",
    nameKey: "analytics.competency.c2",
    max: 2,
  },
  { key: "c3_mobile_icons", label: "C3", nameKey: "analytics.competency.c3", max: 2 },
  { key: "c4_cybersecurity", label: "C4", nameKey: "analytics.competency.c4", max: 3 },
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
    levelKey: "analytics.status.red.level",
    hintKey: "analytics.status.red.hint",
    tagKey: "analytics.status.red.tag",
    tone: "danger",
    color: "#EF4444",
    priorityKey: "analytics.status.red.priority",
  },
  YELLOW: {
    label: "YELLOW",
    levelKey: "analytics.status.yellow.level",
    hintKey: "analytics.status.yellow.hint",
    tagKey: "analytics.status.yellow.tag",
    tone: "warning",
    color: "#F59E0B",
    priorityKey: "analytics.status.yellow.priority",
  },
  GREEN: {
    label: "GREEN",
    levelKey: "analytics.status.green.level",
    hintKey: "analytics.status.green.hint",
    tagKey: "analytics.status.green.tag",
    tone: "success",
    color: "#10B981",
    priorityKey: "analytics.status.green.priority",
  },
};

function competencyStatus(ratio, t) {
  const percent = ratio * 100;
  if (percent < 45) return { label: t("analytics.competency.status.priority"), tone: "danger" };
  if (percent <= 70) return { label: t("analytics.competency.status.reinforcement"), tone: "warning" };
  return { label: t("analytics.competency.status.stable"), tone: "success" };
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
  const { t } = useI18n();
  const [authenticated, setAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [pin, setPin] = useState("");
  const [hasPinError, setHasPinError] = useState(false);
  const [summary, setSummary] = useState(emptySummary);
  const [zones, setZones] = useState([]);
  const [source, setSource] = useState(LIVE_SOURCE);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const loadLiveData = async () => {
    setLoading(true);
    setApiError("");
    setRefreshTrigger((prev) => prev + 1);
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
      setHasPinError(false);
    } else {
      setHasPinError(true);
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
      ["category_code", "category_name", "average", "maximum"],
      ...CATEGORY_META.map((category) => [
        category.label,
        t(category.nameKey),
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
        t(STATUS_META[zone.status].priorityKey),
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
          <div className="analytics-gate-top">
            <div className="analytics-mark">CLAS</div>
            <LanguageSelector variant="light" />
          </div>
          <p className="analytics-eyebrow">{t("analytics.gate.eyebrow")}</p>
          <h1>{t("analytics.gate.title")}</h1>
          <p className="analytics-gate-copy">
            {t("analytics.gate.copy")}
          </p>
          <form onSubmit={handlePinSubmit}>
            <label htmlFor="analytics-pin">{t("analytics.gate.pinLabel")}</label>
            <input
              id="analytics-pin"
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              placeholder="••••"
              aria-invalid={hasPinError}
              autoFocus
            />
            {hasPinError && (
              <p className="analytics-form-error" role="alert">
                {t("analytics.gate.pinError")}
              </p>
            )}
            <button className="analytics-primary-button" type="submit">
              {t("analytics.gate.unlock")}
            </button>
          </form>
          <a className="analytics-text-link" href="/">{t("analytics.gate.backLink")}</a>
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
  const action2Title =
    redZones.length === 1
      ? t("analytics.actionsPanel.item2TitleOne")
      : redZones.length > 1
        ? t("analytics.actionsPanel.item2TitleMany", { count: redZones.length })
        : t("analytics.actionsPanel.item2TitleNone");

  return (
    <main className="analytics-shell">
      <header className="analytics-command">
        <div className="analytics-command-inner">
          <div className="analytics-command-main">
            <div className="analytics-command-title">
              <p className="analytics-eyebrow">{t("analytics.header.eyebrow")}</p>
              <h1>{t("analytics.header.title")}</h1>
            </div>
            <nav className="analytics-view-tabs" aria-label={t("analytics.tabs.aria")}>
              <button
                type="button"
                className={`analytics-tab-btn ${activeTab === "general" ? "is-active" : ""}`}
                aria-current={activeTab === "general" ? "page" : undefined}
                onClick={() => setActiveTab("general")}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-7" /><path d="M22 20H2" /></svg>
                {t("analytics.tabs.general")}
              </button>
              <button
                type="button"
                className={`analytics-tab-btn ${activeTab === "ai" ? "is-active" : ""}`}
                aria-current={activeTab === "ai" ? "page" : undefined}
                onClick={() => setActiveTab("ai")}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 21s-6-5.2-6-10a6 6 0 0 1 12 0c0 4.8-6 10-6 10z" /><circle cx="12" cy="11" r="2" /></svg>
                {t("analytics.tabs.territorial")}
              </button>
            </nav>
          </div>

          <div className="analytics-command-side">
            <span className={`analytics-source-badge ${isLiveSource ? "is-live" : "is-simulated"}`}>
              <span className="status-dot" aria-hidden="true" />
              {isLiveSource ? t("analytics.source.live") : t("analytics.source.demo")}
            </span>
            <div className="analytics-command-actions">
              <button type="button" onClick={handleSimulation} title={t("analytics.actions.simulateTitle")} aria-label={t("analytics.actions.simulateAria")}>{t("analytics.actions.simulate")}</button>
              <button type="button" onClick={loadLiveData} title={t("analytics.actions.restoreTitle")} aria-label={t("analytics.actions.restoreAria")}>{t("analytics.actions.restore")}</button>
              <button type="button" className="is-export" onClick={handleExportCsv} title={t("analytics.actions.csvTitle")} aria-label={t("analytics.actions.csvAria")}>CSV</button>
              <button type="button" className="is-export" onClick={handleExportJson} title={t("analytics.actions.jsonTitle")} aria-label={t("analytics.actions.jsonAria")}>JSON</button>
              <button type="button" className="is-lock" onClick={() => setAuthenticated(false)} title={t("analytics.actions.lockTitle")} aria-label={t("analytics.actions.lockAria")}>{t("analytics.actions.lock")}</button>
            </div>
            <LanguageSelector />
          </div>
        </div>
      </header>

      <div className="analytics-body">
        {(loading || apiError) && (
          <p className="analytics-notice" role="status">
            {loading && <span>{t("analytics.notice.syncing")}</span>}
            {apiError && (
              <span className="analytics-toolbar-warning">
                {t("analytics.notice.offline")}
              </span>
            )}
          </p>
        )}

        {activeTab === "ai" ? (
          <IntelligenceDashboard
            forceSimulation={source === SIMULATED_SOURCE}
            refreshTrigger={refreshTrigger}
          />
        ) : (
          <>
            <section className="analytics-metric-strip" aria-label={t("analytics.metrics.aria")}>
              <article className="analytics-metric is-primary">
                <span className="analytics-metric-label">{t("analytics.metrics.totalSessions")}</span>
                <strong className="analytics-metric-value">{total}</strong>
                <small>{t("analytics.metrics.cumulativeParticipation")}</small>
              </article>
              <article className="analytics-metric">
                <span className="analytics-metric-label">{t("analytics.metrics.completionRate")}</span>
                <strong className="analytics-metric-value">
                  {round(metrics.completionRate)}
                  <span className="analytics-metric-unit">%</span>
                </strong>
                <div className="analytics-mini-track" aria-hidden="true">
                  <span style={{ width: `${Math.min(100, metrics.completionRate)}%` }} />
                </div>
                <small>
                  {t("analytics.metrics.completedOfTotal", {
                    completed: summary.funnel.completed_sessions,
                    total,
                  })}
                </small>
              </article>
              <article className="analytics-metric">
                <span className="analytics-metric-label">{t("analytics.metrics.abandonmentRate")}</span>
                <strong className="analytics-metric-value">
                  {round(metrics.abandonmentRate)}
                  <span className="analytics-metric-unit">%</span>
                </strong>
                <div className="analytics-mini-track is-danger" aria-hidden="true">
                  <span style={{ width: `${Math.min(100, metrics.abandonmentRate)}%` }} />
                </div>
                <small>
                  {t("analytics.metrics.abandonedCount", {
                    abandoned: summary.funnel.abandoned_sessions,
                  })}
                </small>
              </article>
              <article className="analytics-metric">
                <span className="analytics-metric-label">{t("analytics.metrics.globalAverage")}</span>
                <strong className="analytics-metric-value">
                  {round(metrics.globalAverage)}
                  <span className="analytics-metric-scale">/ 9</span>
                </strong>
                <small>{t("analytics.metrics.competencyAverage")}</small>
              </article>
            </section>

            <section className="analytics-bento">
              <article className="analytics-panel analytics-traffic-panel">
                <div className="analytics-panel-heading">
                  <div>
                    <p className="analytics-eyebrow">{t("analytics.traffic.eyebrow")}</p>
                    <h2>{t("analytics.traffic.title")}</h2>
                  </div>
                  <span className="analytics-panel-total">
                    {t("analytics.traffic.completed", {
                      count: summary.funnel.completed_sessions,
                    })}
                  </span>
                </div>
                <div className="analytics-stack" role="img" aria-label={t("analytics.traffic.stackAria")}>
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
                          <strong>{t(STATUS_META[key].levelKey)}</strong>
                          <small>{t(STATUS_META[key].hintKey)}</small>
                        </span>
                      </span>
                      <span className="analytics-ledger-count">{count} <small>{t("analytics.traffic.sessionsUnit")}</small></span>
                      <b className="analytics-ledger-pct">{round(classificationShare(count))}%</b>
                    </li>
                  ))}
                </ul>
              </article>

              <article className="analytics-panel">
                <div className="analytics-panel-heading">
                  <div><p className="analytics-eyebrow">{t("analytics.funnel.eyebrow")}</p><h2>{t("analytics.funnel.title")}</h2></div>
                </div>
                <div className="analytics-funnel">
                  {[
                    [t("analytics.funnel.started"), total, 100],
                    [t("analytics.funnel.completed"), summary.funnel.completed_sessions, metrics.completionRate],
                    [t("analytics.funnel.abandoned"), summary.funnel.abandoned_sessions, metrics.abandonmentRate],
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
                    <p className="analytics-eyebrow">{t("analytics.competencies.eyebrow")}</p>
                    <h2>{t("analytics.competencies.title")}</h2>
                  </div>
                </div>
                <div className="analytics-table-wrap">
                  <table className="analytics-table analytics-matrix">
                    <thead>
                      <tr>
                        <th>{t("analytics.competencies.colArea")}</th>
                        <th>{t("analytics.competencies.colCompetency")}</th>
                        <th>{t("analytics.competencies.colProgress")}</th>
                        <th>{t("analytics.competencies.colScore")}</th>
                        <th>{t("analytics.competencies.colStatus")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {CATEGORY_META.map((category) => {
                        const value = Number(summary.category_averages[category.key] || 0);
                        const ratio = category.max ? value / category.max : 0;
                        const status = competencyStatus(ratio, t);
                        return (
                          <tr key={category.key}>
                            <td><strong className="analytics-code">{category.label}</strong></td>
                            <td>{t(category.nameKey)}</td>
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
                <div className="analytics-panel-heading"><div><p className="analytics-eyebrow">{t("analytics.actionsPanel.eyebrow")}</p><h2>{t("analytics.actionsPanel.title")}</h2></div></div>
                <ul className="analytics-action-list">
                  <li><span>01</span><div><strong>{t("analytics.actionsPanel.item1Title", { name: t(weakestCategory.nameKey), code: weakestCategory.label })}</strong><p>{t("analytics.actionsPanel.item1Body")}</p></div></li>
                  <li><span>02</span><div><strong>{action2Title}</strong><p>{t("analytics.actionsPanel.item2Body")}</p></div></li>
                  <li><span>03</span><div><strong>{t("analytics.actionsPanel.item3Title", { rate: round(metrics.abandonmentRate) })}</strong><p>{t("analytics.actionsPanel.item3Body")}</p></div></li>
                </ul>
              </article>

              <article className="analytics-panel analytics-zones-panel">
                <div className="analytics-panel-heading"><div><p className="analytics-eyebrow">{t("analytics.zones.eyebrow")}</p><h2>{t("analytics.zones.title")}</h2></div></div>
                <div className="analytics-table-wrap">
                  <table className="analytics-table">
                    <thead><tr><th>{t("analytics.zones.colZone")}</th><th>{t("analytics.zones.colSessions")}</th><th>{t("analytics.zones.colCompletion")}</th><th>{t("analytics.zones.colScore")}</th><th>{t("analytics.zones.colStatus")}</th><th>{t("analytics.zones.colPriority")}</th></tr></thead>
                    <tbody>{zones.map((zone) => <tr key={zone.code}><td><strong>{zone.code}</strong><span>{zone.name}</span></td><td>{zone.total}</td><td>{round(zone.completionRate)}%</td><td>{zone.score}</td><td><span className={`analytics-tag is-${STATUS_META[zone.status].tone}`}>{t(STATUS_META[zone.status].tagKey)}</span></td><td>{t(STATUS_META[zone.status].priorityKey)}</td></tr>)}</tbody>
                  </table>
                </div>
              </article>

              <article className="analytics-panel analytics-map-panel">
                <div className="analytics-panel-heading"><div><p className="analytics-eyebrow">{t("analytics.map.eyebrow")}</p><h2>{t("analytics.map.title")}</h2></div><span className="analytics-panel-total">{t("analytics.map.country")}</span></div>
                <MapContainer center={[9.05, -79.55]} zoom={9} scrollWheelZoom={false} className="analytics-map">
                  <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  {zones.map((zone) => (
                    <CircleMarker key={zone.code} center={zone.position} radius={12} pathOptions={{ color: STATUS_META[zone.status].color, fillColor: STATUS_META[zone.status].color, fillOpacity: 0.75 }}>
                      <Popup><strong>{zone.code} · {zone.name}</strong><br />{t("analytics.map.popupStats", { total: zone.total, rate: round(zone.completionRate) })}<br />{t("analytics.map.popupStatus", { status: t(STATUS_META[zone.status].tagKey) })}</Popup>
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
