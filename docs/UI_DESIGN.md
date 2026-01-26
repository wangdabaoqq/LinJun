# linjun UI Design - Cyberpunk Theme

## Visual Style Guide

### Color Palette

| Name                     | Hex       | Usage                         |
| ------------------------ | --------- | ----------------------------- |
| **Background**           | `#0a0a0f` | Main background               |
| **Background Secondary** | `#0d0d12` | Cards, panels                 |
| **Neon Cyan**            | `#00ffff` | Primary accent, active states |
| **Neon Pink**            | `#ff00aa` | Secondary accent, warnings    |
| **Neon Purple**          | `#9d00ff` | Tertiary accent               |
| **Neon Green**           | `#00ff88` | Success, online status        |
| **Neon Red**             | `#ff0044` | Error, offline status         |
| **Text Primary**         | `#e0e0e0` | Main text                     |
| **Text Muted**           | `#888888` | Secondary text                |

### Typography

- **Primary Font**: Rajdhani, Segoe UI, system-ui
- **Monospace**: JetBrains Mono, Fira Code, Consolas

### Effects

1. **Neon Glow**: `box-shadow: 0 0 10px color, 0 0 20px color40, 0 0 30px color10`
2. **Glitch Animation**: Subtle translate jitter on hover
3. **Scanline Overlay**: Horizontal lines at 3% opacity
4. **Grid Background**: Cyan/Pink grid pattern at 3% opacity

---

## Layout Structure

```
┌─────────────────────────────────────────────────────────────────┐
│ [HUD BAR] CLI-to-API Bridge v2.0 · ● 127.0.0.1:8080 · ACTIVE   │
├──────────────┬──────────────────────────────────────────────────┤
│              │                                                  │
│  PROVIDERS   │   ┌────────────┐ ┌────────────┐ ┌────────────┐  │
│  ───────────│   │  REQUESTS  │ │   TOKENS   │ │  LATENCY   │  │
│  ● OpenAI   │   │   2,847    │ │    1.2M    │ │    1.8s    │  │
│  ● Gemini   │   └────────────┘ └────────────┘ └────────────┘  │
│  ● Claude   │                                                  │
│  ○ Codex    │   ┌─────────────────────────────────────────────┐│
│  ○ Qwen     │   │ TERMINAL LOG                          LIVE ││
│              │   │ > POST /v1/chat [claude-3.5-sonnet]        ││
│  NAVIGATION  │   │ < 200 OK (2.1s) tokens: 1,234             ││
│  ───────────│   │ > POST /v1/chat [gemini-2.5-pro]           ││
│  ◈ Dashboard │   │ < 200 OK (1.8s) tokens: 892               ││
│  ◉ Providers │   │ █                                          ││
│  ▣ Quota     │   └─────────────────────────────────────────────┘│
│  ◎ Agents    │                                                  │
│  ▤ Logs      │   ┌─────────────────────────────────────────────┐│
│  ⚙ Settings  │   │ QUOTA USAGE                                ││
│              │   │ Claude  ████████████░░░░░  45K / 100K      ││
│  ───────────│   │ Gemini  ██████░░░░░░░░░░░ 120K / 500K      ││
│  SYS v1.0.0  │   │ OpenAI  █████████████████  8.5K / 10K      ││
│              │   └─────────────────────────────────────────────┘│
└──────────────┴──────────────────────────────────────────────────┘
```

---

## Component Specifications

### HUD Top Bar

```css
.hud-bar {
  height: 40px;
  background: linear-gradient(
    180deg,
    rgba(0, 0, 0, 0.8),
    rgba(10, 10, 15, 0.9)
  );
  border-bottom: 1px solid rgba(0, 255, 255, 0.2);
  backdrop-filter: blur(10px);
}
```

### Cyber Card

```css
.cyber-card {
  background: linear-gradient(
    135deg,
    rgba(13, 13, 18, 0.9),
    rgba(20, 20, 30, 0.9)
  );
  border: 1px solid rgba(0, 255, 255, 0.2);
  border-radius: 8px;
}

.cyber-card::before {
  /* Top gradient line */
  background: linear-gradient(90deg, transparent, #00ffff, transparent);
}
```

### Cyber Button

```css
.cyber-btn {
  background: linear-gradient(
    135deg,
    rgba(0, 255, 255, 0.1),
    rgba(157, 0, 255, 0.1)
  );
  border: 1px solid rgba(0, 255, 255, 0.4);
  color: #00ffff;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.cyber-btn:hover {
  box-shadow: 0 0 20px rgba(0, 255, 255, 0.4);
  transform: translateY(-2px);
}
```

### Status Indicators

```css
.status-online {
  color: #00ff88;
  text-shadow: 0 0 10px rgba(0, 255, 136, 0.8);
}

.status-offline {
  color: #ff0044;
  text-shadow: 0 0 10px rgba(255, 0, 68, 0.8);
}
```

### Progress Bar

```css
.progress-bar-cyber {
  background: rgba(0, 0, 0, 0.4);
  height: 8px;
}

.progress-bar-cyber-fill {
  background: linear-gradient(90deg, #00ffff, #9d00ff);
  box-shadow: 0 0 10px #00ffff;
}
```

---

## Page Designs

### Dashboard

- 3 stat cards (Requests, Tokens, Latency) with neon colors
- Terminal log with live indicator
- Quota usage bars
- Active endpoints grid

### Providers

- Grid of provider cards
- Status indicators (green/red glow)
- OAuth connect buttons
- Account count display

### Quota

- Summary cards (Total Used, At Limit, Next Reset)
- Per-account quota bars with color coding:
  - Green: < 80%
  - Yellow: 80-95%
  - Red: > 95%

### Agents

- List of detected CLI agents
- Status: Configured (green), Detected (yellow), Not Found (gray)
- Configuration code snippets

### Logs

- Table with columns: Time, Provider, Model, Tokens, Latency, Status
- Filter buttons (All, Success, Error)
- Monospace terminal font

### Settings

- Form inputs with cyber styling
- Toggle switches with neon glow
- About section with version info

---

## Responsive Considerations

- Minimum window: 800 x 600
- Optimal window: 1200 x 800
- Sidebar: Fixed 224px width
- Main content: Fluid with padding
