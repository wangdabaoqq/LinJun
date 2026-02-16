import { Dispatch, SetStateAction } from "react";
import {
  Check,
  ChevronRight,
  Copy,
  Edit2,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";

import { useTranslations } from "../../stores/settings";
import { getCustomProviderIcon } from "../icons/ProviderIcons";
import { CustomProviderDisplay } from "./types";

interface CustomProvidersSectionProps {
  customExpanded: boolean;
  setCustomExpanded: Dispatch<SetStateAction<boolean>>;
  customProviders: CustomProviderDisplay[];
  isImporting: boolean;
  pendingCustomToggles: Record<string, boolean>;
  copiedProvider: string | null;
  onImportClick: () => void;
  onToggleCustomProviderEnabled: (
    provider: CustomProviderDisplay,
    enabled: boolean,
  ) => void;
  onEditCustomProvider: (provider: CustomProviderDisplay) => void;
  onCopyCustomProvider: (provider: CustomProviderDisplay) => void;
  onDeleteCustomProvider: (provider: CustomProviderDisplay) => void;
}

export function CustomProvidersSection({
  customExpanded,
  setCustomExpanded,
  customProviders,
  isImporting,
  pendingCustomToggles,
  copiedProvider,
  onImportClick,
  onToggleCustomProviderEnabled,
  onEditCustomProvider,
  onCopyCustomProvider,
  onDeleteCustomProvider,
}: CustomProvidersSectionProps) {
  const t = useTranslations();

  return (
    <section>
      <div
        className={`flex items-center gap-3 mb-6 cursor-pointer group/section px-4 py-3 rounded-xl border transition-all duration-200 ${
          customExpanded
            ? "bg-[var(--text-primary)]/[0.05] border-[var(--glass-border-hover)]"
            : "bg-transparent border-transparent hover:bg-[var(--text-primary)]/[0.03] hover:border-[var(--glass-border)]"
        }`}
        onClick={() => setCustomExpanded(!customExpanded)}
      >
        <div
          className={`flex-shrink-0 transition-transform duration-300 ${customExpanded ? "rotate-90 text-[var(--accent-primary)]" : "text-[var(--text-dim)]"}`}
        >
          <ChevronRight className="w-4 h-4" />
        </div>
        <h3
          className={`text-xs font-bold text-[var(--text-primary)] uppercase tracking-[0.15em] transition-opacity duration-200 ${customExpanded ? "opacity-80" : "opacity-40 group-hover/section:opacity-60"}`}
        >
          {t.providers.customManage}
        </h3>
        <div className="flex-1" />
        <button
          onClick={(event) => {
            event.stopPropagation();
            onImportClick();
          }}
          disabled={isImporting}
          className="glass-btn h-7 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5"
        >
          {isImporting ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Upload className="w-3 h-3 stroke-[2.5px]" />
          )}
          {isImporting ? t.providers.customImporting : t.providers.customImport}
        </button>
        <span className="text-[10px] font-mono font-bold text-[var(--text-dim)] tabular-nums">
          {customProviders.length}
        </span>
      </div>

      {customProviders.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {customProviders.map((cp) => (
            <div
              key={cp.id}
              className="group/card relative flex flex-col p-6 rounded-3xl glass-card transition-all duration-300 border border-[rgba(255,255,255,0.04)]"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="text-3xl">
                    {getCustomProviderIcon(cp.type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-base text-[var(--text-primary)] leading-tight">
                        {cp.name}
                      </h4>
                      <span className="px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider rounded bg-[var(--text-primary)]/5 text-[var(--text-dim)]">
                        {cp.type}
                      </span>
                    </div>
                    <p className="text-[10px] font-mono text-[var(--text-dim)] mt-1 tracking-tighter opacity-70">
                      {cp.baseUrl}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider ${
                        cp.enabled
                          ? "text-emerald-500"
                          : "text-[var(--text-dim)]"
                      }`}
                    >
                      {cp.enabled
                        ? t.providers.enabledState
                        : t.providers.disabledState}
                    </span>
                    <button
                      role="switch"
                      aria-checked={cp.enabled}
                      onClick={() =>
                        onToggleCustomProviderEnabled(cp, !cp.enabled)
                      }
                      disabled={!!pendingCustomToggles[cp.id]}
                      className={`relative w-8 h-4 rounded-full transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-black ${cp.enabled ? "toggle-track-active" : "toggle-track"} ${pendingCustomToggles[cp.id] ? "opacity-70 cursor-wait" : "cursor-pointer"}`}
                      title={
                        cp.enabled
                          ? t.providers.disableProvider
                          : t.providers.enableProvider
                      }
                    >
                      <div
                        className={`toggle-knob absolute top-0.5 left-0.5 w-3 h-3 rounded-full flex items-center justify-center pointer-events-none transition-transform duration-200 ${cp.enabled ? "translate-x-4" : "translate-x-0"}`}
                      >
                        {pendingCustomToggles[cp.id] && (
                          <Loader2 className="w-2 h-2 text-[var(--accent-primary)] animate-spin" />
                        )}
                      </div>
                    </button>
                  </div>

                  <div className="flex gap-1 opacity-0 group-hover/card:opacity-100 transition-all duration-300">
                    {cp.enabled && (
                      <>
                        <button
                          onClick={() => onEditCustomProvider(cp)}
                          className="p-1.5 text-[var(--text-dim)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/5 rounded-lg transition-all"
                          title={t.common.edit}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onCopyCustomProvider(cp)}
                          className={`p-1.5 rounded-lg transition-all ${
                            copiedProvider === cp.id
                              ? "text-emerald-500"
                              : "text-[var(--text-dim)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/5"
                          }`}
                          title={
                            copiedProvider === cp.id
                              ? t.common.copied
                              : t.common.copy
                          }
                        >
                          {copiedProvider === cp.id ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => onDeleteCustomProvider(cp)}
                      className="p-1.5 text-[var(--text-dim)] hover:text-neon-red hover:bg-neon-red/5 rounded-lg transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {customExpanded && (
                <div className="flex items-center gap-6 mt-auto animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-bold text-[var(--text-dim)] uppercase tracking-wider">
                      Keys
                    </p>
                    <p className="text-sm font-bold text-[var(--text-primary)] font-mono">
                      {cp.keysCount}
                    </p>
                  </div>
                  <div className="w-px h-6 bg-[var(--text-primary)]/5" />
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-bold text-[var(--text-dim)] uppercase tracking-wider">
                      Models
                    </p>
                    <p className="text-sm font-bold text-[var(--text-primary)] font-mono">
                      {cp.modelsCount}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="py-14 text-center border border-dashed border-[var(--glass-border)] rounded-3xl group hover:border-[var(--glass-border-hover)] transition-colors bg-[var(--text-primary)]/[0.01]">
          <div className="text-4xl mb-4 opacity-10 group-hover:opacity-20 transition-opacity text-[var(--text-primary)]">
            ◈
          </div>
          <p className="text-[var(--text-dim)] font-bold tracking-tight uppercase text-[10px] mb-6">
            {t.providers.customNoProviders}
          </p>
          <button
            className="px-8 py-2.5 rounded-xl border border-[var(--glass-border)] text-[var(--text-primary)] text-xs font-bold tracking-widest hover:bg-[var(--text-primary)]/5 transition-all"
            onClick={onImportClick}
          >
            {t.providers.customImport}
          </button>
        </div>
      )}
    </section>
  );
}
