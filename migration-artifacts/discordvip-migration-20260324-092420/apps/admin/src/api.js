const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
async function request(path, init) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...init,
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...(init?.headers ?? {}),
        },
    });
    if (!response.ok) {
        let message = "Request failed";
        try {
            const body = (await response.json());
            message = body.error || message;
        }
        catch {
            message = response.statusText || message;
        }
        throw new Error(message);
    }
    if (response.status === 204) {
        return undefined;
    }
    return (await response.json());
}
export const api = {
    get(path) {
        return request(path);
    },
    post(path, body) {
        return request(path, {
            method: "POST",
            body: body ? JSON.stringify(body) : undefined,
        });
    },
    loginUrl() {
        return `${API_BASE_URL}/api/auth/discord/login?returnTo=${encodeURIComponent(window.location.origin)}`;
    },
    logout() {
        return request("/api/auth/logout", { method: "POST" });
    },
};
