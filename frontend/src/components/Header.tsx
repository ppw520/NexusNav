import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Grid3x3, Home, LogOut, Menu, Settings, X } from "lucide-react";
import { Button } from "./ui/button";
import { useAuthStore } from "../store/useAuthStore";

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const doLogout = useAuthStore((state) => state.doLogout);
  const securityEnabled = useAuthStore((state) => state.securityEnabled);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    await doLogout();
    setMobileMenuOpen(false);
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 md:h-16">
        <Link to="/" className="flex items-center gap-2">
          <Grid3x3 className="h-5 w-5 text-blue-600 md:h-6 md:w-6" />
          <span className="text-lg font-semibold md:text-xl">NexusNav</span>
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          <Link to="/">
            <Button variant={isActive("/") ? "default" : "ghost"} size="sm">
              <Home className="mr-1 h-4 w-4" />
              首页
            </Button>
          </Link>
          <Link to="/settings">
            <Button variant={isActive("/settings") ? "default" : "ghost"} size="sm">
              <Settings className="mr-1 h-4 w-4" />
              配置
            </Button>
          </Link>
          {securityEnabled && (
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="mr-1 h-4 w-4" />
              退出
            </Button>
          )}
        </nav>

        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileMenuOpen((value) => !value)}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {mobileMenuOpen && (
        <div className="border-t bg-white md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1 p-3">
            <Link to="/" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="ghost" className="w-full justify-start">
                <Home className="mr-2 h-4 w-4" />
                首页
              </Button>
            </Link>
            <Link to="/settings" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="ghost" className="w-full justify-start">
                <Settings className="mr-2 h-4 w-4" />
                配置
              </Button>
            </Link>
            {securityEnabled && (
              <Button variant="ghost" className="justify-start" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                退出
              </Button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
