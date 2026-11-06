import { useI18n } from "../utils/i18n";
import "./AdminDashboard.css";

const classificationOptions = [
  { key: "red", labelKey: "admin.dashboard.class.red", className: "red" },
  { key: "yellow", labelKey: "admin.dashboard.class.yellow", className: "yellow" },
  { key: "green", labelKey: "admin.dashboard.class.green", className: "green" },
];

export default function AdminDashboard({
  stats,
  isLoading,
  error,
  onRefresh,
}) {
  const { t } = useI18n();

  if (isLoading) {
    return (
      <div className="admin-dashboard" aria-busy="true">
        <p className="admin-dashboard-state" role="status">
          {t("admin.dashboard.loading")}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-dashboard">
        <div className="admin-dashboard-error" role="alert">
          <p>{t("admin.dashboard.error", { error })}</p>
          <button className="admin-dashboard-refresh" onClick={onRefresh}>
            {t("admin.dashboard.tryAgain")}
          </button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const distribution = classificationOptions.map((option) => ({
    ...option,
    label: t(option.labelKey),
    count: stats.classification_distribution[option.key],
    percentage:
      stats.total_submissions > 0
        ? (stats.classification_distribution[option.key] /
            stats.total_submissions) *
          100
        : 0,
  }));
  const highestCount = Math.max(...distribution.map((category) => category.count));
  const leaders =
    highestCount > 0
      ? distribution.filter((category) => category.count === highestCount)
      : [];
  const mostCommonClassification =
    leaders.length === 0
      ? t("admin.dashboard.noData")
      : leaders.map((item) => item.label).join(" / ");

  return (
    <div className="admin-dashboard">
      <div className="admin-dashboard-toolbar">
        <p className="admin-dashboard-scope">
          {t("admin.dashboard.scope")}
        </p>
        <button
          className="admin-dashboard-refresh"
          type="button"
          onClick={onRefresh}
        >
          {t("admin.dashboard.refresh")}
        </button>
      </div>

      <section
        className="admin-dashboard-stats"
        aria-label={t("admin.dashboard.statsAria")}
      >
        <article className="admin-stat-card">
          <h3 className="admin-stat-label">{t("admin.dashboard.totalSubmissions")}</h3>
          <p className="admin-stat-value">{stats.total_submissions}</p>
          <p className="admin-stat-help">
            {t("admin.dashboard.totalSubmissionsHelp")}
          </p>
        </article>

        <article className="admin-stat-card">
          <h3 className="admin-stat-label">{t("admin.dashboard.averageScore")}</h3>
          <p className="admin-stat-value">
            {stats.average_score_percentage === null
              ? "—"
              : `${stats.average_score_percentage.toFixed(1)}%`}
          </p>
          <p className="admin-stat-help">
            {t("admin.dashboard.averageScoreHelp")}
          </p>
        </article>

        <article className="admin-stat-card">
          <h3 className="admin-stat-label">{t("admin.dashboard.mostCommon")}</h3>
          <p className="admin-stat-value admin-stat-classification">
            {mostCommonClassification}
          </p>
          <p className="admin-stat-help">
            {leaders.length === 0
              ? t("admin.dashboard.noCompletedToClassify")
              : highestCount === 1
                ? t("admin.dashboard.completedCountOne")
                : t("admin.dashboard.completedCountMany", { count: highestCount })}
          </p>
        </article>
      </section>

      <section
        className="admin-distribution-card"
        aria-labelledby="admin-distribution-title"
      >
        <header className="admin-distribution-header">
          <h3 id="admin-distribution-title">{t("admin.dashboard.distributionTitle")}</h3>
          <p>{t("admin.dashboard.distributionSubtitle")}</p>
        </header>

        {stats.total_submissions === 0 ? (
          <p className="admin-dashboard-empty" role="status">
            {t("admin.dashboard.empty")}
          </p>
        ) : (
          <ul className="admin-distribution-list">
            {distribution.map((category) => (
              <li
                key={category.key}
                className={`admin-distribution-item admin-category-${category.className}`}
              >
                <div className="admin-distribution-row">
                  <span className="admin-distribution-label">
                    <span className="admin-category-dot" aria-hidden="true" />
                    {category.label}
                  </span>
                  <span className="admin-distribution-value">
                    {category.count} ({category.percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="admin-distribution-track" aria-hidden="true">
                  <div
                    className="admin-distribution-fill"
                    style={{ width: `${category.percentage}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
