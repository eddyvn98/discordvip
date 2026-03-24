import { api } from "./api";
import { LoginScreen } from "./components/auth/LoginScreen";
import { AdminLayout } from "./components/layout/AdminLayout";
import { useCurrentUser } from "./hooks/useCurrentUser";

export default function App() {
  const { user, loading, setUser } = useCurrentUser();

  if (loading) {
    return <div className="login-shell">Đang tải...</div>;
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <AdminLayout
      user={user}
      onLogout={async () => {
        await api.logout();
        setUser(null);
      }}
    />
  );
}

