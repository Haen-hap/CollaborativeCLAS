const API_URL = import.meta.env.VITE_API_URL;

export async function checkBackendConnection() {
    const response = await fetch(`${API_URL}/health/`);

    if (!response.ok) {
        throw new Error("Backend connection failed");

    }

    return response.json();


}