import { useCallback, useEffect, useMemo, useState } from "react";
import log from "@renderer/utils/logger";

import { useTranslations } from "../../../stores/settings";
import { TokenAccount, useProvidersStore } from "../../../stores/providers";
import { allProviders } from "../providerDefinitions";
import { Account, Provider } from "../types";

interface UseProviderAccountsOptions {
  customProvidersCount: number;
}

interface UseProviderAccountsResult {
  isLoading: boolean;
  removeConfirmAccount: { providerId: string; accountId: string } | null;
  pendingAccountToggles: Record<string, boolean>;
  isRemovingAccount: boolean;
  accountsByProvider: Map<string, Account[]>;
  loadedProviders: Provider[];
  providersWithAccounts: Provider[];
  stats: {
    totalProviders: number;
    totalAccounts: number;
    activeAccounts: number;
    customCount: number;
  };
  // batch select
  selectModeProviderId: string | null;
  selectedAccountIds: Set<string>;
  isBatchRemoving: boolean;
  batchRemoveConfirm: boolean;
  refreshAccounts: () => Promise<void>;
  setRemoveConfirmAccount: (
    value: { providerId: string; accountId: string } | null,
  ) => void;
  handleRemoveAccount: (providerId: string, accountId: string) => void;
  performRemoveAccount: (
    providerId: string,
    accountId: string,
  ) => Promise<void>;
  handleToggleAccountEnabled: (
    providerId: string,
    accountId: string,
    enabled: boolean,
  ) => Promise<void>;
  handleDownloadAccountJson: (
    providerId: string,
    accountId: string,
  ) => Promise<void>;
  getAccountDisplay: (account: Account) => { main: string; sub: string };
  // batch actions
  enterSelectMode: (providerId: string) => void;
  exitSelectMode: () => void;
  toggleSelectAccount: (accountId: string) => void;
  toggleSelectAll: (allIds: string[]) => void;
  handleBatchRemove: () => void;
  performBatchRemove: () => Promise<void>;
  setBatchRemoveConfirm: (value: boolean) => void;
  // delete expired
  deleteExpiredConfirmProviderId: string | null;
  isDeletingExpired: boolean;
  handleDeleteExpired: (providerId: string) => void;
  performDeleteExpired: () => Promise<void>;
  setDeleteExpiredConfirmProviderId: (value: string | null) => void;
}

function getExpiresAtMs(expiresAt?: string): number | null {
  if (!expiresAt) {
    return null;
  }

  const expiresAtMs = new Date(expiresAt).getTime();
  return Number.isNaN(expiresAtMs) ? null : expiresAtMs;
}

function resolveRuntimeStatus(
  account: TokenAccount,
  nowMs: number,
): TokenAccount["status"] {
  if (account.status === "expired") {
    return "expired";
  }

  const expiresAtMs = getExpiresAtMs(account.expiresAt);
  if (expiresAtMs !== null && expiresAtMs <= nowMs) {
    return "expired";
  }

  return account.status;
}

const MAX_TIMEOUT_MS = 2147483647;

