import { Dispatch, SetStateAction } from "react";
import { ChevronRight } from "lucide-react";

import { useTranslations } from "../../stores/settings";
import { getCustomProviderIcon } from "../icons/ProviderIcons";
import { AmpcodeCompatProvider } from "./types";

interface RoutingProtocolSectionProps {
  routingExpanded: boolean;
  setRoutingExpanded: Dispatch<SetStateAction<boolean>>;
  ampcodeProvider: AmpcodeCompatProvider | null;
  ampcodeMappedKeyCount: number;
  onOpenAmpcodeSettings: () => void;
}

export function RoutingProtocolSection({
  routingExpanded,
  setRoutingExpanded,
  ampcodeProvider,
  ampcodeMappedKeyCount,
  onOpenAmpcodeSettings,
}: RoutingProtocolSectionProps) {
  const t = useTranslations();

  return (
    <section>
      <div
        className={`flex items-center gap-3 mb-6 cursor-pointer group/section px-4 py-3 rounded-xl border transition-all duration-200 ${
          routingExpanded
            ? "bg-[var(--text-primary)]/[0.05] border-[var(--glass-border-hover)]"
            : "bg-transparent border-transparent hover:bg-[var(--text-primary)]/[0.03] hover:border-[var(--glass-border)]"
        }`}
        onClick={() => setRoutingExpanded(!routingExpanded)}
      >
        <div
          className={`flex-shrink-0 transition-transform duration-300 ${routingExpanded ? "rotate-90 text-[var(--accent-primary)]" : "text-[var(--text-dim)]"}`}
        >
          <ChevronRight className="w-4 h-4" />
        </div>
        <h3
          className={`text-xs font-bold text-[var(--text-primary)] uppercase tracking-[0.15em] transition-opacity duration-200 ${routingExpanded ? "opacity-80" : "opacity-40 group-hover/section:opacity-60"}`}
        >
          {t.providers.routingProtocol}
        </h3>
        <div className="flex-1" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <div className="group/card relative flex flex-col p-6 rounded-3xl glass-card transition-all duration-300 border border-[rgba(255,255,255,0.04)]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="text-3xl">{getCustomProviderIcon("ampcode")}</div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-base text-[var(--text-primary)] leading-tight">
                    {t.providers.ampcodeSettingsTitle}
                  </h4>
                  <span className="px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider rounded bg-[var(--text-primary)]/5 text-[var(--text-dim)]">
                    {t.providers.protocol}
                  </span>
                </div>
                <p className="text-[10px] font-mono text-[var(--text-dim)] mt-1 tracking-tighter opacity-70">
                  {ampcodeProvider?.["upstream-url"] || "https://ampcode.com"}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span
                className={`text-[10px] font-bold uppercase tracking-wider ${
                  ampcodeProvider
                    ? "text-emerald-500"
                    : "text-[var(--text-dim)]"
                }`}
              >
                {ampcodeProvider
                  ? t.providers.ampcodeConfigured
                  : t.providers.ampcodeNotConfigured}
              </span>
              <button
                onClick={onOpenAmpcodeSettings}
                className="px-4 py-2 bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-hover)] border border-[var(--glass-border)] rounded-full text-xs text-[var(--text-primary)] font-bold tracking-wider transition-all duration-200"
              >
                {t.providers.ampcodeConfigure}
              </button>
            </div>
          </div>

          {routingExpanded && (
            <div className="flex items-center gap-6 mt-6 pt-5 border-t border-[var(--text-primary)]/5 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="space-y-0.5">
                <p className="text-[9px] font-bold text-[var(--text-dim)] uppercase tracking-wider">
                  Keys
                </p>
                <p className="text-sm font-bold text-[var(--text-primary)] font-mono">
                  {ampcodeMappedKeyCount +
                    (ampcodeProvider?.["upstream-api-key"] ? 1 : 0)}
                </p>
              </div>
              <div className="w-px h-6 bg-[var(--text-primary)]/5" />
              <div className="space-y-0.5">
                <p className="text-[9px] font-bold text-[var(--text-dim)] uppercase tracking-wider">
                  Models
                </p>
                <p className="text-sm font-bold text-[var(--text-primary)] font-mono">
                  {ampcodeProvider?.["model-mappings"]?.length || 0}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
