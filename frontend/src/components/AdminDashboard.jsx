import "./AdminDashboard.css";

const classificationOptions = [
  { label: "Red", className: "red" },
  { label: "Yellow", className: "yellow" },
  { label: "Green", className: "green" },
];

export default function AdminDashboard({ submissions = [], isDemo = false }) {
  const records = Array.isArray(submissions) ? submissions : [];
  const totalSubmissions = records.length;

  const scoredSubmissions = records.filter(
    (submission) =>
      Number.isFinite(submission?.score) &&
      Number.isFinite(submission?.totalQuestions) &&
      submission.totalQuestions > 0 &&
      submission.score >= 0 &&
      submission.score <= submission.totalQuestions,
  );

  const averageScore =
    scoredSubmissions.length > 0
      ? scoredSubmissions.reduce(
          (total, submission) =>
            total + (submission.score / submission.totalQuestions) * 100,
          0,
        ) / scoredSubmissions.length
      : null;

  const distribution = classificationOptions.map((option) => {
    const count = records.filter(
      (submission) => submission?.classification === option.label,
    ).length;

    return {
      ...option,
      count,
      percentage: totalSubmissions > 0 ? (count / totalSubmissions) * 100 : 0,
    };
  });

  const classifiedCount = distribution.reduce(
    (total, category) => total + category.count,
    0,
  );

  const unclassifiedCount = totalSubmissions - classifiedCount;

  const highestCount = Math.max(
    ...distribution.map((category) => category.count),
  );

  const leadingCategories =
    highestCount > 0
      ? distribution.filter((category) => category.count === highestCount)
      : [];

  const mostCommonClassification =
    leadingCategories.length === 0
      ? "No data"
      : leadingCategories.map((category) => category.label).join(" / ");

  return (
    <div className="admin-dashboard">
      {isDemo && (
        <p className="admin-dashboard-demo-note">
          Demo data — these statistics do not represent live submissions.
        </p>
      )}

      <section
        className="admin-dashboard-stats"
        aria-label="Assessment summary statistics"
      >
        <article className="admin-stat-card">
          <h3 className="admin-stat-label">Total submissions</h3>
          <p className="admin-stat-value">{totalSubmissions}</p>
          <p className="admin-stat-help">
            Number of submissions in the supplied dataset.
          </p>
        </article>

        <article className="admin-stat-card">
          <h3 className="admin-stat-label">Average score</h3>
          <p className="admin-stat-value">
            {averageScore === null ? "—" : `${averageScore.toFixed(1)}%`}
          </p>
          <p className="admin-stat-help">
            {averageScore === null
              ? "No valid scores available."
              : `Mean of individual percentage scores across ${scoredSubmissions.length} valid submissions.`}
          </p>
        </article>

        <article className="admin-stat-card">
          <h3 className="admin-stat-label">Most common classification</h3>
          <p className="admin-stat-value admin-stat-classification">
            {mostCommonClassification}
          </p>
          <p className="admin-stat-help">
            {leadingCategories.length === 0
              ? "No recognized classifications available."
              : leadingCategories.length > 1
                ? `Tied at ${highestCount} submissions per category.`
                : `${highestCount} submissions in this category.`}
          </p>
        </article>
      </section>

      <section
        className="admin-distribution-card"
        aria-labelledby="admin-distribution-title"
      >
        <header className="admin-distribution-header">
          <h3 id="admin-distribution-title">Classification distribution</h3>
          <p>Counts and percentages of all supplied submissions.</p>
        </header>

        {totalSubmissions === 0 ? (
          <p className="admin-dashboard-empty">No submissions available yet.</p>
        ) : (
          <ul className="admin-distribution-list">
            {distribution.map((category) => (
              <li
                key={category.label}
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
                    style={{
                      width: `${category.percentage}%`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}

        {unclassifiedCount > 0 && (
          <p className="admin-dashboard-data-note">
            {unclassifiedCount} submissions have a missing or unrecognized
            classification. They are included in the total but not shown as a
            colored category.
          </p>
        )}
      </section>
    </div>
  );
}
