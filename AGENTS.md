# AGENTS.md - CLIPlus Development Guide

> Instructions for AI coding agents working on this Electron + React + TypeScript codebase.

## Project Overview

CLIPlus is a cross-platform desktop application for managing CLIProxyAPIPlus, built with:
- **Electron 33+** - Desktop framework
- **React 18** - UI library
- **TypeScript 5** - Type safety
- **Vite** - Build tool (via electron-vite)
- **Tailwind CSS** - Styling

## Build Commands

```bash
# Install dependencies
pnpm install

# Development mode (hot reload)
pnpm dev

# Build for production
pnpm build

# Platform-specific builds
pnpm build:mac      # macOS (dmg, zip)
pnpm build:win      # Windows (nsis, portable)
pnpm build:linux    # Linux (AppImage, deb)
pnpm build:all      # All platforms

# Download CLIProxyAPIPlus binary
pnpm download:binary
```

## Lint & Format Commands

```bash
# Lint all files
pnpm lint

# Lint with auto-fix
pnpm lint:fix

# Format code with Prettier
pnpm format

# Type check without emitting
pnpm typecheck
```

## Test Commands

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run a single test file
pnpm test src/main/proxy/manager.test.ts

# Run tests matching a pattern
pnpm test -t "ProxyManager"

# Run with coverage
pnpm test:coverage
```

## Project Structure

```
src/
├── main/           # Electron main process (Node.js)
├── preload/        # Preload scripts (bridge)
└── renderer/       # React frontend (browser)
```

## Code Style Guidelines

### TypeScript

- **Strict mode enabled** - No `any` types unless absolutely necessary
- **Explicit return types** on exported functions
- **Interface over type** for object shapes
- **Enums** for fixed sets of values

```typescript
// ✅ Good
interface ProxyStatus {
  running: boolean
  port: number
  uptime: number
}

export function getStatus(): ProxyStatus {
  // ...
}

// ❌ Bad
export function getStatus(): any {
  // ...
}
```

### Imports

Order imports in this sequence (with blank lines between groups):
1. Node.js built-ins
2. Electron modules
3. Third-party packages
4. Internal modules (absolute paths)
5. Relative imports

```typescript
// ✅ Good
import path from 'path'
import { spawn } from 'child_process'

import { app, BrowserWindow, ipcMain } from 'electron'

import axios from 'axios'
import { create } from 'zustand'

import { proxyManager } from '@/main/proxy/manager'

import { formatBytes } from './utils'
```

### Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Files (components) | PascalCase | `ProxyControl.tsx` |
| Files (utils) | camelCase | `formatBytes.ts` |
| Variables/Functions | camelCase | `isRunning`, `startProxy()` |
| Constants | UPPER_SNAKE | `DEFAULT_PORT` |
| Types/Interfaces | PascalCase | `ProxyConfig` |
| React Components | PascalCase | `DashboardView` |
| IPC Channels | kebab:colon | `proxy:start`, `auth:login` |

### React Components

- **Functional components only** - No class components
- **Named exports** for components
- **Props interface** defined above component

```typescript
// ✅ Good
interface ProxyControlProps {
  onStatusChange?: (running: boolean) => void
}

export function ProxyControl({ onStatusChange }: ProxyControlProps) {
  const [running, setRunning] = useState(false)
  // ...
}
```

### Error Handling

- **Always catch async errors** - Never leave promises unhandled
- **Use try/catch** in async functions
- **Log errors** with context
- **Return typed errors** when possible

```typescript
// ✅ Good
async function startProxy(): Promise<{ success: boolean; error?: string }> {
  try {
    await proxyManager.start()
    return { success: true }
  } catch (error) {
    console.error('[Proxy] Failed to start:', error)
    return { success: false, error: String(error) }
  }
}
```

### IPC Communication

- **Use `ipcMain.handle`** for request/response patterns
- **Preload scripts** expose safe APIs via `contextBridge`
- **Never expose** `ipcRenderer` directly to renderer

```typescript
// main/ipc/handlers.ts
ipcMain.handle('proxy:start', async () => {
  await proxyManager.start()
  return { success: true }
})

// preload/index.ts
contextBridge.exposeInMainWorld('electronAPI', {
  proxy: {
    start: () => ipcRenderer.invoke('proxy:start'),
  },
})
```

### Tailwind CSS

- **Use utility classes** - Avoid custom CSS when possible
- **Component extraction** for repeated patterns
- **Dark mode** via `dark:` prefix

```tsx
// ✅ Good
<button className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg">
  Start
</button>
```

## Security Rules

1. **`nodeIntegration: false`** - Always disabled in renderer
2. **`contextIsolation: true`** - Always enabled
3. **Validate IPC inputs** - Never trust renderer data
4. **CLIProxyAPIPlus binds to `127.0.0.1`** - Localhost only

## File Templates

When creating new files, follow these patterns:

### Main Process Module
```typescript
// src/main/feature/index.ts
import { ipcMain } from 'electron'

export function setupFeature(): void {
  ipcMain.handle('feature:action', async (_event, args) => {
    // Implementation
  })
}
```

### React Component
```typescript
// src/renderer/components/Feature/FeatureName.tsx
import { useState } from 'react'

interface FeatureNameProps {
  // props
}

export function FeatureName({ }: FeatureNameProps) {
  return (
    <div>
      {/* JSX */}
    </div>
  )
}
```

## Common Pitfalls

1. **Don't import Electron in renderer** - Use preload bridge
2. **Don't block main process** - Use async/await properly
3. **Don't hardcode paths** - Use `app.getPath()` and `__dirname`
4. **Don't forget cleanup** - Kill child processes on app quit
