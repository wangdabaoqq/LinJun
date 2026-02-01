import axios from "axios";
import { app } from "electron";

import log from "../utils/logger";

const GITHUB_REPO = "wangdabaoqq/LinJun";

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
    const response = await axios.get(
      `https://github.com/${GITHUB_REPO}/releases/latest`,
      {
        timeout: 10000,
        maxRedirects: 5,
        headers: {
          "User-Agent": "LinJun-App",
        },
      },
    );

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
      releaseUrl: `https://github.com/${GITHUB_REPO}/releases/tag/v${latestVersion}`,
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
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}
