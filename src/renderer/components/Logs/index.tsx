import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  RotateCw,
  Trash2,
  X,
  Copy,
  Check,
  ChevronDown,
  FileText,
  Info,
  Code,
  Loader2,
} from "lucide-react";
import { useTranslations } from "../../stores/settings";
import { getProviderIcon } from "../icons/ProviderIcons";
import { useRequestLogs } from "../../hooks/useRequestLogs";
import { RequestLogEntry } from "../../types/logs";

const JsonViewer = ({ data }: { data: string }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!data)
    return <span className="text-[var(--text-dim)] italic">No content</span>;

  const lines = data.split("\n");
  const isLong = lines.length > 20;

  const renderTokens = (json: string) => {
    const regex =
      /((?:"(?:\\.|[^"\\])*")(?:\s*:)?|\b(?:true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?|[{}[\],])/g;

    return json
      .split(regex)
      .filter(Boolean)
      .map((token, i) => {
        let className = "text-[var(--text-primary)]";

        if (token.match(/^[{}[\],]$/)) {
          className = "text-[var(--text-primary)] opacity-40";
        } else if (token.match(/^"(?:\\.|[^"\\])*"\s*:$/)) {
          className = "text-[var(--accent-primary)] font-bold";
        } else if (token.startsWith('"')) {
          className = "text-[var(--accent-secondary)] font-medium";
        } else if (token.match(/^-?\d/)) {
          className = "text-[var(--accent-tertiary)] font-bold";
        } else if (token.match(/^(true|false|null)$/)) {
          className = "text-[var(--warning)] font-bold";
        }

        return (
          <span key={i} className={className}>
            {token}
          </span>
        );
      });
  };

  return (
    <div className="relative group/code flex-1 min-h-0 flex flex-col">
      <div
        className={`relative p-5 rounded-xl text-[13px] font-mono overflow-auto custom-scrollbar whitespace-pre-wrap break-all leading-relaxed bg-[var(--bg-deep)] border border-[var(--glass-border)] shadow-inner transition-all duration-300 ${isExpanded ? "flex-1" : "max-h-[300px]"}`}
      >
        {renderTokens(data)}
      </div>

      {isLong && !isExpanded && (
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[var(--bg-deep)] to-transparent flex items-end justify-center pb-4 rounded-b-xl pointer-events-none">
          <button
            onClick={() => setIsExpanded(true)}
            className="pointer-events-auto px-4 py-1.5 rounded-full bg-[var(--bg-primary)] border border-[var(--glass-border)] text-[11px] font-bold text-[var(--text-primary)] shadow-lg hover:border-[var(--accent-primary)]/50 transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2"
          >
            <span>Expand JSON</span>
            <span className="px-1.5 py-0.5 rounded-md bg-[var(--bg-secondary)] text-[var(--text-primary)] opacity-50 text-[10px]">
              {lines.length} lines
            </span>
          </button>
        </div>
      )}

      {isExpanded && (
        <button
          onClick={() => setIsExpanded(false)}
          className="absolute top-3 right-3 p-1.5 rounded-lg bg-[var(--bg-primary)]/80 backdrop-blur border border-[var(--glass-border)] text-[var(--text-primary)] opacity-60 hover:opacity-100 transition-all opacity-0 group-hover/code:opacity-100 z-10"
          title="Collapse"
        >
          <ChevronDown className="w-3.5 h-3.5 rotate-180" />
        </button>
      )}
    </div>
  );
};

