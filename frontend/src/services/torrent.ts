import type { CardDTO, TorrentStatsDTO, TorrentStatusBreakdown } from "../types";
import { fetchQbittorrentStatsViaProxy, fetchTransmissionStatsViaProxy } from "./api";

const REQUEST_TIMEOUT_MS = 8000;
const TRANSMISSION_RPC_ENDPOINTS = ["/transmission/rpc", "/rpc"] as const;

type QbConnectionContext = {
  baseUrl: string;
  username: string;
  password: string;
};

type TransmissionConnectionContext = {
  baseUrl: string;
  username: string;
  password: string;
};

export async function loadQbittorrentStats(card: CardDTO): Promise<TorrentStatsDTO> {
  try {
    return await fetchQbittorrentStatsDirect(card);
  } catch {
    const fallback = await fetchQbittorrentStatsViaProxy(card.id);
    return { ...fallback, source: "proxy" };
  }
}

export async function loadTransmissionStats(card: CardDTO): Promise<TorrentStatsDTO> {
  try {
    return await fetchTransmissionStatsDirect(card);
  } catch {
    const fallback = await fetchTransmissionStatsViaProxy(card.id);
    return { ...fallback, source: "proxy" };
  }
}

async function fetchQbittorrentStatsDirect(card: CardDTO): Promise<TorrentStatsDTO> {
  const context = resolveQbConnectionContext(card);
  await qbLogin(context);

  const [transferInfo, allTorrentsPayload, activeTorrentsPayload] = await Promise.all([
    fetchQbJson(buildUrl(context.baseUrl, "/api/v2/transfer/info")),
    fetchQbJson(buildUrl(context.baseUrl, "/api/v2/torrents/info?filter=all")),
    fetchQbJson(buildUrl(context.baseUrl, "/api/v2/torrents/info?filter=active"))
  ]);

  const transfer = asRecord(transferInfo) || {};
  const allTorrents = Array.isArray(allTorrentsPayload) ? allTorrentsPayload : [];
  const activeTorrents = Array.isArray(activeTorrentsPayload) ? activeTorrentsPayload : [];
  const statusBreakdown = buildQbStatusBreakdown(allTorrents);

  return {
    downloadSpeed: asNumber(transfer.dl_info_speed) || asNumber(transfer.dl_speed) || asNumber(transfer.dlspeed),
    uploadSpeed: asNumber(transfer.up_info_speed) || asNumber(transfer.up_speed) || asNumber(transfer.upspeed),
    activeCount:
      activeTorrents.length ||
      statusBreakdown.downloading + statusBreakdown.seeding + statusBreakdown.checking + statusBreakdown.queued,
    totalCount: allTorrents.length,
    statusBreakdown,
    updatedAt: Date.now(),
    source: "direct"
  };
}

async function qbLogin(context: QbConnectionContext): Promise<void> {
  const body = new URLSearchParams({
    username: context.username,
    password: context.password
  });
  const payload = await fetchText(buildUrl(context.baseUrl, "/api/v2/auth/login"), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: body.toString(),
    credentials: "include"
  });
  const normalized = payload.trim().toLowerCase();
  if (normalized !== "ok." && normalized !== "ok") {
    throw new Error("qBittorrent authentication failed");
  }
}

function buildQbStatusBreakdown(torrents: unknown[]): TorrentStatusBreakdown {
  let downloading = 0;
  let seeding = 0;
  let paused = 0;
  let queued = 0;
  let checking = 0;
  let stalled = 0;
  let error = 0;
  let unknown = 0;

  for (const torrent of torrents) {
    const item = asRecord(torrent);
    const state = asString(item?.state).toLowerCase();
    if (state === "error" || state === "missingfiles") {
      error += 1;
      continue;
    }
    switch (state) {
      case "downloading":
      case "forceddl":
      case "metadl":
        downloading += 1;
        break;
      case "uploading":
      case "forcedup":
        seeding += 1;
        break;
      case "pauseddl":
      case "pausedup":
        paused += 1;
        break;
      case "queueddl":
      case "queuedup":
        queued += 1;
        break;
      case "checkingup":
      case "checkingdl":
      case "checkingresumedata":
        checking += 1;
        break;
      case "stalleddl":
      case "stalledup":
        stalled += 1;
        break;
      default:
        unknown += 1;
        break;
    }
  }

  return { downloading, seeding, paused, queued, checking, stalled, error, unknown };
}

