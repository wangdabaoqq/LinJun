import { useCallback, useState } from "react";
import {
  Plus,
  RotateCw,
  Loader2,
  Settings,
  Users,
  ShieldCheck,
  Upload,
} from "lucide-react";

import { useTranslations } from "../../stores/settings";
import { CustomProviderForm } from "./CustomProviderForm/index";
import { CustomProviderImportModal } from "./CustomProviderImportModal";
import { GlobalImportModal } from "./GlobalImportModal";
import { OAuthImportModal } from "./OAuthImportModal";
import type { OAuthImportEntry } from "./OAuthImportModal";
import { ConfirmModal } from "../ui/ConfirmModal";
import {
  Account,
  Provider,
  OpenAICompatProvider,
  ClaudeCompatProvider,
  GeminiCompatProvider,
  CodexCompatProvider,
} from "./types";
import { useProviderAuth } from "./hooks/useProviderAuth";
import { AddAccountModal } from "./AddAccountModal";
import { AddProviderModal } from "./AddProviderModal";
import { CopilotAuthModal } from "./CopilotAuthModal";
import { AmpcodeSettingsModal } from "./AmpcodeSettingsModal";
import { AccountModelExplorerModal } from "./AccountModelExplorerModal";
import { AccountModelAliasModal } from "./AccountModelAliasModal";
import { ProviderModelRulesModal } from "./ProviderModelRulesModal";
import { AccountEditModal } from "./AccountEditModal";
import { CustomProvidersSection } from "./CustomProvidersSection";
import { OfficialProvidersSection } from "./OfficialProvidersSection";
import { RoutingProtocolSection } from "./RoutingProtocolSection";
import { useCustomProviders } from "./hooks/useCustomProviders";
import { useOAuthRules } from "./hooks/useOAuthRules";
import { useProviderAccounts } from "./hooks/useProviderAccounts";

