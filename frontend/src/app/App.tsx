import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { FloatingMenu } from "../components/FloatingMenu";
import { Header } from "../components/Header";
import { setUnauthorizedHandler } from "../services/api";
import { useAuthStore } from "../store/useAuthStore";
import { useSystemStore } from "../store/useSystemStore";
import { HomePage } from "../pages/HomePage";
import { LoginPage } from "../pages/LoginPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { SettingsPage } from "../pages/SettingsPage";

function ProtectedRoutes() {
  const config = useSystemStore((state) => state.config);
  const loadSystem = useSystemStore((state) => state.load);

  useEffect(() => {
    if (!config) {
      loadSystem().catch(() => undefined);
    }
  }, [config, loadSystem]);

  const backgroundStyle =
    config?.backgroundType === "image" && config.backgroundImageDataUrl
      ? {
          backgroundImage: `linear-gradient(135deg, rgba(15,23,42,0.45), rgba(30,41,59,0.65)), url(${config.backgroundImageDataUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center"
        }
      : {
          backgroundImage:
            "radial-gradient(circle at 0% 0%, rgba(56,189,248,0.25), transparent 35%), radial-gradient(circle at 100% 0%, rgba(168,85,247,0.24), transparent 32%), linear-gradient(160deg, #0f172a 0%, #111827 55%, #020617 100%)"
        };

  return (
    <div className="min-h-screen" style={backgroundStyle}>
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <FloatingMenu />
    </div>
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