export function useProviderAccounts({
  customProvidersCount,
}: UseProviderAccountsOptions): UseProviderAccountsResult {
  const t = useTranslations();
  const providerAccounts = useProvidersStore((state) => state.accounts);
  const isLoading = useProvidersStore((state) => state.isLoading);
  const loadAccounts = useProvidersStore((state) => state.loadAccounts);
  const removeAccountLocal = useProvidersStore(
    (state) => state.removeAccountLocal,
  );

  const [removeConfirmAccount, setRemoveConfirmAccount] = useState<{
    providerId: string;
    accountId: string;
  } | null>(null);
  const [pendingAccountToggles, setPendingAccountToggles] = useState<
    Record<string, boolean>
  >({});
  const [isRemovingAccount, setIsRemovingAccount] = useState(false);
  const [selectModeProviderId, setSelectModeProviderId] = useState<
    string | null
  >(null);
  const [selectedAccountIds, setSelectedAccountIds] = useState<Set<string>>(
    new Set(),
  );
  const [isBatchRemoving, setIsBatchRemoving] = useState(false);
  const [batchRemoveConfirm, setBatchRemoveConfirm] = useState(false);
  const [deleteExpiredConfirmProviderId, setDeleteExpiredConfirmProviderId] =
    useState<string | null>(null);
  const [isDeletingExpired, setIsDeletingExpired] = useState(false);
  const [expirationClock, setExpirationClock] = useState(() => Date.now());

  useEffect(() => {
    void loadAccounts({ force: true });
  }, [loadAccounts]);

  useEffect(() => {
    setExpirationClock(Date.now());
  }, [providerAccounts]);

  const runtimeProviderAccounts = useMemo(
    () =>
      providerAccounts.map((account) => ({
        ...account,
        status: resolveRuntimeStatus(account, expirationClock),
      })),
    [expirationClock, providerAccounts],
  );

  const nextExpirationAtMs = useMemo(() => {
    let nextExpiry: number | null = null;

    runtimeProviderAccounts.forEach((account) => {
      if (account.status === "expired") {
        return;
      }

      const expiresAtMs = getExpiresAtMs(account.expiresAt);
      if (expiresAtMs === null || expiresAtMs <= expirationClock) {
        return;
      }

      if (nextExpiry === null || expiresAtMs < nextExpiry) {
        nextExpiry = expiresAtMs;
      }
    });

    return nextExpiry;
  }, [expirationClock, runtimeProviderAccounts]);

  useEffect(() => {
    if (nextExpirationAtMs === null) {
      return;
    }

    const delay = Math.min(
      Math.max(nextExpirationAtMs - Date.now(), 250),
      MAX_TIMEOUT_MS,
    );
    const timer = window.setTimeout(() => {
      setExpirationClock(Date.now());
    }, delay);

    return () => window.clearTimeout(timer);
  }, [nextExpirationAtMs]);

  useEffect(() => {
    const syncExpirationClock = () => {
      setExpirationClock(Date.now());
    };

    window.addEventListener("focus", syncExpirationClock);
    document.addEventListener("visibilitychange", syncExpirationClock);

    return () => {
      window.removeEventListener("focus", syncExpirationClock);
      document.removeEventListener("visibilitychange", syncExpirationClock);
    };
  }, []);

  const refreshAccounts = useCallback(async () => {
    await loadAccounts({ force: true });
  }, [loadAccounts]);

  const stats = useMemo(() => {
    const totalProviders = new Set(
      runtimeProviderAccounts.map((a) => a.provider),
    ).size;
    const totalAccounts = runtimeProviderAccounts.length;
    const activeAccounts = runtimeProviderAccounts.filter(
      (a) => a.status === "online",
    ).length;

    return {
      totalProviders,
      totalAccounts,
      activeAccounts,
      customCount: customProvidersCount,
    };
  }, [customProvidersCount, runtimeProviderAccounts]);

  const handleRemoveAccount = useCallback(
    (providerId: string, accountId: string) => {
      setRemoveConfirmAccount({ providerId, accountId });
    },
    [],
  );

  const performRemoveAccount = useCallback(
    async (providerId: string, accountId: string) => {
      if (isRemovingAccount) {
        return;
      }

      setIsRemovingAccount(true);
      const account = providerAccounts.find(
        (acc) => acc.provider === providerId && acc.id === accountId,
      );

      try {
        if (account?.filePath && window.electronAPI?.providers) {
          const result = await window.electronAPI.providers.removeAccount(
            account.filePath,
          );
          if (result?.success) {
            await loadAccounts({ force: true });
            setRemoveConfirmAccount(null);
          } else {
            log.error("[Providers] Failed to remove account:", result?.error);
          }
        } else {
          removeAccountLocal(providerId, accountId);
          setRemoveConfirmAccount(null);
        }
      } catch (error) {
        log.error("[Providers] Error removing account:", error);
      } finally {
        setIsRemovingAccount(false);
      }
    },
    [isRemovingAccount, loadAccounts, providerAccounts, removeAccountLocal],
  );

  const handleToggleAccountEnabled = useCallback(
    async (providerId: string, accountId: string, enabled: boolean) => {
      const account = providerAccounts.find(
        (acc) => acc.provider === providerId && acc.id === accountId,
      );

      if (!account?.filePath) {
        return;
      }

      const pendingKey = `${providerId}:${accountId}`;
      setPendingAccountToggles((prev) => ({ ...prev, [pendingKey]: true }));

      try {
        const result = await window.electronAPI?.providers?.setAccountEnabled(
          account.filePath,
          enabled,
        );
        if (result?.success) {
          await loadAccounts({ force: true });
        } else {
          log.error(
            "[Providers] Failed to toggle account state:",
            result?.error,
          );
        }
      } catch (error) {
        log.error("[Providers] Failed to toggle account state:", error);
      } finally {
        setPendingAccountToggles((prev) => {
          const next = { ...prev };
          delete next[pendingKey];
          return next;
        });
      }
    },
    [loadAccounts, providerAccounts],
  );

  const handleDownloadAccountJson = useCallback(
    async (providerId: string, accountId: string) => {
      const account = providerAccounts.find(
        (acc) => acc.provider === providerId && acc.id === accountId,
      );

      if (!account?.filePath) {
        return;
      }

      try {
        const result = await window.electronAPI?.providers?.getAccountPreview(
          account.filePath,
        );

        if (!result?.success) {
          log.error(
            "[Providers] Failed to download account json:",
            result?.error,
          );
          return;
        }

        const payload = result.payload;
        const jsonText =
          typeof payload === "string"
            ? payload
            : JSON.stringify(payload ?? {}, null, 2);

        const fileName =
          account.filePath.split(/[/\\]/).pop() || `${account.id}.json`;

        const blob = new Blob([jsonText], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = fileName;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
      } catch (error) {
        log.error("[Providers] Failed to download account json:", error);
      }
    },
    [providerAccounts],
  );

  const getAccountDisplay = useCallback((account: Account) => {
    let main = account.nickname || "";
    let sub = account.email || "";

    if (!main) {
      if (
        account.email &&
        !account.email.startsWith("oauth-") &&
        account.email !== "unknown"
      ) {
        main = account.email.split("@")[0];
        sub = account.email;
      } else if (account.filePath) {
        const filename = account.filePath.split(/[/\\]/).pop() || "";
        main = filename
          .replace(
            /^(claude|gemini|codex|antigravity|qwen|iflow|github-copilot|kiro)-/i,
            "",
          )
          .replace(/\.json$/i, "");
        sub = filename;
      } else {
        main = account.email || "Account";
        sub = "";
      }
    }

    if (main === sub) {
      sub = "";
    }

    return { main, sub };
  }, []);

  const accountsByProvider = useMemo(() => {
    const byProvider = new Map<string, Account[]>();

    runtimeProviderAccounts.forEach((acc) => {
      const accounts = byProvider.get(acc.provider) || [];
      const lastUsedDate = new Date(acc.lastUsed);
      const now = new Date();
      const diffMs = now.getTime() - lastUsedDate.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      let lastUsedText = t.quota.justNow;
      if (diffDays > 0) {
        lastUsedText = t.quota.daysAgo.replace("{days}", diffDays.toString());
      } else if (diffHours > 0) {
        lastUsedText = t.quota.hoursAgo.replace(
          "{hours}",
          diffHours.toString(),
        );
      } else if (diffMins > 0) {
        lastUsedText = t.quota.minutesAgo.replace(
          "{minutes}",
          diffMins.toString(),
        );
      }

      accounts.push({
        id: acc.id,
        email: acc.email,
        nickname: acc.nickname,
        accountKey: acc.accountKey,
        oauthSourceKey: acc.oauthSourceKey,
        status: acc.status,
        enabled: acc.enabled,
        lastUsed: lastUsedText,
        filePath: acc.filePath,
        expiresAt: acc.expiresAt,
      });
      byProvider.set(acc.provider, accounts);
    });

    return byProvider;
  }, [
    runtimeProviderAccounts,
    t.quota.daysAgo,
    t.quota.hoursAgo,
    t.quota.justNow,
    t.quota.minutesAgo,
  ]);

  const loadedProviders = useMemo(() => {
    const nextProviders: Provider[] = [];
    accountsByProvider.forEach((accounts, providerId) => {
      const providerMeta = allProviders.find(
        (provider) => provider.id === providerId,
      );
      if (providerMeta) {
        nextProviders.push({
          ...providerMeta,
          accounts,
        });
      }
    });
    return nextProviders;
  }, [accountsByProvider]);

  const providersWithAccounts = useMemo(
    () => loadedProviders.filter((provider) => provider.accounts.length > 0),
    [loadedProviders],
  );

  const enterSelectMode = useCallback((providerId: string) => {
    setSelectModeProviderId(providerId);
    setSelectedAccountIds(new Set());
  }, []);

  const exitSelectMode = useCallback(() => {
    setSelectModeProviderId(null);
    setSelectedAccountIds(new Set());
  }, []);

  const toggleSelectAccount = useCallback((accountId: string) => {
    setSelectedAccountIds((prev) => {
      const next = new Set(prev);
      if (next.has(accountId)) {
        next.delete(accountId);
      } else {
        next.add(accountId);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback((allIds: string[]) => {
    setSelectedAccountIds((prev) =>
      prev.size === allIds.length ? new Set() : new Set(allIds),
    );
  }, []);

  const handleBatchRemove = useCallback(() => {
    if (selectedAccountIds.size === 0) return;
    setBatchRemoveConfirm(true);
  }, [selectedAccountIds.size]);

  const performBatchRemove = useCallback(async () => {
    if (
      isBatchRemoving ||
      selectedAccountIds.size === 0 ||
      !selectModeProviderId
    )
      return;

    setIsBatchRemoving(true);
    try {
      const filePaths: string[] = [];
      for (const accountId of selectedAccountIds) {
        const account = providerAccounts.find(
          (acc) =>
            acc.provider === selectModeProviderId && acc.id === accountId,
        );
        if (account?.filePath) {
          filePaths.push(account.filePath);
        }
      }

      if (filePaths.length > 0 && window.electronAPI?.providers) {
        const result =
          await window.electronAPI.providers.removeAccounts(filePaths);
        if (result?.success) {
          await loadAccounts({ force: true });
          setBatchRemoveConfirm(false);
          exitSelectMode();
        } else {
          log.error(
            "[Providers] Failed to batch remove accounts:",
            result?.error,
          );
        }
      }
    } catch (error) {
      log.error("[Providers] Error batch removing accounts:", error);
    } finally {
      setIsBatchRemoving(false);
    }
  }, [
    isBatchRemoving,
    selectedAccountIds,
    selectModeProviderId,
    providerAccounts,
    loadAccounts,
    exitSelectMode,
  ]);

  const handleDeleteExpired = useCallback((providerId: string) => {
    setDeleteExpiredConfirmProviderId(providerId);
  }, []);

  const performDeleteExpired = useCallback(async () => {
    if (isDeletingExpired || !deleteExpiredConfirmProviderId) return;

    setIsDeletingExpired(true);
    try {
      const expiredAccounts = runtimeProviderAccounts.filter(
        (acc) =>
          acc.provider === deleteExpiredConfirmProviderId &&
          acc.status === "expired" &&
          acc.filePath,
      );
      const filePaths = expiredAccounts.map((acc) => acc.filePath);

      if (filePaths.length > 0 && window.electronAPI?.providers) {
        const result =
          await window.electronAPI.providers.removeAccounts(filePaths);
        if (result?.success) {
          await loadAccounts({ force: true });
          setDeleteExpiredConfirmProviderId(null);
        } else {
          log.error(
            "[Providers] Failed to delete expired accounts:",
            result?.error,
          );
        }
      }
    } catch (error) {
      log.error("[Providers] Error deleting expired accounts:", error);
    } finally {
      setIsDeletingExpired(false);
    }
  }, [
    isDeletingExpired,
    deleteExpiredConfirmProviderId,
    runtimeProviderAccounts,
    loadAccounts,
  ]);

  return {
    isLoading,
    removeConfirmAccount,
    pendingAccountToggles,
    isRemovingAccount,
    accountsByProvider,
    loadedProviders,
    providersWithAccounts,
    stats,
    refreshAccounts,
    setRemoveConfirmAccount,
    handleRemoveAccount,
    performRemoveAccount,
    handleToggleAccountEnabled,
    handleDownloadAccountJson,
    getAccountDisplay,
    selectModeProviderId,
    selectedAccountIds,
    isBatchRemoving,
    batchRemoveConfirm,
    enterSelectMode,
    exitSelectMode,
    toggleSelectAccount,
    toggleSelectAll,
    handleBatchRemove,
    performBatchRemove,
    setBatchRemoveConfirm,
    deleteExpiredConfirmProviderId,
    isDeletingExpired,
    handleDeleteExpired,
    performDeleteExpired,
    setDeleteExpiredConfirmProviderId,
  };
}
