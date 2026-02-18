import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { createGunzip } from "zlib";

import axios from "axios";

import { proxyManager } from "./manager";
import log from "../utils/logger";

const DEFAULT_REPOS = [
  "router-for-me/CLIProxyAPIPlus",
  "Ravens2121/CLIProxyAPIPlus",
];

const GITHUB_API_BASE = (
  process.env.CLIPROXY_GITHUB_API_BASE || "https://api.github.com"
).replace(/\/+$/, "");

const CLIPROXY_RELEASES_BASE = (
  process.env.CLIPROXY_RELEASES_BASE ||
  "https://g-proxy.940703.xyz/https://github.com/router-for-me/CLIProxyAPIPlus/releases"
).replace(/\/+$/, "");

const CLIPROXY_PROXY_PREFIX = (
  process.env.CLIPROXY_PROXY_PREFIX || "https://g-proxy.940703.xyz"
).replace(/\/+$/, "");

interface PlatformTarget {
  dir: string;
  binaryName: string;
  matcher: RegExp;
}

interface ReleaseAsset {
  name: string;
  browser_download_url: string;
}

interface ReleaseInfo {
  tag_name: string;
  assets: ReleaseAsset[];
}

export interface ProxyBinaryUpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseUrl?: string;
  error?: string;
}

export interface ProxyBinaryUpdateResult extends ProxyBinaryUpdateInfo {
  success: boolean;
  updated: boolean;
  restarted: boolean;
}

export interface ProxyBinaryVersionInfo {
  success: boolean;
  version: string;
  error?: string;
}

export type ProxyBinaryUpdateStage =
  | "preparing"
  | "downloading"
  | "extracting"
  | "installing"
  | "restarting"
  | "completed";

export interface ProxyBinaryUpdateProgress {
  stage: ProxyBinaryUpdateStage;
  percent: number;
  message?: string;
  downloadedBytes?: number;
  totalBytes?: number;
}

type UpdateProgressReporter = (progress: ProxyBinaryUpdateProgress) => void;

function reportProgress(
  reporter: UpdateProgressReporter | undefined,
  progress: ProxyBinaryUpdateProgress,
): void {
  if (!reporter) {
    return;
  }

  reporter({
    ...progress,
    percent: Math.max(0, Math.min(100, Math.round(progress.percent))),
  });
}

function buildApiUrl(repo: string, suffix: string): string {
  const cleanSuffix = suffix.startsWith("/") ? suffix : `/${suffix}`;
  return `${GITHUB_API_BASE}/repos/${repo}${cleanSuffix}`;
}

function getCurrentTarget(): PlatformTarget {
  const platform = process.platform;
  const arch = process.arch;

  if (platform === "darwin" && arch === "arm64") {
    return {
      dir: "darwin-arm64",
      binaryName: "cliproxy",
      matcher:
        /(darwin|mac|macos).*(arm64|aarch64)|(arm64|aarch64).*(darwin|mac|macos)/i,
    };
  }

  if (platform === "darwin" && arch === "x64") {
    return {
      dir: "darwin-x64",
      binaryName: "cliproxy",
      matcher:
        /(darwin|mac|macos).*(x64|amd64)|(x64|amd64).*(darwin|mac|macos)/i,
    };
  }

  if (platform === "linux" && arch === "x64") {
    return {
      dir: "linux-x64",
      binaryName: "cliproxy",
      matcher: /linux.*(x64|amd64)|(x64|amd64).*linux/i,
    };
  }

  if (platform === "win32" && arch === "x64") {
    return {
      dir: "win32-x64",
      binaryName: "cliproxy.exe",
      matcher:
        /(windows|win32|win).*(x64|amd64)|(x64|amd64).*(windows|win32|win)/i,
    };
  }

  throw new Error(`Unsupported platform/arch: ${platform}-${arch}`);
}

function parseTagVersion(tag: string): string {
  return tag.replace(/^v/i, "");
}