async function fetchTransmissionStatsDirect(card: CardDTO): Promise<TorrentStatsDTO> {
  const context = resolveTransmissionConnectionContext(card);
  let lastError: Error | null = null;

  for (const endpoint of TRANSMISSION_RPC_ENDPOINTS) {
    try {
      let sessionId: string | undefined;
      const statsResponse = await callTransmissionRpc(context, endpoint, {
        method: "session-stats"
      }, sessionId);
      sessionId = statsResponse.sessionId;
      const statsArgs = asRecord(statsResponse.payload.arguments) || {};

      const torrentResponse = await callTransmissionRpc(context, endpoint, {
        method: "torrent-get",
        arguments: {
          fields: ["status", "error"]
        }
      }, sessionId);
      const torrents = Array.isArray(asRecord(torrentResponse.payload.arguments)?.torrents)
        ? ((asRecord(torrentResponse.payload.arguments)?.torrents as unknown[]) || [])
        : [];
      const statusBreakdown = buildTransmissionStatusBreakdown(torrents);

      const totalCount = asNumber(statsArgs.torrentCount) || torrents.length;
      const activeCount =
        asNumber(statsArgs.activeTorrentCount) ||
        statusBreakdown.downloading + statusBreakdown.seeding + statusBreakdown.checking + statusBreakdown.queued;

      return {
        downloadSpeed: asNumber(statsArgs.downloadSpeed),
        uploadSpeed: asNumber(statsArgs.uploadSpeed),
        activeCount,
        totalCount,
        statusBreakdown,
        updatedAt: Date.now(),
        source: "direct"
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Transmission request failed");
    }
  }

  throw lastError || new Error("Transmission request failed");
}

function buildTransmissionStatusBreakdown(torrents: unknown[]): TorrentStatusBreakdown {
  let downloading = 0;
  let seeding = 0;
  let paused = 0;
  let queued = 0;
  let checking = 0;
  const stalled = 0;
  let error = 0;
  let unknown = 0;

  for (const torrent of torrents) {
    const item = asRecord(torrent);
    if (!item) {
      unknown += 1;
      continue;
    }
    if (asNumber(item.error) > 0) {
      error += 1;
      continue;
    }

    switch (asNumber(item.status)) {
      case 0:
        paused += 1;
        break;
      case 1:
      case 2:
        checking += 1;
        break;
      case 3:
      case 5:
        queued += 1;
        break;
      case 4:
        downloading += 1;
        break;
      case 6:
        seeding += 1;
        break;
      default:
        unknown += 1;
        break;
    }
  }

  return { downloading, seeding, paused, queued, checking, stalled, error, unknown };
}

async function callTransmissionRpc(
  context: TransmissionConnectionContext,
  endpoint: string,
  payload: Record<string, unknown>,
  sessionId?: string
): Promise<{ payload: Record<string, unknown>; sessionId?: string }> {
  const baseHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Basic ${btoa(`${context.username}:${context.password}`)}`
  };

  const firstResponse = await fetchWithTimeout(buildUrl(context.baseUrl, endpoint), {
    method: "POST",
    headers: {
      ...baseHeaders,
      ...(sessionId ? { "X-Transmission-Session-Id": sessionId } : {})
    },
    body: JSON.stringify(payload)
  });

  if (firstResponse.status === 409) {
    const nextSessionId = firstResponse.headers.get("X-Transmission-Session-Id");
    if (!nextSessionId) {
      throw new Error("Transmission session id challenge failed");
    }
    const retryResponse = await fetchWithTimeout(buildUrl(context.baseUrl, endpoint), {
      method: "POST",
      headers: {
        ...baseHeaders,
        "X-Transmission-Session-Id": nextSessionId
      },
      body: JSON.stringify(payload)
    });
    return {
      payload: await parseTransmissionPayload(retryResponse),
      sessionId: nextSessionId
    };
  }

  return {
    payload: await parseTransmissionPayload(firstResponse),
    sessionId
  };
}

async function parseTransmissionPayload(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  if (!response.ok) {
    throw new Error(parseTransmissionError(response.status, text));
  }
  if (!text.trim()) {
    return {};
  }
  const payload = safeParse(text);
  const record = asRecord(payload);
  const result = asString(record?.result);
  if (result && result.toLowerCase() !== "success") {
    throw new Error(`Transmission RPC failed: ${result}`);
  }
  if (!record) {
    throw new Error("Transmission response is not valid JSON");
  }
  return record;
}

function parseTransmissionError(status: number, rawBody: string) {
  if (status === 401 || status === 403) {
    return "Transmission authentication failed";
  }
  if (status === 404) {
    return "Transmission RPC endpoint not found";
  }
  const text = rawBody.trim();
  return text ? `Transmission request failed (${status}): ${text}` : `Transmission request failed (${status})`;
}

async function fetchQbJson(url: string): Promise<unknown> {
  const response = await fetchWithTimeout(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    credentials: "include"
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(parseQbError(response.status, text));
  }
  if (!text.trim()) {
    return {};
  }
  return JSON.parse(text) as unknown;
}

function parseQbError(status: number, rawBody: string) {
  if (status === 401 || status === 403) {
    return "qBittorrent authentication failed";
  }
  if (status === 404) {
    return "qBittorrent API endpoint not found";
  }
  const text = rawBody.trim();
  return text ? `qBittorrent request failed (${status}): ${text}` : `qBittorrent request failed (${status})`;
}

async function fetchText(url: string, init?: RequestInit): Promise<string> {
  const response = await fetchWithTimeout(url, init);
  const text = await response.text();
  if (!response.ok) {
    throw new Error(parseQbError(response.status, text));
  }
  return text;
}

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal
    });
  } finally {
    window.clearTimeout(timer);
  }
}

function resolveQbConnectionContext(card: CardDTO): QbConnectionContext {
  const baseUrl = firstNonBlank(card.url, card.lanUrl, card.wanUrl);
  if (!baseUrl) {
    throw new Error("qBittorrent URL is required");
  }
  const username = asString(card.qbittorrentUsername);
  if (!username) {
    throw new Error("qBittorrent username is required");
  }
  const password = asString(card.qbittorrentPassword);
  if (!password) {
    throw new Error("qBittorrent password is required");
  }
  return {
    baseUrl: stripTrailingSlash(baseUrl),
    username,
    password
  };
}

function resolveTransmissionConnectionContext(card: CardDTO): TransmissionConnectionContext {
  const baseUrl = firstNonBlank(card.url, card.lanUrl, card.wanUrl);
  if (!baseUrl) {
    throw new Error("Transmission URL is required");
  }
  const username = asString(card.transmissionUsername);
  if (!username) {
    throw new Error("Transmission username is required");
  }
  const password = asString(card.transmissionPassword);
  if (!password) {
    throw new Error("Transmission password is required");
  }
  return {
    baseUrl: stripTrailingSlash(baseUrl),
    username,
    password
  };
}

function buildUrl(baseUrl: string, path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
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
