import { create } from "zustand";
import { fetchAdminConfig, fetchSystemConfig, updateAdminConfig } from "../services/api";
import type { AdminConfigDTO, SearchEngineDTO, SystemConfigDTO } from "../types";

type SystemStore = {
  config?: SystemConfigDTO;
  adminConfig?: AdminConfigDTO;
  selectedSearchEngineId?: string;
  load: () => Promise<void>;
  loadAdminConfig: () => Promise<void>;
  saveAdminConfig: (payload: AdminConfigDTO & { newAdminPassword?: string }) => Promise<void>;
  setSearchEngine: (id: string) => void;
  getSelectedEngine: () => SearchEngineDTO | undefined;
};

export const useSystemStore = create<SystemStore>((set, get) => ({
  config: undefined,
  adminConfig: undefined,
  selectedSearchEngineId: undefined,

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
