import { create } from "zustand";
import { fetchAdminConfig, fetchSystemConfig, updateAdminConfig } from "../services/api";
import type { AdminConfigDTO, SearchEngineDTO, SystemConfigDTO } from "../types";

export type RuntimeNetworkMode = "auto" | "lan" | "wan";

type SystemStore = {
  config?: SystemConfigDTO;
  adminConfig?: AdminConfigDTO;
  selectedSearchEngineId?: string;
  runtimeNetworkMode: RuntimeNetworkMode;
  load: () => Promise<void>;
  loadAdminConfig: () => Promise<void>;
  saveAdminConfig: (payload: AdminConfigDTO & { newAdminPassword?: string }) => Promise<void>;
  setSearchEngine: (id: string) => void;
  setRuntimeNetworkMode: (mode: RuntimeNetworkMode) => void;
  cycleRuntimeNetworkMode: () => void;
  getSelectedEngine: () => SearchEngineDTO | undefined;
};

export const useSystemStore = create<SystemStore>((set, get) => ({
  config: undefined,
  adminConfig: undefined,
  selectedSearchEngineId: undefined,
  runtimeNetworkMode: (() => {
    const saved = window.localStorage.getItem("nexusnav.runtime.mode");
    return saved === "lan" || saved === "wan" || saved === "auto" ? saved : "auto";
  })(),

  load: async () => {
    const config = await fetchSystemConfig();
    const saved = window.localStorage.getItem("nexusnav.search.engine");
    const selected =
      config.searchEngines.find((item) => item.id === saved)?.id || config.defaultSearchEngineId;
    set({ config, selectedSearchEngineId: selected });
  },

  loadAdminConfig: async () => {
    const adminConfig = await fetchAdminConfig();
    set({ adminConfig });
  },

  saveAdminConfig: async (payload) => {
    const adminConfig = await updateAdminConfig(payload);
    set({ adminConfig });
    try {
      await get().load();
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 401) {
        return;
      }
      throw error;
    }
  },

  setSearchEngine: (id) => {
    window.localStorage.setItem("nexusnav.search.engine", id);
    set({ selectedSearchEngineId: id });
  },

  setRuntimeNetworkMode: (mode) => {
    window.localStorage.setItem("nexusnav.runtime.mode", mode);
    set({ runtimeNetworkMode: mode });
  },

  cycleRuntimeNetworkMode: () => {
    const current = get().runtimeNetworkMode;
    const next: RuntimeNetworkMode =
      current === "auto" ? "lan" : current === "lan" ? "wan" : "auto";
    window.localStorage.setItem("nexusnav.runtime.mode", next);
    set({ runtimeNetworkMode: next });
  },

  getSelectedEngine: () => {
    const { config, selectedSearchEngineId } = get();
    if (!config) {
      return undefined;
    }
    return (
      config.searchEngines.find((item) => item.id === selectedSearchEngineId) ||
      config.searchEngines.find((item) => item.id === config.defaultSearchEngineId) ||
      config.searchEngines[0]
    );
  }
}));
