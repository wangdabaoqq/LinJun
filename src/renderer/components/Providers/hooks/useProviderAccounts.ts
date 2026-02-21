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
}

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

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  const refreshAccounts = useCallback(async () => {
    await loadAccounts({ force: true });
  }, [loadAccounts]);

  const stats = useMemo(() => {
    const totalProviders = new Set(providerAccounts.map((a) => a.provider))
      .size;
    const totalAccounts = providerAccounts.length;
    const activeAccounts = providerAccounts.filter(
      (a) => a.status === "online",
    ).length;

    return {
      totalProviders,
      totalAccounts,
      activeAccounts,
      customCount: customProvidersCount,
    };
  }, [customProvidersCount, providerAccounts]);

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

    (providerAccounts as TokenAccount[]).forEach((acc) => {
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
      });
      byProvider.set(acc.provider, accounts);
    });

    return byProvider;
  }, [
    providerAccounts,
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
  };
}
