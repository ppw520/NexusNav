import { create } from "zustand";
import { fetchSession, login, logout } from "../services/api";

type AuthStore = {
  ready: boolean;
  authenticated: boolean;
  securityEnabled: boolean;
  loading: boolean;
  checkSession: () => Promise<void>;
  doLogin: (password: string) => Promise<void>;
  doLogout: () => Promise<void>;
  markLoggedOut: () => void;
};

export const useAuthStore = create<AuthStore>((set, get) => ({
  ready: false,
  authenticated: false,
  securityEnabled: true,
  loading: false,

  checkSession: async () => {
    set({ loading: true });
    try {
      const session = await fetchSession();
      set({
        authenticated: session.authenticated,
        securityEnabled: session.securityEnabled,
        ready: true,
        loading: false
      });
    } catch {
      set({ authenticated: false, securityEnabled: true, ready: true, loading: false });
    }
  },

  doLogin: async (password: string) => {
    set({ loading: true });
    try {
      const result = await login(password);
      set({
        authenticated: result.authenticated,
        securityEnabled: result.securityEnabled,
        ready: true,
        loading: false
      });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  doLogout: async () => {
    set({ loading: true });
    try {
      const response = await logout();
      const previous = get();
      set({
        authenticated: response.authenticated,
        securityEnabled:
          typeof response.securityEnabled === "boolean"
            ? response.securityEnabled
            : previous.securityEnabled,
        ready: true,
        loading: false
      });
    } catch {
      set({ authenticated: false, loading: false, ready: true });
    }
  },

  markLoggedOut: () => set({ authenticated: false, ready: true, loading: false })
}));
