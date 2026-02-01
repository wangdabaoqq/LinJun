import { useState, useEffect } from "react";
import log from "@renderer/utils/logger";
import { Trash2, Edit2, Plus, RotateCw, Loader2 } from "lucide-react";

import { useTranslations } from "../../stores/settings";
import { useProvidersStore, TokenAccount } from "../../stores/providers";
import { CustomProviderForm } from "./CustomProviderForm/index";
import { ConfirmModal } from "../ui/ConfirmModal";
import { CustomIcon } from "../icons/ProviderIcons";

import { Provider, OpenAICompatProvider, Account } from "./types";
import { allProviders } from "./providerDefinitions";
import { useProviderAuth } from "./hooks/useProviderAuth";
import { AddAccountModal } from "./AddAccountModal";
import { AddProviderModal } from "./AddProviderModal";
import { ProviderCard } from "./ProviderCard";
import { CopilotAuthModal } from "./CopilotAuthModal";

export function Providers() {
  const t = useTranslations();
  const providerAccounts = useProvidersStore((state) => state.accounts);
  const isLoading = useProvidersStore((state) => state.isLoading);
  const loadAccounts = useProvidersStore((state) => state.loadAccounts);
  const removeAccountLocal = useProvidersStore(
    (state) => state.removeAccountLocal,
  );

  const {
    isAuthenticating,
    authError,
    setAuthError,
    copilotAuthInfo,
    setCopilotAuthInfo,
    copilotAuthError,
    setCopilotAuthError,
    triggerAuth,
  } = useProviderAuth();

  const [showAddModal, setShowAddModal] = useState(false);
  const [addAccountProvider, setAddAccountProvider] = useState<Omit<
    Provider,
    "accounts"
  > | null>(null);
  const [customProviders, setCustomProviders] = useState<
    OpenAICompatProvider[]
  >([]);
  const [showCustomProviderForm, setShowCustomProviderForm] = useState(false);
  const [editingCustomProvider, setEditingCustomProvider] =
    useState<OpenAICompatProvider | null>(null);
  const [deleteConfirmProvider, setDeleteConfirmProvider] = useState<
    string | null
  >(null);
  const [removeConfirmAccount, setRemoveConfirmAccount] = useState<{
    providerId: string;
    accountId: string;
  } | null>(null);

  useEffect(() => {
    loadAccounts();
    loadCustomProviders();
  }, [loadAccounts]);

  const loadCustomProviders = async () => {
    try {
      const result = await window.electronAPI?.openaiCompat?.getAll();
      if (result?.success) {
        setCustomProviders(result.providers || []);
      }
    } catch (err) {
      log.error("[Providers] Failed to load custom providers:", err);
    }
  };

  const handleDeleteCustomProvider = async (name: string) => {
    try {
      const result = await window.electronAPI?.openaiCompat?.delete(name);
      if (result?.success) {
        setCustomProviders(result.providers || []);
        setDeleteConfirmProvider(null);
      }
    } catch (err) {
      log.error("[Providers] Failed to delete custom provider:", err);
    }
  };

  const handleSelectProvider = async (
    providerInfo: Omit<Provider, "accounts">,
  ) => {
    setShowAddModal(false);
    if (providerInfo.id === "custom") {
      setEditingCustomProvider(null);
      setShowCustomProviderForm(true);
      return;
    }
    if (
      providerInfo.authType === "apikey" ||
      providerInfo.authType === "import" ||
      providerInfo.authType === "oauth-project"
    ) {
      setAddAccountProvider(providerInfo);
    } else {
      await triggerAuth(providerInfo);
    }
  };

  const handleAddAccount = async (providerId: string) => {
    const providerInfo = allProviders.find((p) => p.id === providerId);
    if (providerInfo) {
      if (
        providerInfo.authType === "apikey" ||
        providerInfo.authType === "import" ||
        providerInfo.authType === "oauth-project"
      ) {
        setAddAccountProvider(providerInfo);
      } else {
        await triggerAuth(providerInfo);
      }
    }
  };

  const handleAccountAdded = async () => {
    if (!addAccountProvider) return;

    setAddAccountProvider(null);
    await loadAccounts({ force: true });
  };

  const handleRemoveAccount = (providerId: string, accountId: string) => {
    setRemoveConfirmAccount({ providerId, accountId });
  };

  const performRemoveAccount = async (
    providerId: string,
    accountId: string,
  ) => {
    const account = providerAccounts.find(
      (acc) => acc.provider === providerId && acc.id === accountId,
    );

    if (account?.filePath && window.electronAPI?.providers) {
      try {
        const result = await window.electronAPI.providers.removeAccount(
          account.filePath,
        );
        if (result?.success) {
          await loadAccounts({ force: true });
          setRemoveConfirmAccount(null);
        } else {
          log.error("[Providers] Failed to remove account:", result?.error);
        }
      } catch (error) {
        log.error("[Providers] Error removing account:", error);
      }
    } else {
      removeAccountLocal(providerId, accountId);
      setRemoveConfirmAccount(null);
    }
  };

  const accountsByProvider = new Map<string, Account[]>();

  (providerAccounts as TokenAccount[]).forEach((acc) => {
    const accounts = accountsByProvider.get(acc.provider) || [];
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
      lastUsedText = t.quota.hoursAgo.replace("{hours}", diffHours.toString());
    } else if (diffMins > 0) {
      lastUsedText = t.quota.minutesAgo.replace(
        "{minutes}",
        diffMins.toString(),
      );
    }

    accounts.push({
      id: acc.id,
      email: acc.email,
      status: acc.status,
      lastUsed: lastUsedText,
      filePath: acc.filePath,
    });
    accountsByProvider.set(acc.provider, accounts);
  });

  const loadedProviders: Provider[] = [];
  accountsByProvider.forEach((accounts, providerId) => {
    const providerMeta = allProviders.find((p) => p.id === providerId);
    if (providerMeta) {
      loadedProviders.push({
        ...providerMeta,
        accounts,
      });
    }
  });

  const providersWithAccounts = loadedProviders.filter(
    (p) => p.accounts.length > 0,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">
            {t.providers.title}
          </h2>
          <p className="text-[var(--text-muted)] text-sm mt-1">
            {t.providers.subtitle}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            className="glass-btn p-2.5 active:scale-90 transition-all duration-300 group hover:bg-white/10"
            onClick={() => loadAccounts({ force: true })}
            disabled={isLoading}
            title={t.quota.refresh}
          >
            <RotateCw
              className={`w-4 h-4 group-hover:rotate-180 transition-transform duration-500 ${isLoading ? "animate-spin" : ""}`}
            />
          </button>
          <button
            className="glass-btn glass-btn-teal flex items-center justify-center gap-2 group active:scale-95 transition-all duration-300 hover:brightness-110 shadow-lg hover:shadow-teal-500/20"
            onClick={() => setShowAddModal(true)}
            disabled={isAuthenticating}
          >
            {isAuthenticating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                {t.providers.connecting}
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 group-hover:scale-125 group-hover:rotate-90 transition-all duration-300" />
                <span>{t.providers.addProvider}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {authError && (
        <div className="p-4 rounded-lg bg-[var(--accent-magenta)]/10 border border-[var(--accent-magenta)]/30">
          <p className="text-sm text-[var(--accent-magenta)]">{authError}</p>
          <button
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] mt-2"
            onClick={() => setAuthError(null)}
          >
            {t.providers.dismiss || "Dismiss"}
          </button>
        </div>
      )}

      {providersWithAccounts.length > 0 ? (
        <div className="space-y-4">
          {providersWithAccounts.map((provider) => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              onAddAccount={handleAddAccount}
              onRemoveAccount={handleRemoveAccount}
            />
          ))}
        </div>
      ) : (
        <div className="glass-card p-12 text-center flex flex-col items-center">
          <div className="text-4xl mb-4 text-[var(--text-dim)]">◈</div>
          <p className="text-[var(--text-muted)]">{t.providers.noProviders}</p>
          <button
            className="glass-btn glass-btn-teal mt-6 flex items-center justify-center gap-2 group active:scale-95 transition-all px-6 py-2.5"
            onClick={() => setShowAddModal(true)}
          >
            <Plus className="w-4 h-4 group-hover:scale-125 group-hover:rotate-90 transition-all duration-300" />
            <span>{t.providers.addProvider}</span>
          </button>
        </div>
      )}

      {customProviders.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
            {t.providers.customManage}
          </h3>
          <div className="space-y-3">
            {customProviders.map((cp) => (
              <div
                key={cp.name}
                className="glass-card p-4 flex items-center justify-between group hover:border-[var(--accent-indigo)]/30 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-[var(--accent-indigo)]/10 text-[var(--accent-indigo)]">
                    <CustomIcon />
                  </div>
                  <div>
                    <h4 className="font-semibold text-[var(--text-primary)]">
                      {cp.name}
                    </h4>
                    <p className="text-xs text-[var(--text-muted)] truncate max-w-[200px]">
                      {cp["base-url"]}
                    </p>
                    <p className="text-xs text-[var(--text-dim)]">
                      {cp["api-key-entries"].length} API keys
                      {cp.models &&
                        cp.models.length > 0 &&
                        ` • ${cp.models.length} models`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => {
                      setEditingCustomProvider(cp);
                      setShowCustomProviderForm(true);
                    }}
                    className="glass-btn p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    title={t.providers.customEdit}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirmProvider(cp.name)}
                    className="p-2 text-red-500/70 hover:text-red-500 hover:scale-110 transition-all"
                    title={t.providers.customDelete}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showAddModal && (
        <AddProviderModal
          onClose={() => setShowAddModal(false)}
          onSelectProvider={handleSelectProvider}
        />
      )}

      {addAccountProvider && (
        <AddAccountModal
          provider={addAccountProvider}
          onClose={() => setAddAccountProvider(null)}
          onAdd={handleAccountAdded}
        />
      )}

      {showCustomProviderForm && (
        <CustomProviderForm
          onClose={() => {
            setShowCustomProviderForm(false);
            setEditingCustomProvider(null);
          }}
          onSaved={() => {
            setShowCustomProviderForm(false);
            setEditingCustomProvider(null);
            loadCustomProviders();
          }}
          editProvider={editingCustomProvider || undefined}
        />
      )}

      {copilotAuthInfo && (
        <CopilotAuthModal
          authInfo={copilotAuthInfo}
          onClose={() => {
            setCopilotAuthInfo(null);
            setCopilotAuthError(null);
          }}
          authError={copilotAuthError}
        />
      )}

      <ConfirmModal
        isOpen={!!deleteConfirmProvider}
        onClose={() => setDeleteConfirmProvider(null)}
        onConfirm={() => {
          if (deleteConfirmProvider)
            handleDeleteCustomProvider(deleteConfirmProvider);
        }}
        title={t.providers.customDeleteConfirm.replace(
          "{name}",
          deleteConfirmProvider || "",
        )}
        description={t.logs.deleteDesc}
        confirmText={t.common.delete}
        cancelText={t.common.cancel}
        variant="danger"
      />

      <ConfirmModal
        isOpen={!!removeConfirmAccount}
        onClose={() => setRemoveConfirmAccount(null)}
        onConfirm={() => {
          if (removeConfirmAccount) {
            performRemoveAccount(
              removeConfirmAccount.providerId,
              removeConfirmAccount.accountId,
            );
          }
        }}
        title={t.providers.removeAccountConfirm}
        description={t.providers.removeAccountDesc}
        confirmText={t.common.delete}
        cancelText={t.common.cancel}
        variant="danger"
      />
    </div>
  );
}
