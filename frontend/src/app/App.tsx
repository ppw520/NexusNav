import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Header } from "../components/Header";
import { setUnauthorizedHandler } from "../services/api";
import { useAuthStore } from "../store/useAuthStore";
import { HomePage } from "../pages/HomePage";
import { LoginPage } from "../pages/LoginPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { SettingsPage } from "../pages/SettingsPage";

function ProtectedRoutes() {
  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}

export function App() {
  const ready = useAuthStore((state) => state.ready);
  const authenticated = useAuthStore((state) => state.authenticated);
  const securityEnabled = useAuthStore((state) => state.securityEnabled);
  const checkSession = useAuthStore((state) => state.checkSession);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      checkSession().catch(() => undefined);
    });
    checkSession().catch(() => undefined);
    return () => setUnauthorizedHandler(undefined);
  }, [checkSession]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          !securityEnabled || authenticated ? <Navigate to="/" replace /> : <LoginPage />
        }
      />
      <Route
        path="/*"
        element={securityEnabled && !authenticated ? <Navigate to="/login" replace /> : <ProtectedRoutes />}
      />
    </Routes>
  );
}
