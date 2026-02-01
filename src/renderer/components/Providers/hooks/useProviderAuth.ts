import { useState } from "react";
import log from "@renderer/utils/logger";

import { useTranslations } from "../../../stores/settings";
import { useProvidersStore } from "../../../stores/providers";
import { Provider, CopilotAuthInfo } from "../types";

export function useProviderAuth() {
  const t = useTranslations();
  const loadAccounts = useProvidersStore((state) => state.loadAccounts);

  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [copilotAuthInfo, setCopilotAuthInfo] =
    useState<CopilotAuthInfo | null>(null);
  const [copilotAuthError, setCopilotAuthError] = useState<string | null>(null);

  const triggerAuth = async (providerInfo: Omit<Provider, "accounts">) => {
    if (!window.electronAPI) {
      setAuthError(
        "Electron API not available. Please run in Electron environment.",
      );
      return;
    }

    setIsAuthenticating(true);
    setAuthError(null);
    log.info("[Auth] Starting authentication for:", providerInfo.id);

    if (providerInfo.id === "qwen") {
      log.info("[Auth] Using Qwen API OAuth");
      try {
        const result = await window.electronAPI.qwen?.getAuthUrl();
        if (result?.status === "ok") {
          setTimeout(() => {
            loadAccounts({ force: true });
            setIsAuthenticating(false);
          }, 3000);
        } else {
          setAuthError("Failed to get Qwen authentication URL");
          setIsAuthenticating(false);
        }
      } catch (err) {
        log.error("[Auth] Qwen OAuth error:", err);
        setAuthError(String(err));
        setIsAuthenticating(false);
      }
      return;
    }

    if (providerInfo.id === "antigravity") {
      log.info("[Auth] Using Antigravity API OAuth");
      try {
        const result = await window.electronAPI.antigravity?.getAuthUrl();
        if (result?.status === "ok") {
          setTimeout(() => {
            loadAccounts({ force: true });
            setIsAuthenticating(false);
          }, 3000);
        } else {
          setAuthError("Failed to get Antigravity authentication URL");
          setIsAuthenticating(false);
        }
      } catch (err) {
        log.error("[Auth] Antigravity OAuth error:", err);
        setAuthError(String(err));
        setIsAuthenticating(false);
      }
      return;
    }

    if (providerInfo.id === "iflow") {
      log.info("[Auth] Using iFlow API OAuth");
      try {
        const result = await window.electronAPI.iflow?.getAuthUrl();
        if (result?.status === "ok") {
          setTimeout(() => {
            loadAccounts({ force: true });
            setIsAuthenticating(false);
          }, 3000);
        } else {
          setAuthError("Failed to get iFlow authentication URL");
          setIsAuthenticating(false);
        }
      } catch (err) {
        log.error("[Auth] iFlow OAuth error:", err);
        setAuthError(String(err));
        setIsAuthenticating(false);
      }
      return;
    }

    if (providerInfo.id === "claude") {
      log.info("[Auth] Using Claude API OAuth");
      try {
        const result = await window.electronAPI.claude?.getAuthUrl();
        if (result?.status === "ok") {
          setTimeout(() => {
            loadAccounts({ force: true });
            setIsAuthenticating(false);
          }, 3000);
        } else {
          setAuthError("Failed to get Claude authentication URL");
          setIsAuthenticating(false);
        }
      } catch (err) {
        log.error("[Auth] Claude OAuth error:", err);
        setAuthError(String(err));
        setIsAuthenticating(false);
      }
      return;
    }

    if (providerInfo.id === "gemini") {
      log.info("[Auth] Using Gemini API OAuth");
      try {
        const result = await window.electronAPI.gemini?.getAuthUrl();
        if (result?.status === "ok") {
          setTimeout(() => {
            loadAccounts({ force: true });
            setIsAuthenticating(false);
          }, 3000);
        } else {
          setAuthError("Failed to get Gemini authentication URL");
          setIsAuthenticating(false);
        }
      } catch (err) {
        log.error("[Auth] Gemini OAuth error:", err);
        setAuthError(String(err));
        setIsAuthenticating(false);
      }
      return;
    }

    if (providerInfo.id === "codex") {
      log.info("[Auth] Using Codex API OAuth");
      try {
        const result = await window.electronAPI.codex?.getAuthUrl();
        if (result?.status === "ok") {
          setTimeout(() => {
            loadAccounts({ force: true });
            setIsAuthenticating(false);
          }, 3000);
        } else {
          setAuthError("Failed to get Codex authentication URL");
          setIsAuthenticating(false);
        }
      } catch (err) {
        log.error("[Auth] Codex OAuth error:", err);
        setAuthError(String(err));
        setIsAuthenticating(false);
      }
      return;
    }

    if (providerInfo.id === "copilot") {
      log.info("[Auth] Using Copilot device login");
      try {
        const result = await window.electronAPI.copilot?.getAuthUrl();
        if (result?.status === "ok") {
          setCopilotAuthInfo(result);
        } else {
          setCopilotAuthError(t.providers.copilotDeviceError);
        }
      } catch (err) {
        log.error("[Auth] Copilot login error:", err);
        setCopilotAuthError(String(err));
      } finally {
        setIsAuthenticating(false);
      }
      return;
    }

    if (providerInfo.id === "kiro") {
      log.info("[Auth] Using Kiro import");
      try {
        const result = await window.electronAPI.kiro?.importToken();
        if (result?.success) {
          loadAccounts({ force: true });
          setIsAuthenticating(false);
        } else {
          setAuthError(result?.error || "Failed to import Kiro token");
          setIsAuthenticating(false);
        }
      } catch (err) {
        log.error("[Auth] Kiro import error:", err);
        setAuthError(String(err));
        setIsAuthenticating(false);
      }
      return;
    }

    try {
      log.info("[Auth] Using OAuth for:", providerInfo.id);
      const result = await window.electronAPI.api.startAuth(
        providerInfo.id as Parameters<
          typeof window.electronAPI.api.startAuth
        >[0],
      );

      log.info("[Auth] Result:", result);

      if (result?.success) {
        await loadAccounts({ force: true });
      } else {
        setAuthError(result?.error || "Authentication failed");
      }
    } catch (err) {
      log.error("[Auth] Error:", err);
      setAuthError(String(err));
    } finally {
      setIsAuthenticating(false);
    }
  };

  return {
    isAuthenticating,
    authError,
    setAuthError,
    copilotAuthInfo,
    setCopilotAuthInfo,
    copilotAuthError,
    setCopilotAuthError,
    triggerAuth,
  };
}
