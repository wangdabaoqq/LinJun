/**
 * Compatibility Observability Schema
 *
 * Defines structured event names and payload shapes for:
 *   - fallback-hit: management API unavailable, legacy YAML used as effective source
 *   - migration-started: one-time write-through from legacy YAML to management API begun
 *   - migration-succeeded: write-through completed successfully
 *   - migration-failed: write-through failed; fallback remains active
 *   - conflict-detected: both management and legacy YAML have data; management wins
 *
 * SECURITY: No secrets, tokens, or credential values are ever included in payloads.
 * Sensitive fields (e.g. account keys, auth tokens) MUST NOT be passed to these emitters.
 */

import log from "../utils/logger";


export const COMPAT_EVENTS = {
  FALLBACK_HIT: "compat:fallback-hit",
  MIGRATION_STARTED: "compat:migration-started",
  MIGRATION_SUCCEEDED: "compat:migration-succeeded",
  MIGRATION_FAILED: "compat:migration-failed",
  CONFLICT_DETECTED: "compat:conflict-detected",
} as const;

export type CompatEventName =
  (typeof COMPAT_EVENTS)[keyof typeof COMPAT_EVENTS];


/** Which feature triggered the event */
export type CompatFeature = "exclusion" | "alias";

export interface FallbackHitPayload {
  event: typeof COMPAT_EVENTS.FALLBACK_HIT;
  feature: CompatFeature;
  /** Human-readable reason why management source was skipped */
  reason: string;
  /** Error code from network layer, if applicable (e.g. ECONNREFUSED) */
  errorCode?: string;
  /** Provider/source key that triggered the fallback (safe, no credentials) */
  sourceKey?: string;
}

export interface MigrationStartedPayload {
  event: typeof COMPAT_EVENTS.MIGRATION_STARTED;
  feature: CompatFeature;
  /** Number of legacy entries being migrated */
  legacyEntryCount: number;
}

export interface MigrationSucceededPayload {
  event: typeof COMPAT_EVENTS.MIGRATION_SUCCEEDED;
  feature: CompatFeature;
  /** Number of entries written to management API */
  writtenCount: number;
}

export interface MigrationFailedPayload {
  event: typeof COMPAT_EVENTS.MIGRATION_FAILED;
  feature: CompatFeature;
  /** Short reason string — MUST NOT contain token/secret values */
  reason: string;
  /** Error code if available */
  errorCode?: string;
}

export interface ConflictDetectedPayload {
  event: typeof COMPAT_EVENTS.CONFLICT_DETECTED;
  feature: CompatFeature;
  /** Provider/source key where conflict was found */
  sourceKey: string;
  /** Which source won (always "management" per policy) */
  winner: "management";
}

export type CompatEventPayload =
  | FallbackHitPayload
  | MigrationStartedPayload
  | MigrationSucceededPayload
  | MigrationFailedPayload
  | ConflictDetectedPayload;


const SENSITIVE_KEYS = new Set([
  "token",
  "accessToken",
  "access_token",
  "refreshToken",
  "refresh_token",
  "secret",
  "password",
  "credential",
  "apiKey",
  "api_key",
  "authorization",
  "auth",
]);

/**
 * Strips any top-level keys that look like credentials from a payload object.
 * This is a shallow guard — nested objects are not recursed intentionally to
 * keep the schema flat and auditable.
 */
export function redactSensitiveFields(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (SENSITIVE_KEYS.has(k.toLowerCase()) || SENSITIVE_KEYS.has(k)) {
      safe[k] = "[REDACTED]";
    } else {
      safe[k] = v;
    }
  }
  return safe;
}


function emit(payload: CompatEventPayload): void {
  const safe = redactSensitiveFields(
    payload as unknown as Record<string, unknown>,
  );
  log.info(`[Compat] ${payload.event}`, safe);
}

export function emitFallbackHit(
  payload: Omit<FallbackHitPayload, "event">,
): void {
  emit({ event: COMPAT_EVENTS.FALLBACK_HIT, ...payload });
}

export function emitMigrationStarted(
  payload: Omit<MigrationStartedPayload, "event">,
): void {
  emit({ event: COMPAT_EVENTS.MIGRATION_STARTED, ...payload });
}

export function emitMigrationSucceeded(
  payload: Omit<MigrationSucceededPayload, "event">,
): void {
  emit({ event: COMPAT_EVENTS.MIGRATION_SUCCEEDED, ...payload });
}

export function emitMigrationFailed(
  payload: Omit<MigrationFailedPayload, "event">,
): void {
  emit({ event: COMPAT_EVENTS.MIGRATION_FAILED, ...payload });
}

export function emitConflictDetected(
  payload: Omit<ConflictDetectedPayload, "event">,
): void {
  emit({ event: COMPAT_EVENTS.CONFLICT_DETECTED, ...payload });
}
