import { useCallback, useEffect, useState } from "react";
import log from "@renderer/utils/logger";

import { useTranslations } from "../../../stores/settings";
import { useProvidersStore } from "../../../stores/providers";
import { Account } from "../types";

type OAuthProviderRules = Record<string, string[]>;
type OAuthAccountRules = Record<string, Record<string, string[]>>;
type OAuthModelAliasRules = Record<
  string,
  Array<{ name: string; alias: string; fork?: boolean }>
>;
type OAuthAccountModelAliasRules = Record<
  string,
  Record<string, Array<{ name: string; alias: string; fork?: boolean }>>
>;

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
  oauthModelAliasRules: OAuthModelAliasRules;
  oauthAccountModelAliasRules: OAuthAccountModelAliasRules;
  sourceOptionsByProvider: Record<string, string[]>;
  editingAccountModelRules: { providerId: string; account: Account } | null;
  editingAccountModelAlias: { providerId: string; account: Account } | null;
  editingProviderModelRules: string | null;
  editingProviderModelAlias: string | null;
  setEditingAccountModelRules: (
    value: { providerId: string; account: Account } | null,
  ) => void;
  setEditingAccountModelAlias: (
    value: { providerId: string; account: Account } | null,
  ) => void;
  setEditingProviderModelRules: (value: string | null) => void;
  setEditingProviderModelAlias: (value: string | null) => void;
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
  getProviderModelRulesMeta: (providerId: string) => {
    sourceKey: string;
    count: number;
  };
  getAccountModelAliasMeta: (
    providerId: string,
    account: Account,
  ) => { sourceKey: string; count: number };
  getProviderModelAliasMeta: (providerId: string) => {
    sourceKey: string;
    count: number;
  };
  getModelAliasBySource: (
    sourceKey: string,
  ) => Array<{ name: string; alias: string; fork?: boolean }>;
  getAccountModelAliasBySource: (
    providerId: string,
    account: Account,
  ) => Record<string, Array<{ name: string; alias: string; fork?: boolean }>>;
  getProviderRulesBySource: (sourceKey: string) => string[];
  getAccountRulesBySource: (
    providerId: string,
    account: Account,
  ) => Record<string, string[]>;
  handleOpenAccountModelRules: (providerId: string, account: Account) => void;
  handleOpenAccountModelAlias: (providerId: string, account: Account) => void;
  handleOpenProviderModelRules: (providerId: string) => void;
  handleOpenProviderModelAlias: (providerId: string) => void;
  handleLoadModelCatalog: (
    accountFilePath?: string,
  ) => Promise<Array<{ id: string; ownedBy: string }>>;
  handleLoadAccountPreview: (filePath: string) => Promise<unknown>;
  handleSaveAccountMetadata: (
    filePath: string,
    updates: {
      priority?: number;
      prefix?: string;
      proxyUrl?: string;
    },
  ) => Promise<void>;
  handleSaveAccountModelRules: (
    sourceKey: string,
    accountPatterns: string[],
  ) => Promise<void>;
  handleSaveProviderModelRules: (
    sourceKey: string,
    providerPatterns: string[],
  ) => Promise<void>;
  handleSaveProviderModelAlias: (
    sourceKey: string,
    mappings: Array<{ name: string; alias: string; fork?: boolean }>,
  ) => Promise<void>;
  handleSaveAccountModelAlias: (
    sourceKey: string,
    mappings: Array<{ name: string; alias: string; fork?: boolean }>,
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
  const [oauthModelAliasRules, setOauthModelAliasRules] =
    useState<OAuthModelAliasRules>({});
  const [oauthAccountModelAliasRules, setOauthAccountModelAliasRules] =
    useState<OAuthAccountModelAliasRules>({});
  const [sourceOptionsByProvider, setSourceOptionsByProvider] = useState<
    Record<string, string[]>
  >(DEFAULT_SOURCE_OPTIONS_BY_PROVIDER);
  const [editingAccountModelRules, setEditingAccountModelRules] = useState<{
    providerId: string;
    account: Account;
  } | null>(null);
  const [editingAccountModelAlias, setEditingAccountModelAlias] = useState<{
    providerId: string;
    account: Account;
  } | null>(null);
  const [editingProviderModelRules, setEditingProviderModelRules] = useState<
    string | null
  >(null);
  const [editingProviderModelAlias, setEditingProviderModelAlias] = useState<
    string | null
  >(null);

  const loadOAuthRules = useCallback(async () => {
    try {
      const [rulesResult, aliasResult] = await Promise.all([
        window.electronAPI?.oauthRules?.get(),
        window.electronAPI?.oauthModelAlias?.get?.(),
      ]);

      if (!rulesResult?.success) {
        return;
      }

      setOauthProviderRules(
        (rulesResult.providerRules as OAuthProviderRules) || {},
      );
      setOauthAccountRules(
        (rulesResult.accountRules as OAuthAccountRules) || {},
      );
      setSourceOptionsByProvider(
        (rulesResult.sourceOptionsByProvider as Record<string, string[]>) ||
          DEFAULT_SOURCE_OPTIONS_BY_PROVIDER,
      );

      if (aliasResult?.success) {
        setOauthModelAliasRules(
          (aliasResult.sourceRules as OAuthModelAliasRules) || {},
        );
        setOauthAccountModelAliasRules(
          (aliasResult.accountRules as OAuthAccountModelAliasRules) || {},
        );
      }
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
        if (account.oauthSourceKey !== "file") {
          return account.oauthSourceKey;
        }
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

  const getAccountModelAliasMeta = useCallback(
    (
      providerId: string,
      account: Account,
    ): { sourceKey: string; count: number } => {
      const sourceKey = getAccountSourceKey(providerId, account);
      const accountKey = getAccountRulesKey(providerId, account);
      const providerMappings = oauthModelAliasRules[sourceKey] || [];
      const accountMappings =
        oauthAccountModelAliasRules[sourceKey]?.[accountKey] || [];
      const mappings = [...providerMappings, ...accountMappings];
      return { sourceKey, count: mappings.length };
    },
    [
      getAccountRulesKey,
      getAccountSourceKey,
      oauthAccountModelAliasRules,
      oauthModelAliasRules,
    ],
  );

  const getProviderModelRulesMeta = useCallback(
    (providerId: string): { sourceKey: string; count: number } => {
      const sourceOptions = getSourceOptionsForProvider(providerId);
      const sourceKey = sourceOptions[0] || providerId;
      const count = sourceOptions.reduce((sum, source) => {
        return sum + (oauthProviderRules[source]?.length || 0);
      }, 0);
      return { sourceKey, count };
    },
    [getSourceOptionsForProvider, oauthProviderRules],
  );

  const getModelAliasBySource = useCallback(
    (
      sourceKey: string,
    ): Array<{ name: string; alias: string; fork?: boolean }> => {
      return oauthModelAliasRules[sourceKey] || [];
    },
    [oauthModelAliasRules],
  );

  const getProviderRulesBySource = useCallback(
    (sourceKey: string): string[] => {
      return oauthProviderRules[sourceKey] || [];
    },
    [oauthProviderRules],
  );

  const getAccountModelAliasBySource = useCallback(
    (
      providerId: string,
      account: Account,
    ): Record<
      string,
      Array<{ name: string; alias: string; fork?: boolean }>
    > => {
      const accountKey = getAccountRulesKey(providerId, account);
      const aliasBySource: Record<
        string,
        Array<{ name: string; alias: string; fork?: boolean }>
      > = {};

      Object.entries(oauthAccountModelAliasRules).forEach(
        ([sourceKey, accountMap]) => {
          const mappings = accountMap[accountKey] || [];
          if (mappings.length > 0) {
            aliasBySource[sourceKey] = mappings;
          }
        },
      );

      return aliasBySource;
    },
    [getAccountRulesKey, oauthAccountModelAliasRules],
  );

  const getProviderModelAliasMeta = useCallback(
    (providerId: string): { sourceKey: string; count: number } => {
      const sourceOptions = getSourceOptionsForProvider(providerId);
      const sourceKey = sourceOptions[0] || providerId;
      const count = sourceOptions.reduce((sum, source) => {
        return sum + (oauthModelAliasRules[source]?.length || 0);
      }, 0);
      return { sourceKey, count };
    },
    [getSourceOptionsForProvider, oauthModelAliasRules],
  );

  const handleOpenAccountModelRules = useCallback(
    (providerId: string, account: Account) => {
      setEditingAccountModelRules({ providerId, account });
    },
    [],
  );

  const handleOpenAccountModelAlias = useCallback(
    (providerId: string, account: Account) => {
      setEditingAccountModelAlias({ providerId, account });
    },
    [],
  );

  const handleOpenProviderModelRules = useCallback((providerId: string) => {
    setEditingProviderModelRules(providerId);
  }, []);

  const handleOpenProviderModelAlias = useCallback((providerId: string) => {
    setEditingProviderModelAlias(providerId);
  }, []);

  const handleLoadModelCatalog = useCallback(
    async (
      accountFilePath?: string,
    ): Promise<Array<{ id: string; ownedBy: string }>> => {
      const result = accountFilePath
        ? await window.electronAPI?.providers?.getAccountModels(accountFilePath)
        : await window.electronAPI?.models?.fetch();
      if (!result?.success) {
        throw new Error(
          result?.error || t.providers.accountModelRulesLoadFailed,
        );
      }

      const models = Array.isArray(result.models) ? result.models : [];
      const normalizedModels: Array<{ id: string; ownedBy: string }> =
        models.map((model: unknown) => {
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
        });

      return normalizedModels
        .map((model) => ({
          id: model.id.trim(),
          ownedBy: model.ownedBy.trim().toLowerCase(),
        }))
        .filter((model) => model.id.length > 0);
    },
    [t.providers.accountModelRulesLoadFailed],
  );

  const handleLoadAccountPreview = useCallback(async (filePath: string) => {
    try {
      const result =
        await window.electronAPI?.providers?.getAccountPreview(filePath);
      if (!result?.success) {
        throw new Error(result?.error || "Failed to load account preview");
      }
      return result.payload;
    } catch (error) {
      const message = String(error);
      if (
        message.includes(
          "No handler registered for 'providers:getAccountPreview'",
        )
      ) {
        log.warn(
          "[Providers] getAccountPreview IPC unavailable; opening edit modal without preview",
        );
        return null;
      }
      throw error;
    }
  }, []);

  const handleSaveAccountMetadata = useCallback(
    async (
      filePath: string,
      updates: {
        priority?: number;
        prefix?: string;
        proxyUrl?: string;
      },
    ) => {
      const result = await window.electronAPI?.providers?.updateAccountMetadata(
        filePath,
        updates,
      );
      if (!result?.success) {
        throw new Error(result?.error || "Failed to update account metadata");
      }
    },
    [],
  );

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

  const handleSaveProviderModelRules = useCallback(
    async (sourceKey: string, providerPatterns: string[]) => {
      if (!window.electronAPI?.oauthRules) {
        throw new Error(t.providers.accountModelRulesSaveFailed);
      }

      const sanitizedPatterns = Array.from(
        new Set(
          providerPatterns.map((pattern) => pattern.trim()).filter(Boolean),
        ),
      );

      const saveResult = await window.electronAPI.oauthRules.setProviderRules(
        sourceKey,
        sanitizedPatterns,
      );

      if (!saveResult?.success) {
        throw new Error(
          saveResult?.error || t.providers.accountModelRulesSaveFailed,
        );
      }

      await loadOAuthRules();
      setEditingProviderModelRules(null);
    },
    [loadOAuthRules, t.providers.accountModelRulesSaveFailed],
  );

  const handleSaveProviderModelAlias = useCallback(
    async (
      sourceKey: string,
      mappings: Array<{ name: string; alias: string; fork?: boolean }>,
    ) => {
      if (!window.electronAPI?.oauthModelAlias?.setSourceRules) {
        throw new Error(t.providers.accountModelAliasSaveFailed);
      }

      const normalizedMappings = Array.from(
        new Map(
          mappings
            .map((item) => ({
              name: item.name.trim(),
              alias: item.alias.trim(),
              ...(typeof item.fork === "boolean" ? { fork: item.fork } : {}),
            }))
            .filter((item) => item.name && item.alias)
            .map((item) => [`${item.name}=>${item.alias}`, item]),
        ).values(),
      );

      const saveResult =
        await window.electronAPI.oauthModelAlias.setSourceRules(
          sourceKey,
          normalizedMappings,
        );

      if (!saveResult?.success) {
        throw new Error(
          saveResult?.error || t.providers.accountModelAliasSaveFailed,
        );
      }

      await loadOAuthRules();
      setEditingProviderModelAlias(null);
    },
    [loadOAuthRules, t.providers.accountModelAliasSaveFailed],
  );

  const handleSaveAccountModelAlias = useCallback(
    async (
      sourceKey: string,
      mappings: Array<{ name: string; alias: string; fork?: boolean }>,
    ) => {
      void sourceKey;
      void mappings;
      throw new Error(t.providers.accountModelAliasSaveFailed);
    },
    [t.providers.accountModelAliasSaveFailed],
  );

  return {
    oauthProviderRules,
    oauthAccountRules,
    oauthModelAliasRules,
    oauthAccountModelAliasRules,
    sourceOptionsByProvider,
    editingAccountModelRules,
    editingAccountModelAlias,
    editingProviderModelRules,
    editingProviderModelAlias,
    setEditingAccountModelRules,
    setEditingAccountModelAlias,
    setEditingProviderModelRules,
    setEditingProviderModelAlias,
    loadOAuthRules,
    getSourceOptionsForProvider,
    getAccountRulesKey,
    getAccountSourceKey,
    getSourceOptionsForAccount,
    getAccountModelRulesMeta,
    getProviderModelRulesMeta,
    getAccountModelAliasMeta,
    getProviderModelAliasMeta,
    getAccountRulesBySource,
    getModelAliasBySource,
    getAccountModelAliasBySource,
    getProviderRulesBySource,
    handleOpenAccountModelRules,
    handleOpenAccountModelAlias,
    handleOpenProviderModelRules,
    handleOpenProviderModelAlias,
    handleLoadModelCatalog,
    handleLoadAccountPreview,
    handleSaveAccountMetadata,
    handleSaveAccountModelRules,
    handleSaveProviderModelRules,
    handleSaveProviderModelAlias,
    handleSaveAccountModelAlias,
  };
}
