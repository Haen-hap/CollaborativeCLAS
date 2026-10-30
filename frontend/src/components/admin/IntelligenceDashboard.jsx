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
  const outlierKiosks = useMemo(
    () => kiosks.filter((kiosk) => kiosk.is_outlier),
    [kiosks],
  );
  const topDispersalKiosk = outlierKiosks[0] || kiosks[0] || null;

  // Severity-aware headline: a 0% critical index must never read as an alarm.
  const primaryAiAlert = useMemo(() => {
    const rankedZones = rankingData?.zones || [];
    const leadZone = rankedZones[0] || null;
    if (!leadZone) {
      return {
        tone: "neutral",
        label: "",
        text: "Sin registros territoriales suficientes para estimar el índice de vulnerabilidad crítica.",
      };
    }
    const leadIndex = Number(leadZone.critical_literacy_index || 0);
    if (leadIndex === 0 || leadZone.red_sessions === 0) {
      const lowestAverageZone = rankedZones.reduce((lowest, zone) =>
        Number(zone.avg_total_score || 0) < Number(lowest.avg_total_score || 0)
          ? zone
          : lowest,
      );
      return {
        tone: "neutral",
        label: "",
        text: `Sin sesiones críticas registradas en el corte actual. La zona con menor promedio relativo es ${lowestAverageZone.zone_name} (${Number(lowestAverageZone.avg_total_score || 0).toFixed(1)} / 9); se sugiere seguimiento preventivo.`,
      };
    }
    return {
      tone: "critical",
      label: "Atención prioritaria:",
      text: `La zona ${leadZone.zone_name} (${leadZone.zone_code}) tiene un índice crítico de ${leadIndex.toFixed(1)}%. Se sugiere despliegue urgente de campaña educativa de Ciberseguridad.`,
    };
  }, [rankingData]);

  return (
    <div className="ai-dashboard" aria-label="Panel de análisis e inteligencia">
      <div className="ai-subheader">
        <div className="ai-subheader-status">
          <span className={`ai-status ${isLive ? "is-live" : "is-fallback"}`}>
            <span className="ai-dot" aria-hidden="true" />
            {isLive ? "Datos conectados" : "Datos de demostración"}
          </span>
          {loading && <span>Sincronizando…</span>}
          {errorMsg && (
            <span className="ai-subheader-warning">
              No fue posible sincronizar; se muestra la muestra base.
            </span>
          )}
        </div>
        <div className="ai-status-actions">
          <button
            type="button"
            className="ai-btn"
            onClick={() => fetchIntelligenceData()}
          >
            Sincronizar
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
            Cargar muestra base
          </button>
        </div>
      </div>

      {/* Resumen operativo: hallazgos prioritarios y recomendaciones */}
      <section
        className={`ai-insights-card ${primaryAiAlert.tone === "critical" ? "is-critical" : "is-neutral"}`}
        aria-label="Hallazgos prioritarios y recomendaciones"
      >
        <div className="ai-insights-header">
          <div>
            <p className="ai-eyebrow">Resumen operativo</p>
            <h2>Hallazgos prioritarios y recomendaciones</h2>
          </div>
          <span className="ai-metric-pill">
            Índice crítico global: {Number(rankingData?.global_avg_critical_index || 0).toFixed(1)}%
          </span>
        </div>

        <p className="ai-primary-alert" role="status">
          {primaryAiAlert.label && <strong>{primaryAiAlert.label} </strong>}
          {primaryAiAlert.text}
        </p>

        <ul className="ai-secondary-insights">
          {topDispersalKiosk && (
            <li>
              <strong>
                <span className="ai-dot is-warning" aria-hidden="true" />
                {outlierKiosks.length > 0
                  ? "Variación detectada en punto de acceso"
                  : "Punto de acceso con mayor dispersión"}{" "}
                {topDispersalKiosk.kiosk_id} ({topDispersalKiosk.kiosk_name})
              </strong>
              Presenta una desviación estándar en Ciberseguridad (C4) de{" "}
              <b>σ = {Number(topDispersalKiosk.stddev_c4_score).toFixed(2)}</b> (rango intercuartílico IQR ={" "}
              {Number(topDispersalKiosk.iqr_c4_score).toFixed(1)}).
              {outlierKiosks.length > 0 &&
                " Se recomienda activar modo asistido en este punto para nivelar brechas digitales."}
            </li>
          )}
          <li>
            <strong>
              <span className="ai-dot is-info" aria-hidden="true" />
              Variabilidad en competencia C4 (Ciberseguridad)
            </strong>
            Se detectaron <b>{outlierKiosks.length}</b> punto(s) de acceso con alta varianza o desviación
            respecto a la media global ({Number(dispersalData?.global_avg_c4_score || 0).toFixed(2)} / 3.0).
          </li>
        </ul>
      </section>

      <div className="ai-grid">
        {/* Sección 1: Prioridad territorial por zona */}
        <article className="ai-panel" aria-label="Ranking de vulnerabilidad por zona">
          <div className="ai-panel-header">
            <div>
              <p className="ai-eyebrow">Índice de vulnerabilidad territorial</p>
              <h2>Prioridad territorial por zona</h2>
              <p className="ai-panel-subtitle">
                Clasificación según porcentaje de sesiones en categoría crítica. La zona líder solo se resalta
                en rojo cuando existen sesiones críticas.
              </p>
            </div>
            <span className="ai-metric-pill">{zones.length} zonas evaluadas</span>
          </div>

          <div className="ai-table-wrap">
            <table className="ai-table">
              <thead>
                <tr>
                  <th>Rango</th>
                  <th>Zona</th>
                  <th>Sesiones (crít. / ref. / aut.)</th>
                  <th>Promedio</th>
                  <th>Índice crítico (% sesiones críticas)</th>
                </tr>
              </thead>
              <tbody>
                {zones.map((zone, idx) => {
                  const isTop1 = zone.vulnerability_rank === 1 || idx === 0;
                  const indexVal = Number(zone.critical_literacy_index || 0);
                  const isCritical = isTop1 && indexVal > 0 && zone.red_sessions !== 0;
                  const barClass = isCritical
                    ? "is-red"
                    : indexVal >= 40
                      ? "is-yellow"
                      : "";
                  const rankClass = isCritical
                    ? "is-top1"
                    : isTop1
                      ? "is-neutral"
                      : "";
                  return (
                    <tr
                      key={zone.zone_code}
                      className={isCritical ? "ai-row-top1" : ""}
                    >
                      <td>
                        <span className={`ai-rank-badge ${rankClass}`}>
                          #{zone.vulnerability_rank}
                        </span>
                      </td>
                      <td className="ai-zone-cell">
                        <strong>
                          {zone.zone_name}
                          {isTop1 && (
                            <span
                              className={`ai-tag ${isCritical ? "is-danger" : "is-neutral"}`}
                            >
                              {isCritical ? "PRIORIDAD" : "SEGUIMIENTO"}
                            </span>
                          )}
                        </strong>
                        <span>Código {zone.zone_code}</span>
                      </td>
                      <td>
                        {zone.total_sessions}{" "}
                        <small>
                          ({zone.red_sessions} / {zone.yellow_sessions} / {zone.green_sessions})
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

        {/* Sección 2: Dispersión y variabilidad C4 (matriz operativa) */}
        <article className="ai-panel" aria-label="Dispersión y variabilidad en competencia C4">
          <div className="ai-panel-header">
            <div>
              <p className="ai-eyebrow">Distribución estadística por punto</p>
              <h2>Dispersión y variabilidad por kiosco</h2>
              <p className="ai-panel-subtitle">
                Desviación estándar (σ), rango intercuartílico (P25–P75) y duración en Ciberseguridad.
              </p>
            </div>
            <span className="ai-metric-pill">
              Media C4: {Number(dispersalData?.global_avg_c4_score || 0).toFixed(2)} / 3
            </span>
          </div>

          <div className="ai-table-wrap">
            <table className="ai-table ai-matrix">
              <thead>
                <tr>
                  <th>Punto de acceso</th>
                  <th>Sesiones</th>
                  <th>Media C4</th>
                  <th>Dispersión (σ · IQR)</th>
                  <th>Duración media</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {kiosks.map((kiosk) => (
                  <tr
                    key={kiosk.kiosk_id}
                    className={kiosk.is_outlier ? "is-review" : ""}
                  >
                    <td className="ai-kiosk-cell">
                      <strong>
                        #{kiosk.dispersal_rank} · {kiosk.kiosk_name}
                      </strong>
                      <span>
                        ID: {kiosk.kiosk_id}
                        {kiosk.zone_code ? ` · Zona ${kiosk.zone_code}` : " · Canal Web"}
                      </span>
                    </td>
                    <td>{kiosk.total_sessions}</td>
                    <td>{Number(kiosk.avg_c4_score).toFixed(2)} / 3</td>
                    <td>
                      <strong>σ {Number(kiosk.stddev_c4_score).toFixed(2)}</strong>
                      <small>
                        IQR {Number(kiosk.iqr_c4_score).toFixed(1)} · P25–P75 {kiosk.p25_c4_score}–{kiosk.p75_c4_score}
                      </small>
                    </td>
                    <td>
                      {Math.round(kiosk.avg_duration_seconds)}s ±{" "}
                      {Math.round(kiosk.stddev_duration_seconds)}s
                    </td>
                    <td>
                      <span
                        className={`ai-tag ${kiosk.is_outlier ? "is-warning" : "is-success"}`}
                      >
                        {kiosk.is_outlier ? "Revisar dispersión" : "Estable"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </div>
    </div>
  );
}
