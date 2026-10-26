const API_URL = import.meta.env.VITE_API_URL;

async function handleResponse(response, fallbackError) {
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

    throw new Error(message || fallbackError);
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

export async function getAdminDashboardStats({ signal } = {}) {
  const response = await fetch(`${API_URL}/admin/dashboard/stats`, { signal });
  return handleResponse(response, "Failed to load dashboard statistics");
}
