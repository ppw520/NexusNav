import type { CardDTO, EmbyStatsDTO, EmbyTaskDTO, EmbyTaskRunResultDTO } from "../types";
import { fetchEmbyStatsViaProxy, fetchEmbyTasksViaProxy, runEmbyTaskViaProxy } from "./api";

const REQUEST_TIMEOUT_MS = 8000;

const MEDIA_COUNT_KEYS = [
  "MovieCount",
  "SeriesCount",
  "EpisodeCount",
  "SongCount",
  "AlbumCount",
  "MusicVideoCount",
  "TrailerCount",
  "BoxSetCount",
  "BookCount",
  "PhotoCount",
  "ProgramCount"
] as const;

export async function loadEmbyStats(card: CardDTO): Promise<EmbyStatsDTO> {
  try {
    return await fetchEmbyStatsDirect(card);
  } catch {
    return fetchEmbyStatsViaProxy(card.id);
  }
}

export async function loadEmbyTasks(card: CardDTO): Promise<EmbyTaskDTO[]> {
  try {
    return await fetchEmbyTasksDirect(card);
  } catch {
    return fetchEmbyTasksViaProxy(card.id);
  }
}

export async function triggerEmbyTask(card: CardDTO, taskId: string, taskName?: string): Promise<EmbyTaskRunResultDTO> {
  try {
    return await runEmbyTaskDirect(card, taskId, taskName);
  } catch {
    return runEmbyTaskViaProxy(card.id, taskId);
  }
}

async function fetchEmbyStatsDirect(card: CardDTO): Promise<EmbyStatsDTO> {
  const context = resolveConnectionContext(card);
  const [countsPayload, sessionsPayload, libraryBreakdown] = await Promise.all([
    fetchJson(buildEmbyUrl(context.baseUrl, "/Items/Counts", context.apiKey)),
    fetchJson(buildEmbyUrl(context.baseUrl, "/Sessions?ActiveWithinSeconds=300", context.apiKey)),
    fetchLibraryBreakdownDirect(context)
  ]);

  const mediaBreakdown = libraryBreakdown.length > 0 ? libraryBreakdown : buildTypeBreakdown(countsPayload);
  const mediaTotal =
    mediaBreakdown.length > 0
      ? mediaBreakdown.reduce((sum, item) => sum + item.count, 0)
      : countMediaTotalFromCounts(countsPayload);
  const sessions = Array.isArray(sessionsPayload) ? sessionsPayload : [];
  const playingSessions = sessions.filter((session) => {
    const item = asRecord(session);
    if (!item) {
      return false;
    }
    if (item.NowPlayingItem != null) {
      return true;
    }
    const playState = asRecord(item.PlayState);
    return Boolean(playState && playState.PositionTicks != null);
  }).length;

  return {
    mediaTotal,
    mediaBreakdown,
    onlineSessions: sessions.length,
    playingSessions,
    updatedAt: Date.now(),
    source: "direct"
  };
}

async function fetchLibraryBreakdownDirect(context: { baseUrl: string; apiKey: string }) {
  try {
    const foldersPayload = await fetchJson(
      buildEmbyUrl(context.baseUrl, "/Items?IncludeItemTypes=CollectionFolder&Recursive=true&Limit=200", context.apiKey)
    );
    const folders = extractItemsArray(foldersPayload);
    if (!folders.length) {
      return [];
    }

    const settled = await Promise.allSettled(
      folders.map(async (folder) => {
        const id = asString(folder.Id) || asString(folder.id);
        const name = asString(folder.Name) || asString(folder.name);
        if (!id || !name) {
          return null;
        }
        const countPayload = await fetchJson(
          buildEmbyUrl(context.baseUrl, `/Items?ParentId=${encodeURIComponent(id)}&Recursive=true&Limit=0`, context.apiKey)
        );
        const countRecord = asRecord(countPayload);
        const count = asNumber(countRecord?.TotalRecordCount);
        if (count <= 0) {
          return null;
        }
        return { key: name, count };
      })
    );

    const breakdown = settled
      .map((result) => (result.status === "fulfilled" ? result.value : null))
      .filter((item): item is { key: string; count: number } => Boolean(item))
      .sort((a, b) => b.count - a.count);
    return breakdown;
  } catch {
    return [];
  }
}

async function fetchEmbyTasksDirect(card: CardDTO): Promise<EmbyTaskDTO[]> {
  const context = resolveConnectionContext(card);
  const payload = await fetchJson(buildEmbyUrl(context.baseUrl, "/ScheduledTasks", context.apiKey));
  const tasksRaw = Array.isArray(payload)
    ? payload
    : Array.isArray(asRecord(payload)?.Items)
      ? (asRecord(payload)?.Items as unknown[])
      : [];

  const tasks = tasksRaw
    .map(mapTask)
    .filter((item): item is EmbyTaskDTO => Boolean(item))
    .sort((a, b) => {
      const moduleDiff = taskModuleSortKey(a.module).localeCompare(taskModuleSortKey(b.module), "zh-CN", {
        sensitivity: "base"
      });
      if (moduleDiff !== 0) {
        return moduleDiff;
      }
      return a.name.localeCompare(b.name, "zh-CN", { sensitivity: "base" });
    });

  return tasks;
}

async function runEmbyTaskDirect(card: CardDTO, taskId: string, taskName?: string): Promise<EmbyTaskRunResultDTO> {
  if (!taskId.trim()) {
    throw new Error("taskId is required");
  }
  const context = resolveConnectionContext(card);
  await fetchJson(buildEmbyUrl(context.baseUrl, `/ScheduledTasks/Running/${encodeURIComponent(taskId)}`, context.apiKey), {
    method: "POST"
  });

  return {
    taskId,
    taskName,
    triggered: true,
    status: "running",
    message: "Task triggered",
    updatedAt: Date.now(),
    source: "direct"
  };
}

