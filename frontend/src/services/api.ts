import axios from "axios";
import type {
  AdminConfigDTO,
  AdminConfigUpdatePayload,
  ApiResponse,
  AuthSessionDTO,
  CardDTO,
  CardOrderItemDTO,
  CardPayload,
  GroupDTO,
  GroupPayload,
  NavConfigImportPayload,
  SystemConfigDTO
} from "../types";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || "/api",
  withCredentials: true
});

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
  const { data } = await api.post<ApiResponse<AuthSessionDTO>>("/v1/auth/login", { password });
  return data.data;
}

export async function logout(): Promise<AuthSessionDTO> {
  const { data } = await api.post<ApiResponse<AuthSessionDTO>>("/v1/auth/logout");
  return data.data;
}

export async function fetchSession(): Promise<AuthSessionDTO> {
  const { data } = await api.get<ApiResponse<AuthSessionDTO>>("/v1/auth/session");
  return data.data;
}

export async function fetchSystemConfig(): Promise<SystemConfigDTO> {
  const { data } = await api.get<ApiResponse<SystemConfigDTO>>("/v1/system/config");
  return data.data;
}

export async function fetchAdminConfig(): Promise<AdminConfigDTO> {
  const { data } = await api.get<ApiResponse<AdminConfigDTO>>("/v1/system/admin-config");
  return data.data;
}

export async function updateAdminConfig(payload: AdminConfigUpdatePayload): Promise<AdminConfigDTO> {
  const { data } = await api.post<ApiResponse<AdminConfigDTO>>("/v1/system/admin-config", payload);
  return data.data;
}

export async function fetchGroups(): Promise<GroupDTO[]> {
  const { data } = await api.get<ApiResponse<GroupDTO[]>>("/v1/groups");
  return data.data;
}

export async function createGroup(payload: GroupPayload): Promise<GroupDTO> {
  const { data } = await api.post<ApiResponse<GroupDTO>>("/v1/groups", payload);
  return data.data;
}

export async function updateGroup(groupId: string, payload: GroupPayload): Promise<GroupDTO> {
  const { data } = await api.post<ApiResponse<GroupDTO>>(`/v1/groups/${groupId}/update`, payload);
  return data.data;
}

export async function deleteGroup(groupId: string): Promise<void> {
  await api.post(`/v1/groups/${groupId}/delete`);
}

export async function fetchCards(params?: {
  groupId?: string;
  q?: string;
  enabled?: boolean;
}): Promise<CardDTO[]> {
  const { data } = await api.get<ApiResponse<CardDTO[]>>("/v1/cards", { params });
  return data.data;
}

export async function createCard(payload: CardPayload): Promise<CardDTO> {
  const { data } = await api.post<ApiResponse<CardDTO>>("/v1/cards", payload);
  return data.data;
}

export async function updateCard(cardId: string, payload: CardPayload): Promise<CardDTO> {
  const { data } = await api.post<ApiResponse<CardDTO>>(`/v1/cards/${cardId}/update`, payload);
  return data.data;
}

export async function deleteCard(cardId: string): Promise<void> {
  await api.post(`/v1/cards/${cardId}/delete`);
}

export async function saveCardOrder(items: CardOrderItemDTO[]) {
  const { data } = await api.post<ApiResponse<{ updated: number }>>("/v1/cards/order", items);
  return data.data;
}

export async function reloadConfig(prune = false) {
  const { data } = await api.post<ApiResponse<Record<string, unknown>>>("/v1/config/reload", undefined, {
    params: { prune }
  });
  return data.data;
}

export async function importNavConfig(payload: NavConfigImportPayload) {
  const { data } = await api.post<ApiResponse<{ groups: number; cards: number; message: string }>>(
    "/v1/config/import-nav",
    payload
  );
  return data.data;
}
