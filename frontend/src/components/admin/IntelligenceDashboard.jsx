import { useCallback, useEffect, useMemo, useState } from "react";
import { getKioskC4Dispersal, getVulnerabilityRanking } from "../../api/api";
import "./IntelligenceDashboard.css";

const FALLBACK_RANKING = {
  global_avg_critical_index: 41.8,
  zones: [
    {
      zone_code: "Z001",
      zone_name: "Curundú",
      total_sessions: 18,
      red_sessions: 12,
      yellow_sessions: 4,
      green_sessions: 2,
      avg_total_score: 3.1,
      critical_literacy_index: 66.7,
      vulnerability_rank: 1,
      dense_vulnerability_rank: 1,
    },
    {
      zone_code: "Z014",
      zone_name: "Tocumen",
      total_sessions: 14,
      red_sessions: 7,
      yellow_sessions: 5,
      green_sessions: 2,
      avg_total_score: 4.2,
      critical_literacy_index: 50.0,
      vulnerability_rank: 2,
      dense_vulnerability_rank: 2,
    },
    {
      zone_code: "Z006",
      zone_name: "El Chorrillo",
      total_sessions: 12,
      red_sessions: 5,
      yellow_sessions: 4,
      green_sessions: 3,
      avg_total_score: 4.8,
      critical_literacy_index: 41.7,
      vulnerability_rank: 3,
      dense_vulnerability_rank: 3,
    },
    {
      zone_code: "Z002",
      zone_name: "Bethania",
      total_sessions: 10,
      red_sessions: 2,
      yellow_sessions: 5,
      green_sessions: 3,
      avg_total_score: 6.1,
      critical_literacy_index: 20.0,
      vulnerability_rank: 4,
      dense_vulnerability_rank: 4,
    },
  ],
};

const FALLBACK_DISPERSAL = {
  global_avg_c4_score: 1.55,
  kiosks: [
    {
      kiosk_id: "PTYK001",
      kiosk_name: "Smart Kiosk Curundú",
      zone_code: "Z001",
      total_sessions: 18,
      avg_c4_score: 0.94,
      stddev_c4_score: 1.24,
      min_c4_score: 0,
      max_c4_score: 3,
      p25_c4_score: 0.0,
      p50_c4_score: 1.0,
      p75_c4_score: 2.0,
      iqr_c4_score: 2.0,
      avg_duration_seconds: 112.4,
      stddev_duration_seconds: 38.5,
      dispersal_rank: 1,
      is_outlier: true,
    },
    {
      kiosk_id: "DIRECT_WEB",
      kiosk_name: "Direct PWA Web Access",
      zone_code: null,
      total_sessions: 16,
      avg_c4_score: 1.88,
      stddev_c4_score: 1.08,
      min_c4_score: 0,
      max_c4_score: 3,
      p25_c4_score: 1.0,
      p50_c4_score: 2.0,
      p75_c4_score: 3.0,
      iqr_c4_score: 2.0,
      avg_duration_seconds: 84.2,
      stddev_duration_seconds: 24.1,
      dispersal_rank: 2,
      is_outlier: true,
    },
    {
      kiosk_id: "PTYK002",
      kiosk_name: "Smart Kiosk Bethania",
      zone_code: "Z002",
      total_sessions: 10,
      avg_c4_score: 1.85,
      stddev_c4_score: 0.52,
      min_c4_score: 1,
      max_c4_score: 3,
      p25_c4_score: 1.0,
      p50_c4_score: 2.0,
      p75_c4_score: 2.0,
      iqr_c4_score: 1.0,
      avg_duration_seconds: 76.0,
      stddev_duration_seconds: 14.3,
      dispersal_rank: 3,
      is_outlier: false,
    },
  ],
};

