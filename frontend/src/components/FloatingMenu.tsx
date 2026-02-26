import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Globe, Home, LogOut, Menu, Network, Settings, Wifi, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { useAuthStore } from "../store/useAuthStore";
import { useSystemStore, type RuntimeNetworkMode } from "../store/useSystemStore";

export function FloatingMenu() {
  const navigate = useNavigate();
  const securityEnabled = useAuthStore((state) => state.securityEnabled);
  const doLogout = useAuthStore((state) => state.doLogout);
  const runtimeNetworkMode = useSystemStore((state) => state.runtimeNetworkMode);
  const cycleRuntimeNetworkMode = useSystemStore((state) => state.cycleRuntimeNetworkMode);
  const [isOpen, setIsOpen] = useState(true);

  const handleLogout = async () => {
    await doLogout();
    toast.success("已退出登录");
    setIsOpen(false);
    navigate("/login");
  };

  const modeText: Record<RuntimeNetworkMode, string> = {
    auto: "自动识别",
    lan: "内网模式",
    wan: "外网模式"
  };

  const modeIcon =
    runtimeNetworkMode === "lan" ? (
      <Wifi className="h-5 w-5" />
    ) : runtimeNetworkMode === "wan" ? (
      <Globe className="h-5 w-5" />
    ) : (
      <Network className="h-5 w-5" />
    );

  return (
    <div
      className="fixed z-[9999]"
      style={{ right: "24px", left: "auto", bottom: "32%" }}
    >
      <div
        className={`mb-3 flex flex-col gap-3 transition-all duration-300 ${
          isOpen ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
        }`}
      >
        <Button
          size="icon"
          className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg hover:from-purple-600 hover:to-purple-700"
          onClick={() => {
            cycleRuntimeNetworkMode();
            const nextMode =
              runtimeNetworkMode === "auto" ? "lan" : runtimeNetworkMode === "lan" ? "wan" : "auto";
            toast.success(`已切换到 ${modeText[nextMode]}`);
          }}
          title={modeText[runtimeNetworkMode]}
        >
          {modeIcon}
        </Button>

        <Button
          size="icon"
          className="h-12 w-12 rounded-full bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg hover:from-green-600 hover:to-green-700"
          onClick={() => {
            navigate("/");
            setIsOpen(false);
          }}
          title="首页"
        >
          <Home className="h-5 w-5" />
        </Button>

        <Button
          size="icon"
          className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg hover:from-blue-600 hover:to-blue-700"
          onClick={() => {
            navigate("/settings");
            setIsOpen(false);
          }}
          title="配置"
        >
          <Settings className="h-5 w-5" />
        </Button>

        {securityEnabled && (
          <Button
            size="icon"
            className="h-12 w-12 rounded-full bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg hover:from-red-600 hover:to-red-700"
            onClick={handleLogout}
            title="退出登录"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        )}
      </div>

      <Button
        size="icon"
        className="h-14 w-14 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-2xl transition-transform duration-300 hover:scale-110 hover:from-blue-700 hover:to-purple-700"
        onClick={() => setIsOpen((value) => !value)}
        title={isOpen ? "关闭菜单" : "打开菜单"}
      >
        {isOpen ? <X className="h-6 w-6 rotate-90 transition-transform duration-300" /> : <Menu className="h-6 w-6" />}
      </Button>

      {isOpen && <div className="fixed inset-0 -z-10 bg-black/20 md:hidden" onClick={() => setIsOpen(false)} />}
    </div>
  );
}
