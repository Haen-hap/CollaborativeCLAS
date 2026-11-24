import { useEffect, useState } from "react";
import { getAuthStatus, loginAdmin, setAdminAuthSession } from "../../api/api";
import { LanguageSelector, useI18n } from "../../utils/i18n";

export default function LoginView() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [authStatus, setAuthStatus] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState(true);

  // Read ?next= query param
  const nextUrl =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("next") || "/admin"
      : "/admin";

  useEffect(() => {
    let active = true;
    getAuthStatus()
      .then((data) => {
        if (active) {
          setAuthStatus(data);
          setCheckingStatus(false);
        }
      })
      .catch(() => {
        if (active) {
          setAuthStatus({ network_allowed: true, has_admins: true });
          setCheckingStatus(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !pin) {
      setError("Por favor completa todos los campos.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const data = await loginAdmin({ email, pin });
      if (data?.token) {
        setAdminAuthSession(data.token, data.user);
        window.location.href = nextUrl;
      }
    } catch (err) {
      setError(err.message || "Error al iniciar sesión.");
    } finally {
      setLoading(false);
    }
  };

  const networkBlocked = authStatus && !authStatus.network_allowed;

  return (
    <main className="analytics-gate">
      <section className="analytics-gate-card">
        <div className="analytics-gate-top">
          <div className="analytics-mark">CCLAS</div>
          <LanguageSelector variant="light" />
        </div>

        <p className="analytics-eyebrow">Portal de Administración</p>
        <h1>Acceso Administrativo</h1>
        <p className="analytics-gate-copy">
          Ingresa tus credenciales autorizadas para gestionar analíticas y el sistema.
        </p>

        {networkBlocked && (
          <div
            className="analytics-form-error"
            role="alert"
            style={{
              background: "#ef44441a",
              border: "1px solid #ef4444",
              color: "#ef4444",
              padding: "12px",
              borderRadius: "12px",
              marginBottom: "16px",
              fontWeight: 600,
              fontSize: "14px",
            }}
          >
            Red no autorizada (403): Tu dispositivo o conexión no se encuentra en la red administrativa autorizada.
          </div>
        )}

        {authStatus && !authStatus.has_admins && !networkBlocked && (
          <div
            role="status"
            style={{
              background: "#10b9811a",
              border: "1px solid #10b981",
              color: "#10b981",
              padding: "12px",
              borderRadius: "12px",
              marginBottom: "16px",
              fontWeight: 600,
              fontSize: "13px",
            }}
          >
            Modo Inicial: No hay administradores registrados.{" "}
            <a href="/register" style={{ color: "#38bdf8", textDecoration: "underline" }}>
              Crea la cuenta principal aquí
            </a>.
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label htmlFor="login-email">Correo Electrónico</label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@ejemplo.com"
            disabled={loading || networkBlocked}
            required
            autoFocus
          />

          <label htmlFor="login-pin" style={{ marginTop: "12px" }}>
            PIN / Contraseña
          </label>
          <input
            id="login-pin"
            type="password"
            autoComplete="current-password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="••••"
            disabled={loading || networkBlocked}
            required
          />

          {error && (
            <p className="analytics-form-error" role="alert" style={{ marginTop: "10px" }}>
              {error}
            </p>
          )}

          <button
            className="analytics-primary-button"
            type="submit"
            disabled={loading || networkBlocked}
            style={{ marginTop: "18px" }}
          >
            {loading ? "Verificando..." : "Iniciar Sesión"}
          </button>
        </form>

        <div style={{ marginTop: "16px", display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
          <a className="analytics-text-link" href="/">
            ← Volver al inicio
          </a>
          <a className="analytics-text-link" href={`/register?next=${encodeURIComponent(nextUrl)}`}>
            Registrar administrador →
          </a>
        </div>
      </section>
    </main>
  );
}
