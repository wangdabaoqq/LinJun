import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import os from "os";
import http, { IncomingMessage } from "http";
import https from "https";

import log from "./logger";

const execAsync = promisify(exec);

/**
 * 查找 nvm 管理的最新 node 版本的 bin 目录
 */
function findNvmNodeBin(): string | null {
  const homeDir = os.homedir();
  const nvmDir = path.join(homeDir, ".nvm", "versions", "node");

  if (!fs.existsSync(nvmDir)) {
    return null;
  }

  try {
    const versions = fs
      .readdirSync(nvmDir)
      .filter((v) => v.startsWith("v"))
      .sort((a, b) => {
        const parseVersion = (v: string) =>
          v
            .slice(1)
            .split(".")
            .map((n) => parseInt(n, 10) || 0);
        const [aMajor, aMinor, aPatch] = parseVersion(a);
        const [bMajor, bMinor, bPatch] = parseVersion(b);
        return bMajor - aMajor || bMinor - aMinor || bPatch - aPatch;
      });

    if (versions.length > 0) {
      const binPath = path.join(nvmDir, versions[0], "bin");
      if (fs.existsSync(binPath)) {
        return binPath;
      }
    }
  } catch (error) {
    log.info("[CLIDetector] Failed to find nvm node:", error);
  }

  return null;
}

/**
 * 获取增强的 PATH 环境变量
 * 解决从 Dock/Finder 启动时 PATH 不完整的问题
 */
function getEnhancedPath(): string {
  const homeDir = os.homedir();
  const isWindows = process.platform === "win32";
  const delimiter = isWindows ? ";" : ":";

  const additionalPaths: string[] = isWindows
    ? [
        `${homeDir}\\AppData\\Local\\Programs`,
        `${homeDir}\\AppData\\Roaming\\npm`,
        `${homeDir}\\.cargo\\bin`,
        `${homeDir}\\.bun\\bin`,
      ]
    : [
        "/usr/local/bin",
        "/usr/bin",
        "/opt/homebrew/bin",
        "/opt/homebrew/sbin",
        "/snap/bin",
        `${homeDir}/.local/bin`,
        `${homeDir}/.npm-global/bin`,
        `${homeDir}/.cargo/bin`,
        `${homeDir}/.bun/bin`,
        "/usr/local/go/bin",
        `${homeDir}/go/bin`,
      ];

  if (!isWindows) {
    const nvmBin = process.env.NVM_BIN || findNvmNodeBin();
    if (nvmBin) {
      additionalPaths.push(nvmBin);
    }
  }

  const currentPath = process.env.PATH || "";
  return [...additionalPaths, currentPath].join(delimiter);
}

/**
 * 获取执行命令时使用的环境变量
 */
function getExecEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PATH: getEnhancedPath(),
  };

  if (!env.OPENCODE_BIN_PATH) {
    const homeDir = os.homedir();
    const platform = process.platform === "win32" ? "win32" : process.platform;
    const arch = process.arch;
    const opencodeBin = path.join(
      homeDir,
      ".bun",
      "install",
      "global",
      "node_modules",
      `opencode-${platform}-${arch}`,
      "bin",
      "opencode",
    );
    if (fs.existsSync(opencodeBin)) {
      env.OPENCODE_BIN_PATH = opencodeBin;
    }
  }

  return env;
}

export interface CLIToolInfo {
  name: string;
  command: string;
  status: "installed" | "not_found";
  path?: string;
  version?: string;
  configPath?: string;
  authPath?: string;
}

export interface CLIConfig {
  configContent?: string;
  authContent?: string;
  configPath?: string;
  authPath?: string;
}

/**
 * 检测 CLI 工具是否已安装
 */
export async function detectCLITool(
  toolName: string,
  command: string,
): Promise<CLIToolInfo> {
  const execEnv = getExecEnv();

  try {
    const whichCommand = process.platform === "win32" ? "where" : "which";
    const { stdout } = await execAsync(`${whichCommand} ${command}`, {
      env: execEnv,
    });
    const toolPath = stdout.trim().split("\n")[0];

    if (!toolPath) {
      return {
        name: toolName,
        command,
        status: "not_found",
      };
    }

    let version = "unknown";
    try {
      const { stdout: versionOutput } = await execAsync(
        `${command} --version`,
        { timeout: 10000, env: execEnv },
      );
      version = versionOutput.trim().split("\n")[0];
    } catch (err) {
      log.info(`[CLIDetector] Failed to get version for ${command}:`, err);
    }

    const { configPath, authPath } = getConfigPaths(toolName);

    return {
      name: toolName,
      command,
      status: "installed",
      path: toolPath,
      version,
      configPath,
      authPath,
    };
  } catch (error) {
    log.info(`[CLIDetector] Tool not found: ${command}`, error);
    return {
      name: toolName,
      command,
      status: "not_found",
    };
  }
}

