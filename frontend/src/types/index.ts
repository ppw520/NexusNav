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
export type CardType = "generic" | "ssh" | "emby";
export type SshAuthMode = "password" | "privatekey";

export type CardDTO = {
  id: string;
  groupId: string;
  name: string;
  url: string;
  lanUrl?: string;
  wanUrl?: string;
  openMode: CardOpenMode;
  cardType: CardType;
  sshHost?: string;
  sshPort?: number;
  sshUsername?: string;
  sshAuthMode?: SshAuthMode;
  embyApiKey?: string;
  icon?: string;
  description?: string;
  orderIndex: number;
  enabled: boolean;
  healthCheckEnabled: boolean;
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

export type CardPayload = {
  id?: string;
  groupId: string;
  name: string;
  url?: string;
  lanUrl?: string;
  wanUrl?: string;
  openMode: CardOpenMode;
  cardType: CardType;
  sshHost?: string;
  sshPort?: number;
  sshUsername?: string;
  sshAuthMode?: SshAuthMode;
  embyApiKey?: string;
  icon?: string;
  description?: string;
  orderIndex: number;
  enabled: boolean;
  healthCheckEnabled: boolean;
};

export type CardOrderItemDTO = {
  id: string;
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
  cards: CardDTO[];
};

export type VerifyConfigResponse = {
  verifyToken: string;
  expiresInSeconds: number;
};
