import { useEffect, useState } from "react";
import { getAuthStatus, registerAdmin, setAdminAuthSession } from "../../api/api";
import { LanguageSelector, useI18n } from "../../utils/i18n";

export default function RegisterView() {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [authStatus, setAuthStatus] = useState(null);

  const nextUrl =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("next") || "/admin"
      : "/admin";

  useEffect(() => {
    let active = true;
    getAuthStatus()
      .then((data) => {
        if (active) setAuthStatus(data);
      })
      .catch(() => {
        if (active) setAuthStatus({ network_allowed: true, has_admins: true });
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !pin) {
      setError("Por favor completa los campos requeridos.");
      return;
    }
    if (pin.length < 4) {
      setError("El PIN debe tener al menos 4 caracteres.");
      return;
    }
    if (authStatus?.has_admins && !inviteCode) {
      setError("El código de invitación es obligatorio para nuevos administradores.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const data = await registerAdmin({
        name,
        email,
        pin,
        invite_code: inviteCode,
      });
      if (data?.token) {
        setAdminAuthSession(data.token, data.user);
        window.location.href = nextUrl;
      }
    } catch (err) {
      setError(err.message || "Error al registrar el administrador.");
    } finally {
      setLoading(false);
    }
  };

  const networkBlocked = authStatus && !authStatus.network_allowed;
  const isBootstrap = authStatus && !authStatus.has_admins;

  return (
    <main className="analytics-gate">
      <section className="analytics-gate-card">
        <div className="analytics-gate-top">
          <div className="analytics-mark">CCLAS</div>
          <LanguageSelector variant="light" />
        </div>

        <p className="analytics-eyebrow">Portal de Administración</p>
        <h1>Registrar Administrador</h1>
        <p className="analytics-gate-copy">
          {isBootstrap
            ? "Configura la cuenta principal de Superadmin para iniciar el sistema."
            : "Crea una nueva cuenta administrativa utilizando tu código de invitación."}
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

        {isBootstrap && !networkBlocked && (
          <div
            role="status"
            style={{
              background: "#38bdf81a",
              border: "1px solid #38bdf8",
              color: "#38bdf8",
              padding: "12px",
              borderRadius: "12px",
              marginBottom: "16px",
              fontWeight: 600,
              fontSize: "13px",
            }}
          >
            🛡️ Modo Inicial (Bootstrap): Esta primera cuenta se creará automáticamente como Superadmin sin requerir código de invitación.
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label htmlFor="reg-name">Nombre Completo</label>
          <input
            id="reg-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre de Administrador"
            disabled={loading || networkBlocked}
            required
            autoFocus
          />

          <label htmlFor="reg-email" style={{ marginTop: "12px" }}>
            Correo Electrónico
          </label>
          <input
            id="reg-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@ejemplo.com"
            disabled={loading || networkBlocked}
            required
          />

          <label htmlFor="reg-pin" style={{ marginTop: "12px" }}>
            PIN / Contraseña (mínimo 4 caracteres)
          </label>
          <input
            id="reg-pin"
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="••••"
            minLength={4}
            disabled={loading || networkBlocked}
            required
          />

          {!isBootstrap && (
            <>
              <label htmlFor="reg-invite" style={{ marginTop: "12px" }}>
                Código de Invitación
              </label>
              <input
                id="reg-invite"
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="GBM-ADMIN-..."
                disabled={loading || networkBlocked}
                required
              />
            </>
          )}

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
            {loading ? "Creando cuenta..." : isBootstrap ? "Crear Superadmin" : "Registrar Cuenta"}
          </button>
        </form>

        <div style={{ marginTop: "16px", display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
          <a className="analytics-text-link" href="/">
            ← Volver al inicio
          </a>
          <a className="analytics-text-link" href={`/login?next=${encodeURIComponent(nextUrl)}`}>
            ¿Ya tienes cuenta? Inicia sesión →
          </a>
        </div>
      </section>
    </main>
  );
}
