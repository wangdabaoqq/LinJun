# linjun - 跨平台 CLIProxyAPIPlus 管理工具

## 项目概述

基于 CLIProxyAPIPlus 构建的跨平台桌面应用，提供类似 Quotio 的功能，支持 **Windows / macOS / Linux** 三端。

### 参考项目

- [Quotio](https://github.com/nguyenphutrong/quotio) - macOS 原生 Swift 实现（仅 macOS）
- [CLIProxyAPIPlus](https://github.com/router-for-me/CLIProxyAPIPlus) - 核心代理服务器（Go 实现）
- [ProxyPilot](https://github.com/Finesssee/ProxyPilot) - Windows 原生实现
- [ZeroLimit](https://github.com/0xtbug/zero-limit) - Tauri + React 实现（参考 UI 设计）

---

## 技术选型

### 方案：Electron + React + TypeScript

| 组件         | 技术栈                  | 说明                        |
| ------------ | ----------------------- | --------------------------- |
| **框架**     | Electron 33+            | 跨平台桌面应用框架          |
| **前端**     | React 18 + TypeScript   | UI 开发                     |
| **样式**     | Tailwind CSS            | 快速 UI 开发                |
| **构建**     | Vite + electron-builder | 开发构建工具链              |
| **进程管理** | child_process           | 管理 CLIProxyAPIPlus 二进制 |
| **系统托盘** | Electron Tray API       | 原生托盘支持                |

### Electron 优势

1. **成熟生态**：丰富的 npm 包支持，大量学习资源
2. **开发效率**：JavaScript/TypeScript 开发，热重载支持
3. **跨平台一致**：一套代码，三端运行
4. **原生能力**：完整的系统托盘、通知、菜单支持

### CLIProxyAPIPlus 集成方式

由于 CLIProxyAPIPlus 是 Go 编写的，Electron 通过以下方式集成：

1. **内嵌二进制**：将 CLIProxyAPIPlus 二进制打包到应用中
2. **进程管理**：使用 `child_process` 启动/停止代理进程
3. **HTTP 通信**：通过 Management API 与代理交互

---

## 核心功能规划

### Phase 1 - MVP

- [ ] 内嵌 CLIProxyAPIPlus 二进制，启动/停止代理服务
- [ ] 系统托盘图标 + 基础菜单
- [ ] 单账户 OAuth 登录（Claude/Gemini/OpenAI）
- [ ] 基础状态显示（运行中/已停止）
- [ ] 开机自启动

### Phase 2 - 多账户管理

- [ ] 多账户管理界面
- [ ] Quota 用量追踪（实时刷新）
- [ ] 账户切换/负载均衡策略配置（Round Robin / Fill First）
- [ ] 自动 Failover 配置

### Phase 3 - Agent 配置

- [ ] 自动检测已安装的 CLI Agent（Claude Code, OpenCode, Gemini CLI, Amp CLI）
- [ ] 一键配置 Agent 使用本地代理
- [ ] 配置备份/恢复

### Phase 4 - 高级功能

- [ ] 请求日志查看
- [ ] 实时流量监控图表
- [ ] 多语言支持（中/英）
- [ ] 自动更新（electron-updater）
- [ ] API Key 管理

---

## 项目结构

```
cliPlus/
├── package.json
├── electron.vite.config.ts     # Vite + Electron 配置
├── electron-builder.yml        # 打包配置
├── tsconfig.json
│
├── src/
│   ├── main/                   # Electron 主进程
│   │   ├── index.ts            # 主进程入口
│   │   ├── tray.ts             # 系统托盘
│   │   ├── proxy/              # CLIProxyAPIPlus 管理
│   │   │   ├── manager.ts      # 进程管理
│   │   │   ├── api.ts          # Management API 封装
│   │   │   └── binary.ts       # 二进制路径处理
│   │   ├── ipc/                # IPC 通信
│   │   │   └── handlers.ts
│   │   └── utils/
│   │       ├── store.ts        # electron-store 配置存储
│   │       └── autoLaunch.ts   # 开机自启动
│   │
│   ├── preload/                # 预加载脚本
│   │   └── index.ts
│   │
│   └── renderer/               # 渲染进程（React）
│       ├── index.html
│       ├── main.tsx
│       ├── App.tsx
│       ├── components/
│       │   ├── Dashboard/
│       │   ├── Providers/
│       │   ├── Agents/
│       │   ├── Quota/
│       │   └── Settings/
│       ├── hooks/
│       ├── stores/             # Zustand 状态管理
│       ├── services/           # API 调用
│       └── styles/
│
├── resources/                  # 静态资源
│   ├── icon.png
│   ├── icon.ico
│   ├── icon.icns
│   └── binaries/               # CLIProxyAPIPlus 二进制
│       ├── darwin-arm64/
│       ├── darwin-x64/
│       ├── win32-x64/
│       └── linux-x64/
│
└── scripts/
    └── download-binary.ts      # 下载 CLIProxyAPIPlus 二进制
```

---

## 开发指南

### 环境要求

- Node.js 18+
- pnpm 8+ (推荐) 或 npm
- Git

### 快速开始

```bash
# 创建项目（使用 electron-vite 模板）
pnpm create @electron-vite/electron-app cliPlus --template react-ts

# 进入项目
cd cliPlus

# 安装依赖
pnpm install

# 安装额外依赖
pnpm add electron-store zustand axios
pnpm add -D @types/node tailwindcss postcss autoprefixer

# 下载 CLIProxyAPIPlus 二进制（需要实现脚本）
pnpm run download:binary

# 开发模式
pnpm dev

# 构建
pnpm build
```

### CLIProxyAPIPlus 进程管理

```typescript
// src/main/proxy/manager.ts
import { spawn, ChildProcess } from "child_process";
import path from "path";
import { app } from "electron";

class ProxyManager {
  private process: ChildProcess | null = null;
  private port: number = 8080;

  getBinaryPath(): string {
    const platform = process.platform;
    const arch = process.arch;
    const binaryName = platform === "win32" ? "cliproxy.exe" : "cliproxy";

    if (app.isPackaged) {
      return path.join(
        process.resourcesPath,
        "binaries",
        `${platform}-${arch}`,
        binaryName,
      );
    }
    return path.join(
      __dirname,
      "../../resources/binaries",
      `${platform}-${arch}`,
      binaryName,
    );
  }

  async start(): Promise<void> {
    if (this.process) {
      throw new Error("Proxy already running");
    }

    const binaryPath = this.getBinaryPath();

    this.process = spawn(binaryPath, ["--port", String(this.port)], {
      stdio: ["ignore", "pipe", "pipe"],
      detached: false,
    });

    this.process.stdout?.on("data", (data) => {
      console.log(`[Proxy] ${data}`);
    });

    this.process.stderr?.on("data", (data) => {
      console.error(`[Proxy Error] ${data}`);
    });

    this.process.on("exit", (code) => {
      console.log(`Proxy exited with code ${code}`);
      this.process = null;
    });
  }

  async stop(): Promise<void> {
    if (this.process) {
      this.process.kill("SIGTERM");
      this.process = null;
    }
  }

  isRunning(): boolean {
    return this.process !== null;
  }

  getPort(): number {
    return this.port;
  }
}

export const proxyManager = new ProxyManager();
```

### 系统托盘

```typescript
// src/main/tray.ts
import { Tray, Menu, nativeImage, app } from "electron";
import path from "path";
import { proxyManager } from "./proxy/manager";

let tray: Tray | null = null;

export function createTray(mainWindow: Electron.BrowserWindow): void {
  const iconPath = path.join(__dirname, "../../resources/icon.png");
  const icon = nativeImage
    .createFromPath(iconPath)
    .resize({ width: 16, height: 16 });

  tray = new Tray(icon);
  tray.setToolTip("linjun");

  const updateMenu = () => {
    const isRunning = proxyManager.isRunning();

    const contextMenu = Menu.buildFromTemplate([
      {
        label: "Dashboard",
        click: () => {
          mainWindow.show();
          mainWindow.focus();
        },
      },
      { type: "separator" },
      {
        label: isRunning ? "● Running" : "○ Stopped",
        enabled: false,
      },
      {
        label: isRunning ? "Stop Proxy" : "Start Proxy",
        click: async () => {
          if (isRunning) {
            await proxyManager.stop();
          } else {
            await proxyManager.start();
          }
          updateMenu();
        },
      },
      { type: "separator" },
      {
        label: "Quit",
        click: () => {
          proxyManager.stop();
          app.quit();
        },
      },
    ]);

    tray?.setContextMenu(contextMenu);
  };

  updateMenu();

  tray.on("click", () => {
    mainWindow.show();
    mainWindow.focus();
  });
}
```

### IPC 通信

```typescript
// src/main/ipc/handlers.ts
import { ipcMain } from "electron";
import { proxyManager } from "../proxy/manager";

export function setupIpcHandlers(): void {
  ipcMain.handle("proxy:start", async () => {
    await proxyManager.start();
    return { success: true };
  });

  ipcMain.handle("proxy:stop", async () => {
    await proxyManager.stop();
    return { success: true };
  });

  ipcMain.handle("proxy:status", () => {
    return {
      running: proxyManager.isRunning(),
      port: proxyManager.getPort(),
    };
  });
}
```

```typescript
// src/preload/index.ts
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  proxy: {
    start: () => ipcRenderer.invoke("proxy:start"),
    stop: () => ipcRenderer.invoke("proxy:stop"),
    status: () => ipcRenderer.invoke("proxy:status"),
  },
});
```

### 前端调用示例

```tsx
// src/renderer/components/Dashboard/ProxyControl.tsx
import { useState, useEffect } from "react";

export function ProxyControl() {
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    window.electronAPI.proxy.status().then(({ running }) => {
      setRunning(running);
    });
  }, []);

  const toggle = async () => {
    setLoading(true);
    try {
      if (running) {
        await window.electronAPI.proxy.stop();
      } else {
        await window.electronAPI.proxy.start();
      }
      setRunning(!running);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`px-4 py-2 rounded ${running ? "bg-red-500" : "bg-green-500"} text-white`}
    >
      {loading ? "Loading..." : running ? "Stop Proxy" : "Start Proxy"}
    </button>
  );
}
```

---

## 构建 & 发布

### electron-builder 配置

```yaml
# electron-builder.yml
appId: com.clipplus.app
productName: linjun
directories:
  buildResources: resources
  output: dist

files:
  - "!**/.git/*"
  - "!**/node_modules/*/{CHANGELOG.md,README.md,README,readme.md,readme}"

extraResources:
  - from: "resources/binaries/${platform}-${arch}"
    to: "binaries/${platform}-${arch}"
    filter:
      - "**/*"

mac:
  category: public.app-category.developer-tools
  icon: resources/icon.icns
  target:
    - target: dmg
      arch: [x64, arm64]
    - target: zip
      arch: [x64, arm64]
  hardenedRuntime: true
  gatekeeperAssess: false

win:
  icon: resources/icon.ico
  target:
    - target: nsis
      arch: [x64]
    - target: portable
      arch: [x64]

linux:
  icon: resources/icon.png
  category: Development
  target:
    - target: AppImage
      arch: [x64]
    - target: deb
      arch: [x64]

nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: true
  createStartMenuShortcut: true
```

### 构建命令

```bash
# macOS (当前架构)
pnpm build:mac

# Windows
pnpm build:win

# Linux
pnpm build:linux

# 所有平台
pnpm build:all
```

### package.json scripts

```json
{
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "build:mac": "pnpm build && electron-builder --mac",
    "build:win": "pnpm build && electron-builder --win",
    "build:linux": "pnpm build && electron-builder --linux",
    "build:all": "pnpm build && electron-builder --mac --win --linux",
    "download:binary": "ts-node scripts/download-binary.ts"
  }
}
```

---

## CLIProxyAPIPlus Management API

### 常用接口

```typescript
// src/main/proxy/api.ts
import axios from "axios";

const BASE_URL = "http://127.0.0.1:8080";

export const managementAPI = {
  // 获取状态
  async getStatus() {
    const res = await axios.get(`${BASE_URL}/management/status`);
    return res.data;
  },

  // 获取账户列表
  async getAccounts() {
    const res = await axios.get(`${BASE_URL}/management/accounts`);
    return res.data;
  },

  // 获取 Quota 使用情况
  async getQuota() {
    const res = await axios.get(`${BASE_URL}/management/quota`);
    return res.data;
  },

  // OAuth 认证
  async startAuth(provider: "claude" | "gemini" | "codex") {
    const res = await axios.post(
      `${BASE_URL}/management/auth/${provider}/start`,
    );
    return res.data;
  },
};
```

---

## 相关资源

### CLIProxyAPIPlus

- 官方文档: https://help.router-for.me/
- GitHub: https://github.com/router-for-me/CLIProxyAPIPlus
- Management API: https://help.router-for.me/management/api
- Releases (二进制下载): https://github.com/router-for-me/CLIProxyAPIPlus/releases

### Electron 开发

- 官方文档: https://www.electronjs.org/docs
- electron-vite: https://electron-vite.org/
- electron-builder: https://www.electron.build/
- electron-store: https://github.com/sindresorhus/electron-store

### UI 参考

- Quotio 截图: https://github.com/nguyenphutrong/quotio#screenshots
- ZeroLimit: https://github.com/0xtbug/zero-limit

---

## 注意事项

### 包体积优化

Electron 应用默认较大（~150MB），可通过以下方式优化：

1. 使用 `electron-builder` 的 `asar` 打包
2. 排除不必要的 node_modules
3. 使用 `@electron/rebuild` 只编译需要的原生模块

### 安全性

1. 启用 `contextIsolation`
2. 禁用 `nodeIntegration`
3. 使用 `preload` 脚本暴露安全的 API
4. CLIProxyAPIPlus 仅监听 `127.0.0.1`

### macOS 签名

发布到 macOS 需要：

1. Apple Developer 证书
2. 代码签名 + 公证 (Notarization)
3. 或提示用户执行 `xattr -cr /Applications/linjun.app`
