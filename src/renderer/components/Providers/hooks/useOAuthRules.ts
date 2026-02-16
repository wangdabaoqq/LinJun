import { useCallback, useEffect, useState } from "react";
import log from "@renderer/utils/logger";

import { useTranslations } from "../../../stores/settings";
import { useProvidersStore } from "../../../stores/providers";
import { Account } from "../types";

type OAuthProviderRules = Record<string, string[]>;
type OAuthAccountRules = Record<string, Record<string, string[]>>;

export const DEFAULT_SOURCE_OPTIONS_BY_PROVIDER: Record<string, string[]> = {
  gemini: ["gemini-cli", "vertex", "aistudio"],
  antigravity: ["antigravity"],
  claude: ["claude"],
  codex: ["codex"],
  qwen: ["qwen"],
  iflow: ["iflow"],
  copilot: ["copilot"],
  kiro: ["kiro"],
};

interface UseOAuthRulesResult {
  oauthProviderRules: OAuthProviderRules;
  oauthAccountRules: OAuthAccountRules;
  sourceOptionsByProvider: Record<string, string[]>;
  editingAccountModelRules: { providerId: string; account: Account } | null;
  setEditingAccountModelRules: (
    value: { providerId: string; account: Account } | null,
  ) => void;
  loadOAuthRules: () => Promise<void>;
  getSourceOptionsForProvider: (providerId: string) => string[];
  getAccountRulesKey: (providerId: string, account: Account) => string;
  getAccountSourceKey: (providerId: string, account: Account) => string;
  getSourceOptionsForAccount: (
    providerId: string,
    account: Account,
  ) => string[];
  getAccountModelRulesMeta: (
    providerId: string,
    account: Account,
  ) => { sourceKey: string; count: number };
  getAccountRulesBySource: (
    providerId: string,
    account: Account,
  ) => Record<string, string[]>;
  handleOpenAccountModelRules: (providerId: string, account: Account) => void;
  handleLoadModelCatalog: () => Promise<Array<{ id: string; ownedBy: string }>>;
  handleSaveAccountModelRules: (
    sourceKey: string,
    accountPatterns: string[],
  ) => Promise<void>;
}