function parseReleaseTagFromUrl(url: string): string | null {
  const tagMatch = url.match(/\/releases\/tag\/([^/?#]+)/i);
  if (!tagMatch || !tagMatch[1]) {
    return null;
  }

  return decodeURIComponent(tagMatch[1]);
}

function toProxyUrl(url: string): string {
  if (!/^https?:\/\//i.test(url)) {
    return url;
  }

  if (url.startsWith(`${CLIPROXY_PROXY_PREFIX}/http://`)) {
    return url;
  }

  if (url.startsWith(`${CLIPROXY_PROXY_PREFIX}/https://`)) {
    return url;
  }

  return `${CLIPROXY_PROXY_PREFIX}/${url}`;
}

function parseInstalledVersion(text: string): string {
  const bannerMatch = text.match(/CLIProxyAPI\s+Version:\s*([^,\n]+)/i);
  if (bannerMatch && bannerMatch[1]) {
    return bannerMatch[1].trim();
  }

  const semver = text.match(/v?(\d+\.\d+\.\d+(?:[-+][\w.-]+)?)/i);
  return semver ? semver[1] : "unknown";
}

function runVersionCommand(binaryPath: string): string {
  const versionResult = spawnSync(binaryPath, ["--version"], {
    encoding: "utf-8",
    timeout: 8000,
  });

  const versionOutput =
    `${versionResult.stdout || ""}\n${versionResult.stderr || ""}`.trim();
  if (parseInstalledVersion(versionOutput) !== "unknown") {
    return versionOutput;
  }

  const helpResult = spawnSync(binaryPath, ["-h"], {
    encoding: "utf-8",
    timeout: 8000,
  });

  return `${helpResult.stdout || ""}\n${helpResult.stderr || ""}`.trim();
}

function compareVersions(a: string, b: string): number {
  const pa = a
    .split(".")
    .map((part) => Number.parseInt(part, 10))
    .map((part) => (Number.isNaN(part) ? 0 : part));
  const pb = b
    .split(".")
    .map((part) => Number.parseInt(part, 10))
    .map((part) => (Number.isNaN(part) ? 0 : part));

  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

async function fetchLatestProxyRelease(): Promise<{
  latestTag: string;
  latestVersion: string;
  releaseUrl: string;
}> {
  const response = await axios.get(`${CLIPROXY_RELEASES_BASE}/latest`, {
    timeout: 10000,
    maxRedirects: 5,
    headers: {
      "User-Agent": "LinJun-App",
    },
  });

  const finalUrl =
    response.request?.res?.responseUrl ||
    response.request?.responseUrl ||
    response.config.url ||
    "";
  const tag = parseReleaseTagFromUrl(finalUrl);
  if (!tag) {
    throw new Error("Failed to parse latest CLIProxyAPIPlus release tag");
  }

  return {
    latestTag: tag,
    latestVersion: parseTagVersion(tag),
    releaseUrl: `${CLIPROXY_RELEASES_BASE}/tag/${encodeURIComponent(tag)}`,
  };
}

function getAssetPlatformTokens(target: PlatformTarget): string[] {
  if (target.dir === "darwin-arm64") {
    return ["darwin_arm64", "darwin-aarch64", "macos_arm64", "macos-aarch64"];
  }

  if (target.dir === "darwin-x64") {
    return ["darwin_amd64", "darwin_x64", "macos_amd64", "macos_x64"];
  }

  if (target.dir === "linux-x64") {
    return ["linux_amd64", "linux_x64"];
  }

  if (target.dir === "win32-x64") {
    return ["windows_amd64", "windows_x64", "win32_x64", "win_amd64"];
  }

  return [target.dir.replace(/-/g, "_")];
}

function getAssetExtensions(target: PlatformTarget): string[] {
  if (target.dir === "win32-x64") {
    return [".zip", ".tar.gz", ".exe"];
  }

  return [".tar.gz", ".tgz", ".zip", ""];
}

async function urlExists(url: string): Promise<boolean> {
  const response = await fetch(url, {
    method: "HEAD",
    headers: {
      "User-Agent": "LinJun-App",
    },
    redirect: "follow",
  });

  return response.ok;
}

async function resolveReleaseAssetFromTagPattern(
  target: PlatformTarget,
): Promise<{ release: ReleaseInfo; asset: ReleaseAsset; repo: string } | null> {
  const { latestTag } = await fetchLatestProxyRelease();
  const version = parseTagVersion(latestTag);
  const prefixes = ["CLIProxyAPIPlus", "cli-proxy-api-plus", "cliproxy"];
  const platformTokens = getAssetPlatformTokens(target);
  const extensions = getAssetExtensions(target);

  const candidates: string[] = [];
  for (const prefix of prefixes) {
    for (const token of platformTokens) {
      for (const ext of extensions) {
        candidates.push(`${prefix}_${version}_${token}${ext}`);
        candidates.push(`${prefix}-${version}-${token}${ext}`);
      }
    }
  }

  for (const assetName of candidates) {
    const mirroredDownloadUrl = `${CLIPROXY_RELEASES_BASE}/download/${encodeURIComponent(latestTag)}/${encodeURIComponent(assetName)}`;
    try {
      if (await urlExists(mirroredDownloadUrl)) {
        return {
          release: {
            tag_name: latestTag,
            assets: [
              {
                name: assetName,
                browser_download_url: mirroredDownloadUrl,
              },
            ],
          },
          asset: {
            name: assetName,
            browser_download_url: mirroredDownloadUrl,
          },
          repo: "router-for-me/CLIProxyAPIPlus",
        };
      }
    } catch {
      // continue checking next candidate
    }
  }

  return null;
}

async function fetchJson<T>(url: string): Promise<T> {
  const token = process.env.GITHUB_TOKEN;
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "LinJun-App",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  return (await response.json()) as T;
}

function pickAsset(
  release: ReleaseInfo,
  target: PlatformTarget,
): ReleaseAsset | null {
  const candidates = release.assets.filter((asset) => {
    const name = asset.name.toLowerCase();
    const hasBinaryHint =
      name.includes("cliproxy") ||
      name.includes("cli-proxy") ||
      name.includes("cliproxyapi");
    return hasBinaryHint && target.matcher.test(name);
  });

  if (candidates.length === 0) {
    return null;
  }

  const sorted = candidates.sort((a, b) => a.name.length - b.name.length);
  return sorted[0] || null;
}

function getBinaryCandidates(targetBinaryName: string): string[] {
  const lower = targetBinaryName.toLowerCase();
  const isWindows = lower.endsWith(".exe");
  const ext = isWindows ? ".exe" : "";

  return [
    targetBinaryName,
    `cli-proxy-api-plus${ext}`,
    `CLIProxyAPIPlus${ext}`,
    `cliproxyapi${ext}`,
    `cliproxy-api-plus${ext}`,
  ];
}

function findBinary(rootDir: string, binaryName: string): string | null {
  const candidates = getBinaryCandidates(binaryName).map((name) =>
    name.toLowerCase(),
  );
  const queue: string[] = [rootDir];
  let fallback: string | null = null;

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }

    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        queue.push(fullPath);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      const fileNameLower = entry.name.toLowerCase();
      if (candidates.includes(fileNameLower)) {
        return fullPath;
      }

      if (
        fallback === null &&
        (fileNameLower.includes("cliproxy") ||
          fileNameLower.includes("cli-proxy-api-plus"))
      ) {
        fallback = fullPath;
      }
    }
  }

  return fallback;
}

function isArchive(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return (
    lower.endsWith(".zip") ||
    lower.endsWith(".tar.gz") ||
    lower.endsWith(".tgz") ||
    lower.endsWith(".gz")
  );
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

async function downloadFile(
  url: string,
  outputPath: string,
  onProgress?: (downloadedBytes: number, totalBytes: number) => void,
): Promise<void> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "LinJun-App",
      Accept: "application/octet-stream",
    },
    redirect: "follow",
  });

  if (!response.ok || !response.body) {
    throw new Error(`Failed to download ${url}, status: ${response.status}`);
  }

  const totalBytes = Number.parseInt(
    response.headers.get("content-length") || "0",
    10,
  );
  const reader = response.body.getReader();
  const fileStream = fs.createWriteStream(outputPath);
  let downloadedBytes = 0;

  const waitForDrain = () =>
    new Promise<void>((resolve) => {
      fileStream.once("drain", resolve);
    });

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      if (!value) {
        continue;
      }

      downloadedBytes += value.byteLength;
      const writable = fileStream.write(Buffer.from(value));
      if (onProgress) {
        onProgress(downloadedBytes, Number.isNaN(totalBytes) ? 0 : totalBytes);
      }

      if (!writable) {
        await waitForDrain();
      }
    }

    fileStream.end();
    await new Promise<void>((resolve, reject) => {
      fileStream.on("finish", resolve);
      fileStream.on("error", reject);
    });
  } catch (error) {
    fileStream.destroy();
    throw error;
  }
}

