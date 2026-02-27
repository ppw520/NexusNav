import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Activity, ArrowDownToLine, ArrowUpFromLine, Maximize2, Minimize2, Minus, RefreshCw, X } from "lucide-react";
import { Rnd } from "react-rnd";
import type { CardDTO, CardType, TorrentStatsDTO } from "../types";
import { loadQbittorrentStats, loadTransmissionStats } from "../services/torrent";
import { AppIcon } from "./AppIcon";
import { Button } from "./ui/button";

type TorrentStatsWindowProps = {
  id: string;
  title: string;
  icon?: string;
  card: CardDTO;
  provider: Extract<CardType, "qbittorrent" | "transmission">;
  zIndex: number;
  initialStats?: TorrentStatsDTO;
  onStatsUpdate?: (stats: TorrentStatsDTO) => void;
  onClose: () => void;
  onFocus: () => void;
};

const POLL_INTERVAL_MS = 30000;

export function TorrentStatsWindow({
  id,
  title,
  icon,
  card,
  provider,
  zIndex,
  initialStats,
  onStatsUpdate,
  onClose,
  onFocus
}: TorrentStatsWindowProps) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [stats, setStats] = useState<TorrentStatsDTO | undefined>(initialStats);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const onStatsUpdateRef = useRef(onStatsUpdate);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    onStatsUpdateRef.current = onStatsUpdate;
  }, [onStatsUpdate]);

  const refreshData = useCallback(
    async (silent = false) => {
      if (silent) {
        setRefreshing(true);
      } else if (!hasLoadedOnce) {
        setLoading(true);
      }
      try {
        const next = provider === "qbittorrent" ? await loadQbittorrentStats(card) : await loadTransmissionStats(card);
        setStats(next);
        setError(undefined);
        onStatsUpdateRef.current?.(next);
      } catch (err) {
        const message = err instanceof Error ? err.message : "加载统计数据失败";
        setError(message);
      } finally {
        setHasLoadedOnce(true);
        setLoading(false);
        setRefreshing(false);
      }
    },
    [card, hasLoadedOnce, provider]
  );

  useEffect(() => {
    refreshData().catch(() => undefined);
    const timer = window.setInterval(() => {
      refreshData(true).catch(() => undefined);
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [refreshData]);

  const providerLabel = provider === "qbittorrent" ? "qBittorrent" : "Transmission";
  const sourceLabel = stats?.source === "direct" ? "直连" : "代理";
  const lastUpdated = useMemo(() => {
    if (!stats?.updatedAt) {
      return "--";
    }
    return formatEpoch(stats.updatedAt);
  }, [stats?.updatedAt]);

  if (isMinimized) {
    return (
      <div
        className="fixed bottom-4 left-4 cursor-pointer rounded-xl border border-white/25 bg-slate-900/90 px-3 py-2 text-white shadow-xl backdrop-blur-md"
        style={{ zIndex }}
        onClick={() => {
          setIsMinimized(false);
          onFocus();
        }}
      >
        <div className="flex items-center gap-2 text-sm">
          <span className="flex h-5 w-5 items-center justify-center overflow-hidden rounded bg-white/20">
            <AppIcon icon={icon} className="h-4 w-4 text-white" />
          </span>
          <span className="max-w-44 truncate">
            {title} ({providerLabel})
          </span>
        </div>
      </div>
    );
  }

  const content = (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-white/20 bg-slate-950/90 text-white shadow-[0_20px_50px_-20px_rgba(15,23,42,0.95)] backdrop-blur-sm">
      <div className="torrent-window-drag-handle flex cursor-move select-none items-center justify-between border-b border-white/15 bg-slate-900/85 px-2 py-1.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-sm font-semibold">
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center overflow-hidden rounded bg-white/20">
              <AppIcon icon={icon} className="h-4 w-4 text-white" />
            </span>
            <span className="truncate">
              {title} / {providerLabel}
            </span>
          </div>
          <div className="truncate text-[10px] text-white/70">
            最近更新: {lastUpdated} · 数据源: {sourceLabel}
          </div>
        </div>
        <div className="torrent-window-controls ml-2 flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white hover:bg-white/20 hover:text-white"
            onClick={() => refreshData(true)}
            title="刷新"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
          {!isMobile && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-white hover:bg-white/20 hover:text-white"
                onClick={() => setIsMinimized(true)}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-white hover:bg-white/20 hover:text-white"
                onClick={() => setIsMaximized((value) => !value)}
              >
                {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white hover:bg-rose-500/30 hover:text-white"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-auto bg-slate-900 p-3">
        {error && <div className="rounded-md border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{error}</div>}

        <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <StatsItem label="下载速率" value={formatSpeed(stats?.downloadSpeed)} icon={<ArrowDownToLine className="h-3.5 w-3.5" />} />
          <StatsItem label="上传速率" value={formatSpeed(stats?.uploadSpeed)} icon={<ArrowUpFromLine className="h-3.5 w-3.5" />} />
          <StatsItem label="活跃任务" value={stats?.activeCount ?? "--"} icon={<Activity className="h-3.5 w-3.5" />} />
          <StatsItem label="总任务数" value={stats?.totalCount ?? "--"} icon={<Activity className="h-3.5 w-3.5" />} />
        </section>

        <section className="rounded-lg border border-white/10 bg-slate-950/55 p-3">
          <h4 className="mb-2 text-sm font-semibold text-slate-100">细分状态</h4>
          {loading ? (
            <div className="py-8 text-center text-sm text-slate-400">加载中...</div>
          ) : (
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              <BreakdownItem label="下载中" value={stats?.statusBreakdown.downloading} tone="sky" />
              <BreakdownItem label="做种中" value={stats?.statusBreakdown.seeding} tone="emerald" />
              <BreakdownItem label="已暂停" value={stats?.statusBreakdown.paused} tone="slate" />
              <BreakdownItem label="排队中" value={stats?.statusBreakdown.queued} tone="amber" />
              <BreakdownItem label="校验中" value={stats?.statusBreakdown.checking} tone="violet" />
              <BreakdownItem label="卡住" value={stats?.statusBreakdown.stalled} tone="orange" />
              <BreakdownItem label="错误" value={stats?.statusBreakdown.error} tone="rose" />
              <BreakdownItem label="未知" value={stats?.statusBreakdown.unknown} tone="slate" />
            </div>
          )}
        </section>
      </div>
    </div>
  );

  if (isMobile || isMaximized) {
    return (
      <div
        className="fixed left-0 top-[84px] h-[calc(100vh-84px)] w-full p-2 md:top-[88px] md:h-[calc(100vh-88px)]"
        style={{ zIndex }}
        onMouseDown={onFocus}
      >
        {content}
      </div>
    );
  }

  return (
    <Rnd
      default={{
        x: 112 + Math.random() * 120,
        y: 126 + Math.random() * 64,
        width: Math.min(window.innerWidth * 0.65, 860),
        height: Math.min(window.innerHeight * 0.62, 620)
      }}
      minWidth={520}
      minHeight={360}
      bounds="window"
      dragHandleClassName="torrent-window-drag-handle"
      cancel=".torrent-window-controls, .torrent-window-controls *"
      style={{ zIndex }}
      onMouseDown={onFocus}
    >
      {content}
    </Rnd>
  );
}

function StatsItem({ label, value, icon }: { label: string; value: string | number; icon?: React.ReactNode }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/5 px-3 py-2">
      <div className="flex items-center justify-between text-[11px] text-slate-400">
        <span>{label}</span>
        {icon}
      </div>
      <div className="mt-1 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

function BreakdownItem({
  label,
  value,
  tone
}: {
  label: string;
  value?: number;
  tone: "sky" | "emerald" | "slate" | "amber" | "violet" | "orange" | "rose";
}) {
  const toneMap: Record<typeof tone, string> = {
    sky: "border-sky-400/35 bg-sky-500/10 text-sky-200",
    emerald: "border-emerald-400/35 bg-emerald-500/10 text-emerald-200",
    slate: "border-slate-400/35 bg-slate-500/10 text-slate-200",
    amber: "border-amber-400/35 bg-amber-500/10 text-amber-200",
    violet: "border-violet-400/35 bg-violet-500/10 text-violet-200",
    orange: "border-orange-400/35 bg-orange-500/10 text-orange-200",
    rose: "border-rose-400/35 bg-rose-500/10 text-rose-200"
  };

  return (
    <div className={`rounded-md border px-3 py-2 ${toneMap[tone]}`}>
      <div className="text-[11px]">{label}</div>
      <div className="mt-1 text-base font-semibold">{value ?? 0}</div>
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

function formatEpoch(epoch: number) {
  if (!Number.isFinite(epoch) || epoch <= 0) {
    return "--";
  }
  return new Date(epoch).toLocaleString();
}
