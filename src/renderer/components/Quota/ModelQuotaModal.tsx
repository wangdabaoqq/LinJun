import { useState, useMemo, useEffect, useRef, memo } from "react";
import { motion } from "motion/react";
import log from "@renderer/utils/logger";
import {
  Copy,
  Check,
  Search,
  Info,
  AlertCircle,
  X,
  LayoutGrid,
  List,
} from "lucide-react";
import { Modal } from "../ui/Modal";
import { QuotaWindowBar } from "./QuotaWindowBar";
import { QuotaWindow } from "./AccountQuotaCard";
import { getProviderIcon } from "../icons/ProviderIcons";
import { useTranslations } from "../../stores/settings";
import { sortModelsByDisplayOrder } from "./modelOrder";
import { VirtualList } from "../shared/VirtualList";

interface ModelQuotaModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  badge?: string;
  providerId?: string;
  rateLimits: {
    primary: QuotaWindow;
    secondary?: QuotaWindow;
    codeReview?: QuotaWindow;
    additional?: QuotaWindow[];
  };
}

function formatModelLabel(label: string): string {
  return label.replace(/(\s|^)(Pro|Plus)(\s|$)/gi, " ").trim();
}

interface ProcessedQuotaWindow extends QuotaWindow {
  vendor: string;
  vendorKey: string;
  cleanLabel: string;
}

function normalizeVendorIconKey(vendor: string): string {
  const raw = (vendor || "").trim();
  const lower = raw.toLowerCase();

  if (raw.includes("阿里巴巴") || lower.includes("qwen")) return "qwen";
  if (raw.includes("智谱") || lower.includes("zhipu")) return "zai";
  if (lower.includes("moonshot")) return "moonshot";
  if (lower.includes("kimi") || lower.includes("kim")) return "kimi";
  if (lower.includes("xai") || lower.includes("grok")) return "grok";
  if (lower.includes("ollama")) return "ollama";
  if (
    lower.includes("hugging face") ||
    lower.includes("huggingface") ||
    lower === "hf"
  )
    return "huggingface";
  if (lower.includes("vercel")) return "vercel";
  if (lower.includes("xiaomi") || lower.includes("mimo")) return "xiaomimimo";
  if (lower.includes("deepseek")) return "deepseek";
  if (lower.includes("mistral")) return "mistral";
  if (lower.includes("meta") || lower.includes("llama")) return "meta";
  if (lower.includes("openai") || lower.includes("gpt")) return "openai";
  if (lower.includes("anthropic") || lower.includes("claude")) return "claude";
  if (lower.includes("google") || lower.includes("gemini")) return "google";

  return lower;
}

interface ModelCardProps {
  model: ProcessedQuotaWindow;
  viewMode: "grid" | "list";
  t: any;
  copiedModelId: string | null;
  onCopy: (id: string) => void;
}

