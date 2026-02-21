import { create } from "zustand";
import log from "@renderer/utils/logger";

export type ProviderType =
  | "codex"
  | "antigravity"
  | "claude"
  | "gemini"
  | "kiro"
  | "copilot"
  | "qwen"
  | "iflow"
  | "custom";

export interface QuotaWindow {
  label: string;
  usedPercent: number;
  resetIn: string;
  limitReached: boolean;
}

export interface QuotaAccount {
  id: string;
  provider: ProviderType;
  email: string;
  badge?: string;
  status: "active" | "limited" | "error" | "refreshing";
  rateLimits: {
    primary: QuotaWindow;
    secondary?: QuotaWindow;
    codeReview?: QuotaWindow;
    additional?: QuotaWindow[];
  };
  lastUpdated: Date;
  error?: string;
}

export interface ProviderInfo {
  id: ProviderType;
  name: string;
  icon: string;
  accountCount: number;
  color: "teal" | "magenta" | "indigo";
}

interface QuotaState {
  providers: ProviderInfo[];
  selectedProvider: ProviderType | null;
  accounts: QuotaAccount[];
  cachedAccounts: Partial<Record<ProviderType, QuotaAccount[]>>;
  loadingProviders: Partial<Record<ProviderType, boolean>>;
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  lastUpdated: Date | null;

  loadProviders: () => Promise<void>;
  selectProvider: (provider: ProviderType) => Promise<void>;
  refreshAccount: (accountId: string) => Promise<void>;
  refreshQuotas: () => Promise<void>;
}

export const useQuotaStore = create<QuotaState>((set, get) => ({
  providers: [],
  selectedProvider: null,
  accounts: [],
  cachedAccounts: {},
  loadingProviders: {},
  isLoading: false,
  isStreaming: false,
  error: null,
  lastUpdated: null,

  loadProviders: async () => {
    try {
      const result = await window.electronAPI?.quota.getProviders();
      if (result?.success) {
        const providers = result.providers as ProviderInfo[];
        set({ providers });

        if (providers.length > 0 && !get().selectedProvider) {
          const firstWithAccounts = providers.find((p) => p.accountCount > 0);
          if (firstWithAccounts) {
            await get().selectProvider(firstWithAccounts.id);
          }
        }
      } else {
        set({
          providers: [],
          error:
            result?.error ||
            "Failed to load providers from management auth-files",
        });
      }
    } catch (error) {
      log.error("[QuotaStore] Failed to load providers:", error);
      set({ error: String(error) });
    }
  },

  selectProvider: async (provider: ProviderType) => {
    const cachedAccounts = get().cachedAccounts[provider];
    const hasCached = cachedAccounts && cachedAccounts.length > 0;

    set({
      selectedProvider: provider,
      accounts: cachedAccounts ?? [],
      isLoading: !hasCached,
      isStreaming: false,
      error: null,
    });

    if (hasCached) {
      return;
    }

    set({
      loadingProviders: { ...get().loadingProviders, [provider]: true },
    });

    const unsubscribe = window.electronAPI?.quota.onStreamBatch((data) => {
      if (data.provider !== provider) return;

      const incoming = (data.accounts as QuotaAccount[]).map((acc) => ({
        ...acc,
        lastUpdated: new Date(acc.lastUpdated),
      }));

      if (incoming.length > 0) {
        set((state) => {
          const existing = state.cachedAccounts[provider] ?? [];
          const merged = [...existing, ...incoming];

          if (state.selectedProvider !== provider) {
            return {
              cachedAccounts: {
                ...state.cachedAccounts,
                [provider]: merged,
              },
            };
          }

          return {
            accounts: merged,
            isStreaming: true,
            cachedAccounts: {
              ...state.cachedAccounts,
              [provider]: merged,
            },
          };
        });
      }

      if (data.done) {
        unsubscribe?.();
        const finalAccounts =
          get().selectedProvider === provider
            ? get().accounts
            : (get().cachedAccounts[provider] ?? []);

        set((state) => ({
          isLoading: false,
          isStreaming: false,
          lastUpdated: new Date(),
          loadingProviders: { ...state.loadingProviders, [provider]: false },
          cachedAccounts: {
            ...state.cachedAccounts,
            [provider]:
              state.selectedProvider === provider
                ? state.accounts
                : (state.cachedAccounts[provider] ?? []),
          },
          providers: state.providers.map((p) =>
            p.id === provider
              ? { ...p, accountCount: finalAccounts.length }
              : p,
          ),
        }));

        if (data.error) {
          set({ error: data.error });
        }
        return;
      }
    });

    window.electronAPI?.quota.streamByProvider(provider);
  },

  refreshAccount: async (accountId: string) => {
    const accounts = get().accounts.map((acc) =>
      acc.id === accountId ? { ...acc, status: "refreshing" as const } : acc,
    );
    set({ accounts });

    try {
      const result = await window.electronAPI?.quota.refresh(accountId);
      if (result?.success && result.account) {
        const updatedAccount = {
          ...result.account,
          lastUpdated: new Date(result.account.lastUpdated),
        } as QuotaAccount;
        const provider = updatedAccount.provider;
        const cachedAccounts = get().cachedAccounts[provider] || [];
        const updatedCache = cachedAccounts.map((acc) =>
          acc.id === accountId ? updatedAccount : acc,
        );
        set({
          accounts: get().accounts.map((acc) =>
            acc.id === accountId ? updatedAccount : acc,
          ),
          cachedAccounts: {
            ...get().cachedAccounts,
            [provider]: updatedCache,
          },
        });
      }
    } catch (error) {
      log.error("[QuotaStore] Failed to refresh account:", error);
      set({
        accounts: get().accounts.map((acc) =>
          acc.id === accountId ? { ...acc, status: "error" as const } : acc,
        ),
      });
    }
  },

  refreshQuotas: async () => {
    const { selectedProvider, cachedAccounts } = get();

    if (selectedProvider) {
      set({
        cachedAccounts: {
          ...cachedAccounts,
          [selectedProvider]: [],
        },
        isLoading: true,
      });
      await get().selectProvider(selectedProvider);
    }
    await get().loadProviders();
  },
}));

export function useQuotaStats() {
  const accounts = useQuotaStore((state) => state.accounts);

  const totalUsed = accounts.reduce(
    (sum, acc) => sum + (acc.rateLimits.primary?.usedPercent || 0),
    0,
  );
  const accountsAtLimit = accounts.filter(
    (acc) => acc.status === "limited" || acc.rateLimits.primary?.limitReached,
  ).length;

  return {
    totalUsed,
    totalLimit: accounts.length * 100,
    accountsAtLimit,
    nextReset: accounts[0]
      ? {
          provider: accounts[0].provider,
          time: accounts[0].rateLimits.primary?.resetIn || "-",
        }
      : null,
  };
}
