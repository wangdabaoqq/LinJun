# 霖君

![霖君 Banner](docs/icon/logo.webp)

[![Platform macOS](https://img.shields.io/badge/platform-macOS-lightgray.svg)](https://developer.apple.com/macos/) [![Platform Windows](https://img.shields.io/badge/platform-Windows-blue.svg)](https://www.microsoft.com/windows/) [![Platform Linux](https://img.shields.io/badge/platform-Linux-yellow.svg)](https://www.linux.org/) [![Language TypeScript](https://img.shields.io/badge/language-TypeScript-3178c6.svg)](https://www.typescriptlang.org/) [![License MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**[中文文档](README_CN.md)**

**Cross-platform AI proxy management for Claude, Gemini, OpenAI, Qwen, and more.**

霖君 is a native desktop application for managing [CLIProxyAPIPlus](https://github.com/router-for-me/CLIProxyAPIPlus) - a local proxy server that powers your AI coding agents. It helps you manage multiple AI accounts, track quotas, and configure CLI tools in one place across **macOS**, **Windows**, and **Linux**.

## ✨ Features

- 🔌 **Multi-Provider Support**: Connect accounts from Claude, Gemini, OpenAI Codex, Qwen, Antigravity, iFlow, Kiro, Vertex AI, GitHub Copilot via OAuth or API keys
- 📊 **Real-time Quota Tracking**: Monitor usage per account with automatic refresh
- 🚀 **One-Click Agent Configuration**: Auto-detect and configure Claude Code, OpenCode, Gemini CLI, and more
- 📈 **Live Dashboard**: Monitor request traffic, token usage, and success rates
- 🔀 **Smart Routing**: Round Robin and Fill First failover strategies
- 🔑 **API Key Management**: Generate and manage keys for your local proxy
- 🖥️ **System Tray Integration**: Quick access to status from menu bar
- 🌐 **Multilingual**: English and Simplified Chinese support

## 🤖 Supported Ecosystem

### AI Providers

| Provider        | Auth Method    |
| --------------- | -------------- |
| Claude Code     | OAuth          |
| Gemini CLI      | OAuth          |
| OpenAI Codex    | OAuth          |
| Qwen Code       | OAuth          |
| Antigravity     | OAuth (Google) |
| iFlow           | OAuth          |
| GitHub Copilot  | OAuth          |
| Kiro            | OAuth          |
| Vertex AI       | OAuth          |
| Custom Provider | API Key        |

### Compatible CLI Agents

霖君 can automatically configure these tools to use your centralized proxy:

- Claude Code
- Codex CLI
- Gemini CLI
- OpenCode

## 📥 Installation

### Download

Download the latest release from [GitHub Releases](https://github.com/wangdabaoqq/L-jun/releases):

| Platform              | Download                        |
| --------------------- | ------------------------------- |
| macOS (Apple Silicon) | `霖君-x.x.x-arm64.dmg`          |
| macOS (Intel)         | `霖君-x.x.x.dmg`                |
| Windows               | `霖君-Setup-x.x.x.exe`          |
| Linux                 | `霖君-x.x.x.AppImage` or `.deb` |

### Build from Source

**Requirements:**

- Node.js 18+
- Bun (recommended) or npm
- Git

```bash
# Clone the repository
git clone https://github.com/wangdabaoqq/L-jun.git
cd L-jun

# Install dependencies
bun install

# Download CLIProxyAPIPlus binary
bun run download:binary

# Start development server
bun dev
```

### Build for Production

```bash
bun run build:mac      # macOS (dmg, zip)
bun run build:win      # Windows (nsis, portable)
bun run build:linux    # Linux (AppImage, deb)
bun run build:all      # All platforms
```

## 📖 Usage

### 1. Start the Server

Launch 霖君 and click **Start** to initialize the local proxy server.

### 2. Connect Accounts

Go to **Providers** tab → Select a provider → Authenticate via OAuth or enter API key.

### 3. Configure Agents

Go to **Agents** tab → Select detected agent → Configure to use local proxy.

### 4. Monitor Usage

- **Dashboard**: Overall health and traffic
- **Quota**: Per-account usage breakdown
- **Logs**: Raw request logs for debugging

## 📸 Screenshots

| Dashboard                                    | Providers                                    |
| -------------------------------------------- | -------------------------------------------- |
| ![Dashboard](docs/screenshots/dashboard.png) | ![Providers](docs/screenshots/providers.png) |

| Quota Monitoring                     | Settings                                   |
| ------------------------------------ | ------------------------------------------ |
| ![Quota](docs/screenshots/quota.png) | ![Settings](docs/screenshots/settings.png) |

| Agents                                 | API Key                                  |
| -------------------------------------- | ---------------------------------------- |
| ![Agents](docs/screenshots/agents.png) | ![API Key](docs/screenshots/api-key.png) |

## ⚙️ Settings

- **Port**: Change the proxy listening port (default: 8317)
- **Routing Strategy**: Round Robin or Fill First
- **Auto-start**: Launch proxy automatically on app startup
- **Notifications**: Toggle alerts for quota warnings

## 🏗️ Architecture

```
霖君/
├── src/
│   ├── main/                    # Electron main process
│   │   ├── index.ts            # App entry point
│   │   ├── tray.ts             # System tray integration
│   │   ├── proxy/              # CLIProxyAPIPlus management
│   │   │   ├── manager.ts      # Process lifecycle
│   │   │   └── api.ts          # Management API client
│   │   ├── ipc/                # IPC handlers
│   │   ├── quota/              # Provider quota services
│   │   ├── logging/            # Request logging
│   │   └── utils/              # CLI detection, storage
│   ├── preload/                # Context bridge
│   └── renderer/               # React frontend
│       ├── components/         # UI components
│       ├── stores/             # Zustand state
│       └── hooks/              # Custom hooks
├── resources/                  # Static assets
└── scripts/                    # Build scripts
```

## 🔧 Tech Stack

| Component | Technology            |
| --------- | --------------------- |
| Framework | Electron 33+          |
| Frontend  | React 18 + TypeScript |
| Styling   | Tailwind CSS          |
| State     | Zustand               |
| Build     | Vite + electron-vite  |
| Packaging | electron-builder      |

## 📁 Token Storage

Authentication tokens are stored in `~/.cli-proxy-api/` directory as JSON files:

- `codex-{email}-Plus.json`
- `antigravity-{email}.json`
- `kiro-google-{id}.json`
- etc.

## 🤝 Contributing

1. Fork the project
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License. See [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- [CLIProxyAPIPlus](https://github.com/router-for-me/CLIProxyAPIPlus) - The amazing proxy server
- [Quotio](https://github.com/nguyenphutrong/quotio) - Inspiration for this project
- [Electron](https://www.electronjs.org/) - Cross-platform framework
- [Vite](https://vitejs.dev/) - Fast build tool

---

[![Star History Chart](https://api.star-history.com/svg?repos=wangdabaoqq/L-jun&type=Date)](https://star-history.com/#wangdabaoqq/L-jun&Date)