/**
 * 获取 CLI 工具的配置文件路径
 */
function getConfigPaths(toolName: string): {
  configPath?: string;
  authPath?: string;
} {
  const homeDir = os.homedir();

  const pathMap: Record<string, { configPath?: string; authPath?: string }> = {
    "Claude Code": {
      configPath: path.join(homeDir, ".claude", "settings.json"),
    },
    "Codex CLI": {
      configPath: path.join(homeDir, ".codex", "config.toml"),
      authPath: path.join(homeDir, ".codex", "auth.json"),
    },
    OpenCode: {
      configPath: path.join(homeDir, ".config", "opencode", "opencode.json"),
    },
    "Amp CLI": {
      configPath: path.join(homeDir, ".config", "amp", "settings.json"),
      authPath: path.join(homeDir, ".local", "share", "amp", "secrets.json"),
    },
    "Droid CLI": {
      configPath: path.join(homeDir, ".factory", "config.json"),
    },
    "iFlow CLI": {
      configPath: path.join(homeDir, ".iflow", "settings.json"),
    },
  };

  return pathMap[toolName] || {};
}

/**
 * 读取 CLI 工具的配置文件内容
 */
export async function readCLIConfig(toolName: string): Promise<CLIConfig> {
  const { configPath, authPath } = getConfigPaths(toolName);
  const result: CLIConfig = {
    configPath,
    authPath,
  };

  if (configPath && fs.existsSync(configPath)) {
    try {
      result.configContent = await fsp.readFile(configPath, "utf-8");
    } catch (error) {
      log.error(`[CLIDetector] Failed to read config: ${configPath}`, error);
    }
  }

  if (authPath && fs.existsSync(authPath)) {
    try {
      result.authContent = await fsp.readFile(authPath, "utf-8");
    } catch (error) {
      log.error(`[CLIDetector] Failed to read auth: ${authPath}`, error);
    }
  }

  return result;
}

/**
 * 备份配置文件
 */
export async function backupConfig(filePath: string): Promise<string | null> {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = `${filePath}.backup-${timestamp}`;

  try {
    await fsp.copyFile(filePath, backupPath);
    log.info(`[CLIDetector] Backed up ${filePath} to ${backupPath}`);
    return backupPath;
  } catch (error) {
    log.error(`[CLIDetector] Failed to backup ${filePath}:`, error);
    return null;
  }
}

/**
 * 写入配置文件（会先备份现有文件）
 */
export async function writeConfig(
  filePath: string,
  content: string,
  backup = true,
): Promise<{ success: boolean; backupPath?: string; error?: string }> {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      await fsp.mkdir(dir, { recursive: true });
    }

    let backupPath: string | null = null;
    if (backup && fs.existsSync(filePath)) {
      backupPath = await backupConfig(filePath);
    }

    await fsp.writeFile(filePath, content, "utf-8");
    log.info(`[CLIDetector] Wrote config to ${filePath}`);

    return {
      success: true,
      backupPath: backupPath || undefined,
    };
  } catch (error) {
    log.error(`[CLIDetector] Failed to write config to ${filePath}:`, error);
    return {
      success: false,
      error: String(error),
    };
  }
}

/**
 * 检测所有支持的 CLI 工具
 */
export async function detectAllCLITools(): Promise<CLIToolInfo[]> {
  const tools = [
    { name: "Claude Code", command: "claude" },
    { name: "Codex CLI", command: "codex" },
    { name: "Gemini CLI", command: "gemini" },
    { name: "OpenCode", command: "opencode" },
    { name: "Amp CLI", command: "amp" },
    { name: "Droid CLI", command: "droid" },
    { name: "iFlow CLI", command: "iflow" },
  ];

  const results = await Promise.all(
    tools.map((tool) => detectCLITool(tool.name, tool.command)),
  );

  return results;
}

/**
 * 测试连接到代理服务器
 */
export async function testProxyConnection(
  url: string,
  apiKey?: string,
): Promise<{ success: boolean; error?: string; latency?: number }> {
  return new Promise((resolve) => {
    const startTime = Date.now();

    const urlObj = new URL(url);
    const protocol = urlObj.protocol === "https:" ? https : http;

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === "https:" ? 443 : 80),
      path: "/",
      method: "GET",
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
      timeout: 5000,
    };

    const req = protocol.request(options, (res: IncomingMessage) => {
      const latency = Date.now() - startTime;

      if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
        resolve({ success: true, latency });
      } else {
        resolve({
          success: false,
          error: `HTTP ${res.statusCode}: ${res.statusMessage}`,
        });
      }

      res.resume();
    });

    req.on("error", (error: Error) => {
      resolve({
        success: false,
        error: error.message || String(error),
      });
    });

    req.on("timeout", () => {
      req.destroy();
      resolve({
        success: false,
        error: "连接超时 (5秒)",
      });
    });

    req.end();
  });
}
