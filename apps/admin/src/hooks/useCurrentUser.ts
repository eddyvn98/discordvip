import { useEffect, useState } from "react";

import { api } from "../api";
import type { AdminUser } from "../types";

export function useCurrentUser() {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ user: AdminUser }>("/api/admin/me")
      .then((response) => setUser(response.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  return { user, loading, setUser };
}