async function maybeUnGzip(filePath: string): Promise<string> {
  if (
    !filePath.toLowerCase().endsWith(".gz") ||
    filePath.toLowerCase().endsWith(".tar.gz")
  ) {
    return filePath;
  }

  const outputPath = filePath.replace(/\.gz$/i, "");
  const input = fs.createReadStream(filePath);
  const output = fs.createWriteStream(outputPath);
  const gunzip = createGunzip();

  return new Promise<string>((resolve, reject) => {
    input.pipe(gunzip).pipe(output);
    output.on("finish", () => resolve(outputPath));
    output.on("error", reject);
    input.on("error", reject);
    gunzip.on("error", reject);
  });
}

async function extractArchive(
  archivePath: string,
  extractDir: string,
): Promise<void> {
  ensureDir(extractDir);
  const lower = archivePath.toLowerCase();

  if (lower.endsWith(".zip")) {
    const result = spawnSync("unzip", ["-o", archivePath, "-d", extractDir], {
      stdio: "ignore",
    });
    if (result.status !== 0) {
      throw new Error("Failed to extract zip archive");
    }
    return;
  }

  if (lower.endsWith(".tar.gz") || lower.endsWith(".tgz")) {
    const result = spawnSync("tar", ["-xzf", archivePath, "-C", extractDir], {
      stdio: "ignore",
    });
    if (result.status !== 0) {
      throw new Error("Failed to extract tar archive");
    }
    return;
  }

  if (lower.endsWith(".gz")) {
    const outPath = await maybeUnGzip(archivePath);
    const destPath = path.join(extractDir, path.basename(outPath));
    fs.copyFileSync(outPath, destPath);
    return;
  }

  throw new Error(`Unsupported archive format: ${archivePath}`);
}

