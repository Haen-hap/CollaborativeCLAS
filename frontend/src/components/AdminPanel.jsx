import { useCallback, useEffect, useState } from "react";
import AdminDashboard from "./AdminDashboard";
import IntelligenceDashboard from "./admin/IntelligenceDashboard";
import { getAdminDashboardStats } from "../api/api";
import { LanguageSelector, useI18n } from "../utils/i18n";

const adminPageKeys = ["dashboard", "intelligence", "results", "questions"];

export default function AdminPanel() {
  const { t } = useI18n();
  const [activePage, setActivePage] = useState("dashboard");
  const [dashboardStats, setDashboardStats] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState(null);

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
          <p className="admin-eyebrow">{t("admin.panel.eyebrow")}</p>
          <h1 className="admin-brand-title">{t("admin.panel.title")}</h1>
          <p className="admin-brand-description">
            {t("admin.panel.description")}
          </p>
        </div>

        <nav className="admin-nav" aria-label={t("admin.panel.navAria")}>
          {adminPageKeys.map((pageKey) => (
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
              {t(`admin.pages.${pageKey}.label`)}
            </button>
          ))}
        </nav>

        <a className="admin-back-link" href="/">
          {t("admin.panel.backLink")}
        </a>
      </aside>

      <main className="admin-main">
        <header className="admin-page-header">
          <div>
            <p className="admin-eyebrow">{t("admin.panel.workspaceEyebrow")}</p>
            <h2 className="admin-page-title">
              {t(`admin.pages.${activePage}.title`)}
            </h2>
            <p className="admin-page-description">
              {t(`admin.pages.${activePage}.description`)}
            </p>
          </div>

          <div className="admin-page-header-actions">
            <span className="admin-preview-badge">
              {activePage === "intelligence"
                ? t("admin.panel.badgePreMl")
                : activePage === "dashboard" && dashboardStats
                  ? t("admin.panel.badgeLive")
                  : t("admin.panel.badgeWorkspace")}
            </span>
            <LanguageSelector />
          </div>
        </header>

        <section
          id="admin-page-content"
          className="admin-content-card"
          aria-labelledby="admin-content-title"
        >
          <h3 id="admin-content-title">{t(`admin.pages.${activePage}.label`)}</h3>

          {activePage === "dashboard" ? (
            <AdminDashboard
              stats={dashboardStats}
              isLoading={dashboardLoading}
              error={dashboardError}
              onRefresh={() => loadDashboardStats()}
            />
          ) : activePage === "intelligence" ? (
            <IntelligenceDashboard />
          ) : (
            <>
              <p>{t(`admin.pages.${activePage}.placeholder`)}</p>

              <div className="admin-placeholder-note">
                {t("admin.panel.placeholderNote")}
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
