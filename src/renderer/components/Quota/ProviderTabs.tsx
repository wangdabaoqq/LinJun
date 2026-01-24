import React from "react";
import { motion } from "motion/react";
import { getProviderIcon } from "../icons/ProviderIcons";

interface Provider {
  id: string;
  name: string;
  accountCount: number;
  color: "teal" | "magenta" | "indigo";
}

interface ProviderTabsProps {
  providers: Provider[];
  selected: string;
  onSelect: (id: string) => void;
}

export function ProviderTabs({
  providers,
  selected,
  onSelect,
}: ProviderTabsProps) {
  return (
    <div className="flex justify-center">
      <div className="relative inline-flex p-1.5 bg-[var(--glass-bg)]/60 backdrop-blur-2xl rounded-2xl border border-[var(--glass-border)] shadow-xl">
        {providers.map((provider) => {
          const isSelected = selected === provider.id;

          return (
            <button
              key={provider.id}
              onClick={() => onSelect(provider.id)}
              className={`
                relative flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 z-10
                ${isSelected ? "text-white" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"}
              `}
            >
              {isSelected && (
                <motion.div
                  layoutId="active-provider-bg"
                  className="absolute inset-0 bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] rounded-xl -z-10 shadow-lg shadow-[var(--accent-primary)]/25"
                  transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                />
              )}

              <span
                className={`text-base transition-all duration-300 w-5 h-5 flex items-center justify-center ${isSelected ? "scale-110" : "opacity-70 group-hover:opacity-100"}`}
              >
                {getProviderIcon(provider.id)}
              </span>

              <span>{provider.name}</span>

              {provider.accountCount > 0 && (
                <span
                  className={`
                    ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold leading-none transition-all duration-300
                    ${
                      isSelected
                        ? "bg-white/20 text-white"
                        : "bg-[var(--surface-hover)] text-[var(--text-dim)] border border-[var(--border-subtle)]"
                    }
                  `}
                >
                  {provider.accountCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
