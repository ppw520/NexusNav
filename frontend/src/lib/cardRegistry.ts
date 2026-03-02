import type { CardDTO, TorrentStatsDTO } from "../types";

export type CardOpenKind = "iframe" | "ssh" | "emby" | "qbittorrent" | "transmission";

type RendererContext = {
  embyMediaTotal?: number;
  torrentStats?: TorrentStatsDTO;
};

type CardRenderer = {
  openKind: CardOpenKind;
  tag?: string;
  getDetail: (card: CardDTO, context: RendererContext) => string;
};

const registry: Record<string, CardRenderer> = {
  generic: {
    openKind: "iframe",
    getDetail: (card) => card.url || "-"
  },
  ssh: {
    openKind: "ssh",
    tag: "SSH",
    getDetail: (card) => {
      const host = asText(card.config.host);
      const port = asText(card.config.port) || "22";
      const username = asText(card.config.username);
      return host ? `${username ? `${username}@` : ""}${host}:${port}` : "SSH 连接";
    }
  },
  emby: {
    openKind: "emby",
    tag: "Emby",
    getDetail: (_card, context) => `媒体总数: ${context.embyMediaTotal ?? "--"}`
  },
  qbittorrent: {
    openKind: "qbittorrent",
    tag: "QBT",
    getDetail: (_card, context) =>
      `↓ ${formatSpeed(context.torrentStats?.downloadSpeed)} / ↑ ${formatSpeed(context.torrentStats?.uploadSpeed)}`
  },
  transmission: {
    openKind: "transmission",
    tag: "TR",
    getDetail: (_card, context) =>
      `↓ ${formatSpeed(context.torrentStats?.downloadSpeed)} / ↑ ${formatSpeed(context.torrentStats?.uploadSpeed)}`
  }
};

export function resolveCardRenderer(cardType: string): CardRenderer {
  return registry[cardType] || registry.generic;
}

function asText(value: unknown) {
  if (value == null) {
    return "";
  }
  return String(value).trim();
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
