# Release Guide

This guide explains how to publish releases to GitHub Releases using electron-builder.

## Prerequisites

### 1. Create GitHub Personal Access Token

1. Go to https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Set the following permissions:
   - `repo` (full control of private repositories)
4. Generate and copy the token (it will only be shown once!)

### 2. Configure Environment Variable

```bash
# Option A: Set directly in terminal (recommended for security)
export GH_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Option B: Create .env file (DON'T commit this)
cp .env.example .env
# Edit .env and paste your token
```

## Publishing Releases

### Single Platform

```bash
# macOS only
bun run release:mac

# Windows only
bun run release:win

# Linux only
bun run release:linux
```

### All Platforms

```bash
# Build and publish for all platforms
bun run release:all
```

## What Happens

When you run `bun run release:all`:

1. **Build**: `electron-vite build` compiles TypeScript
2. **Package**: `electron-builder` creates installers for each platform
3. **Publish**: Artifacts are uploaded to GitHub Releases with a draft tag
4. **Draft Release**: A draft release is created with:
   - Tag version: `v1.0.0` (from package.json)
   - Release name: `v1.0.0`
   - Assets: All installers (dmg, exe, AppImage, deb)

## After Publishing

1. Go to https://github.com/wangdabaoqq/LinJun/releases
2. Find the draft release
3. Edit release notes
4. Click "Publish release"

## Version Bumping

Before releasing a new version:

```bash
# Update version in package.json
npm version patch  # 1.0.0 → 1.0.1
npm version minor  # 1.0.0 → 1.1.0
npm version major  # 1.0.0 → 2.0.0

# Or manually edit package.json version field
```

## CI/CD Integration (Optional)

For GitHub Actions, add this to your workflow:

```yaml
- name: Build & Release
  env:
    GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  run: bun run release:all
```

Note: `GITHUB_TOKEN` is automatically provided in GitHub Actions.

## Troubleshooting

### Error: GH_TOKEN not set

```bash
export GH_TOKEN=your_token_here
```

### Error: Repository not found

Make sure:

- `repository.url` in package.json is correct
- Token has `repo` permissions
- You have push access to the repository

### Error: Tag already exists

```bash
# Delete the tag locally and remotely
git tag -d v1.0.0
git push origin :refs/tags/v1.0.0

# Then try publishing again
```
