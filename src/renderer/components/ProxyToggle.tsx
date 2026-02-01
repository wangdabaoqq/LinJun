"use client";

import { useEffect, useState } from "react";
import {
  useProxy,
  startProxy,
  stopProxy,
  fetchProxyStatus,
  useTranslations,
} from "../stores/settings";
import { cn } from "@renderer/lib/utils";
import { PauseIcon } from "./ui/pause";
import { PlayIcon } from "./ui/play";

export function ProxyToggle() {
  const t = useTranslations();
  const {
    proxyRunning: _proxyRunning,
    proxyLoading,
    setProxyRunning,
    setProxyLoading,
    port,
  } = useProxy();
  const [localRunning, setLocalRunning] = useState(false);

  useEffect(() => {
    const initStatus = async () => {
      const running = await fetchProxyStatus();
      setLocalRunning(running);
      setProxyRunning(running);
    };
    initStatus();

    if (
      typeof window !== "undefined" &&
      window.electronAPI?.proxy?.onStatusChange
    ) {
      const unsubscribe = window.electronAPI.proxy.onStatusChange((running) => {
        setLocalRunning(running);
        setProxyRunning(running);
      });
      return () => {
        unsubscribe();
      };
    }
  }, [setProxyRunning]);

  const handleToggle = async () => {
    if (proxyLoading) return;

    setProxyLoading(true);
    try {
      if (localRunning) {
        const success = await stopProxy();
        if (success) {
          setLocalRunning(false);
          setProxyRunning(false);
        }
      } else {
        const success = await startProxy();
        if (success) {
          setLocalRunning(true);
          setProxyRunning(true);
        }
      }
    } finally {
      setProxyLoading(false);
    }
  };

  return (
    <div className="flex items-center no-drag">
      <div
        className={cn(
          "flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-full transition-all duration-300",
          "border",
          localRunning
            ? "proxy-toggle-active"
            : "bg-[var(--glass-bg)] border-[var(--glass-border)]",
        )}
      >
        <div
          className={cn(
            "w-1.5 h-1.5 rounded-full transition-all duration-300",
            proxyLoading
              ? "bg-[var(--warning)] animate-pulse"
              : localRunning
                ? "bg-[var(--accent-primary)] shadow-[0_0_6px_var(--accent-primary)]"
                : "bg-[var(--text-dim)]",
          )}
        />
        <span
          className={cn(
            "text-xs font-medium transition-colors duration-300",
            localRunning
              ? "text-[var(--accent-primary)]"
              : "text-[var(--text-muted)]",
          )}
        >
          127.0.0.1:{port}
        </span>
        <button
          onClick={handleToggle}
          disabled={proxyLoading}
          className={cn(
            "w-6 h-6 flex items-center justify-center rounded-full transition-all duration-200",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            localRunning
              ? "proxy-toggle-btn-active"
              : "bg-[var(--text-dim)]/10 text-[var(--text-secondary)]",
          )}
          title={localRunning ? t.status.stop : t.status.start}
        >
          {proxyLoading ? (
            <span className="text-[10px]">...</span>
          ) : localRunning ? (
            <PauseIcon size={12} />
          ) : (
            <PlayIcon size={12} />
          )}
        </button>
      </div>
    </div>
  );
}
