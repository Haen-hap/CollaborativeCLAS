import "./AdminDashboard.css";

const classificationOptions = [
  { key: "red", label: "Red", className: "red" },
  { key: "yellow", label: "Yellow", className: "yellow" },
  { key: "green", label: "Green", className: "green" },
];

export default function AdminDashboard({
  stats,
  isLoading,
  error,
  onRefresh,
}) {
  if (isLoading) {
    return (
      <div className="admin-dashboard" aria-busy="true">
        <p className="admin-dashboard-state" role="status">
          Loading dashboard statistics…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-dashboard">
        <div className="admin-dashboard-error" role="alert">
          <p>Could not load live dashboard statistics: {error}</p>
          <button className="admin-dashboard-refresh" onClick={onRefresh}>
            Try again
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
    leaders.length === 0 ? "No data" : leaders.map((item) => item.label).join(" / ");

  return (
    <div className="admin-dashboard">
      <div className="admin-dashboard-toolbar">
        <p className="admin-dashboard-scope">
          Statistics include completed assessments with saved results only.
        </p>
        <button
          className="admin-dashboard-refresh"
          type="button"
          onClick={onRefresh}
        >
          Refresh data
        </button>
      </div>

      <section
        className="admin-dashboard-stats"
        aria-label="Assessment summary statistics"
      >
        <article className="admin-stat-card">
          <h3 className="admin-stat-label">Total submissions</h3>
          <p className="admin-stat-value">{stats.total_submissions}</p>
          <p className="admin-stat-help">
            Completed assessments with saved results.
          </p>
        </article>

        <article className="admin-stat-card">
          <h3 className="admin-stat-label">Average score</h3>
          <p className="admin-stat-value">
            {stats.average_score_percentage === null
              ? "—"
              : `${stats.average_score_percentage.toFixed(1)}%`}
          </p>
          <p className="admin-stat-help">
            Mean percentage correct, based on each assessment’s question count.
          </p>
        </article>

        <article className="admin-stat-card">
          <h3 className="admin-stat-label">Most common classification</h3>
          <p className="admin-stat-value admin-stat-classification">
            {mostCommonClassification}
          </p>
          <p className="admin-stat-help">
            {leaders.length === 0
              ? "No completed results to classify yet."
              : `${highestCount} completed ${highestCount === 1 ? "assessment" : "assessments"}.`}
          </p>
        </article>
      </section>

      <section
        className="admin-distribution-card"
        aria-labelledby="admin-distribution-title"
      >
        <header className="admin-distribution-header">
          <h3 id="admin-distribution-title">Classification distribution</h3>
          <p>Counts and percentages of completed assessments with saved results.</p>
        </header>

        {stats.total_submissions === 0 ? (
          <p className="admin-dashboard-empty" role="status">
            No completed assessments are available yet.
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