function mapTask(raw: unknown): EmbyTaskDTO | null {
  const task = asRecord(raw);
  if (!task) {
    return null;
  }

  const id = asString(task.Id) || asString(task.id);
  if (!id) {
    return null;
  }

  const name = asString(task.Name) || asString(task.name) || id;
  const description = asString(task.Description) || asString(task.description) || undefined;
  const module = asString(task.Category) || asString(task.category) || asString(task.Module) || undefined;
  const state = asString(task.State) || asString(task.state) || "Unknown";
  const isRunning =
    asBoolean(task.IsRunning) || state.toLowerCase() === "running" || state.toLowerCase() === "cancelling";

  const lastRunAt = resolveTaskLastRunAt(task);

  const lastResult = resolveTaskResult(task);

  return {
    id,
    name,
    description,
    module,
    state,
    isRunning,
    lastRunAt,
    lastResult
  };
}

function resolveTaskResult(task: Record<string, unknown>): string | undefined {
  const direct = asString(task.LastExecutionResult) || asString(task.LastResult) || asString(task.Result);
  if (direct) {
    return direct;
  }

  const executionResult = asRecord(task.LastExecutionResult);
  if (!executionResult) {
    return undefined;
  }

  const status = asString(executionResult.Status) || asString(executionResult.State);
  const message =
    asString(executionResult.Message) || asString(executionResult.ErrorMessage) || asString(executionResult.Details);

  if (status && message) {
    return `${status}: ${message}`;
  }
  return status || message || undefined;
}

function resolveTaskLastRunAt(task: Record<string, unknown>): string | undefined {
  const direct =
    asString(task.LastExecutionTimeUtc) || asString(task.LastExecutionDate) || asString(task.LastRunTime) || "";
  if (direct) {
    return direct;
  }

  const executionResult = asRecord(task.LastExecutionResult);
  if (!executionResult) {
    return undefined;
  }
  return (
    asString(executionResult.StartTimeUtc) ||
    asString(executionResult.StartDate) ||
    asString(executionResult.Date) ||
    asString(executionResult.EndTimeUtc) ||
    asString(executionResult.EndDate) ||
    undefined
  );
}

async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init?.headers || {})
      },
      signal: controller.signal
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(parseErrorMessage(response.status, text));
    }
    if (!text.trim()) {
      return {};
    }
    return JSON.parse(text) as unknown;
  } finally {
    window.clearTimeout(timer);
  }
}

function parseErrorMessage(status: number, rawBody: string) {
  if (status === 401 || status === 403) {
    return "Emby authentication failed";
  }
  if (status === 404) {
    return "Emby API endpoint not found";
  }

  const payload = safeParse(rawBody);
  const bodyRecord = asRecord(payload);
  const detail =
    asString(bodyRecord?.Message) || asString(bodyRecord?.ErrorMessage) || asString(bodyRecord?.message) || undefined;
  return detail ? `Emby request failed (${status}): ${detail}` : `Emby request failed (${status})`;
}

function buildTypeBreakdown(raw: unknown): Array<{ key: string; count: number }> {
  const payload = asRecord(raw);
  if (!payload) {
    return [];
  }

  const items: Array<{ key: string; count: number }> = [];
  for (const key of MEDIA_COUNT_KEYS) {
    const count = asNumber(payload[key]);
    if (count > 0) {
      items.push({ key, count });
    }
  }
  if (items.length > 0) {
    return items;
  }

  for (const [key, value] of Object.entries(payload)) {
    if (key.endsWith("Count")) {
      const count = asNumber(value);
      if (count > 0) {
        items.push({ key, count });
      }
    }
  }

  return items;
}

function countMediaTotalFromCounts(raw: unknown) {
  const payload = asRecord(raw);
  if (!payload) {
    return 0;
  }
  let total = 0;
  for (const [key, value] of Object.entries(payload)) {
    if (key.endsWith("Count")) {
      total += asNumber(value);
    }
  }
  return total;
}

function buildEmbyUrl(baseUrl: string, path: string, apiKey: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const separator = normalizedPath.includes("?") ? "&" : "?";
  return `${baseUrl}${normalizedPath}${separator}api_key=${encodeURIComponent(apiKey)}`;
}

function resolveConnectionContext(card: CardDTO): { baseUrl: string; apiKey: string } {
  const baseUrl = firstNonBlank(card.url, card.lanUrl, card.wanUrl);
  if (!baseUrl) {
    throw new Error("Emby URL is required");
  }
  const apiKey = (card.embyApiKey || "").trim();
  if (!apiKey) {
    throw new Error("Emby API key is required");
  }
  return {
    baseUrl: stripTrailingSlash(baseUrl),
    apiKey
  };
}

function stripTrailingSlash(value: string) {
  let current = value.trim();
  while (current.endsWith("/")) {
    current = current.slice(0, -1);
  }
  return current;
}

function firstNonBlank(...values: Array<string | undefined>) {
  for (const value of values) {
    if (value && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function safeParse(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return undefined;
  }
}

function extractItemsArray(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    return payload.map((item) => asRecord(item)).filter((item): item is Record<string, unknown> => Boolean(item));
  }
  const record = asRecord(payload);
  const items = record?.Items;
  if (!Array.isArray(items)) {
    return [];
  }
  return items.map((item) => asRecord(item)).filter((item): item is Record<string, unknown> => Boolean(item));
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function asBoolean(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    return value.toLowerCase() === "true";
  }
  return false;
}

function taskModuleSortKey(module?: string) {
  if (!module || !module.trim()) {
    return "~";
  }
  return module.trim().toLowerCase();
}
