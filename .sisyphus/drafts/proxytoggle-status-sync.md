# Draft: ProxyToggle Status Sync

## Requirements (confirmed)

- User observes ProxyToggle status not updating after killing process by PID (e.g., `kill 29635`).

## Technical Decisions

- None yet.

## Research Findings

- ProxyToggle subscribes to `proxy:statusChanged` and initializes via `proxy.status()`.
- Main process emits `proxy:statusChanged` on `proxyManager` status changes.
- `ProxyManager` has a 3s health check polling `http://127.0.0.1:{port}/management/status` to detect external kill and emit statusChange.

## Open Questions

- Is the PID killed the same process spawned by Electron, or just the process holding the port?
- After kill, does `/management/status` still respond?
- Does `lsof -i:8310` still show any process after the kill?

## Scope Boundaries

- INCLUDE: Diagnose status sync behavior for top-right ProxyToggle when external kill happens.
- EXCLUDE: Unrelated UI status indicators (TPS/P99/Tok/s).