export function Providers() {
  const t = useTranslations();
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
  const [officialExpanded, setOfficialExpanded] = useState(false);
  const [routingExpanded, setRoutingExpanded] = useState(false);
  const [customExpanded, setCustomExpanded] = useState(false);
  const [editingAccount, setEditingAccount] = useState<{
    providerId: string;
    account: Account;
  } | null>(null);
  const [showGlobalImportModal, setShowGlobalImportModal] = useState(false);
  const [showOAuthImportModal, setShowOAuthImportModal] = useState(false);
  const [isOAuthImporting, setIsOAuthImporting] = useState(false);
  const [isRefreshingAllProviders, setIsRefreshingAllProviders] =
    useState(false);
  const [downloadConfirmAccount, setDownloadConfirmAccount] = useState<{
    providerId: string;
    accountId: string;
  } | null>(null);

  const {
    customProviders,
    showCustomProviderForm,
    editingCustomProvider,
    deleteConfirmProvider,
    showImportModal,
    importStatus,
    copiedProvider,
    pendingCustomToggles,
    isDeletingCustomProvider,
    isImporting,
    openaiProviders,
    claudeProviders,
    geminiProviders,
    codexProviders,
    ampcodeProvider,
    showAmpcodeSettings,
    ampcodeMappedKeyCount,
    setShowCustomProviderForm,
    setEditingCustomProvider,
    setDeleteConfirmProvider,
    setShowImportModal,
    setImportStatus,
    setShowAmpcodeSettings,
    loadCustomProviders,
    handleDeleteCustomProvider,
    handleCopyCustomProvider,
    handleToggleCustomProviderEnabled,
    handleImportClick,
    handleImportConfirm,
  } = useCustomProviders();

  const {
    editingAccountModelRules,
    editingProviderModelRules,
    editingProviderModelAlias,
    setEditingAccountModelRules,
    setEditingProviderModelRules,
    setEditingProviderModelAlias,
    getAccountSourceKey,
    getSourceOptionsForProvider,
    getSourceOptionsForAccount,
    getAccountModelRulesMeta,
    getProviderModelRulesMeta,
    getProviderModelAliasMeta,
    getAccountRulesBySource,
    getModelAliasBySource,
    getProviderRulesBySource,
    handleOpenAccountModelRules,
    handleOpenProviderModelRules,
    handleOpenProviderModelAlias,
    handleLoadModelCatalog,
    handleLoadAccountPreview,
    handleSaveAccountMetadata,
    handleSaveAccountModelRules,
    handleSaveProviderModelRules,
    handleSaveProviderModelAlias,
  } = useOAuthRules();

  const {
    isLoading,
    removeConfirmAccount,
    pendingAccountToggles,
    isRemovingAccount,
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
  } = useProviderAccounts({ customProvidersCount: customProviders.length });

  const handleSelectProvider = useCallback(
    async (providerInfo: Omit<Provider, "accounts">) => {
      setShowAddModal(false);

      if (providerInfo.id === "custom") {
        setEditingCustomProvider(null);
        setShowCustomProviderForm(true);
        return;
      }

      if (providerInfo.id === "ampcode") {
        setShowAmpcodeSettings(true);
        return;
      }

      if (
        providerInfo.authType === "apikey" ||
        providerInfo.authType === "import" ||
        providerInfo.authType === "oauth-project" ||
        providerInfo.id === "antigravity" ||
        providerInfo.id === "codex" ||
        providerInfo.id === "claude" ||
        providerInfo.id === "gemini" ||
        providerInfo.id === "qwen" ||
        providerInfo.id === "iflow" ||
        providerInfo.id === "kiro"
      ) {
        setAddAccountProvider(providerInfo);
      } else {
        await triggerAuth(providerInfo);
      }
    },
    [
      triggerAuth,
      setEditingCustomProvider,
      setShowCustomProviderForm,
      setShowAmpcodeSettings,
    ],
  );

  const handleAccountAdded = useCallback(async () => {
    if (!addAccountProvider) {
      return;
    }
    setAddAccountProvider(null);
    await refreshAccounts();
  }, [addAccountProvider, refreshAccounts]);

  const handleRefreshAllProviders = useCallback(async () => {
    setIsRefreshingAllProviders(true);
    try {
      await Promise.all([refreshAccounts(), loadCustomProviders()]);
    } finally {
      setIsRefreshingAllProviders(false);
    }
  }, [loadCustomProviders, refreshAccounts]);

  const handleOpenGlobalImport = useCallback(() => {
    setShowGlobalImportModal(true);
  }, []);

  const handleSelectGlobalImportType = useCallback(
    (type: "oauth" | "custom") => {
      setShowGlobalImportModal(false);
      if (type === "custom") {
        handleImportClick();
        return;
      }
      setShowOAuthImportModal(true);
    },
    [handleImportClick],
  );

  const handleOAuthImportConfirm = useCallback(
    async (entries: OAuthImportEntry[]) => {
      setIsOAuthImporting(true);
      setImportStatus(null);
      try {
        if (entries.length === 0) {
          setImportStatus({
            type: "error",
            message: t.providers.oauthImportNoData,
          });
          return;
        }

        let successCount = 0;
        let failedCount = 0;

        const batchImport = window.electronAPI?.providers?.importOAuthFiles;
        if (batchImport) {
          const result = await batchImport(entries);
          const summary = result?.summary;
          successCount = summary?.success || 0;
          failedCount = summary?.failed || 0;
        } else {
          for (const entry of entries) {
            const result = await window.electronAPI?.providers?.importOAuthFile(
              entry.fileName,
              entry.payload,
            );
            if (result?.success) {
              successCount += 1;
            } else {
              failedCount += 1;
            }
          }
        }

        if (successCount > 0) {
          const total = successCount + failedCount;
          const message =
            failedCount > 0
              ? t.providers.oauthImportPartialSummary
                  .replace("{success}", successCount.toString())
                  .replace("{total}", total.toString())
                  .replace("{failed}", failedCount.toString())
              : t.providers.oauthImportSuccessSummary
                  .replace("{success}", successCount.toString())
                  .replace("{total}", total.toString());

          setImportStatus({ type: "success", message });
          setShowOAuthImportModal(false);
          await handleRefreshAllProviders();
        } else {
          setImportStatus({
            type: "error",
            message: t.providers.oauthImportAllFailedSummary,
          });
        }
      } catch (error) {
        setImportStatus({
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : t.providers.oauthImportFailed,
        });
      } finally {
        setIsOAuthImporting(false);
      }
    },
    [
      handleRefreshAllProviders,
      setImportStatus,
      t.providers.oauthImportAllFailedSummary,
      t.providers.oauthImportNoData,
      t.providers.oauthImportFailed,
      t.providers.oauthImportPartialSummary,
      t.providers.oauthImportSuccessSummary,
    ],
  );

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden p-6">
      <div className="shrink-0 mb-8">
        <div className="flex items-center justify-between mb-10">
          <div className="space-y-1">
            <h2 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">
              {t.providers.title}
            </h2>
            <p className="text-[var(--text-muted)] text-sm font-medium">
              {t.providers.subtitle}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="p-2.5 text-[var(--text-dim)] hover:text-[var(--text-primary)] transition-colors group glass-card border-none bg-transparent hover:bg-[var(--text-primary)]/5"
              onClick={() => {
                void handleRefreshAllProviders();
              }}
              disabled={isLoading || isRefreshingAllProviders}
            >
              <RotateCw
                className={`w-4 h-4 ${isLoading || isRefreshingAllProviders ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-500"}`}
              />
            </button>
            <button
              className="glass-btn glass-btn-primary h-11 px-6 rounded-xl font-bold text-sm flex items-center gap-2 transition-all hover:scale-[1.02]"
              onClick={() => setShowAddModal(true)}
              disabled={isAuthenticating}
            >
              {isAuthenticating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 stroke-[2.5px]" />
              )}
              <span>
                {isAuthenticating
                  ? t.providers.connecting
                  : t.providers.addProvider}
              </span>
            </button>
            <button
              className="glass-btn h-11 px-5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all hover:scale-[1.02]"
              onClick={handleOpenGlobalImport}
              disabled={isImporting || isOAuthImporting}
            >
              {isImporting || isOAuthImporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 stroke-[2.5px]" />
              )}
              <span>{t.providers.globalImportAction}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-1">
          {[
            {
              label: t.providers.officialAccounts,
              value: stats.totalProviders,
              icon: ShieldCheck,
              color: "text-[var(--accent-primary)]",
            },
            {
              label: t.providers.connected,
              value: stats.totalAccounts,
              icon: Users,
              color: "text-neon-teal",
            },
            {
              label: t.status.online,
              value: stats.activeAccounts,
              icon: RotateCw,
              color: "text-neon-green",
            },
            {
              label: t.providers.customProvider,
              value: stats.customCount,
              icon: Settings,
              color: "text-neon-purple",
            },
          ].map((stat, i) => (
            <div
              key={i}
              className="glass-card flex flex-col gap-3 p-4 border-none bg-[var(--text-primary)]/[0.02] hover:bg-[var(--text-primary)]/[0.04] transition-all hover:shadow-soft-md"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
                  {stat.label}
                </span>
                <stat.icon className={`w-3.5 h-3.5 ${stat.color} opacity-80`} />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
                  {stat.value.toString().padStart(2, "0")}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-2 -mr-2">
        <div className="space-y-12 pb-12">
          {importStatus && (
            <div
              className={`p-4 rounded-xl border text-sm font-bold flex items-center justify-between animate-in fade-in slide-in-from-top-2 ${
                importStatus.type === "success"
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                  : "bg-red-500/10 border-red-500/20 text-red-500"
              }`}
            >
              <span>{importStatus.message}</span>
              <button
                onClick={() => setImportStatus(null)}
                className="opacity-60 hover:opacity-100 transition-opacity"
              >
                ✕
              </button>
            </div>
          )}

          {authError && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-bold flex items-center justify-between animate-in fade-in slide-in-from-top-2">
              <span>{authError}</span>
              <button
                onClick={() => setAuthError(null)}
                className="opacity-60 hover:opacity-100 transition-opacity"
              >
                ✕
              </button>
            </div>
          )}

          <OfficialProvidersSection
            officialExpanded={officialExpanded}
            setOfficialExpanded={setOfficialExpanded}
            totalAccounts={stats.totalAccounts}
            providersWithAccounts={providersWithAccounts}
            pendingAccountToggles={pendingAccountToggles}
            onEditAccount={(providerId, account) => {
              setEditingAccount({ providerId, account });
            }}
            onRemoveAccount={handleRemoveAccount}
            onToggleAccountEnabled={handleToggleAccountEnabled}
            onDownloadAccountJson={(providerId, accountId) => {
              setDownloadConfirmAccount({ providerId, accountId });
            }}
            onEditProviderModelRules={handleOpenProviderModelRules}
            onEditAccountModelRules={handleOpenAccountModelRules}
            onEditProviderModelAlias={handleOpenProviderModelAlias}
            getProviderModelRulesMeta={getProviderModelRulesMeta}
            getAccountModelRulesMeta={getAccountModelRulesMeta}
            getProviderModelAliasMeta={getProviderModelAliasMeta}
            selectModeProviderId={selectModeProviderId}
            selectedAccountIds={selectedAccountIds}
            onEnterSelectMode={enterSelectMode}
            onExitSelectMode={exitSelectMode}
            onToggleSelectAccount={toggleSelectAccount}
            onToggleSelectAll={toggleSelectAll}
            onBatchDelete={handleBatchRemove}
          />

          <RoutingProtocolSection
            routingExpanded={routingExpanded}
            setRoutingExpanded={setRoutingExpanded}
            ampcodeProvider={ampcodeProvider}
            ampcodeMappedKeyCount={ampcodeMappedKeyCount}
            onOpenAmpcodeSettings={() => setShowAmpcodeSettings(true)}
          />

          <CustomProvidersSection
            customExpanded={customExpanded}
            setCustomExpanded={setCustomExpanded}
            customProviders={customProviders}
            pendingCustomToggles={pendingCustomToggles}
            copiedProvider={copiedProvider}
            onToggleCustomProviderEnabled={(provider, enabled) => {
              void handleToggleCustomProviderEnabled(provider, enabled);
            }}
            onEditCustomProvider={(provider) => {
              setEditingCustomProvider(provider);
              setShowCustomProviderForm(true);
            }}
            onCopyCustomProvider={(provider) => {
              void handleCopyCustomProvider(provider);
            }}
            onDeleteCustomProvider={setDeleteConfirmProvider}
          />
        </div>
      </div>

      {showImportModal && (
        <CustomProviderImportModal
          isOpen={showImportModal}
          isImporting={isImporting}
          existingProviders={{
            openai: openaiProviders,
            claude: claudeProviders,
            gemini: geminiProviders,
            codex: codexProviders,
          }}
          onClose={() => setShowImportModal(false)}
          onConfirm={handleImportConfirm}
        />
      )}

      {showGlobalImportModal && (
        <GlobalImportModal
          isOpen={showGlobalImportModal}
          onClose={() => setShowGlobalImportModal(false)}
          onSelect={handleSelectGlobalImportType}
        />
      )}

      {showOAuthImportModal && (
        <OAuthImportModal
          isOpen={showOAuthImportModal}
          isImporting={isOAuthImporting}
          onClose={() => setShowOAuthImportModal(false)}
          onConfirm={handleOAuthImportConfirm}
        />
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

      {editingAccount && (
        <AccountEditModal
          isOpen={!!editingAccount}
          onClose={() => setEditingAccount(null)}
          accountLabel={getAccountDisplay(editingAccount.account).main}
          providerId={editingAccount.providerId}
          account={editingAccount.account}
          siblingAccounts={
            providersWithAccounts.find(
              (p) => p.id === editingAccount.providerId,
            )?.accounts
          }
          onLoadAccountPreview={handleLoadAccountPreview}
          onSaveAccountMetadata={handleSaveAccountMetadata}
        />
      )}

      {editingAccountModelRules && (
        <AccountModelExplorerModal
          isOpen={!!editingAccountModelRules}
          onClose={() => setEditingAccountModelRules(null)}
          accountLabel={
            editingAccountModelRules
              ? getAccountDisplay(editingAccountModelRules.account).main
              : ""
          }
          providerId={editingAccountModelRules?.providerId || ""}
          sourceOptions={
            editingAccountModelRules
              ? getSourceOptionsForAccount(
                  editingAccountModelRules.providerId,
                  editingAccountModelRules.account,
                )
              : []
          }
          initialSourceKey={
            editingAccountModelRules
              ? getAccountSourceKey(
                  editingAccountModelRules.providerId,
                  editingAccountModelRules.account,
                )
              : ""
          }
          accountFilePath={editingAccountModelRules?.account.filePath}
          accountRulesBySource={
            editingAccountModelRules
              ? getAccountRulesBySource(
                  editingAccountModelRules.providerId,
                  editingAccountModelRules.account,
                )
              : {}
          }
          onLoadCatalog={handleLoadModelCatalog}
          onSave={handleSaveAccountModelRules}
        />
      )}

      {editingProviderModelAlias && (
        <AccountModelAliasModal
          isOpen={!!editingProviderModelAlias}
          onClose={() => setEditingProviderModelAlias(null)}
          providerId={editingProviderModelAlias}
          subjectLabel={editingProviderModelAlias || ""}
          sourceOptions={
            editingProviderModelAlias
              ? getSourceOptionsForProvider(editingProviderModelAlias)
              : []
          }
          initialSourceKey={
            editingProviderModelAlias
              ? getSourceOptionsForProvider(editingProviderModelAlias)[0] ||
                editingProviderModelAlias
              : ""
          }
          mappingsBySource={
            editingProviderModelAlias
              ? Object.fromEntries(
                  getSourceOptionsForProvider(editingProviderModelAlias).map(
                    (sourceKey) => [
                      sourceKey,
                      getModelAliasBySource(sourceKey),
                    ],
                  ),
                )
              : {}
          }
          onLoadCatalog={handleLoadModelCatalog}
          onSave={handleSaveProviderModelAlias}
        />
      )}

      {editingProviderModelRules && (
        <ProviderModelRulesModal
          isOpen={!!editingProviderModelRules}
          onClose={() => setEditingProviderModelRules(null)}
          providerId={editingProviderModelRules}
          providerLabel={editingProviderModelRules}
          sourceOptions={getSourceOptionsForProvider(editingProviderModelRules)}
          initialSourceKey={
            getSourceOptionsForProvider(editingProviderModelRules)[0] ||
            editingProviderModelRules
          }
          patternsBySource={Object.fromEntries(
            getSourceOptionsForProvider(editingProviderModelRules).map(
              (sourceKey) => [sourceKey, getProviderRulesBySource(sourceKey)],
            ),
          )}
          onLoadCatalog={() => handleLoadModelCatalog()}
          onSave={handleSaveProviderModelRules}
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
            void loadCustomProviders();
          }}
          editProvider={
            editingCustomProvider?.type === "openai"
              ? (editingCustomProvider.rawData as OpenAICompatProvider)
              : undefined
          }
          editClaudeProvider={
            editingCustomProvider?.type === "claude"
              ? (editingCustomProvider.rawData as ClaudeCompatProvider)
              : undefined
          }
          editGeminiProvider={
            editingCustomProvider?.type === "gemini"
              ? (editingCustomProvider.rawData as GeminiCompatProvider)
              : undefined
          }
          editCodexProvider={
            editingCustomProvider?.type === "codex"
              ? (editingCustomProvider.rawData as CodexCompatProvider)
              : undefined
          }
        />
      )}

      {showAmpcodeSettings && (
        <AmpcodeSettingsModal
          provider={ampcodeProvider}
          onClose={() => setShowAmpcodeSettings(false)}
          onSaved={() => void loadCustomProviders()}
        />
      )}

      {copilotAuthInfo && (
        <CopilotAuthModal
          authInfo={copilotAuthInfo}
          onClose={() => {
            setCopilotAuthInfo(null);
            setCopilotAuthError(null);
          }}
          onSuccess={() => {
            refreshAccounts();
          }}
          authError={copilotAuthError}
        />
      )}

      <ConfirmModal
        isOpen={!!deleteConfirmProvider}
        onClose={() => {
          if (!isDeletingCustomProvider) {
            setDeleteConfirmProvider(null);
          }
        }}
        onConfirm={() => {
          if (deleteConfirmProvider) {
            void handleDeleteCustomProvider(deleteConfirmProvider);
          }
        }}
        title={
          deleteConfirmProvider
            ? t.providers.customDeleteConfirm.replace(
                "{name}",
                deleteConfirmProvider.name,
              )
            : ""
        }
        description={t.logs.deleteDesc}
        confirmText={t.common.delete}
        cancelText={t.common.cancel}
        variant="danger"
        isLoading={isDeletingCustomProvider}
      />

      <ConfirmModal
        isOpen={!!removeConfirmAccount}
        onClose={() => {
          if (!isRemovingAccount) {
            setRemoveConfirmAccount(null);
          }
        }}
        onConfirm={() => {
          if (removeConfirmAccount) {
            void performRemoveAccount(
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
        isLoading={isRemovingAccount}
      />

      <ConfirmModal
        isOpen={batchRemoveConfirm}
        onClose={() => {
          if (!isBatchRemoving) {
            setBatchRemoveConfirm(false);
          }
        }}
        onConfirm={() => {
          void performBatchRemove();
        }}
        title={t.providers.batchDeleteConfirm.replace(
          "{count}",
          String(selectedAccountIds.size),
        )}
        description={t.providers.batchDeleteDesc}
        confirmText={t.common.delete}
        cancelText={t.common.cancel}
        variant="danger"
        isLoading={isBatchRemoving}
      />

      <ConfirmModal
        isOpen={!!downloadConfirmAccount}
        onClose={() => setDownloadConfirmAccount(null)}
        onConfirm={() => {
          if (downloadConfirmAccount) {
            void handleDownloadAccountJson(
              downloadConfirmAccount.providerId,
              downloadConfirmAccount.accountId,
            );
            setDownloadConfirmAccount(null);
          }
        }}
        title={t.providers.downloadAccountJsonConfirmTitle}
        description={t.providers.downloadAccountJsonConfirmDesc}
        confirmText={t.providers.downloadAccountJsonConfirmAction}
        cancelText={t.common.cancel}
        variant="warning"
      />
    </div>
  );
}
