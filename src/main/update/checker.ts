import axios from "axios";
import { app } from "electron";

import log from "../utils/logger";

const _GITHUB_REPO = "wangdabaoqq/LinJun";
const UPDATE_PROXY_BASE =
  "https://g-proxy.940703.xyz/https://github.com/wangdabaoqq/LinJun";

export interface UpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseUrl?: string;
  error?: string;
}

export async function checkForUpdates(): Promise<UpdateInfo> {
  const currentVersion = app.getVersion();

  try {
    // Use redirect-based approach to avoid API rate limits
    // GET /releases/latest redirects to /releases/tag/vX.X.X
    const response = await axios.get(`${UPDATE_PROXY_BASE}/releases/latest`, {
      timeout: 10000,
      maxRedirects: 5,
      headers: {
        "User-Agent": "LinJun-App",
      },
    });

    const finalUrl = response.request.res.responseUrl || response.config.url;
    const tagMatch = finalUrl.match(/\/releases\/tag\/v?(.+)$/);

    if (!tagMatch) {
      return {
        hasUpdate: false,
        currentVersion,
        latestVersion: currentVersion,
        error: "Failed to parse release version",
      };
    }

    const latestVersion = tagMatch[1];
    const hasUpdate = compareVersions(latestVersion, currentVersion) > 0;

    return {
      hasUpdate,
      currentVersion,
      latestVersion,
      releaseUrl: `${UPDATE_PROXY_BASE}/releases/tag/v${latestVersion}`,
    };
  } catch (error) {
    log.error("[UpdateChecker] Failed to check updates:", error);

    let errorMessage = "Failed to check for updates";
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        errorMessage = "No releases available yet";
      }
    }

    return {
      hasUpdate: false,
      currentVersion,
      latestVersion: currentVersion,
      error: errorMessage,
    };
  }
}

function compareVersions(a: string, b: string): number {
  const parseVersion = (v: string) => {
    const [corePart, pre] = v.split("-");
    const core = corePart.split(".").map(Number);
    return { core, pre: pre ?? null };
  };

  const va = parseVersion(a);
  const vb = parseVersion(b);

  for (let i = 0; i < Math.max(va.core.length, vb.core.length); i++) {
    const na = va.core[i] ?? 0;
    const nb = vb.core[i] ?? 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }

  if (va.pre === null && vb.pre !== null) return 1;
  if (va.pre !== null && vb.pre === null) return -1;
  if (va.pre !== null && vb.pre !== null) {
    return va.pre.localeCompare(vb.pre, undefined, { numeric: true });
  }
  return 0;
}