export default function IntelligenceDashboard({ forceSimulation = false }) {
  const [rankingData, setRankingData] = useState(FALLBACK_RANKING);
  const [dispersalData, setDispersalData] = useState(FALLBACK_DISPERSAL);
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchIntelligenceData = useCallback(async (signal) => {
    setLoading(true);
    setErrorMsg("");
    try {
      const [rankingRes, dispersalRes] = await Promise.all([
        getVulnerabilityRanking({ signal }),
        getKioskC4Dispersal({ signal }),
      ]);

      const hasZones = Array.isArray(rankingRes?.zones) && rankingRes.zones.length > 0;
      const hasKiosks = Array.isArray(dispersalRes?.kiosks) && dispersalRes.kiosks.length > 0;

      if (hasZones || hasKiosks) {
        setRankingData(hasZones ? rankingRes : FALLBACK_RANKING);
        setDispersalData(hasKiosks ? dispersalRes : FALLBACK_DISPERSAL);
        setIsLive(true);
      } else {
        setRankingData(FALLBACK_RANKING);
        setDispersalData(FALLBACK_DISPERSAL);
        setIsLive(false);
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        setErrorMsg(error.message || "Error consultando endpoints Pre-ML");
        setRankingData(FALLBACK_RANKING);
        setDispersalData(FALLBACK_DISPERSAL);
        setIsLive(false);
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (forceSimulation) {
      setRankingData(FALLBACK_RANKING);
      setDispersalData(FALLBACK_DISPERSAL);
      setIsLive(false);
      return undefined;
    }
    const controller = new AbortController();
    fetchIntelligenceData(controller.signal);
    return () => controller.abort();
  }, [fetchIntelligenceData, forceSimulation]);

  const zones = rankingData?.zones || [];
  const kiosks = dispersalData?.kiosks || [];
  const topZone = zones[0] || null;
  const outlierKiosks = useMemo(
    () => kiosks.filter((kiosk) => kiosk.is_outlier),
    [kiosks],
  );
  const topDispersalKiosk = outlierKiosks[0] || kiosks[0] || null;

  const primaryAiAlert = useMemo(() => {
    if (!topZone) {
      return "⚠️ ALERTA IA: Sin registros territoriales suficientes para estimar el índice de vulnerabilidad crítica.";
    }
    return `⚠️ ALERTA IA: La zona ${topZone.zone_name} (${topZone.zone_code}) tiene un índice crítico de ${Number(topZone.critical_literacy_index).toFixed(1)}%. Se sugiere despliegue urgente de campaña educativa de Ciberseguridad.`;
  }, [topZone]);

  return (
    <div className="ai-dashboard" aria-label="Panel de Inteligencia IA y Pre-ML">
      <div className="ai-status-bar">
        <div className="ai-status-meta">
          <span className={`ai-badge ${isLive ? "is-live" : "is-fallback"}`}>
            {isLive
              ? "🟢 Motor SQLAlchemy Pre-ML en Vivo"
              : "🧪 Dataset Pre-ML de Demostración"}
          </span>
          <span>
            Endpoints: <code>/api/analytics/vulnerability-ranking</code> ·{" "}
            <code>/api/analytics/kiosk-c4-dispersal</code>
          </span>
          {loading && <span>Sincronizando consultas analíticas…</span>}
          {errorMsg && <span>({errorMsg})</span>}
        </div>
        <div className="ai-status-actions">
          <button
            type="button"
            className="ai-btn"
            onClick={() => fetchIntelligenceData()}
          >
            Actualizar consultas SQL
          </button>
          <button
            type="button"
            className="ai-btn"
            onClick={() => {
              setRankingData(FALLBACK_RANKING);
              setDispersalData(FALLBACK_DISPERSAL);
              setIsLive(false);
            }}
          >
            Ver escenario Pre-ML demostrativo
          </button>
        </div>
      </div>

      {/* Sección 3 destacada arriba: AI Automated Insights (Sugerencias IA) */}
      <section className="ai-insights-card" aria-label="Sugerencias automatizadas de IA">
        <div className="ai-insights-header">
          <div>
            <p className="ai-eyebrow">AI Automated Insights · Feature Store Readiness</p>
            <h2>Sugerencias IA y Diagnóstico Automatizado</h2>
          </div>
          <span className="ai-metric-pill">
            Índice Crítico Global: {Number(rankingData?.global_avg_critical_index || 0).toFixed(1)}%
          </span>
        </div>

        <p className="ai-primary-alert" role="status">
          {primaryAiAlert}
        </p>

        <ul className="ai-secondary-insights">
          {topDispersalKiosk && (
            <li>
              <strong>
                🔍 Anomalía en Kiosco {topDispersalKiosk.kiosk_id} ({topDispersalKiosk.kiosk_name})
              </strong>
              Presenta una desviación estándar en Ciberseguridad (C4) de{" "}
              <b>σ = {Number(topDispersalKiosk.stddev_c4_score).toFixed(2)}</b> (rango intercuartílico IQR ={" "}
              {Number(topDispersalKiosk.iqr_c4_score).toFixed(1)}). Se recomienda activar modo asistido
              en este punto para nivelar brechas digitales.
            </li>
          )}
          <li>
            <strong>📊 Estado de Outliers en C4 (Ciberseguridad)</strong>
            Se detectaron <b>{outlierKiosks.length}</b> punto(s) de acceso con alta varianza o desviación
            respecto a la media global ({Number(dispersalData?.global_avg_c4_score || 0).toFixed(2)} / 3.0).
          </li>
        </ul>
      </section>

      <div className="ai-grid">
        {/* Sección 1: Top Vulnerability Ranking */}
        <article className="ai-panel" aria-label="Ranking de vulnerabilidad por zona">
          <div className="ai-panel-header">
            <div>
              <p className="ai-eyebrow">Query 1 · Window RANK() OVER</p>
              <h2>Top Vulnerability Ranking por Zona</h2>
              <p className="ai-panel-subtitle">
                Clasificación según porcentaje de sesiones en categoría crítica (RED). Top 1 resaltado en rojo.
              </p>
            </div>
            <span className="ai-metric-pill">{zones.length} zonas evaluadas</span>
          </div>

          <div className="ai-table-wrap">
            <table className="ai-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Zona</th>
                  <th>Sesiones (R/Y/G)</th>
                  <th>Promedio</th>
                  <th>Índice Crítico (% RED)</th>
                </tr>
              </thead>
              <tbody>
                {zones.map((zone, idx) => {
                  const isTop1 = zone.vulnerability_rank === 1 || idx === 0;
                  const indexVal = Number(zone.critical_literacy_index || 0);
                  const barClass = isTop1
                    ? "is-red"
                    : indexVal >= 40
                      ? "is-yellow"
                      : "";
                  return (
                    <tr
                      key={zone.zone_code}
                      className={isTop1 ? "ai-row-top1" : ""}
                    >
                      <td>
                        <span className={`ai-rank-badge ${isTop1 ? "is-top1" : ""}`}>
                          #{zone.vulnerability_rank}
                        </span>
                      </td>
                      <td className="ai-zone-cell">
                        <strong>
                          {zone.zone_name} {isTop1 ? "· CRÍTICO" : ""}
                        </strong>
                        <span>Código {zone.zone_code}</span>
                      </td>
                      <td>
                        {zone.total_sessions}{" "}
                        <small>
                          ({zone.red_sessions}R / {zone.yellow_sessions}Y / {zone.green_sessions}G)
                        </small>
                      </td>
                      <td>{Number(zone.avg_total_score || 0).toFixed(1)} / 9</td>
                      <td>
                        <div className="ai-index-bar-wrap">
                          <div className="ai-index-track">
                            <div
                              className={`ai-index-fill ${barClass}`}
                              style={{ width: `${Math.min(100, indexVal)}%` }}
                            />
                          </div>
                          <span>{indexVal.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </article>

        {/* Sección 2: C4 Outlier Detection */}
        <article className="ai-panel" aria-label="Detección de outliers en Ciberseguridad C4">
          <div className="ai-panel-header">
            <div>
              <p className="ai-eyebrow">Query 2 · Dispersión y Percentiles C4</p>
              <h2>C4 Outlier Detection por Kiosco</h2>
              <p className="ai-panel-subtitle">
                Desviación estándar (σ), cuartiles (P25/P50/P75) y duración en Ciberseguridad.
              </p>
            </div>
            <span className="ai-metric-pill">
              Media C4: {Number(dispersalData?.global_avg_c4_score || 0).toFixed(2)} / 3
            </span>
          </div>

          <div className="ai-kiosk-list">
            {kiosks.map((kiosk) => (
              <div
                key={kiosk.kiosk_id}
                className={`ai-kiosk-card ${kiosk.is_outlier ? "is-outlier" : ""}`}
              >
                <div className="ai-kiosk-top">
                  <div className="ai-kiosk-title">
                    <strong>
                      #{kiosk.dispersal_rank} · {kiosk.kiosk_name}
                    </strong>
                    <span>
                      ID: {kiosk.kiosk_id}
                      {kiosk.zone_code ? ` · Zona ${kiosk.zone_code}` : " · Canal Web"} ·{" "}
                      {kiosk.total_sessions} sesiones
                    </span>
                  </div>
                  <span
                    className={`ai-outlier-tag ${
                      kiosk.is_outlier ? "is-alert" : "is-normal"
                    }`}
                  >
                    {kiosk.is_outlier ? "⚠️ OUTLIER DETECTADO" : "✓ DISPERSIÓN NORMAL"}
                  </span>
                </div>

                <div className="ai-kiosk-metrics">
                  <div className="ai-kiosk-metric">
                    <small>Media C4</small>
                    <strong>{Number(kiosk.avg_c4_score).toFixed(2)} / 3</strong>
                  </div>
                  <div className="ai-kiosk-metric">
                    <small>Desv. Estándar (σ)</small>
                    <strong>{Number(kiosk.stddev_c4_score).toFixed(2)}</strong>
                  </div>
                  <div className="ai-kiosk-metric">
                    <small>P25 / Mediana / P75</small>
                    <strong>
                      {kiosk.p25_c4_score} / {kiosk.p50_c4_score} / {kiosk.p75_c4_score}
                    </strong>
                  </div>
                  <div className="ai-kiosk-metric">
                    <small>Duración (μ ± σ)</small>
                    <strong>
                      {Math.round(kiosk.avg_duration_seconds)}s ±{" "}
                      {Math.round(kiosk.stddev_duration_seconds)}s
                    </strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>
    </div>
  );
}
