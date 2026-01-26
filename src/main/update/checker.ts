import axios from "axios";
import { app } from "electron";

const GITHUB_REPO = "wangdabaoqq/L-jun";

export interface UpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseUrl?: string;
  releaseNotes?: string;
  publishedAt?: string;
  error?: string;
}

export async function checkForUpdates(): Promise<UpdateInfo> {
  const currentVersion = app.getVersion();

  try {
    const response = await axios.get(
      `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
      { timeout: 10000 },
    );

    const latestVersion = response.data.tag_name.replace(/^v/, "");
    const hasUpdate = compareVersions(latestVersion, currentVersion) > 0;

    return {
      hasUpdate,
      currentVersion,
      latestVersion,
      releaseUrl: response.data.html_url,
      releaseNotes: response.data.body,
      publishedAt: response.data.published_at,
    };
  } catch (error) {
    console.error("[UpdateChecker] Failed to check updates:", error);

    let errorMessage = "Failed to check for updates";
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      errorMessage = "No releases available yet";
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
