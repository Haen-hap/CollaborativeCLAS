import { useCallback, useEffect, useState } from "react";
import AdminDashboard from "./AdminDashboard";
import { getAdminDashboardStats } from "../api/api";

const adminPages = {
  dashboard: {
    label: "Dashboard",
    title: "Dashboard",
    description: "An overview of assessment activity and results.",
    placeholder:
      "Dashboard cards and the Red/Yellow/Green chart will appear here.",
  },
  results: {
    label: "Results",
    title: "Assessment results",
    description: "Review assessment results in one place.",
    placeholder:
      "The results table and filters will appear here when available.",
  },
  questions: {
    label: "Questions",
    title: "Assessment questions",
    description: "Access assessment question management.",
    placeholder: "Question management tools will appear here when available.",
  },
};

export default function AdminPanel() {
  const [activePage, setActivePage] = useState("dashboard");
  const [dashboardStats, setDashboardStats] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState(null);
  const currentPage = adminPages[activePage];

  const loadDashboardStats = useCallback(async (signal) => {
    setDashboardLoading(true);
    setDashboardError(null);
    setDashboardStats(null);

    try {
      const stats = await getAdminDashboardStats({ signal });
      setDashboardStats(stats);
    } catch (error) {
      if (error.name !== "AbortError") {
        setDashboardError(error.message);
      }
    } finally {
      if (!signal?.aborted) {
        setDashboardLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (activePage !== "dashboard") {
      return undefined;
    }

    const controller = new AbortController();
    loadDashboardStats(controller.signal);
    return () => controller.abort();
  }, [activePage, loadDashboardStats]);

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <p className="admin-eyebrow">Administration</p>
          <h1 className="admin-brand-title">Admin Panel</h1>
          <p className="admin-brand-description">
            Manage assessments from one place.
          </p>
        </div>

        <nav className="admin-nav" aria-label="Admin navigation">
          {Object.entries(adminPages).map(([pageKey, page]) => (
            <button
              key={pageKey}
              type="button"
              className={`admin-nav-item ${
                activePage === pageKey ? "is-active" : ""
              }`}
              aria-current={activePage === pageKey ? "page" : undefined}
              aria-controls="admin-page-content"
              onClick={() => setActivePage(pageKey)}
            >
              {page.label}
            </button>
          ))}
        </nav>

        <a className="admin-back-link" href="/">
          Back to assessment
        </a>
      </aside>

      <main className="admin-main">
        <header className="admin-page-header">
          <div>
            <p className="admin-eyebrow">Admin workspace</p>
            <h2 className="admin-page-title">{currentPage.title}</h2>
            <p className="admin-page-description">{currentPage.description}</p>
          </div>

          <span className="admin-preview-badge">
            {activePage === "dashboard" && dashboardStats ? "Live data" : "Admin workspace"}
          </span>
        </header>

        <section
          id="admin-page-content"
          className="admin-content-card"
          aria-labelledby="admin-content-title"
        >
          <h3 id="admin-content-title">{currentPage.label}</h3>

          {activePage === "dashboard" ? (
            <AdminDashboard
              stats={dashboardStats}
              isLoading={dashboardLoading}
              error={dashboardError}
              onRefresh={() => loadDashboardStats()}
            />
          ) : (
            <>
              <p>{currentPage.placeholder}</p>

              <div className="admin-placeholder-note">
                Backend data is not connected yet. No live records are
                displayed.
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
