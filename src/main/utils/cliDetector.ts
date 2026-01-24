import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import os from "os";

const execAsync = promisify(exec);

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
  try {
    // 尝试使用 which/where 命令查找工具路径
    const whichCommand = process.platform === "win32" ? "where" : "which";
    const { stdout } = await execAsync(`${whichCommand} ${command}`);
    const toolPath = stdout.trim().split("\n")[0];

    if (!toolPath) {
      return {
        name: toolName,
        command,
        status: "not_found",
      };
    }

    // 尝试获取版本信息
    let version = "unknown";
    try {
      const { stdout: versionOutput } = await execAsync(
        `${command} --version`,
        { timeout: 5000 },
      );
      version = versionOutput.trim().split("\n")[0];
    } catch (err) {
      // 版本获取失败不影响检测结果
      console.log(`[CLIDetector] Failed to get version for ${command}:`, err);
    }

    // 获取配置文件路径
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
  const isWindows = process.platform === "win32";

  const pathMap: Record<string, { configPath?: string; authPath?: string }> = {
    "Claude Code": {
      configPath: path.join(homeDir, ".claude", "settings.json"),
    },
    "Codex CLI": {
      configPath: path.join(homeDir, ".codex", "config.toml"),
      authPath: path.join(homeDir, ".codex", "auth.json"),
    },
    OpenCode: {
      configPath: path.join(homeDir, ".opencode", "config.json"),
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
      result.configContent = fs.readFileSync(configPath, "utf-8");
    } catch (error) {
      console.error(
        `[CLIDetector] Failed to read config: ${configPath}`,
        error,
      );
    }
  }

  if (authPath && fs.existsSync(authPath)) {
    try {
      result.authContent = fs.readFileSync(authPath, "utf-8");
    } catch (error) {
      console.error(`[CLIDetector] Failed to read auth: ${authPath}`, error);
    }
  }

  return result;
}

/**
 * 备份配置文件
 */
export function backupConfig(filePath: string): string | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = `${filePath}.backup-${timestamp}`;

  try {
    fs.copyFileSync(filePath, backupPath);
    console.log(`[CLIDetector] Backed up ${filePath} to ${backupPath}`);
    return backupPath;
  } catch (error) {
    console.error(`[CLIDetector] Failed to backup ${filePath}:`, error);
    return null;
  }
}

/**
 * 写入配置文件（会先备份现有文件）
 */
export function writeConfig(
  filePath: string,
  content: string,
  backup = true,
): { success: boolean; backupPath?: string; error?: string } {
  try {
    // 确保目录存在
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // 备份现有文件
    let backupPath: string | null = null;
    if (backup && fs.existsSync(filePath)) {
      backupPath = backupConfig(filePath);
    }

    // 写入新配置
    fs.writeFileSync(filePath, content, "utf-8");
    console.log(`[CLIDetector] Wrote config to ${filePath}`);

    return {
      success: true,
      backupPath: backupPath || undefined,
    };
  } catch (error) {
    console.error(
      `[CLIDetector] Failed to write config to ${filePath}:`,
      error,
    );
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
    const https = require("https");
    const http = require("http");

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

    const req = protocol.request(options, (res: any) => {
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
