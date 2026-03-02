export type ApiResponse<T> = {
  code: number;
  message: string;
  data: T;
};

export type GroupDTO = {
  id: string;
  name: string;
  orderIndex: number;
};

export type CardOpenMode = "iframe" | "newtab" | "auto";
export type CardType = string;
export type SshAuthMode = "password" | "privatekey";

export type CardDTO = {
  id: string;
  groupId: string;
  name: string;
  cardType: CardType;
  openMode: CardOpenMode;
  icon?: string;
  description?: string;
  orderIndex: number;
  enabled: boolean;
  healthCheckEnabled: boolean;
  url?: string;
  lanUrl?: string;
  wanUrl?: string;
  config: Record<string, unknown>;
  secretState: Record<string, boolean>;
};

export type CardPayload = {
  id?: string;
  groupId: string;
  name: string;
  cardType: CardType;
  openMode: CardOpenMode;
  icon?: string;
  description?: string;
  orderIndex: number;
  enabled: boolean;
  healthCheckEnabled: boolean;
  config: Record<string, unknown>;
  secrets?: Record<string, string>;
};

export type CardOrderItemDTO = {
  id: string;
  orderIndex: number;
};

export type CardTypeFieldOption = {
  label: string;
  value: string;
};

export type CardTypeFieldSchema = {
  key: string;
  label: string;
  type: "text" | "url" | "number" | "password" | "select";
  required: boolean;
  secret: boolean;
  placeholder?: string;
  defaultValue?: unknown;
  min?: number;
  max?: number;
  options?: CardTypeFieldOption[];
};

export type CardTypeSchema = {
  type: string;
  name: string;
  description?: string;
  healthCheckSupported: boolean;
  defaultOpenMode: CardOpenMode;
  fields: CardTypeFieldSchema[];
};

export type TorrentStatusBreakdown = {
  downloading: number;
  seeding: number;
  paused: number;
  queued: number;
  checking: number;
  stalled: number;
  error: number;
  unknown: number;
};

export type TorrentStatsDTO = {
  downloadSpeed: number;
  uploadSpeed: number;
  activeCount: number;
  totalCount: number;
  statusBreakdown: TorrentStatusBreakdown;
  updatedAt: number;
  source: "direct" | "proxy";
};

export type EmbyDataSource = "direct" | "proxy";

export type EmbyMediaBreakdownItemDTO = {
  key: string;
  count: number;
};

export type EmbyStatsDTO = {
  mediaTotal: number;
  mediaBreakdown?: EmbyMediaBreakdownItemDTO[];
  onlineSessions: number;
  playingSessions: number;
  updatedAt: number;
  source: EmbyDataSource;
};

export type EmbyTaskDTO = {
  id: string;
  name: string;
  description?: string;
  module?: string;
  state: string;
  isRunning: boolean;
  lastRunAt?: string;
  lastResult?: string;
};

export type EmbyTaskRunResultDTO = {
  taskId: string;
  taskName?: string;
  triggered: boolean;
  status: string;
  message?: string;
  updatedAt: number;
  source: EmbyDataSource;
};

export type HealthStatusDTO = {
  cardId: string;
  status: "up" | "down" | "unknown";
  latencyMs?: number;
  checkedAt?: number;
  message?: string;
};

export type SearchEngineDTO = {
  id: string;
  name: string;
  searchUrlTemplate: string;
  icon?: string;
};

export type SystemConfigDTO = {
  networkModePreference: "auto" | "lan" | "wan";
  resolvedNetworkMode: "lan" | "wan";
  defaultSearchEngineId: string;
  searchEngines: SearchEngineDTO[];
  securityEnabled: boolean;
  requireAuthForConfig: boolean;
  dailySentenceEnabled: boolean;
  backgroundType: "gradient" | "image";
  backgroundImageDataUrl?: string;
  healthProbeIntervalSeconds: number;
};

export type AuthSessionDTO = {
  authenticated: boolean;
  securityEnabled: boolean;
  sessionTimeoutMinutes: number;
};

export type GroupPayload = {
  id?: string;
  name: string;
  orderIndex: number;
};

export type AdminConfigDTO = {
  networkModePreference: "auto" | "lan" | "wan";
  defaultSearchEngineId: string;
  dailySentenceEnabled: boolean;
  backgroundType: "gradient" | "image";
  backgroundImageDataUrl?: string;
  searchEngines: SearchEngineDTO[];
  security: {
    enabled: boolean;
    sessionTimeoutMinutes: number;
    requireAuthForConfig: boolean;
  };
};

export type AdminConfigUpdatePayload = AdminConfigDTO & {
  newAdminPassword?: string;
};

export type NavConfigImportPayload = {
  groups: GroupDTO[];
  cards: Array<{
    id: string;
    groupId: string;
    name: string;
    cardType: string;
    openMode: CardOpenMode;
    icon?: string;
    description?: string;
    orderIndex: number;
    enabled: boolean;
    healthCheckEnabled: boolean;
    config: Record<string, unknown>;
    secretRefs?: Record<string, string>;
  }>;
};

export type VerifyConfigResponse = {
  verifyToken: string;
  expiresInSeconds: number;
};
