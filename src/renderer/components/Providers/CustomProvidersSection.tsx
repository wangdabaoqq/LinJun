import {
  Dispatch,
  SetStateAction,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Check,
  ChevronRight,
  Copy,
  Edit2,
  Loader2,
  Search,
  Trash2,
  X,
} from "lucide-react";

import { useTranslations } from "../../stores/settings";
import { getCustomProviderIcon } from "../icons/ProviderIcons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { CustomProviderDisplay } from "./types";

const CUSTOM_FILTER_PREF_KEY = "providers:custom:filters-expanded";
const SEARCH_FILTER_THRESHOLD = 10;

interface CustomProvidersSectionProps {
  customExpanded: boolean;
  setCustomExpanded: Dispatch<SetStateAction<boolean>>;
  customProviders: CustomProviderDisplay[];
  pendingCustomToggles: Record<string, boolean>;
  copiedProvider: string | null;
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
  pendingCustomToggles,
  copiedProvider,
  onToggleCustomProviderEnabled,
  onEditCustomProvider,
  onCopyCustomProvider,
  onDeleteCustomProvider,
}: CustomProvidersSectionProps) {
  const t = useTranslations();
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "enabled" | "disabled"
  >("all");
  const [showFilters, setShowFilters] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const saved = window.localStorage.getItem(CUSTOM_FILTER_PREF_KEY);
    if (saved === "1") {
      setShowFilters(true);
      return;
    }
    if (saved === "0") {
      setShowFilters(false);
      return;
    }
    setShowFilters(customProviders.length >= SEARCH_FILTER_THRESHOLD);
  }, [customProviders.length]);

  useEffect(() => {
    if (customProviders.length >= SEARCH_FILTER_THRESHOLD) {
      return;
    }
    setShowFilters(false);
    setKeyword("");
    setStatusFilter("all");
  }, [customProviders.length]);

  useEffect(() => {
    if (!customExpanded || customProviders.length < SEARCH_FILTER_THRESHOLD) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable
      ) {
        return;
      }
      if (event.key !== "/") {
        return;
      }
      event.preventDefault();
      setShowFilters(true);
      window.localStorage.setItem(CUSTOM_FILTER_PREF_KEY, "1");
      window.setTimeout(() => {
        searchInputRef.current?.focus();
      }, 0);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [customExpanded, customProviders.length]);

  const filteredCustomProviders = useMemo(() => {
    const search = keyword.trim().toLowerCase();
    return customProviders.filter((provider) => {
      if (statusFilter === "enabled" && !provider.enabled) {
        return false;
      }
      if (statusFilter === "disabled" && provider.enabled) {
        return false;
      }

      if (!search) {
        return true;
      }

      const targets = [
        provider.name,
        provider.type,
        provider.baseUrl,
        provider.enabled ? t.providers.enabledState : t.providers.disabledState,
      ]
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.toLowerCase());

      return targets.some((item) => item.includes(search));
    });
  }, [
    customProviders,
    keyword,
    statusFilter,
    t.providers.disabledState,
    t.providers.enabledState,
  ]);

  const hasActiveFilters = keyword.trim().length > 0 || statusFilter !== "all";
  const showFilterBar = showFilters || hasActiveFilters;

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
        <span className="text-[10px] font-mono font-bold text-[var(--text-dim)] tabular-nums">
          {customProviders.length}
        </span>
      </div>

      {customExpanded && customProviders.length >= SEARCH_FILTER_THRESHOLD && (
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={(event) => {
              event.stopPropagation();
              setShowFilters((prev) => {
                const next = !prev;
                if (typeof window !== "undefined") {
                  window.localStorage.setItem(
                    CUSTOM_FILTER_PREF_KEY,
                    next ? "1" : "0",
                  );
                }
                return next;
              });
            }}
            className="h-9 px-3 rounded-xl border border-[var(--glass-border)] bg-[var(--text-primary)]/[0.03] text-[var(--text-primary)] text-xs font-semibold flex items-center gap-2 hover:bg-[var(--text-primary)]/[0.06] transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
            <span>{t.providers.customFilterPlaceholder}</span>
          </button>
          {hasActiveFilters && (
            <button
              onClick={(event) => {
                event.stopPropagation();
                setKeyword("");
                setStatusFilter("all");
              }}
              className="h-9 px-3 rounded-xl border border-[var(--glass-border)] text-[var(--text-dim)] hover:text-[var(--text-primary)] text-xs font-medium transition-colors"
            >
              {t.common.close}
            </button>
          )}
        </div>
      )}

      {customExpanded &&
        customProviders.length >= SEARCH_FILTER_THRESHOLD &&
        showFilterBar && (
          <div className="mb-5 flex flex-col md:flex-row items-stretch md:items-center gap-3">
            <div className="relative flex-1 group">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)] group-focus-within:text-[var(--accent-primary)] transition-colors" />
              <input
                ref={searchInputRef}
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder={t.providers.customFilterPlaceholder}
                className="glass-input h-10 w-full pl-10 pr-9 border border-[var(--glass-border)] bg-[var(--text-primary)]/[0.03] focus:border-[var(--accent-primary)]/50"
              />
              {keyword && (
                <button
                  onClick={() => setKeyword("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-[var(--text-dim)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/[0.06] transition-colors"
                  title={t.common.close}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <Select
              value={statusFilter}
              onValueChange={(value) =>
                setStatusFilter(value as "all" | "enabled" | "disabled")
              }
            >
              <SelectTrigger
                style={{ borderRadius: "12px" }}
                className="md:w-44 h-10 pl-4 pr-10 py-0 text-xs font-medium transition-all duration-300 border backdrop-blur-md text-left outline-none focus:outline-none focus:ring-0 bg-[var(--bg-secondary)]/30 border-[var(--glass-border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]/50 hover:border-[var(--glass-border-hover)] shadow-sm data-[state=open]:bg-[var(--accent-primary)]/10 data-[state=open]:border-[var(--accent-primary)]/30 data-[state=open]:text-[var(--accent-primary)] data-[state=open]:shadow-[0_0_15px_-5px_var(--accent-primary)]"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-[300px] overflow-y-auto custom-scrollbar bg-[var(--bg-primary)]/95 backdrop-blur-xl border border-[var(--glass-border)] rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] z-[100] py-1 ring-1 ring-[var(--glass-border)]">
                <SelectItem
                  value="all"
                  className="py-2 text-xs cursor-pointer transition-colors data-[highlighted]:bg-[var(--accent-primary)]/5 data-[highlighted]:text-[var(--text-primary)] data-[state=checked]:bg-[var(--accent-primary)]/10 data-[state=checked]:text-[var(--accent-primary)] text-[var(--text-muted)]"
                >
                  {t.providers.accountFilterStatusAll}
                </SelectItem>
                <SelectItem
                  value="enabled"
                  className="py-2 text-xs cursor-pointer transition-colors data-[highlighted]:bg-[var(--accent-primary)]/5 data-[highlighted]:text-[var(--text-primary)] data-[state=checked]:bg-[var(--accent-primary)]/10 data-[state=checked]:text-[var(--accent-primary)] text-[var(--text-muted)]"
                >
                  {t.providers.accountFilterStatusEnabled}
                </SelectItem>
                <SelectItem
                  value="disabled"
                  className="py-2 text-xs cursor-pointer transition-colors data-[highlighted]:bg-[var(--accent-primary)]/5 data-[highlighted]:text-[var(--text-primary)] data-[state=checked]:bg-[var(--accent-primary)]/10 data-[state=checked]:text-[var(--accent-primary)] text-[var(--text-muted)]"
                >
                  {t.providers.accountFilterStatusDisabled}
                </SelectItem>
              </SelectContent>
            </Select>

            <div className="h-10 px-3 rounded-xl border border-[var(--glass-border)] bg-[var(--text-primary)]/[0.02] text-[10px] font-mono text-[var(--text-dim)] flex items-center tabular-nums">
              {filteredCustomProviders.length} / {customProviders.length}
            </div>
          </div>
        )}

      {customProviders.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredCustomProviders.map((cp) => (
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
        </div>
      )}

      {customProviders.length > 0 &&
        customExpanded &&
        filteredCustomProviders.length === 0 && (
          <div className="mt-4 px-4 py-8 rounded-xl border border-dashed border-[var(--glass-border)] text-[var(--text-dim)] text-sm text-center">
            {t.providers.customFilterNoResults}
          </div>
        )}
    </section>
  );
}
