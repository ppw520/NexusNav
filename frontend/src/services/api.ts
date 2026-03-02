import axios from "axios";
import type {
  AdminConfigDTO,
  AdminConfigUpdatePayload,
  ApiResponse,
  AuthSessionDTO,
  CardDTO,
  CardOrderItemDTO,
  CardPayload,
  CardTypeSchema,
  EmbyStatsDTO,
  EmbyTaskDTO,
  EmbyTaskRunResultDTO,
  GroupDTO,
  GroupPayload,
  NavConfigImportPayload,
  SystemConfigDTO,
  TorrentStatsDTO,
  VerifyConfigResponse
} from "../types";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || "/api",
  withCredentials: true
});

const VERIFY_TOKEN_HEADER = "X-NexusNav-Verify-Token";

let unauthorizedHandler: (() => void) | undefined;

export function setUnauthorizedHandler(handler: (() => void) | undefined) {
  unauthorizedHandler = handler;
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401 && unauthorizedHandler) {
      unauthorizedHandler();
    }
    return Promise.reject(error);
  }
);

export async function login(password: string): Promise<AuthSessionDTO> {
  const { data } = await api.post<ApiResponse<AuthSessionDTO>>("/v2/auth/login", { password });
  return data.data;
}

export async function logout(): Promise<AuthSessionDTO> {
  const { data } = await api.post<ApiResponse<AuthSessionDTO>>("/v2/auth/logout");
  return data.data;
}

export async function fetchSession(): Promise<AuthSessionDTO> {
  const { data } = await api.get<ApiResponse<AuthSessionDTO>>("/v2/auth/session");
  return data.data;
}

export async function verifyConfig(password: string): Promise<VerifyConfigResponse> {
  const { data } = await api.post<ApiResponse<VerifyConfigResponse>>("/v2/auth/verify-config", { password });
  return data.data;
}

export async function fetchSystemConfig(): Promise<SystemConfigDTO> {
  const { data } = await api.get<ApiResponse<SystemConfigDTO>>("/v2/system/config");
  return data.data;
}

export async function fetchAdminConfig(): Promise<AdminConfigDTO> {
  const { data } = await api.get<ApiResponse<AdminConfigDTO>>("/v2/system/admin-config");
  return data.data;
}

export async function updateAdminConfig(
  payload: AdminConfigUpdatePayload,
  verifyToken?: string
): Promise<AdminConfigDTO> {
  const { data } = await api.put<ApiResponse<AdminConfigDTO>>("/v2/system/admin-config", payload, {
    headers: buildVerifyHeaders(verifyToken)
  });
  return data.data;
}

export async function fetchGroups(): Promise<GroupDTO[]> {
  const { data } = await api.get<ApiResponse<GroupDTO[]>>("/v2/groups");
  return data.data;
}

export async function createGroup(payload: GroupPayload): Promise<GroupDTO> {
  const { data } = await api.post<ApiResponse<GroupDTO>>("/v2/groups", payload);
  return data.data;
}

export async function updateGroup(groupId: string, payload: GroupPayload): Promise<GroupDTO> {
  const { data } = await api.put<ApiResponse<GroupDTO>>(`/v2/groups/${groupId}`, payload);
  return data.data;
}

export async function deleteGroup(groupId: string): Promise<void> {
  await api.delete(`/v2/groups/${groupId}`);
}

export async function fetchCards(params?: {
  groupId?: string;
  q?: string;
  enabled?: boolean;
}): Promise<CardDTO[]> {
  const { data } = await api.get<ApiResponse<CardDTO[]>>("/v2/cards", { params });
  return data.data;
}

export async function fetchCardTypes(): Promise<CardTypeSchema[]> {
  const { data } = await api.get<ApiResponse<CardTypeSchema[]>>("/v2/cards/types");
  return data.data;
}

export async function createCard(payload: CardPayload): Promise<CardDTO> {
  const { data } = await api.post<ApiResponse<CardDTO>>("/v2/cards", payload);
  return data.data;
}

export async function updateCard(cardId: string, payload: CardPayload): Promise<CardDTO> {
  const { data } = await api.put<ApiResponse<CardDTO>>(`/v2/cards/${cardId}`, payload);
  return data.data;
}

export async function deleteCard(cardId: string): Promise<void> {
  await api.delete(`/v2/cards/${cardId}`);
}

export async function saveCardOrder(items: CardOrderItemDTO[]) {
  const { data } = await api.put<ApiResponse<{ updated: number }>>("/v2/cards/order", items);
  return data.data;
}

export async function reloadConfig(prune = false, verifyToken?: string) {
  const { data } = await api.post<ApiResponse<Record<string, unknown>>>("/v2/config/reload", undefined, {
    params: { prune },
    headers: buildVerifyHeaders(verifyToken)
  });
  return data.data;
}

export async function importNavConfig(payload: NavConfigImportPayload, verifyToken?: string) {
  const { data } = await api.post<ApiResponse<{ groups: number; cards: number; message: string }>>(
    "/v2/config/import-nav",
    payload,
    { headers: buildVerifyHeaders(verifyToken) }
  );
  return data.data;
}

export async function fetchEmbyStatsViaProxy(cardId: string): Promise<EmbyStatsDTO> {
  const { data } = await api.get<ApiResponse<EmbyStatsDTO>>(`/v2/emby/cards/${encodeURIComponent(cardId)}/stats`);
  return data.data;
}

export async function fetchEmbyTasksViaProxy(cardId: string): Promise<EmbyTaskDTO[]> {
  const { data } = await api.get<ApiResponse<EmbyTaskDTO[]>>(`/v2/emby/cards/${encodeURIComponent(cardId)}/tasks`);
  return data.data;
}

export async function runEmbyTaskViaProxy(cardId: string, taskId: string): Promise<EmbyTaskRunResultDTO> {
  const { data } = await api.post<ApiResponse<EmbyTaskRunResultDTO>>(
    `/v2/emby/cards/${encodeURIComponent(cardId)}/tasks/${encodeURIComponent(taskId)}/run`
  );
  return data.data;
}

export async function fetchQbittorrentStatsViaProxy(cardId: string): Promise<TorrentStatsDTO> {
  const { data } = await api.get<ApiResponse<TorrentStatsDTO>>(
    `/v2/qbittorrent/cards/${encodeURIComponent(cardId)}/stats`
  );
  return data.data;
}

export async function fetchTransmissionStatsViaProxy(cardId: string): Promise<TorrentStatsDTO> {
  const { data } = await api.get<ApiResponse<TorrentStatsDTO>>(
    `/v2/transmission/cards/${encodeURIComponent(cardId)}/stats`
  );
  return data.data;
}

function buildVerifyHeaders(verifyToken?: string): Record<string, string> | undefined {
  if (!verifyToken || !verifyToken.trim()) {
    return undefined;
  }
  return { [VERIFY_TOKEN_HEADER]: verifyToken.trim() };
}