async function resolveReleaseAsset(target: PlatformTarget): Promise<{
  release: ReleaseInfo;
  asset: ReleaseAsset;
  repo: string;
}> {
  const repoCandidates = (process.env.CLIPROXY_REPOS || DEFAULT_REPOS.join(","))
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

  for (const repo of repoCandidates) {
    try {
      const release = await fetchJson<ReleaseInfo>(
        buildApiUrl(repo, "/releases/latest"),
      );
      const asset = pickAsset(release, target);
      if (!asset) {
        continue;
      }

      return { release, asset, repo };
    } catch (error) {
      log.warn(`[ProxyUpdater] Failed to load release from ${repo}:`, error);
    }
  }

  const fallback = await resolveReleaseAssetFromTagPattern(target);
  if (fallback) {
    log.info(
      "[ProxyUpdater] Using tag-pattern fallback to resolve release asset",
    );
    return fallback;
  }

  throw new Error("No matching CLIProxyAPIPlus release asset found");
}

function getCurrentBinaryVersion(): string {
  const binaryPath = proxyManager.getBinaryPath();
  if (!fs.existsSync(binaryPath)) {
    return "unknown";
  }

  const output = runVersionCommand(binaryPath);
  const parsed = parseInstalledVersion(output.trim());
  return parsed || "unknown";
}

