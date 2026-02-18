const fs = require("fs") as typeof import("fs");
const path = require("path") as typeof import("path");
const { spawnSync } =
  require("child_process") as typeof import("child_process");
const { createGunzip } = require("zlib") as typeof import("zlib");

const OUTPUT_ROOT = path.resolve(process.cwd(), "resources/binaries");
const TMP_ROOT = path.resolve(process.cwd(), ".tmp/download-binary");
const DEFAULT_REPOS = [
  "router-for-me/CLIProxyAPIPlus",
  "Ravens2121/CLIProxyAPIPlus",
];
const GITHUB_API_BASE = (
  process.env.CLIPROXY_GITHUB_API_BASE || "https://api.github.com"
).replace(/\/+$/, "");
const GITHUB_WEB_BASE = (
  process.env.CLIPROXY_GITHUB_WEB_BASE || "https://github.com"
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

function buildApiUrl(repo: string, suffix: string): string {
  const cleanSuffix = suffix.startsWith("/") ? suffix : `/${suffix}`;
  return `${GITHUB_API_BASE}/repos/${repo}${cleanSuffix}`;
}

function buildWebRepoUrl(repo: string, suffix: string): string {
  const cleanSuffix = suffix.startsWith("/") ? suffix : `/${suffix}`;
  return `${GITHUB_WEB_BASE}/${repo}${cleanSuffix}`;
}

function parseTagFromReleaseUrl(url: string): string {
  const match = url.match(/\/releases\/tag\/([^/?#]+)/);
  if (!match || !match[1]) {
    return "unknown";
  }
  return decodeURIComponent(match[1]);
}

async function fetchLatestTag(repo: string): Promise<string> {
  const latestUrl = buildWebRepoUrl(repo, "/releases/latest");
  const response = await fetch(latestUrl, {
    headers: {
      "User-Agent": "linjun-download-script",
      Accept: "text/html,application/xhtml+xml",
    },
    redirect: "manual",
  });

  const location = response.headers.get("location");
  if (location) {
    const fullUrl = location.startsWith("http")
      ? location
      : `${GITHUB_WEB_BASE}${location}`;
    const parsed = parseTagFromReleaseUrl(fullUrl);
    if (parsed !== "unknown") {
      return parsed;
    }
  }

  const fallback = await fetch(latestUrl, {
    headers: {
      "User-Agent": "linjun-download-script",
      Accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
  });

  if (!fallback.ok) {
    throw new Error(`HTTP ${fallback.status} when fetching ${latestUrl}`);
  }

  const tagFromFinalUrl = parseTagFromReleaseUrl(fallback.url || latestUrl);
  if (tagFromFinalUrl === "unknown") {
    throw new Error(`Unable to resolve latest release tag for ${repo}`);
  }

  return tagFromFinalUrl;
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
  if (target.dir === "linux-arm64") {
    return ["linux_arm64", "linux_aarch64"];
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
      "User-Agent": "linjun-download-script",
    },
    redirect: "follow",
  });
  return response.ok;
}

async function resolveReleaseAssetFromTagPattern(
  repo: string,
  target: PlatformTarget,
): Promise<{ release: ReleaseInfo; asset: ReleaseAsset } | null> {
  const tag = await fetchLatestTag(repo);
  const version = tag.replace(/^v/i, "");
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
    const downloadUrl = buildWebRepoUrl(
      repo,
      `/releases/download/${encodeURIComponent(tag)}/${encodeURIComponent(assetName)}`,
    );
    try {
      if (await urlExists(downloadUrl)) {
        return {
          release: {
            tag_name: tag,
            assets: [{ name: assetName, browser_download_url: downloadUrl }],
          },
          asset: { name: assetName, browser_download_url: downloadUrl },
        };
      }
    } catch {
      // continue trying other candidates
    }
  }

  return null;
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

  if (platform === "linux" && arch === "arm64") {
    return {
      dir: "linux-arm64",
      binaryName: "cliproxy",
      matcher: /linux.*(arm64|aarch64)|(arm64|aarch64).*linux/i,
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

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

async function fetchJson<T>(url: string): Promise<T> {
  const token = process.env.GITHUB_TOKEN;
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "linjun-download-script",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status} when fetching ${url}: ${text}`);
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
      name.includes("cliproxy") || name.includes("cli-proxy");

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

async function downloadFile(url: string, outputPath: string): Promise<void> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "linjun-download-script",
      Accept: "application/octet-stream",
    },
    redirect: "follow",
  });

  if (!response.ok || !response.body) {
    throw new Error(`Failed to download ${url}, status: ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(outputPath, buffer);
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

  return await new Promise<string>((resolve, reject) => {
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
      stdio: "inherit",
    });
    if (result.status !== 0) {
      throw new Error(
        "Failed to extract zip archive (unzip not available or extraction failed)",
      );
    }
    return;
  }

  if (lower.endsWith(".tar.gz") || lower.endsWith(".tgz")) {
    const result = spawnSync("tar", ["-xzf", archivePath, "-C", extractDir], {
      stdio: "inherit",
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

async function resolveReleaseAsset(target: PlatformTarget): Promise<{
  asset: ReleaseAsset;
  release: ReleaseInfo;
  repo: string;
}> {
  const repoCandidates = (process.env.CLIPROXY_REPOS || DEFAULT_REPOS.join(","))
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

  for (const repo of repoCandidates) {
    let release: ReleaseInfo | null = null;

    try {
      release = await fetchJson<ReleaseInfo>(
        buildApiUrl(repo, "/releases/latest"),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(
        `[download:binary] GitHub API unavailable for ${repo}, trying tag-pattern fallback: ${message}`,
      );
      const fallback = await resolveReleaseAssetFromTagPattern(repo, target);
      if (fallback) {
        return { asset: fallback.asset, release: fallback.release, repo };
      }
      continue;
    }

    const asset = pickAsset(release, target);
    if (asset) {
      return { asset, release, repo };
    }
  }

  throw new Error(
    `No matching release asset found for ${target.dir}. Try setting CLIPROXY_REPOS, GITHUB_TOKEN, CLIPROXY_GITHUB_API_BASE, or CLIPROXY_GITHUB_WEB_BASE.`,
  );
}

async function main(): Promise<void> {
  const target = getCurrentTarget();
  const targetDir = path.join(OUTPUT_ROOT, target.dir);
  const targetBinaryPath = path.join(targetDir, target.binaryName);

  ensureDir(targetDir);

  if (fs.existsSync(targetBinaryPath)) {
    console.log(`[download:binary] Binary already exists: ${targetBinaryPath}`);
    return;
  }

  ensureDir(TMP_ROOT);

  console.log(`[download:binary] Detect target: ${target.dir}`);

  const { asset, release, repo } = await resolveReleaseAsset(target);
  console.log(`[download:binary] Repo: ${repo}`);
  console.log(`[download:binary] Release: ${release.tag_name}`);
  console.log(`[download:binary] Asset: ${asset.name}`);

  const tempAssetPath = path.join(TMP_ROOT, asset.name);
  await downloadFile(asset.browser_download_url, tempAssetPath);

  if (isArchive(asset.name)) {
    const extractDir = path.join(
      TMP_ROOT,
      `extract-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    );
    await extractArchive(tempAssetPath, extractDir);
    const binaryFromArchive = findBinary(extractDir, target.binaryName);
    if (!binaryFromArchive) {
      throw new Error(
        `Downloaded archive does not contain ${target.binaryName}`,
      );
    }
    fs.copyFileSync(binaryFromArchive, targetBinaryPath);
  } else {
    fs.copyFileSync(tempAssetPath, targetBinaryPath);
  }

  if (process.platform !== "win32") {
    fs.chmodSync(targetBinaryPath, 0o755);
  }

  console.log(`[download:binary] Saved binary to ${targetBinaryPath}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[download:binary] Failed: ${message}`);
  process.exit(1);
});
