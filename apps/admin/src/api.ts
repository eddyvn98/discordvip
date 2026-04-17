const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

export type ApiError = {
  error: string;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
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
      const body = (await response.json()) as ApiError;
      message = body.error || message;
    } catch {
      message = response.statusText || message;
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const api = {
  get<T>(path: string) {
    return request<T>(path);
  },
  post<T>(path: string, body?: unknown) {
    return request<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  },
  patch<T>(path: string, body?: unknown) {
    return request<T>(path, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  },
  delete<T>(path: string) {
    return request<T>(path, {
      method: "DELETE",
    });
  },
  loginUrl() {
    return `${API_BASE_URL}/api/auth/discord/login?returnTo=${encodeURIComponent(window.location.origin)}`;
  },
  logout() {
    return request<void>("/api/auth/logout", { method: "POST" });
  },
  debugLogin(secret: string) {
    return request<{ redirectTo: string }>("/api/auth/debug-login", {
      method: "POST",
      body: JSON.stringify({
        secret,
        returnTo: window.location.origin,
      }),
    });
  },
};
