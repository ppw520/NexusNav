import { ExternalLink, MonitorPlay, TerminalSquare } from "lucide-react";
import type { CardDTO, HealthStatusDTO, TorrentStatsDTO } from "../types";
import { AppIcon } from "./AppIcon";

type ServiceCardProps = {
  service: CardDTO;
  health?: HealthStatusDTO;
  embyMediaTotal?: number;
  torrentStats?: TorrentStatsDTO;
  onClick?: () => void;
  draggable?: boolean;
  onDragStart?: () => void;
  onDrop?: () => void;
};

function getHealthColor(status?: HealthStatusDTO["status"]) {
  switch (status) {
    case "up":
      return "bg-green-500";
    case "down":
      return "bg-red-500";
    default:
      return "bg-gray-400";
  }
}

function getTopBorderColor(service: CardDTO, health?: HealthStatusDTO) {
  if (!service.enabled) {
    return "rgba(148,163,184,0.85)";
  }
  if (health?.status === "down") {
    return "#f59e0b";
  }
  return "#0ea5e9";
}

export function ServiceCard({
  service,
  health,
  embyMediaTotal,
  torrentStats,
  onClick,
  draggable,
  onDragStart,
  onDrop
}: ServiceCardProps) {
  const detailText =
    service.cardType === "emby"
      ? `媒体总数: ${embyMediaTotal ?? "--"}`
      : service.cardType === "qbittorrent" || service.cardType === "transmission"
        ? `↓ ${formatSpeed(torrentStats?.downloadSpeed)} · ↑ ${formatSpeed(torrentStats?.uploadSpeed)}`
        : service.url;

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
      onClick={onClick}
      className="cursor-pointer"
    >
      <article
        className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/10 backdrop-blur-md transition-all hover:border-white/20 hover:bg-white/15 hover:shadow-xl"
        style={{ borderTop: `3px solid ${getTopBorderColor(service, health)}` }}
      >
        {service.healthCheckEnabled && (
          <div className="absolute left-2 top-2 z-10">
            <div className={`h-2.5 w-2.5 rounded-full ${getHealthColor(health?.status)}`} />
          </div>
        )}

        <div className="px-4 pb-3 pt-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/10">
              <AppIcon icon={service.icon} className="h-8 w-8 text-white" emojiClassName="text-2xl" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-base font-semibold text-white">{service.name}</h3>
              {service.description && <p className="mt-1 truncate text-sm text-gray-300">{service.description}</p>}
            </div>
          </div>
        </div>

        <div className="px-4 pb-4">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span className="mr-2 flex-1 truncate">{detailText}</span>
            {service.cardType === "ssh" && <TerminalSquare className="h-3 w-3 flex-shrink-0" />}
            {service.cardType === "emby" && <MonitorPlay className="h-3 w-3 flex-shrink-0" />}
            {service.cardType === "generic" && service.openMode === "newtab" && <ExternalLink className="h-3 w-3 flex-shrink-0" />}
            {service.cardType === "qbittorrent" && (
              <span className="rounded border border-amber-400/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-200">QBT</span>
            )}
            {service.cardType === "transmission" && (
              <span className="rounded border border-indigo-400/40 bg-indigo-500/10 px-1.5 py-0.5 text-[10px] text-indigo-200">TR</span>
            )}
          </div>
        </div>
      </article>
    </div>
  );
}

function formatSpeed(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return "--";
  }
  if (value < 1024) {
    return `${value.toFixed(0)} B/s`;
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB/s`;
  }
  if (value < 1024 * 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(1)} MB/s`;
  }
  return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB/s`;
}