const ModelCard = memo(
  ({ model, viewMode, t, copiedModelId, onCopy }: ModelCardProps) => {
    const isGrid = viewMode === "grid";

    if (isGrid) {
      return (
        <div className="relative p-3 rounded-xl border bg-[var(--bg-secondary)]/40 hover:bg-[var(--bg-secondary)]/60 border-[var(--glass-border)] hover:border-[var(--accent-primary)]/30 transition-all duration-300 group h-full flex items-center gap-3">
          <div className="w-10 h-10 shrink-0 flex items-center justify-center rounded-xl bg-white/5 border border-white/5 shadow-sm group-hover:scale-110 transition-transform duration-500">
            <div className="scale-125">
              {getProviderIcon(
                model.modelId || model.cleanLabel || model.label,
              ) || getProviderIcon(model.vendorKey)}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <h3
                className="text-[11px] font-bold text-[var(--text-primary)] truncate"
                title={model.modelId}
              >
                {model.cleanLabel}
              </h3>
              {model.modelId && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCopy(model.modelId!);
                  }}
                  className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--accent-primary)] opacity-0 group-hover:opacity-100 transition-all shrink-0"
                  title={model.modelId}
                >
                  {copiedModelId === model.modelId ? (
                    <Check size={10} className="text-green-500" />
                  ) : (
                    <Copy size={10} className="opacity-70" />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="relative p-4 rounded-2xl border bg-[var(--bg-secondary)]/30 hover:bg-[var(--bg-secondary)]/50 border-[var(--glass-border)] hover:border-[var(--accent-primary)]/30 transition-all duration-300 group">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 shrink-0 flex items-center justify-center rounded-2xl bg-white/5 border border-white/5 shadow-sm group-hover:scale-110 transition-transform duration-500">
            <div className="scale-[1.75]">
              {getProviderIcon(
                model.modelId || model.cleanLabel || model.label,
              ) || getProviderIcon(model.vendorKey)}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-col min-w-0">
                <h3
                  className="text-sm font-bold text-[var(--text-primary)] truncate"
                  title={model.modelId}
                >
                  {model.cleanLabel}
                </h3>
              </div>
              {model.modelId && (
                <button
                  onClick={() => onCopy(model.modelId!)}
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--accent-primary)] opacity-0 group-hover:opacity-100 transition-all shrink-0"
                  title={`${t.quota.copyModelId}: ${model.modelId}`}
                >
                  {copiedModelId === model.modelId ? (
                    <Check size={12} className="text-green-500 stroke-[3px]" />
                  ) : (
                    <Copy size={12} className="opacity-70" />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  },
);

ModelCard.displayName = "ModelCard";

export function ModelQuotaModal({
  isOpen,
  onClose,
  email,
  badge: _badge,
  providerId,
  rateLimits,
}: ModelQuotaModalProps) {
  const t = useTranslations();
  const [copiedModelId, setCopiedModelId] = useState<string | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<string>(
    t.quota.allModelsTab,
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    const saved = localStorage.getItem("model-quota-view-mode");
    return (saved as "grid" | "list") || "grid";
  });

  useEffect(() => {
    localStorage.setItem("model-quota-view-mode", viewMode);
  }, [viewMode]);

  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);
  const [listHeight, setListHeight] = useState(500);

  const isCustomProvider = providerId === "custom";

  const allModels: QuotaWindow[] = useMemo(() => {
    const list: QuotaWindow[] = [];
    if (isCustomProvider) {
      if (rateLimits.additional) {
        const seen = new Set<string>();
        rateLimits.additional.forEach((model) => {
          const id = model.modelId || model.label;
          if (!seen.has(id)) {
            list.push(model);
            seen.add(id);
          }
        });
      }
    } else {
      if (rateLimits.primary) list.push(rateLimits.primary);
      if (rateLimits.secondary) list.push(rateLimits.secondary);
      if (rateLimits.codeReview) list.push(rateLimits.codeReview);
      if (rateLimits.additional) {
        rateLimits.additional.forEach((model) => {
          if (!list.some((m) => m.modelId === model.modelId)) {
            list.push(model);
          }
        });
      }
    }
    return sortModelsByDisplayOrder(list);
  }, [isCustomProvider, rateLimits]);

  const processedModels = useMemo<ProcessedQuotaWindow[]>(() => {
    if (!isCustomProvider) return allModels as ProcessedQuotaWindow[];

    return allModels.map((model) => {
      const parts = model.label.split(" · ");
      const rawVendor = parts.length > 1 ? parts[0].trim() : "Other";
      const name =
        parts.length > 1 ? parts.slice(1).join(" · ").trim() : model.label;

      let vendor = rawVendor;
      if (vendor === "Other" || vendor === "Other") {
        const lowerLabel = model.label.toLowerCase();
        if (lowerLabel.includes("glm") || lowerLabel.includes("zhipu"))
          vendor = "Zhipu";
        else if (lowerLabel.includes("grok") || lowerLabel.includes("xai"))
          vendor = "Grok";
        else if (lowerLabel.includes("gpt") || lowerLabel.includes("openai"))
          vendor = "OpenAI";
        else if (lowerLabel.includes("moonshot")) vendor = "Moonshot";
        else if (
          lowerLabel.includes("/kimi") ||
          lowerLabel.includes("kimi") ||
          lowerLabel.includes("kimi-") ||
          lowerLabel.includes("kim-")
        )
          vendor = "Kimi";
        else if (lowerLabel.includes("xiaomi") || lowerLabel.includes("mimo"))
          vendor = "Xiaomi MiMo";
        else if (
          lowerLabel.includes("claude") ||
          lowerLabel.includes("anthropic")
        )
          vendor = "Anthropic";
        else if (lowerLabel.includes("gemini") || lowerLabel.includes("google"))
          vendor = "Google";
      }

      let cleanLabel = name;
      const lowerClean = cleanLabel.toLowerCase();
      const lowerVendor = vendor.toLowerCase();
      const lowerRawVendor = rawVendor.toLowerCase();

      if (
        lowerClean.startsWith(lowerVendor) ||
        lowerClean.startsWith(lowerRawVendor)
      ) {
        const prefixLength = lowerClean.startsWith(lowerRawVendor)
          ? rawVendor.length
          : vendor.length;
        cleanLabel = cleanLabel.substring(prefixLength).trim();
        cleanLabel = cleanLabel.replace(/^[·\-\:\s]+/, "");
      }

      return {
        ...model,
        vendor,
        vendorKey: normalizeVendorIconKey(vendor),
        cleanLabel: cleanLabel || name,
      };
    });
  }, [allModels, isCustomProvider]);

  const vendorTabs = useMemo(() => {
    if (!isCustomProvider) return [];
    const vendors = Array.from(new Set(processedModels.map((m) => m.vendor)));
    return [t.quota.allModelsTab, ...vendors.sort()];
  }, [processedModels, isCustomProvider, t.quota.allModelsTab]);

  const filteredModels = useMemo(() => {
    let result = processedModels;
    if (isCustomProvider && selectedVendor !== t.quota.allModelsTab) {
      result = result.filter((m) => m.vendor === selectedVendor);
    }
    if (searchTerm.trim()) {
      const lowSearch = searchTerm.toLowerCase();
      result = result.filter(
        (m) =>
          m.label.toLowerCase().includes(lowSearch) ||
          m.modelId?.toLowerCase().includes(lowSearch),
      );
    }
    return result;
  }, [
    processedModels,
    isCustomProvider,
    selectedVendor,
    searchTerm,
    t.quota.allModelsTab,
  ]);

  const stats = useMemo(() => {
    const total = filteredModels.length;
    const totalAll = processedModels.length;
    const atLimit = filteredModels.filter(
      (m) => m.limitReached || m.usedPercent >= 100,
    ).length;
    return { total, totalAll, atLimit };
  }, [filteredModels, processedModels]);

  useEffect(() => {
    if (!selectedVendor) return;
    const container = tabsContainerRef.current;
    const activeTab = activeTabRef.current;
    if (!container || !activeTab) return;
    const containerWidth = container.clientWidth;
    const currentScroll = container.scrollLeft;
    const tabLeft = activeTab.offsetLeft;
    const tabRight = tabLeft + activeTab.offsetWidth;
    const maxScroll = container.scrollWidth - containerWidth;
    const padding = 16;
    let target = currentScroll;
    if (tabLeft - padding < currentScroll) {
      target = Math.max(tabLeft - padding, 0);
    } else if (tabRight + padding > currentScroll + containerWidth) {
      target = Math.min(tabRight + padding - containerWidth, maxScroll);
    }
    if (target !== currentScroll) {
      container.scrollTo({ left: target, behavior: "smooth" });
    }
  }, [selectedVendor]);

  useEffect(() => {
    if (!isOpen) return;
    const container = listContainerRef.current;
    if (!container) return;
    const updateHeight = () => setListHeight(container.clientHeight || 500);
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(container);
    return () => observer.disconnect();
  }, [isOpen, viewMode, selectedVendor, searchTerm]);

  const handleCopyModelId = async (modelId: string) => {
    try {
      await navigator.clipboard.writeText(modelId);
      setCopiedModelId(modelId);
      setTimeout(() => setCopiedModelId(null), 2000);
    } catch (err) {
      log.error("Failed to copy model ID:", err);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setSelectedVendor(t.quota.allModelsTab);
    setSearchTerm("");
  }, [isOpen, t.quota.allModelsTab]);

  const modalTitle = (
    <div className="flex flex-col gap-0.5">
      <span className="text-[15px] font-semibold text-[var(--text-primary)]">
        {email}
      </span>
      <span className="text-xs text-[var(--text-muted)]">
        {t.quota.allModelsQuota}
      </span>
    </div>
  );

  const renderVendorBadge = (vendor: string, isSelected?: boolean) => {
    const icon = getProviderIcon(normalizeVendorIconKey(vendor));
    if (!icon) return null;

    return (
      <div
        className={`flex items-center justify-center p-1 rounded-full transition-all duration-300 ${
          isSelected
            ? "bg-white/10 ring-1 ring-white/20 shadow-inner"
            : "bg-white/5 border border-white/5"
        }`}
      >
        <div className="w-3.5 h-3.5 flex items-center justify-center transition-transform duration-300">
          {icon}
        </div>
      </div>
    );
  };

  const flattenedItems = useMemo(() => {
    if (!isCustomProvider) return filteredModels;

    const items: (ProcessedQuotaWindow | string | ProcessedQuotaWindow[])[] =
      [];

    if (selectedVendor === t.quota.allModelsTab && !searchTerm.trim()) {
      // Grouping logic for "All Models" view
      const groups = new Map<string, ProcessedQuotaWindow[]>();
      filteredModels.forEach((model) => {
        const vendor = model.vendor || t.quota.otherVendor;
        if (!groups.has(vendor)) {
          groups.set(vendor, []);
        }
        groups.get(vendor)?.push(model);
      });

      Array.from(groups.entries()).forEach(([vendor, models]) => {
        items.push(`HEADER:${vendor}`);
        if (viewMode === "grid") {
          for (let i = 0; i < models.length; i += 2) {
            items.push(models.slice(i, i + 2));
          }
        } else {
          items.push(...models);
        }
      });
    } else {
      if (viewMode === "grid") {
        for (let i = 0; i < filteredModels.length; i += 2) {
          items.push(filteredModels.slice(i, i + 2));
        }
      } else {
        items.push(...filteredModels);
      }
    }

    return items;
  }, [
    filteredModels,
    isCustomProvider,
    selectedVendor,
    searchTerm,
    t.quota.allModelsTab,
    t.quota.otherVendor,
    viewMode,
  ]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      maxWidth={isCustomProvider ? "max-w-3xl" : "max-w-2xl"}
      onScroll={undefined}
      className="flex flex-col h-[70vh]"
    >
      <div className="flex flex-col h-full overflow-hidden">
        {isCustomProvider ? (
          <div className="flex flex-col h-full -mt-6">
            <div className="flex-none flex flex-col gap-4 bg-[var(--bg-primary)]/80 backdrop-blur-xl z-20 pb-4 -mx-6 px-6 pt-6 border-b border-[var(--glass-border)] shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0 relative group/tabs">
                  <div className="relative flex items-center bg-[var(--bg-secondary)]/30 backdrop-blur-xl rounded-full border border-[var(--glass-border)] shadow-inner overflow-hidden h-[42px]">
                    <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-[var(--bg-secondary)]/50 to-transparent z-20 pointer-events-none opacity-0 group-hover/tabs:opacity-100 transition-opacity" />
                    <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-[var(--bg-secondary)]/50 to-transparent z-20 pointer-events-none opacity-0 group-hover/tabs:opacity-100 transition-opacity" />

                    <div
                      ref={tabsContainerRef}
                      className="overflow-x-auto no-scrollbar flex items-center h-full px-1 w-full mask-linear-fade scroll-smooth"
                      onWheel={(e) => {
                        if (tabsContainerRef.current) {
                          e.stopPropagation();
                          e.preventDefault();
                          tabsContainerRef.current.scrollLeft += e.deltaY;
                        }
                      }}
                    >
                      <div className="flex items-center gap-1 whitespace-nowrap min-w-full">
                        {vendorTabs.map((tab) => {
                          const isSelected = selectedVendor === tab;
                          return (
                            <button
                              key={tab}
                              ref={isSelected ? activeTabRef : null}
                              type="button"
                              onClick={() => setSelectedVendor(tab)}
                              className={`
                                relative px-5 py-2 rounded-full text-xs font-medium transition-colors duration-300 z-10 shrink-0
                                ${
                                  isSelected
                                    ? "text-[var(--text-primary)]"
                                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                }
                              `}
                            >
                              {isSelected && (
                                <motion.div
                                  layoutId="modal-vendor-tab-bg"
                                  className="absolute inset-0 bg-[var(--bg-primary)] border border-[var(--accent-primary)]/30 rounded-full -z-10 shadow-[0_2px_10px_rgba(0,0,0,0.1)]"
                                  transition={{
                                    type: "spring",
                                    bounce: 0.1,
                                    duration: 0.6,
                                  }}
                                />
                              )}
                              <span className="relative flex items-center gap-2">
                                {tab !== t.quota.allModelsTab &&
                                  renderVendorBadge(tab, isSelected)}
                                <span
                                  className={isSelected ? "font-semibold" : ""}
                                >
                                  {tab}
                                </span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center bg-[var(--bg-secondary)]/30 backdrop-blur-md rounded-full p-1 border border-[var(--glass-border)] shrink-0">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-2 rounded-full transition-all duration-300 ${
                      viewMode === "grid"
                        ? "bg-[var(--bg-primary)] text-[var(--accent-primary)] shadow-sm border border-[var(--glass-border)]"
                        : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    }`}
                    title={t.quota.gridView}
                  >
                    <LayoutGrid size={15} />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-2 rounded-full transition-all duration-300 ${
                      viewMode === "list"
                        ? "bg-[var(--bg-primary)] text-[var(--accent-primary)] shadow-sm border border-[var(--glass-border)]"
                        : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    }`}
                    title={t.quota.listView}
                  >
                    <List size={15} />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative flex-1 group">
                  <Search
                    className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${
                      searchTerm
                        ? "text-[var(--accent-primary)]"
                        : "text-[var(--text-dim)] group-focus-within:text-[var(--accent-primary)]"
                    }`}
                    size={16}
                  />
                  <input
                    className="w-full pl-11 pr-4 py-2.5 bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--glass-border)] rounded-full outline-none focus:border-[rgba(var(--accent-primary-rgb),0.5)] focus:ring-4 focus:ring-[rgba(var(--accent-primary-rgb),0.1)] transition-all text-sm placeholder:text-[var(--text-dim)] shadow-inner appearance-none"
                    placeholder={t.quota.searchModels}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-[var(--surface-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <div
                    className="px-4 py-2 bg-[var(--bg-secondary)]/30 border border-[var(--glass-border)] rounded-full flex items-center gap-2"
                    title={t.quota.totalModels}
                  >
                    <Info size={14} className="text-[var(--accent-primary)]" />
                    <span className="text-sm font-mono font-bold text-[var(--text-primary)]">
                      {searchTerm.trim() ||
                      selectedVendor !== t.quota.allModelsTab
                        ? `${stats.total}/${stats.totalAll}`
                        : stats.totalAll}
                    </span>
                  </div>
                  {isCustomProvider
                    ? null
                    : stats.atLimit > 0 && (
                        <div
                          className="px-4 py-2 bg-red-500/5 border border-red-500/20 rounded-full flex items-center gap-2 animate-pulse"
                          title={t.quota.atLimit}
                        >
                          <AlertCircle size={14} className="text-red-500" />
                          <span className="text-sm font-mono font-bold text-red-500">
                            {stats.atLimit}
                          </span>
                        </div>
                      )}
                </div>
              </div>
            </div>

            <div
              ref={listContainerRef}
              className="flex-1 min-h-0 bg-[var(--bg-primary)]/30 p-4"
            >
              {flattenedItems.length > 0 ? (
                <VirtualList
                  key={`${viewMode}-${selectedVendor}-${searchTerm}`}
                  items={flattenedItems}
                  height={listHeight}
                  className="h-full"
                  getItemHeight={(index) => {
                    const item = flattenedItems[index];
                    if (typeof item === "string" && item.startsWith("HEADER:"))
                      return 40;
                    return viewMode === "grid" ? 64 : 96;
                  }}
                  renderItem={(item, _index, style) => {
                    if (
                      typeof item === "string" &&
                      item.startsWith("HEADER:")
                    ) {
                      return (
                        <div style={style} className="flex items-center px-2">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)] px-1">
                            {item.replace("HEADER:", "")}
                          </div>
                        </div>
                      );
                    }

                    if (Array.isArray(item)) {
                      return (
                        <div
                          style={{ ...style, paddingBottom: 6 }}
                          className="px-1 flex gap-3"
                        >
                          {item.map((model) => (
                            <div
                              key={model.modelId || model.label}
                              className="flex-1 min-w-0"
                            >
                              <ModelCard
                                model={model}
                                viewMode={viewMode}
                                t={t}
                                copiedModelId={copiedModelId}
                                onCopy={handleCopyModelId}
                              />
                            </div>
                          ))}
                          {item.length === 1 && <div className="flex-1" />}
                        </div>
                      );
                    }

                    const model = item as ProcessedQuotaWindow;
                    const listPadding = viewMode === "list" ? 12 : 8;
                    return (
                      <div
                        style={{ ...style, paddingBottom: listPadding }}
                        className="px-1"
                      >
                        <ModelCard
                          model={model}
                          viewMode={viewMode}
                          t={t}
                          copiedModelId={copiedModelId}
                          onCopy={handleCopyModelId}
                        />
                      </div>
                    );
                  }}
                />
              ) : (
                <div className="h-full flex flex-col items-center justify-center gap-3 text-[var(--text-muted)]">
                  <Search size={32} className="opacity-20" />
                  <p className="text-sm">{t.quota.noModelsFound}</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {allModels.map((model) => (
                <div
                  key={model.modelId ?? model.label}
                  className="p-4 bg-[var(--bg-secondary)]/40 rounded-2xl border border-[var(--glass-border)] hover:bg-[var(--bg-secondary)]/60 transition-all duration-300 group relative"
                >
                  <QuotaWindowBar
                    label={formatModelLabel(model.label)}
                    extraLabel={
                      model.modelId && (
                        <button
                          onClick={() => handleCopyModelId(model.modelId!)}
                          className="ml-1 p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] opacity-0 group-hover:opacity-100 transition-all duration-200 focus:opacity-100 flex items-center justify-center"
                          title={
                            copiedModelId === model.modelId
                              ? t.quota.copiedModelId
                              : `${t.quota.copyModelId}: ${model.modelId}`
                          }
                        >
                          {copiedModelId === model.modelId ? (
                            <Check
                              size={12}
                              className="text-green-500 stroke-[3px]"
                            />
                          ) : (
                            <Copy size={12} className="opacity-70" />
                          )}
                        </button>
                      )
                    }
                    usedPercent={model.usedPercent}
                    resetIn={model.resetIn}
                    limitReached={model.limitReached}
                    providerId={providerId}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