export function Logs() {
  const t = useTranslations();
  const [filter, setFilter] = useState<"all" | "success" | "error">("all");
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [selectedLog, setSelectedLog] = useState<RequestLogEntry | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isProviderOpen, setIsProviderOpen] = useState(false);
  const providerButtonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });
  const { logs, refresh } = useRequestLogs(100);

  const uniqueProviders = Array.from(
    new Set(logs.map((log) => log.provider).filter((p): p is string => !!p)),
  ).sort();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        providerButtonRef.current &&
        !providerButtonRef.current.contains(event.target as Node) &&
        !(event.target as Element).closest(".provider-dropdown")
      ) {
        setIsProviderOpen(false);
      }
    }

    if (isProviderOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("scroll", updateDropdownPosition, true);
      window.addEventListener("resize", updateDropdownPosition);
      updateDropdownPosition();
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", updateDropdownPosition, true);
      window.removeEventListener("resize", updateDropdownPosition);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", updateDropdownPosition, true);
      window.removeEventListener("resize", updateDropdownPosition);
    };
  }, [isProviderOpen]);

  const updateDropdownPosition = () => {
    if (providerButtonRef.current) {
      const rect = providerButtonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        left: rect.left,
        width: Math.max(rect.width, 192),
      });
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (filter !== "all" && log.status !== filter) return false;
    if (providerFilter !== "all" && log.provider !== providerFilter)
      return false;
    return true;
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const handleDeleteAll = async () => {
    setIsDeleting(true);
    try {
      const result = await window.electronAPI?.logs?.deleteAll();
      if (result?.success) {
        setShowDeleteConfirm(false);
        refresh();
      } else {
        alert(t.logs.deleteFailed);
      }
    } catch (error) {
      console.error("[Logs] Delete failed:", error);
      alert(t.logs.deleteFailed);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusColor = (statusCode: number) => {
    if (statusCode >= 200 && statusCode < 300)
      return "text-green-700/80 bg-green-500/10 border-green-500/20 dark:text-[#4ade80] dark:bg-[#4ade80]/10 dark:border-[#4ade80]/10";
    if (statusCode >= 400)
      return "text-red-700/80 bg-red-500/10 border-red-500/20 dark:text-[#f87171] dark:bg-[#f87171]/10 dark:border-[#f87171]/10";
    return "text-yellow-700/80 bg-yellow-500/10 border-yellow-500/20 dark:text-[#fbbf24] dark:bg-[#fbbf24]/10 dark:border-[#fbbf24]/10";
  };

  const getStatusBadge = (statusCode: number) => {
    const isSuccess = statusCode >= 200 && statusCode < 300;
    const isError = statusCode >= 400;

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all duration-300 ${getStatusColor(statusCode)}`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${isSuccess ? "bg-[var(--success)] animate-pulse" : isError ? "bg-[var(--error)]" : "bg-[var(--warning)]"}`}
        ></span>
        {statusCode}
      </span>
    );
  };

  const formatTimestamp = (timestamp: string) => {
    if (!timestamp) return "-";
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return timestamp;

      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      const seconds = String(date.getSeconds()).padStart(2, "0");

      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    } catch {
      return timestamp;
    }
  };

  const formatRequestBody = (body?: string) => {
    if (!body) return "";
    try {
      const parsed = JSON.parse(body);

      if (parsed.input && Array.isArray(parsed.input)) {
        const lastUserMessage = [...parsed.input]
          .reverse()
          .find(
            (msg: { role?: string; content?: Array<{ type?: string }> }) =>
              msg.role === "user" && msg.content?.[0]?.type === "input_text",
          );

        if (lastUserMessage) {
          const simplified = {
            ...parsed,
            input: [lastUserMessage],
            _note: `Showing last user message only (${parsed.input.length} total messages in conversation)`,
          };
          return JSON.stringify(simplified, null, 2);
        }
      }

      return JSON.stringify(parsed, null, 2);
    } catch {
      return body;
    }
  };

  return (
    <div className="flex flex-col h-full p-2 space-y-4">
      <div className="glass-card flex flex-col xl:flex-row items-start xl:items-center justify-between p-4 gap-4 bg-[var(--bg-primary)]/40 backdrop-blur-xl border border-[var(--glass-border)] rounded-2xl shadow-lg relative z-20 group">
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent-primary)]/5 via-transparent to-[var(--accent-secondary)]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none rounded-2xl" />

        <div className="flex items-center gap-4 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-primary)] border border-[var(--glass-border)] flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] group-hover:border-[var(--accent-primary)]/30 transition-colors duration-300">
            <FileText className="w-6 h-6 text-[var(--accent-primary)] drop-shadow-[0_0_8px_rgba(var(--accent-primary),0.5)]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
              {t.logs.title}
            </h2>
            <p className="text-[var(--text-muted)] text-sm font-medium mt-0.5">
              {t.logs.subtitle}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto relative z-10">
          <div className="flex items-center gap-1">
            {[
              {
                key: "all",
                label: t.logs.all,
              },
              {
                key: "success",
                label: t.logs.success,
              },
              {
                key: "error",
                label: t.logs.error,
              },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key as "all" | "success" | "error")}
                className={`relative px-4 py-2 text-xs font-bold transition-all duration-300 group/tab ${
                  filter === f.key
                    ? "text-[var(--accent-primary)] drop-shadow-[0_0_8px_rgba(var(--accent-primary),0.6)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:drop-shadow-[0_0_5px_rgba(255,255,255,0.2)]"
                }`}
              >
                {f.label}
                <span
                  className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 bg-[var(--accent-primary)] rounded-full transition-all duration-300 shadow-[0_0_8px_var(--accent-primary)] ${
                    filter === f.key
                      ? "w-1/2 opacity-100"
                      : "w-0 opacity-0 group-hover/tab:w-1/4 group-hover/tab:opacity-50"
                  }`}
                />
              </button>
            ))}
          </div>

          <div className="h-6 w-px bg-[var(--glass-border)] hidden sm:block mx-1 opacity-50" />

          <div className="relative">
            <button
              ref={providerButtonRef}
              onClick={() => {
                if (!isProviderOpen) updateDropdownPosition();
                setIsProviderOpen(!isProviderOpen);
              }}
              className={`relative pl-4 pr-10 py-2 rounded-xl text-xs font-medium transition-all duration-300 border backdrop-blur-md min-w-[140px] text-left group ${
                isProviderOpen
                  ? "bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]/30 text-[var(--accent-primary)] shadow-[0_0_15px_-5px_var(--accent-primary)]"
                  : "bg-[var(--bg-secondary)]/30 border-[var(--glass-border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]/50 hover:border-[var(--glass-border-hover)] shadow-sm"
              }`}
            >
              <span className="block truncate">
                {providerFilter === "all"
                  ? t.logs.allProviders
                  : providerFilter}
              </span>
              <ChevronDown
                className={`absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 transition-transform duration-300 ${
                  isProviderOpen
                    ? "rotate-180 text-[var(--accent-primary)]"
                    : "text-[var(--text-dim)] group-hover:text-[var(--text-muted)]"
                }`}
              />
            </button>

            {isProviderOpen &&
              createPortal(
                <div
                  className="provider-dropdown fixed max-h-[300px] overflow-y-auto custom-scrollbar bg-[var(--bg-primary)]/95 backdrop-blur-xl border border-[var(--glass-border)] rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] z-[100] py-1 animate-in fade-in zoom-in-95 duration-200 ring-1 ring-[var(--glass-border)]"
                  style={{
                    top: dropdownPosition.top,
                    left: dropdownPosition.left,
                    minWidth: dropdownPosition.width,
                  }}
                >
                  <div
                    onClick={() => {
                      setProviderFilter("all");
                      setIsProviderOpen(false);
                    }}
                    className={`px-3 py-2 text-xs cursor-pointer transition-colors flex items-center justify-between group ${
                      providerFilter === "all"
                        ? "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
                        : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-primary)]/5"
                    }`}
                  >
                    <span>{t.logs.allProviders}</span>
                    {providerFilter === "all" && (
                      <Check className="w-3 h-3 text-[var(--accent-primary)]" />
                    )}
                  </div>

                  {uniqueProviders.length > 0 && (
                    <div className="h-px bg-[var(--glass-border)] mx-2 my-1 opacity-50" />
                  )}

                  {uniqueProviders.map((provider) => (
                    <div
                      key={provider}
                      onClick={() => {
                        setProviderFilter(provider);
                        setIsProviderOpen(false);
                      }}
                      className={`px-3 py-2 text-xs cursor-pointer transition-colors flex items-center justify-between group ${
                        providerFilter === provider
                          ? "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
                          : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-primary)]/5"
                      }`}
                    >
                      <span className="truncate">{provider}</span>
                      {providerFilter === provider && (
                        <Check className="w-3 h-3 text-[var(--accent-primary)]" />
                      )}
                    </div>
                  ))}
                </div>,
                document.body,
              )}
          </div>

          <div className="flex items-center gap-2 ml-auto xl:ml-0 pl-2">
            <button
              onClick={handleRefresh}
              className={`p-2.5 text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10 border border-transparent hover:border-[var(--accent-primary)]/20 rounded-xl transition-all active:scale-95 ${isRefreshing ? "animate-spin text-[var(--accent-primary)]" : ""}`}
              title={t.logs.refresh}
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2.5 text-red-500/70 hover:text-red-500 hover:scale-110 transition-all active:scale-95"
              title={t.logs.deleteAll}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="glass-card flex-1 flex flex-col min-h-0 overflow-hidden border border-[var(--glass-border)] shadow-2xl bg-[var(--bg-primary)]/40 backdrop-blur-xl rounded-2xl relative">
        <div className="grid grid-cols-[160px_120px_1fr_1fr_100px] gap-4 px-6 py-3 bg-white/[0.02] border-b border-[var(--glass-border)] text-[11px] uppercase tracking-[0.1em] font-medium text-[var(--text-muted)] select-none sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center gap-2">{t.logs.time}</div>
          <div>{t.logs.provider}</div>
          <div>{t.logs.account}</div>
          <div>{t.logs.model}</div>
          <div className="text-right pr-2">{t.logs.status}</div>
        </div>

        <div
          className={`flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[var(--glass-border)] hover:scrollbar-thumb-[var(--accent-primary)]/30 scrollbar-track-transparent ${
            filteredLogs.length === 0 ? "flex flex-col" : ""
          }`}
        >
          {filteredLogs.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-6 animate-in fade-in duration-500 min-h-[400px]">
              <div className="relative group">
                <div className="absolute inset-0 bg-[var(--accent-primary)]/10 blur-[60px] rounded-full transition-opacity duration-700 opacity-50 group-hover:opacity-100" />
                <div className="w-20 h-20 rounded-2xl bg-[var(--bg-secondary)]/30 border border-[var(--glass-border)] flex items-center justify-center relative backdrop-blur-sm shadow-sm group-hover:scale-105 transition-transform duration-500">
                  <FileText className="w-8 h-8 text-[var(--text-dim)]/50 group-hover:text-[var(--accent-primary)]/50 transition-colors duration-500" />
                </div>
              </div>
              <div className="text-center relative z-10 space-y-1">
                <p className="text-sm font-medium text-[var(--text-muted)] tracking-wide">
                  {t.logs.noLogs}
                </p>
                <p className="text-xs text-[var(--text-dim)] opacity-60">
                  {t.logs.waitingForRequests}
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-[var(--glass-border)]/50">
              {filteredLogs.map((log, index) => (
                <div
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className="group grid grid-cols-[160px_120px_1fr_1fr_100px] gap-4 px-6 py-4 hover:bg-white/[0.03] transition-all duration-300 ease-out cursor-pointer items-center text-xs relative overflow-hidden"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-[var(--accent-primary)] transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300 shadow-[0_0_8px_var(--accent-primary)]" />

                  <div className="flex flex-col gap-0.5">
                    <span className="font-mono text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors">
                      {formatTimestamp(log.time).split(" ")[1]}
                    </span>
                    <span className="text-[10px] text-[var(--text-dim)] font-mono opacity-60">
                      {formatTimestamp(log.time).split(" ")[0]}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 min-w-0">
                    {log.provider ? (
                      <span className="w-5 h-5 flex items-center justify-center text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors flex-shrink-0 opacity-80">
                        {getProviderIcon(log.provider, "w-4 h-4")}
                      </span>
                    ) : null}
                    <span
                      className="truncate font-medium text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors"
                      title={log.provider}
                    >
                      {log.provider || "-"}
                    </span>
                  </div>

                  <div
                    className="truncate font-mono text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors opacity-90"
                    title={log.account}
                  >
                    {log.account || "-"}
                  </div>

                  <div
                    className="truncate font-medium text-[var(--accent-primary)] opacity-80 group-hover:opacity-100 transition-opacity"
                    title={log.model}
                  >
                    {log.model || "-"}
                  </div>

                  <div className="flex justify-end">
                    {getStatusBadge(log.statusCode)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedLog && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="fixed inset-0 bg-[var(--overlay-bg)] backdrop-blur-xl animate-in fade-in duration-300"
            style={{ WebkitBackdropFilter: "blur(24px)" }}
          />

          <div
            className="relative w-full max-w-4xl max-h-[85vh] flex flex-col rounded-2xl overflow-hidden animate-in zoom-in-95 duration-300 shadow-[0_0_60px_-15px_rgba(0,0,0,0.2)] dark:shadow-[0_0_60px_-15px_rgba(0,0,0,0.8)] border border-[var(--glass-border)] group isolation-isolate"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute inset-0 bg-[var(--bg-primary)]/90 backdrop-blur-3xl z-[-1]" />

            <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-primary)]/5 via-[var(--bg-primary)]/95 to-[var(--accent-secondary)]/5 z-[-1]" />

            <div
              className="absolute -top-[20%] -right-[10%] w-[600px] h-[600px] bg-[var(--accent-primary)]/15 blur-[120px] rounded-full pointer-events-none animate-pulse"
              style={{ animationDuration: "4s" }}
            />
            <div
              className="absolute -bottom-[20%] -left-[10%] w-[600px] h-[600px] bg-[var(--accent-secondary)]/15 blur-[120px] rounded-full pointer-events-none animate-pulse"
              style={{ animationDuration: "5s" }}
            />

            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[var(--accent-primary)] to-transparent opacity-80 shadow-[0_0_20px_var(--accent-primary)] z-20" />

            <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-[var(--glass-border)] pointer-events-none z-20" />
            <div className="absolute inset-0 rounded-2xl shadow-[inset_0_0_40px_rgba(var(--accent-primary),0.05)] pointer-events-none z-20" />

            <div className="relative z-10 flex flex-col h-full min-h-0">
              <div className="flex-none flex items-center justify-between px-6 py-5 border-b border-[var(--glass-border)] bg-[var(--bg-secondary)]/20 backdrop-blur-sm">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-[var(--accent-primary)] text-white border border-[var(--accent-primary)]/20 shadow-[0_0_20px_-5px_var(--accent-primary)] transition-all duration-500">
                    <Info className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-[var(--text-primary)] drop-shadow-[0_2px_10px_rgba(0,0,0,0.3)] tracking-tight">
                      {t.logs.detail}
                    </h3>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {getStatusBadge(selectedLog.statusCode)}
                  <div className="h-8 w-px bg-[var(--glass-border)]" />
                  <button
                    onClick={() => setSelectedLog(null)}
                    className="text-[var(--text-primary)]/70 hover:text-[var(--text-primary)] hover:bg-white/10 transition-all p-2 rounded-xl"
                  >
                    <X />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 min-h-0 relative">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(var(--glass-border),0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(var(--glass-border),0.1)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none opacity-20" />

                <div className="relative z-10 space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      {
                        label: t.logs.time,
                        value: formatTimestamp(selectedLog.timestamp),
                        font: "font-mono",
                      },
                      {
                        label: t.logs.provider,
                        value: selectedLog.provider,
                        icon: selectedLog.provider
                          ? getProviderIcon(selectedLog.provider, "w-4 h-4")
                          : null,
                      },
                      {
                        label: t.logs.model,
                        value: selectedLog.model,
                        color:
                          "text-[var(--accent-primary)] drop-shadow-[0_0_8px_rgba(var(--accent-primary),0.4)]",
                      },
                      {
                        label: t.logs.account,
                        value: selectedLog.account,
                        truncate: true,
                      },
                    ].map((item, i) => (
                      <div
                        key={i}
                        className="bg-[var(--bg-deep)] p-4 rounded-2xl border border-white/10 hover:border-[var(--accent-primary)]/40 transition-all group/card shadow-sm hover:shadow-[0_0_20px_-10px_var(--accent-primary)] relative overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-[var(--accent-primary)]/5 opacity-0 group-hover/card:opacity-100 transition-opacity" />
                        <label className="text-[10px] text-[var(--text-primary)]/60 uppercase tracking-widest font-bold block mb-2 transition-colors relative z-10">
                          {item.label}
                        </label>
                        <div
                          className={`text-sm text-[var(--text-primary)] font-bold relative z-10 flex items-center gap-2 ${item.truncate ? "truncate" : ""} ${item.font || ""} ${item.color || ""}`}
                          title={item.value}
                        >
                          {item.icon && (
                            <span className="flex-shrink-0">{item.icon}</span>
                          )}
                          <span className={item.truncate ? "truncate" : ""}>
                            {item.value || "-"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col h-full min-h-[300px]">
                    <div className="flex items-center justify-between mb-3 px-1">
                      <label className="text-[10px] text-[var(--text-primary)]/70 uppercase tracking-widest font-bold flex items-center gap-2">
                        <Code className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                        <span className="drop-shadow-[0_0_5px_rgba(0,0,0,0.2)]">
                          {t.logs.requestBody}
                        </span>
                      </label>
                      <button
                        onClick={() =>
                          handleCopy(formatRequestBody(selectedLog.requestBody))
                        }
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white/5 border border-white/10 text-[var(--text-primary)] hover:bg-white/10 transition-all shadow-sm"
                      >
                        {copied ? (
                          <Check className="w-3.5 h-3.5 text-[var(--success)]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        {copied ? "Copied!" : "Copy JSON"}
                      </button>
                    </div>

                    <div className="relative group/code flex-1 flex flex-col min-h-0">
                      <div className="absolute -inset-0.5 bg-gradient-to-br from-[var(--accent-primary)]/20 to-[var(--accent-secondary)]/20 rounded-xl opacity-0 group-hover/code:opacity-100 transition-opacity duration-500 blur-sm" />

                      <div className="relative z-10 flex-1 min-h-0 flex flex-col">
                        <JsonViewer
                          data={formatRequestBody(selectedLog.requestBody)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div
          className="fixed inset-0 bg-[var(--overlay-bg)] backdrop-blur-xl flex items-center justify-center z-[60] animate-in fade-in duration-200"
          style={{ WebkitBackdropFilter: "blur(24px)" }}
        >
          <div className="glass-card w-[420px] p-0 rounded-2xl border border-[var(--glass-border)] bg-[var(--bg-primary)] shadow-[0_0_50px_rgba(0,0,0,0.2)] dark:shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="p-8 pb-6 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-[var(--error)]/10 flex items-center justify-center text-[var(--error)] mb-5 shadow-[0_0_20px_rgba(255,69,58,0.2)]">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">
                {t.logs.deleteConfirm}
              </h3>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed px-4">
                {t.logs.deleteDesc}
              </p>
            </div>

            <div className="flex border-t border-[var(--glass-border)] bg-[var(--bg-secondary)]/30">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 py-4 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-colors"
              >
                {t.logs.cancel}
              </button>
              <div className="w-px bg-[var(--glass-border)]" />
              <button
                onClick={handleDeleteAll}
                disabled={isDeleting}
                className="flex-1 py-4 text-sm font-bold text-[var(--error)] hover:bg-[var(--error)]/10 transition-colors relative overflow-hidden"
              >
                {isDeleting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="animate-spin h-4 w-4" />
                    {t.logs.deleting}
                  </span>
                ) : (
                  t.logs.delete
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
