import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CircleHelp, Maximize2, Minimize2, Minus, RefreshCw, Tv, X } from "lucide-react";
import { Rnd } from "react-rnd";
import { toast } from "sonner";
import type { CardDTO, EmbyStatsDTO, EmbyTaskDTO } from "../types";
import { triggerEmbyTask, loadEmbyStats, loadEmbyTasks } from "../services/emby";
import { AppIcon } from "./AppIcon";
import { Button } from "./ui/button";

type EmbyStatsWindowProps = {
  id: string;
  title: string;
  icon?: string;
  card: CardDTO;
  zIndex: number;
  initialStats?: EmbyStatsDTO;
  onStatsUpdate?: (stats: EmbyStatsDTO) => void;
  onClose: () => void;
  onFocus: () => void;
};

const POLL_INTERVAL_MS = 30000;

export function EmbyStatsWindow({
  id,
  title,
  icon,
  card,
  zIndex,
  initialStats,
  onStatsUpdate,
  onClose,
  onFocus
}: EmbyStatsWindowProps) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [stats, setStats] = useState<EmbyStatsDTO | undefined>(initialStats);
  const [tasks, setTasks] = useState<EmbyTaskDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [runningTaskId, setRunningTaskId] = useState<string | null>(null);
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
        const [nextStats, nextTasks] = await Promise.all([loadEmbyStats(card), loadEmbyTasks(card)]);
        setStats(nextStats);
        setTasks(nextTasks);
        setError(undefined);
        onStatsUpdateRef.current?.(nextStats);
      } catch (err) {
        const message = err instanceof Error ? err.message : "加载 Emby 数据失败";
        setError(message);
      } finally {
        setHasLoadedOnce(true);
        setLoading(false);
        setRefreshing(false);
      }
    },
    [card, hasLoadedOnce]
  );

  useEffect(() => {
    refreshData().catch(() => undefined);
    const timer = window.setInterval(() => {
      refreshData(true).catch(() => undefined);
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [refreshData]);

  const lastUpdated = useMemo(() => {
    if (!stats?.updatedAt) {
      return "--";
    }
    return formatEpoch(stats.updatedAt);
  }, [stats?.updatedAt]);

  const runTask = async (task: EmbyTaskDTO) => {
    if (!window.confirm(`确认执行任务「${task.name}」吗？`)) {
      return;
    }
    setRunningTaskId(task.id);
    try {
      const result = await triggerEmbyTask(card, task.id, task.name);
      toast.success(result.message || "任务已触发");
      await refreshData(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "任务执行失败";
      toast.error(message);
    } finally {
      setRunningTaskId(null);
    }
  };

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
          <span className="max-w-44 truncate">{title} (Emby)</span>
        </div>
      </div>
    );
  }

  const content = (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-white/20 bg-slate-950/90 text-white shadow-[0_20px_50px_-20px_rgba(15,23,42,0.95)] backdrop-blur-sm">
      <div className="emby-window-drag-handle flex cursor-move select-none items-center justify-between border-b border-white/15 bg-slate-900/85 px-2 py-1.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-sm font-semibold">
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center overflow-hidden rounded bg-white/20">
              <AppIcon icon={icon} className="h-4 w-4 text-white" />
            </span>
            <span className="truncate">{title} / Emby 统计</span>
          </div>
          <div className="truncate text-[10px] text-white/70">最近更新: {lastUpdated}</div>
        </div>
        <div className="emby-window-controls ml-2 flex items-center gap-1">
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

      <div className="flex flex-1 flex-col gap-3 overflow-hidden bg-slate-900 p-3">
        {error && <div className="rounded-md border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{error}</div>}

        <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <MediaTotalItem stats={stats} />
          <StatsItem label="在线会话" value={stats?.onlineSessions ?? "--"} />
          <StatsItem label="播放中" value={stats?.playingSessions ?? "--"} />
          <StatsItem label="更新时间" value={lastUpdated} />
        </section>

        <section className="flex min-h-0 flex-1 flex-col rounded-lg border border-white/10 bg-slate-950/55">
          <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
            <h4 className="text-sm font-semibold text-white">定时任务</h4>
            <div className="text-xs text-slate-400">{tasks.length} 个任务</div>
          </div>

          <div className="nexus-scrollbar min-h-0 flex-1 overflow-auto">
            {loading ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">加载中...</div>
            ) : tasks.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-slate-400">
                <Tv className="h-4 w-4" />
                暂无可执行任务
              </div>
            ) : (
              <table className="w-full text-left text-xs text-slate-200">
                <thead className="bg-white/5 text-[11px] uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-3 py-2">任务</th>
                    <th className="px-3 py-2">模块</th>
                    <th className="px-3 py-2">状态</th>
                    <th className="px-3 py-2">上次运行</th>
                    <th className="px-3 py-2">结果</th>
                    <th className="px-3 py-2 text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task) => {
                    const running = runningTaskId === task.id;
                    return (
                      <tr key={task.id} className="border-t border-white/5">
                        <td className="px-3 py-2">
                          <div className="font-medium text-slate-100">{task.name}</div>
                          {task.description && (
                            <div className="mt-0.5 max-w-[24rem] truncate text-[11px] leading-4 text-slate-400" title={task.description}>
                              {task.description}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-slate-300">{formatTaskModule(task.module)}</td>
                        <td className="px-3 py-2 text-slate-300">{formatTaskState(task.state, task.isRunning)}</td>
                        <td className="px-3 py-2 text-slate-300">{task.lastRunAt ? formatIso(task.lastRunAt) : "--"}</td>
                        <td className="max-w-80 truncate px-3 py-2 text-slate-300" title={task.lastResult || ""}>
                          {task.lastResult || "--"}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 border-sky-400/40 bg-sky-500/10 text-sky-200 hover:bg-sky-500/20 hover:text-sky-100"
                            disabled={running || task.isRunning}
                            onClick={() => runTask(task)}
                          >
                            {running ? "执行中..." : "执行"}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
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
        x: 92 + Math.random() * 130,
        y: 124 + Math.random() * 70,
        width: Math.min(window.innerWidth * 0.78, 1180),
        height: Math.min(window.innerHeight * 0.72, 760)
      }}
      minWidth={680}
      minHeight={420}
      bounds="window"
      dragHandleClassName="emby-window-drag-handle"
      cancel=".emby-window-controls, .emby-window-controls *"
      style={{ zIndex }}
      onMouseDown={onFocus}
    >
      {content}
    </Rnd>
  );
}

function StatsItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/5 px-3 py-2">
      <div className="text-[11px] text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

function MediaTotalItem({ stats }: { stats?: EmbyStatsDTO }) {
  const breakdown = (stats?.mediaBreakdown || []).filter((item) => item.count > 0);

  return (
    <div className="group relative rounded-md border border-white/10 bg-white/5 px-3 py-2">
      <div className="flex items-center justify-between">
        <div className="text-[11px] text-slate-400">媒体总数</div>
        {breakdown.length > 0 && (
          <span className="inline-flex items-center gap-1 rounded border border-white/20 bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-300">
            <CircleHelp className="h-3 w-3" />
            明细
          </span>
        )}
      </div>
      <div className="mt-1 text-sm font-semibold text-white">{stats?.mediaTotal ?? "--"}</div>

      {breakdown.length > 0 && (
        <div className="pointer-events-none absolute left-0 top-full z-20 mt-1 w-max min-w-56 max-w-[30rem] rounded-md border border-white/15 bg-slate-950/95 p-2 text-xs text-slate-200 opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
          <div className="mb-1 text-[11px] text-slate-400">媒体细项</div>
          <div className="space-y-0.5">
            {breakdown.map((item) => (
              <div key={item.key} className="flex items-center justify-between py-0.5">
                <span>{formatMediaKey(item.key)}</span>
                <span className="font-semibold text-slate-100">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function formatMediaKey(key: string) {
  const labelMap: Record<string, string> = {
    MovieCount: "电影",
    SeriesCount: "剧集",
    EpisodeCount: "剧集单集",
    SongCount: "歌曲",
    AlbumCount: "专辑",
    MusicVideoCount: "音乐视频",
    TrailerCount: "预告片",
    BoxSetCount: "合集",
    BookCount: "图书",
    PhotoCount: "照片",
    ProgramCount: "节目"
  };
  return labelMap[key] || key.replace(/Count$/, "");
}

function formatEpoch(epoch: number) {
  if (!Number.isFinite(epoch) || epoch <= 0) {
    return "--";
  }
  return new Date(epoch).toLocaleString();
}

function formatIso(value: string) {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return value;
  }
  return new Date(parsed).toLocaleString();
}

function formatTaskState(state: string, isRunning: boolean) {
  if (isRunning) {
    return "运行中";
  }
  const normalized = state.trim().toLowerCase();
  const labelMap: Record<string, string> = {
    idle: "空闲",
    queued: "排队中",
    pending: "等待中",
    running: "运行中",
    cancelling: "取消中",
    cancelled: "已取消",
    completed: "已完成",
    failed: "失败",
    error: "异常"
  };
  return labelMap[normalized] || (state.trim() || "未知");
}

function formatTaskModule(module?: string) {
  const value = (module || "").trim();
  if (!value) {
    return "--";
  }
  const map: Record<string, string> = {
    Application: "应用",
    Database: "数据库",
    "Downloads & Conversions": "下载与转码",
    Library: "媒体库",
    Trakt: "Trakt",
    "Infuse Sync": "Infuse 同步",
    "Live TV": "直播电视",
    General: "通用"
  };
  return map[value] || value;
}