export function getProxyBinaryVersion(): ProxyBinaryVersionInfo {
  const binaryPath = proxyManager.getBinaryPath();
  if (!fs.existsSync(binaryPath)) {
    return {
      success: false,
      version: "unknown",
      error: "CLIProxyAPIPlus binary not found",
    };
  }

  try {
    const output = runVersionCommand(binaryPath);
    const version = parseInstalledVersion(output);
    if (version === "unknown") {
      return {
        success: false,
        version,
        error: "Failed to parse CLIProxyAPIPlus version",
      };
    }

    return { success: true, version };
  } catch (error) {
    return {
      success: false,
      version: "unknown",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function checkProxyBinaryUpdate(): Promise<ProxyBinaryUpdateInfo> {
  const currentVersion = getCurrentBinaryVersion();

  try {
    const { latestVersion, releaseUrl } = await fetchLatestProxyRelease();

    if (currentVersion === "unknown") {
      return {
        hasUpdate: true,
        currentVersion,
        latestVersion,
        releaseUrl,
      };
    }

    return {
      hasUpdate: compareVersions(latestVersion, currentVersion) > 0,
      currentVersion,
      latestVersion,
      releaseUrl,
    };
  } catch (error) {
    return {
      hasUpdate: false,
      currentVersion,
      latestVersion: currentVersion,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function downloadLatestBinary(
  onProgress?: UpdateProgressReporter,
): Promise<void> {
  const target = getCurrentTarget();
  const { release, asset } = await resolveReleaseAsset(target);

  const tmpRoot = path.join(os.tmpdir(), "linjun-proxy-update");
  ensureDir(tmpRoot);

  const tempAssetPath = path.join(tmpRoot, asset.name);
  reportProgress(onProgress, {
    stage: "downloading",
    percent: 10,
    message: "Downloading update package",
  });

  await downloadFile(
    toProxyUrl(asset.browser_download_url),
    tempAssetPath,
    (downloadedBytes, totalBytes) => {
      const base = 10;
      const range = 70;
      const percent =
        totalBytes > 0
          ? base + (downloadedBytes / totalBytes) * range
          : base + Math.min(range - 5, downloadedBytes / (1024 * 1024 * 2));

      reportProgress(onProgress, {
        stage: "downloading",
        percent,
        message: "Downloading update package",
        downloadedBytes,
        totalBytes: totalBytes > 0 ? totalBytes : undefined,
      });
    },
  );

  const managedBinaryPath = proxyManager.getManagedBinaryPath();
  ensureDir(path.dirname(managedBinaryPath));

  if (isArchive(asset.name)) {
    reportProgress(onProgress, {
      stage: "extracting",
      percent: 85,
      message: "Extracting update package",
    });

    const extractDir = path.join(tmpRoot, `extract-${Date.now()}`);
    await extractArchive(tempAssetPath, extractDir);
    const binaryFromArchive = findBinary(extractDir, target.binaryName);
    if (!binaryFromArchive) {
      throw new Error(
        `Downloaded archive does not contain ${target.binaryName}`,
      );
    }

    reportProgress(onProgress, {
      stage: "installing",
      percent: 92,
      message: "Installing binary",
    });

    fs.copyFileSync(binaryFromArchive, managedBinaryPath);
  } else {
    reportProgress(onProgress, {
      stage: "installing",
      percent: 92,
      message: "Installing binary",
    });

    fs.copyFileSync(tempAssetPath, managedBinaryPath);
  }

  if (process.platform !== "win32") {
    fs.chmodSync(managedBinaryPath, 0o755);
  }

  log.info(
    `[ProxyUpdater] Installed CLIProxyAPIPlus ${release.tag_name} to ${managedBinaryPath}`,
  );
}

export async function updateProxyBinaryAndRestart(
  onProgress?: UpdateProgressReporter,
): Promise<ProxyBinaryUpdateResult> {
  reportProgress(onProgress, {
    stage: "preparing",
    percent: 3,
    message: "Preparing update",
  });

  const checkResult = await checkProxyBinaryUpdate();
  if (!checkResult.hasUpdate) {
    reportProgress(onProgress, {
      stage: "completed",
      percent: 100,
      message: "Already up to date",
    });

    return {
      ...checkResult,
      success: !checkResult.error,
      updated: false,
      restarted: false,
    };
  }

  const wasRunning = proxyManager.isRunning();

  try {
    if (wasRunning) {
      reportProgress(onProgress, {
        stage: "restarting",
        percent: 8,
        message: "Stopping CLIProxyAPIPlus",
      });

      await proxyManager.stop();
    }

    await downloadLatestBinary(onProgress);

    if (wasRunning) {
      reportProgress(onProgress, {
        stage: "restarting",
        percent: 97,
        message: "Restarting CLIProxyAPIPlus",
      });

      await proxyManager.start();
    }

    const updatedVersion = getCurrentBinaryVersion();
    reportProgress(onProgress, {
      stage: "completed",
      percent: 100,
      message: "Update completed",
    });

    return {
      hasUpdate: false,
      currentVersion: updatedVersion,
      latestVersion: checkResult.latestVersion,
      releaseUrl: checkResult.releaseUrl,
      success: true,
      updated: true,
      restarted: wasRunning,
    };
  } catch (error) {
    try {
      if (wasRunning && !proxyManager.isRunning()) {
        await proxyManager.start();
      }
    } catch (restartError) {
      log.error(
        "[ProxyUpdater] Failed to recover proxy after update failure:",
        restartError,
      );
    }

    return {
      ...checkResult,
      success: false,
      updated: false,
      restarted: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
