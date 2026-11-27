import { useCallback, useEffect, useState } from "react";
import AdminDashboard from "./AdminDashboard";
import IntelligenceDashboard from "./admin/IntelligenceDashboard";
import {
  clearAdminAuthSession,
  getAdminAuthToken,
  getAdminDashboardStats,
  getAdminMe,
  getStoredAdminUser,
  logoutAdmin,
} from "../api/api";
import { LanguageSelector, useI18n } from "../utils/i18n";
import "./AnalyticsDashboard.css";

const adminPageKeys = ["dashboard", "intelligence", "results", "questions"];

const gateErrorStyle = {
  background: "#ef44441a",
  border: "1px solid #ef4444",
  color: "#ef4444",
  padding: "12px",
  borderRadius: "12px",
  marginBottom: "16px",
  fontWeight: 600,
  fontSize: "14px",
};

export default function AdminPanel() {
  const { t } = useI18n();
  const [currentUser, setCurrentUser] = useState(getStoredAdminUser);
  const [authState, setAuthState] = useState("checking");
  const authenticated = authState === "authenticated";
  const restrictedNetwork = authState === "forbidden";
  const [activePage, setActivePage] = useState("dashboard");
  const [dashboardStats, setDashboardStats] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState(null);

  useEffect(() => {
    let active = true;
    const token = getAdminAuthToken();
    if (!token) {
      clearAdminAuthSession();
      window.location.replace("/login?next=/admin");
      return () => {
        active = false;
      };
    }
    getAdminMe()
      .then((user) => {
        if (!active) return;
        setCurrentUser(user);
        setAuthState("authenticated");
      })
      .catch((error) => {
        if (!active) return;
        if (error?.status === 403) {
          setAuthState("forbidden");
          return;
        }
        if (error?.status === 401) {
          if (error?.sessionCleared || !getAdminAuthToken()) {
            clearAdminAuthSession();
            window.location.replace("/login?next=/admin");
          }
          return;
        }
        window.location.replace("/login?next=/admin");
      });
    return () => {
      active = false;
    };
  }, []);

  const loadDashboardStats = useCallback(
    async (signal) => {
      if (!authenticated) return;
      setDashboardLoading(true);
      setDashboardError(null);
      setDashboardStats(null);

      try {
        const stats = await getAdminDashboardStats({ signal });
        setDashboardStats(stats);
      } catch (error) {
        if (error?.status === 401) {
          if (error?.sessionCleared || !getAdminAuthToken()) {
            clearAdminAuthSession();
            setAuthState("checking");
            window.location.replace("/login?next=/admin");
          }
          return;
        }
        if (error?.status === 403) {
          setAuthState("forbidden");
          return;
        }
        if (error.name !== "AbortError") {
          setDashboardError(error.message);
        }
      } finally {
        if (!signal?.aborted) {
          setDashboardLoading(false);
        }
      }
    },
    [authenticated],
  );

  useEffect(() => {
    if (!authenticated || activePage !== "dashboard") {
      return undefined;
    }

    const controller = new AbortController();
    loadDashboardStats(controller.signal);
    return () => controller.abort();
  }, [activePage, authenticated, loadDashboardStats]);

  if (authState === "checking") {
    return (
      <main className="analytics-gate">
        <section className="analytics-gate-card">
          <div className="analytics-gate-top">
            <div className="analytics-mark">CCLAS</div>
            <LanguageSelector variant="light" />
          </div>
          <p className="analytics-eyebrow">Autenticación Requerida</p>
          <h1>Verificando sesión</h1>
          <p className="analytics-gate-copy">
            Validando tus credenciales en la red autorizada...
          </p>
        </section>
      </main>
    );
  }

  if (restrictedNetwork) {
    return (
      <main className="analytics-gate">
        <section className="analytics-gate-card">
          <div className="analytics-gate-top">
            <div className="analytics-mark">CCLAS</div>
            <LanguageSelector variant="light" />
          </div>
          <p className="analytics-eyebrow">Acceso Denegado</p>
          <h1>Red no autorizada</h1>
          <div className="analytics-form-error" role="alert" style={gateErrorStyle}>
            Acceso denegado (403): Tu dispositivo o conexión no se encuentra en la red administrativa autorizada.
          </div>
          <a className="analytics-text-link" href="/">
            ← Volver al inicio
          </a>
        </section>
      </main>
    );
  }

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
            {currentUser && (
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "var(--text-dim, #9ca3af)",
                  marginRight: "8px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                👤 {currentUser.name}
              </span>
            )}
            <button
              type="button"
              onClick={async () => {
                await logoutAdmin();
                window.location.href = "/login?next=/admin";
              }}
              style={{
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid rgba(239, 68, 68, 0.4)",
                color: "#f87171",
                padding: "4px 10px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                marginRight: "8px",
              }}
            >
              Cerrar sesión
            </button>
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
