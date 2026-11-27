const API_URL = (
  import.meta.env.VITE_API_URL ?? ""
).replace(/\/$/, "");

const TOKEN_KEY = "cclas_admin_token";
const USER_KEY = "cclas_admin_user";

export function getAdminAuthToken() {
  if (typeof window === "undefined" || !window.sessionStorage) return null;
  return window.sessionStorage.getItem(TOKEN_KEY);
}

export function getStoredAdminUser() {
  if (typeof window === "undefined" || !window.sessionStorage) return null;
  const raw = window.sessionStorage.getItem(USER_KEY);
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setAdminAuthSession(token, user) {
  if (typeof window === "undefined" || !window.sessionStorage) return;
  if (token) window.sessionStorage.setItem(TOKEN_KEY, token);
  if (user) window.sessionStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAdminAuthSession() {
  if (typeof window === "undefined" || !window.sessionStorage) return;
  window.sessionStorage.removeItem(TOKEN_KEY);
  window.sessionStorage.removeItem(USER_KEY);
}

function getAuthHeaders(extraHeaders = {}, token = getAdminAuthToken()) {
  const headers = { ...extraHeaders };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse(response, fallbackError, requestToken) {
  if (!response.ok) {
    const message = await response
      .json()
      .then((data) => {
        if (Array.isArray(data.detail)) {
          return data.detail.map((item) => item.msg).join(", ");
        }

        return data.detail;
      })
      .catch(() => null);

    const error = new Error(message || fallbackError);
    error.status = response.status;
    if (response.status === 401) {
      if (requestToken && getAdminAuthToken() === requestToken) {
        clearAdminAuthSession();
        error.sessionCleared = true;
      }
    }

    throw error;
  }

  return response.json();
}

export async function checkBackendConnection() {
  const response = await fetch(`${API_URL}/health/`);

  if (!response.ok) {
    throw new Error("Backend connection failed");
  }

  return response.json();
}

export async function createAssessmentSession(payload) {
  const response = await fetch(`${API_URL}/assessment-sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return handleResponse(response, "Failed to create assessment session");
}

export async function getAssessmentQuestions(sessionId) {
  const response = await fetch(
    `${API_URL}/assessment-sessions/${sessionId}/questions`,
  );

  return handleResponse(response, "Failed to load assessment questions");
}

export async function submitAssessmentAnswer(sessionId, payload) {
  const response = await fetch(
    `${API_URL}/assessment-sessions/${sessionId}/answers`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  return handleResponse(response, "Failed to save answer");
}

export async function completeAssessmentSession(sessionId) {
  const response = await fetch(
    `${API_URL}/assessment-sessions/${sessionId}/complete`,
    {
      method: "POST",
    },
  );

  return handleResponse(response, "Failed to complete assessment");
}

export async function getAuthStatus({ signal } = {}) {
  const response = await fetch(`${API_URL}/api/auth/status`, { signal });
  return handleResponse(response, "Error al consultar estado de red/autenticación");
}

export async function loginAdmin({ email, pin }) {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, pin }),
  });
  const data = await handleResponse(response, "Credenciales incorrectas o red no autorizada");
  if (data?.token) {
    setAdminAuthSession(data.token, data.user);
  }
  return data;
}

export async function registerAdmin({ name, email, pin, invite_code }) {
  const response = await fetch(`${API_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      email,
      pin,
      invite_code: invite_code ? invite_code.trim() : undefined,
    }),
  });
  const data = await handleResponse(response, "Error al registrar administrador");
  if (data?.token) {
    setAdminAuthSession(data.token, data.user);
  }
  return data;
}

export async function getAdminMe({ signal } = {}) {
  const token = getAdminAuthToken();
  const response = await fetch(`${API_URL}/api/auth/me`, {
    headers: getAuthHeaders({}, token),
    signal,
  });
  return handleResponse(response, "Sesión no válida o expirada", token);
}

export async function logoutAdmin() {
  try {
    await fetch(`${API_URL}/api/auth/logout`, {
      method: "POST",
      headers: getAuthHeaders(),
    });
  } catch {
    // Silently continue
  } finally {
    clearAdminAuthSession();
  }
}

export async function getAnalyticsSummary({ signal } = {}) {
  const token = getAdminAuthToken();
  const response = await fetch(`${API_URL}/analytics/summary`, {
    headers: getAuthHeaders({}, token),
    signal,
  });
  return handleResponse(response, "Failed to load analytics summary", token);
}

export async function simulateAnalyticsSample(count = 50) {
  const token = getAdminAuthToken();
  const response = await fetch(
    `${API_URL}/analytics/simulate?count=${encodeURIComponent(count)}`,
    {
      method: "POST",
      headers: getAuthHeaders(
        {
          "Content-Type": "application/json",
        },
        token,
      ),
    },
  );
  return handleResponse(response, "Failed to simulate analytics sample", token);
}

export async function restoreAnalyticsData() {
  const token = getAdminAuthToken();
  const response = await fetch(`${API_URL}/analytics/restore`, {
    method: "POST",
    headers: getAuthHeaders(
      {
        "Content-Type": "application/json",
      },
      token,
    ),
  });
  return handleResponse(response, "Failed to restore live analytics data", token);
}

export async function getVulnerabilityRanking({ signal } = {}) {
  const token = getAdminAuthToken();
  const response = await fetch(`${API_URL}/analytics/vulnerability-ranking`, {
    headers: getAuthHeaders({}, token),
    signal,
  });
  return handleResponse(response, "Failed to load zone vulnerability ranking", token);
}

export async function getKioskC4Dispersal({ signal } = {}) {
  const token = getAdminAuthToken();
  const response = await fetch(`${API_URL}/analytics/kiosk-c4-dispersal`, {
    headers: getAuthHeaders({}, token),
    signal,
  });
  return handleResponse(response, "Failed to load kiosk C4 dispersal metrics", token);
}

export async function getAdminDashboardStats({ signal } = {}) {
  const token = getAdminAuthToken();
  const response = await fetch(`${API_URL}/admin/dashboard/stats`, {
    headers: getAuthHeaders({}, token),
    signal,
  });
  return handleResponse(response, "Failed to load dashboard statistics", token);
}
