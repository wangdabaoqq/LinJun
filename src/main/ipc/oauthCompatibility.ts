import { OAuthExcludedModelsConfig, OAuthModelAliasConfig } from "./types";

interface CompatibilityResolution<T> {
  effective: T;
  usedFallback: boolean;
  shouldMigrate: boolean;
  conflictKeys: string[];
}

function hasEntries(value: Record<string, unknown>): boolean {
  return Object.keys(value).length > 0;
}

function arraysEqualAsSet(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  const leftSet = new Set(left);
  if (leftSet.size !== right.length) return false;
  return right.every((item) => leftSet.has(item));
}

function aliasEntriesEqual(
  left: Array<{ name: string; alias: string; fork?: boolean }>,
  right: Array<{ name: string; alias: string; fork?: boolean }>,
): boolean {
  if (left.length !== right.length) return false;
  const leftSet = new Set(
    left.map(
      (entry) =>
        `${entry.name}=>${entry.alias}=>${entry.fork === true ? "1" : "0"}`,
    ),
  );
  if (leftSet.size !== right.length) return false;
  return right.every((entry) =>
    leftSet.has(
      `${entry.name}=>${entry.alias}=>${entry.fork === true ? "1" : "0"}`,
    ),
  );
}

function detectExclusionConflicts(
  managementRules: OAuthExcludedModelsConfig,
  legacyRules: OAuthExcludedModelsConfig,
): string[] {
  return Object.keys(legacyRules).filter((sourceKey) => {
    const managementPatterns = managementRules[sourceKey];
    const legacyPatterns = legacyRules[sourceKey];
    if (!managementPatterns || !legacyPatterns) return false;
    return !arraysEqualAsSet(managementPatterns, legacyPatterns);
  });
}

function detectAliasConflicts(
  managementRules: OAuthModelAliasConfig,
  legacyRules: OAuthModelAliasConfig,
): string[] {
  return Object.keys(legacyRules).filter((sourceKey) => {
    const managementMappings = managementRules[sourceKey];
    const legacyMappings = legacyRules[sourceKey];
    if (!managementMappings || !legacyMappings) return false;
    return !aliasEntriesEqual(managementMappings, legacyMappings);
  });
}

export function resolveExcludedModelCompatibility(params: {
  managementRules: OAuthExcludedModelsConfig;
  legacyRules: OAuthExcludedModelsConfig;
}): CompatibilityResolution<OAuthExcludedModelsConfig> {
  const { managementRules, legacyRules } = params;

  if (hasEntries(managementRules)) {
    return {
      effective: managementRules,
      usedFallback: false,
      shouldMigrate: false,
      conflictKeys: detectExclusionConflicts(managementRules, legacyRules),
    };
  }

  if (hasEntries(legacyRules)) {
    return {
      effective: legacyRules,
      usedFallback: true,
      shouldMigrate: true,
      conflictKeys: [],
    };
  }

  return {
    effective: {},
    usedFallback: false,
    shouldMigrate: false,
    conflictKeys: [],
  };
}

export function resolveModelAliasCompatibility(params: {
  managementRules: OAuthModelAliasConfig;
  legacyRules: OAuthModelAliasConfig;
}): CompatibilityResolution<OAuthModelAliasConfig> {
  const { managementRules, legacyRules } = params;

  if (hasEntries(managementRules)) {
    return {
      effective: managementRules,
      usedFallback: false,
      shouldMigrate: false,
      conflictKeys: detectAliasConflicts(managementRules, legacyRules),
    };
  }

  if (hasEntries(legacyRules)) {
    return {
      effective: legacyRules,
      usedFallback: true,
      shouldMigrate: true,
      conflictKeys: [],
    };
  }

  return {
    effective: {},
    usedFallback: false,
    shouldMigrate: false,
    conflictKeys: [],
  };
}