export function useOAuthRules(): UseOAuthRulesResult {
  const t = useTranslations();
  const loadAccounts = useProvidersStore((state) => state.loadAccounts);

  const [oauthProviderRules, setOauthProviderRules] =
    useState<OAuthProviderRules>({});
  const [oauthAccountRules, setOauthAccountRules] = useState<OAuthAccountRules>(
    {},
  );
  const [sourceOptionsByProvider, setSourceOptionsByProvider] = useState<
    Record<string, string[]>
  >(DEFAULT_SOURCE_OPTIONS_BY_PROVIDER);
  const [editingAccountModelRules, setEditingAccountModelRules] = useState<{
    providerId: string;
    account: Account;
  } | null>(null);

  const loadOAuthRules = useCallback(async () => {
    try {
      const result = await window.electronAPI?.oauthRules?.get();
      if (!result?.success) {
        return;
      }

      setOauthProviderRules((result.providerRules as OAuthProviderRules) || {});
      setOauthAccountRules((result.accountRules as OAuthAccountRules) || {});
      setSourceOptionsByProvider(
        (result.sourceOptionsByProvider as Record<string, string[]>) ||
          DEFAULT_SOURCE_OPTIONS_BY_PROVIDER,
      );
    } catch (error) {
      log.error("[Providers] Failed to load OAuth model rules:", error);
    }
  }, []);

  useEffect(() => {
    void loadOAuthRules();
  }, [loadOAuthRules]);

  const getSourceOptionsForProvider = useCallback(
    (providerId: string): string[] => {
      return (
        sourceOptionsByProvider[providerId] ||
        DEFAULT_SOURCE_OPTIONS_BY_PROVIDER[providerId] || [providerId]
      );
    },
    [sourceOptionsByProvider],
  );

  const getAccountRulesKey = useCallback(
    (providerId: string, account: Account): string => {
      if (account.accountKey) {
        return account.accountKey;
      }

      const filename = account.filePath?.split(/[/\\]/).pop() || account.id;
      return `${providerId}:${filename}`;
    },
    [],
  );

  const getAccountSourceKey = useCallback(
    (providerId: string, account: Account): string => {
      const accountKey = getAccountRulesKey(providerId, account);

      const fromAccountRules = Object.entries(oauthAccountRules).find(
        ([, accountMap]) => !!accountMap[accountKey],
      )?.[0];
      if (fromAccountRules) {
        return fromAccountRules;
      }

      if (account.oauthSourceKey) {
        return account.oauthSourceKey;
      }

      return getSourceOptionsForProvider(providerId)[0] || providerId;
    },
    [getAccountRulesKey, getSourceOptionsForProvider, oauthAccountRules],
  );

  const getSourceOptionsForAccount = useCallback(
    (providerId: string, account: Account): string[] => {
      const accountSourceKey = getAccountSourceKey(providerId, account);
      if (accountSourceKey) {
        return [accountSourceKey];
      }

      const fallbackSourceKey =
        getSourceOptionsForProvider(providerId)[0] || providerId;
      return fallbackSourceKey ? [fallbackSourceKey] : [];
    },
    [getAccountSourceKey, getSourceOptionsForProvider],
  );

  const getAccountModelRulesMeta = useCallback(
    (
      providerId: string,
      account: Account,
    ): { sourceKey: string; count: number } => {
      const accountKey = getAccountRulesKey(providerId, account);
      const sourceKey = getAccountSourceKey(providerId, account);
      const providerPatterns = oauthProviderRules[sourceKey] || [];
      const accountPatterns = oauthAccountRules[sourceKey]?.[accountKey] || [];
      const count = new Set([...providerPatterns, ...accountPatterns]).size;
      return { sourceKey, count };
    },
    [
      getAccountRulesKey,
      getAccountSourceKey,
      oauthProviderRules,
      oauthAccountRules,
    ],
  );

  const getAccountRulesBySource = useCallback(
    (providerId: string, account: Account): Record<string, string[]> => {
      const accountKey = getAccountRulesKey(providerId, account);
      const rulesBySource: Record<string, string[]> = {};

      Object.entries(oauthAccountRules).forEach(([sourceKey, accountMap]) => {
        const patterns = accountMap[accountKey] || [];
        if (patterns.length > 0) {
          rulesBySource[sourceKey] = patterns;
        }
      });

      return rulesBySource;
    },
    [getAccountRulesKey, oauthAccountRules],
  );

  const handleOpenAccountModelRules = useCallback(
    (providerId: string, account: Account) => {
      setEditingAccountModelRules({ providerId, account });
    },
    [],
  );

  const handleLoadModelCatalog = useCallback(async (): Promise<
    Array<{ id: string; ownedBy: string }>
  > => {
    const result = await window.electronAPI?.models?.fetch();
    if (!result?.success) {
      throw new Error(result?.error || t.providers.accountModelRulesLoadFailed);
    }

    const models = Array.isArray(result.models) ? result.models : [];
    const normalizedModels: Array<{ id: string; ownedBy: string }> = models.map(
      (model: unknown) => {
        if (typeof model === "string") {
          return { id: model, ownedBy: "" };
        }
        if (model && typeof model === "object" && "id" in model) {
          const typedModel = model as { id?: string; owned_by?: string };
          return {
            id: String(typedModel.id || ""),
            ownedBy: String(typedModel.owned_by || ""),
          };
        }
        return { id: "", ownedBy: "" };
      },
    );

    return normalizedModels
      .map((model) => ({
        id: model.id.trim(),
        ownedBy: model.ownedBy.trim().toLowerCase(),
      }))
      .filter((model) => model.id.length > 0);
  }, [t.providers.accountModelRulesLoadFailed]);

  const handleSaveAccountModelRules = useCallback(
    async (sourceKey: string, accountPatterns: string[]) => {
      if (!editingAccountModelRules) {
        return;
      }

      const accountKey = getAccountRulesKey(
        editingAccountModelRules.providerId,
        editingAccountModelRules.account,
      );
      const sanitizedPatterns = Array.from(
        new Set(
          accountPatterns.map((pattern) => pattern.trim()).filter(Boolean),
        ),
      );

      const existingSources = Object.entries(oauthAccountRules)
        .filter(([, accountMap]) => !!accountMap[accountKey])
        .map(([existingSourceKey]) => existingSourceKey);

      if (!window.electronAPI?.oauthRules) {
        throw new Error(t.providers.accountModelRulesSaveFailed);
      }

      for (const existingSourceKey of existingSources) {
        const clearResult =
          await window.electronAPI.oauthRules.clearAccountRules(
            existingSourceKey,
            accountKey,
          );
        if (!clearResult?.success) {
          throw new Error(
            clearResult?.error || t.providers.accountModelRulesSaveFailed,
          );
        }
      }

      if (sanitizedPatterns.length > 0) {
        const saveResult = await window.electronAPI.oauthRules.setAccountRules(
          sourceKey,
          accountKey,
          sanitizedPatterns,
        );

        if (!saveResult?.success) {
          throw new Error(
            saveResult?.error || t.providers.accountModelRulesSaveFailed,
          );
        }
      }

      await loadOAuthRules();
      await loadAccounts({ force: true });
      setEditingAccountModelRules(null);
    },
    [
      editingAccountModelRules,
      getAccountRulesKey,
      loadAccounts,
      loadOAuthRules,
      oauthAccountRules,
      t.providers.accountModelRulesSaveFailed,
    ],
  );

  return {
    oauthProviderRules,
    oauthAccountRules,
    sourceOptionsByProvider,
    editingAccountModelRules,
    setEditingAccountModelRules,
    loadOAuthRules,
    getSourceOptionsForProvider,
    getAccountRulesKey,
    getAccountSourceKey,
    getSourceOptionsForAccount,
    getAccountModelRulesMeta,
    getAccountRulesBySource,
    handleOpenAccountModelRules,
    handleLoadModelCatalog,
    handleSaveAccountModelRules,
  };
}
