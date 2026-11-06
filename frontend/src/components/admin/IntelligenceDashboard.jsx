import { useCallback, useEffect, useMemo, useState } from "react";
import { getKioskC4Dispersal, getVulnerabilityRanking } from "../../api/api";
import { useI18n } from "../../utils/i18n";
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

function consistencyLabel(stddev, t) {
  const value = Number(stddev || 0);
  if (value === 0) return t("intelligence.consistency.uniform");
  if (value < 1.0) return t("intelligence.consistency.consistent");
  return t("intelligence.consistency.highVariation");
}

export default function IntelligenceDashboard({
  forceSimulation = false,
  refreshTrigger = 0,
}) {
  const { t } = useI18n();
  const [rankingData, setRankingData] = useState(FALLBACK_RANKING);
  const [dispersalData, setDispersalData] = useState(FALLBACK_DISPERSAL);

  const fetchIntelligenceData = useCallback(async (signal) => {
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
      } else {
        setRankingData(FALLBACK_RANKING);
        setDispersalData(FALLBACK_DISPERSAL);
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        setRankingData(FALLBACK_RANKING);
        setDispersalData(FALLBACK_DISPERSAL);
      }
    }
  }, []);

  useEffect(() => {
    if (forceSimulation) {
      setRankingData(FALLBACK_RANKING);
      setDispersalData(FALLBACK_DISPERSAL);
      return undefined;
    }
    const controller = new AbortController();
    fetchIntelligenceData(controller.signal);
    return () => controller.abort();
  }, [fetchIntelligenceData, forceSimulation, refreshTrigger]);

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
        text: t("intelligence.alert.empty"),
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
        text: t("intelligence.alert.noCritical", {
          zone: lowestAverageZone.zone_name,
          score: Number(lowestAverageZone.avg_total_score || 0).toFixed(1),
        }),
      };
    }
    return {
      tone: "critical",
      label: t("intelligence.alert.criticalLabel"),
      text: t("intelligence.alert.criticalText", {
        zone: leadZone.zone_name,
        code: leadZone.zone_code,
        index: leadIndex.toFixed(1),
      }),
    };
  }, [rankingData, t]);

  return (
    <div className="ai-dashboard" aria-label={t("intelligence.dashboardAria")}>
      {/* Resumen operativo: hallazgos prioritarios y recomendaciones */}
      <section
        className={`ai-insights-card ${primaryAiAlert.tone === "critical" ? "is-critical" : "is-neutral"}`}
        aria-label={t("intelligence.insights.aria")}
      >
        <div className="ai-insights-header">
          <div>
            <p className="ai-eyebrow">{t("intelligence.insights.eyebrow")}</p>
            <h2>{t("intelligence.insights.title")}</h2>
          </div>
          <span className="ai-metric-pill">
            {t("intelligence.insights.globalIndex", {
              index: Number(rankingData?.global_avg_critical_index || 0).toFixed(1),
            })}
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
                  ? t("intelligence.kioskInsight.outlierTitle")
                  : t("intelligence.kioskInsight.topTitle")}{" "}
                {topDispersalKiosk.kiosk_id} ({topDispersalKiosk.kiosk_name})
              </strong>
              {t("intelligence.kioskInsight.bodyPrefix")}
              <b>
                ±{Number(topDispersalKiosk.stddev_c4_score).toFixed(2)} pts (
                {consistencyLabel(topDispersalKiosk.stddev_c4_score, t)})
              </b>
              {t("intelligence.kioskInsight.bodyMiddle")}
              <b>
                {t("intelligence.kioskInsight.bodyRange", {
                  p25: Number(topDispersalKiosk.p25_c4_score).toFixed(0),
                  p75: Number(topDispersalKiosk.p75_c4_score).toFixed(0),
                })}
              </b>.
              {outlierKiosks.length > 0 && t("intelligence.kioskInsight.assistedRec")}
            </li>
          )}
          <li>
            <strong>
              <span className="ai-dot is-info" aria-hidden="true" />
              {t("intelligence.c4Summary.title")}
            </strong>
            {t("intelligence.c4Summary.bodyPrefix")}
            <b>{outlierKiosks.length}</b>
            {t("intelligence.c4Summary.bodySuffix", {
              avg: Number(dispersalData?.global_avg_c4_score || 0).toFixed(2),
            })}
          </li>
        </ul>
      </section>

      <div className="ai-grid">
        {/* Sección 1: Prioridad territorial por zona */}
        <article className="ai-panel" aria-label={t("intelligence.zones.aria")}>
          <div className="ai-panel-header">
            <div>
              <p className="ai-eyebrow">{t("intelligence.zones.eyebrow")}</p>
              <h2>{t("intelligence.zones.title")}</h2>
              <p className="ai-panel-subtitle">
                {t("intelligence.zones.subtitle")}
              </p>
            </div>
            <span className="ai-metric-pill">
              {t("intelligence.zones.countPill", { count: zones.length })}
            </span>
          </div>

          <div className="ai-table-wrap">
            <table className="ai-table">
              <thead>
                <tr>
                  <th>{t("intelligence.zones.colRank")}</th>
                  <th>{t("intelligence.zones.colZone")}</th>
                  <th>{t("intelligence.zones.colSessions")}</th>
                  <th>{t("intelligence.zones.colAvgScore")}</th>
                  <th>{t("intelligence.zones.colCriticalIndex")}</th>
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
                              {isCritical
                                ? t("intelligence.zones.tagPriority")
                                : t("intelligence.zones.tagFollowUp")}
                            </span>
                          )}
                        </strong>
                        <span>{t("intelligence.zones.codeLabel", { code: zone.zone_code })}</span>
                      </td>
                      <td>
                        <strong>{zone.total_sessions}</strong>{" "}
                        <small>
                          {t("intelligence.zones.breakdown", {
                            red: zone.red_sessions,
                            yellow: zone.yellow_sessions,
                            green: zone.green_sessions,
                          })}
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

        {/* Sección 2: Desempeño y consistencia en Ciberseguridad por kiosco */}
        <article className="ai-panel" aria-label={t("intelligence.kiosks.aria")}>
          <div className="ai-panel-header">
            <div>
              <p className="ai-eyebrow">{t("intelligence.kiosks.eyebrow")}</p>
              <h2>{t("intelligence.kiosks.title")}</h2>
              <p className="ai-panel-subtitle">
                {t("intelligence.kiosks.subtitle")}
              </p>
            </div>
            <span className="ai-metric-pill">
              {t("intelligence.kiosks.avgPill", {
                avg: Number(dispersalData?.global_avg_c4_score || 0).toFixed(2),
              })}
            </span>
          </div>

          <div className="ai-table-wrap">
            <table className="ai-table ai-matrix">
              <thead>
                <tr>
                  <th>{t("intelligence.kiosks.colAccessPoint")}</th>
                  <th>{t("intelligence.kiosks.colSessions")}</th>
                  <th>{t("intelligence.kiosks.colAvgC4")}</th>
                  <th>{t("intelligence.kiosks.colConsistency")}</th>
                  <th>{t("intelligence.kiosks.colDuration")}</th>
                  <th>{t("intelligence.kiosks.colStatus")}</th>
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
                        ID: {kiosk.kiosk_id} ·{" "}
                        {kiosk.zone_code
                          ? t("intelligence.kiosks.zoneChannel", { code: kiosk.zone_code })
                          : t("intelligence.kiosks.webChannel")}
                      </span>
                    </td>
                    <td>{kiosk.total_sessions}</td>
                    <td>{Number(kiosk.avg_c4_score).toFixed(2)} / 3 pts</td>
                    <td>
                      <strong>
                        {t("intelligence.kiosks.variationLine", {
                          stddev: Number(kiosk.stddev_c4_score).toFixed(2),
                          label: consistencyLabel(kiosk.stddev_c4_score, t),
                        })}
                      </strong>
                      <small>
                        {t("intelligence.kiosks.rangeLine", {
                          p25: Number(kiosk.p25_c4_score).toFixed(0),
                          p75: Number(kiosk.p75_c4_score).toFixed(0),
                        })}
                      </small>
                    </td>
                    <td>
                      {t("intelligence.kiosks.durationValue", {
                        avg: Math.round(kiosk.avg_duration_seconds),
                        stddev: Math.round(kiosk.stddev_duration_seconds),
                      })}
                    </td>
                    <td>
                      <span
                        className={`ai-tag ${kiosk.is_outlier ? "is-warning" : "is-success"}`}
                      >
                        {kiosk.is_outlier
                          ? t("intelligence.kiosks.statusReview")
                          : t("intelligence.kiosks.statusStable")}
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
