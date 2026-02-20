import React, { useRef, useEffect } from "react";
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
  const tabsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = tabsRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      if (e.deltaY === 0) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY * 1.8;
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  return (
    <div className="flex justify-center max-w-full">
      <div className="relative max-w-full group/tabs">
        <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-[var(--glass-bg)] to-transparent z-20 pointer-events-none rounded-l-2xl opacity-0 group-hover/tabs:opacity-100 transition-opacity" />
        <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-[var(--glass-bg)] to-transparent z-20 pointer-events-none rounded-r-2xl opacity-0 group-hover/tabs:opacity-100 transition-opacity" />

        <div
          ref={tabsRef}
          className="flex items-center p-1.5 bg-[var(--glass-bg)]/60 backdrop-blur-2xl rounded-2xl border border-[var(--glass-border)] shadow-xl overflow-x-auto no-scrollbar scroll-smooth"
        >
          {providers.map((provider) => {
            const isSelected = selected === provider.id;

            return (
              <button
                key={provider.id}
                onClick={(e) => {
                  onSelect(provider.id);
                  e.currentTarget.scrollIntoView({
                    behavior: "smooth",
                    block: "nearest",
                    inline: "center",
                  });
                }}
                className={`
                  relative flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 z-10 shrink-0 whitespace-nowrap
                  ${
                    isSelected
                      ? "text-white shadow-sm"
                      : "text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-[var(--text-primary)]/[0.03] hover:bg-[var(--text-primary)]/[0.06]"
                  }
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
                      ml-1.5 px-2.5 py-0 rounded text-[10px] font-bold tabular-nums transition-all duration-300
                      ${
                        isSelected
                          ? "bg-white/20 text-white"
                          : "bg-[var(--text-primary)]/[0.1] text-[var(--text-muted)]"
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
    </div>
  );
}
