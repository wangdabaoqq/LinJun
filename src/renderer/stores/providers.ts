import { create } from "zustand";
import log from "@renderer/utils/logger";
export interface TokenAccount {
  id: string;
  provider: string;
  email: string;
  status: "online" | "offline";
  enabled: boolean;
  lastUsed: string;
  filePath: string;
}

interface ProvidersState {
  accounts: TokenAccount[];
  isLoading: boolean;
  error: string | null;
  hasLoadedOnce: boolean;
  loadAccounts: (options?: { force?: boolean }) => Promise<void>;
  removeAccountLocal: (providerId: string, accountId: string) => void;
}

export const useProvidersStore = create<ProvidersState>((set, get) => ({
  accounts: [],
  isLoading: true,
  error: null,
  hasLoadedOnce: false,

  loadAccounts: async (options) => {
    if (!window.electronAPI?.providers) return;
    if (get().hasLoadedOnce && !options?.force) return;

    set({ isLoading: true, error: null });

    try {
      const result = await window.electronAPI.providers.getAccounts();
      if (result?.success) {
        set({
          accounts: result.accounts as TokenAccount[],
          hasLoadedOnce: true,
        });
      }
    } catch (error) {
      log.error("[ProvidersStore] Failed to load accounts:", error);
      set({ error: String(error) });
    } finally {
      set({ isLoading: false });
    }
  },
  removeAccountLocal: (providerId, accountId) => {
    set((state) => ({
      accounts: state.accounts.filter(
        (acc) => !(acc.provider === providerId && acc.id === accountId),
      ),
    }));
  },
}));
