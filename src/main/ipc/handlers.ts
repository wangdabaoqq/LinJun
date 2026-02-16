import { setupApiKeysHandlers } from "./apiKeys.handlers";
import { setupCliHandlers } from "./cli.handlers";
import { setupCustomProvidersHandlers } from "./customProviders.handlers";
import { setupLogsHandlers } from "./logs.handlers";
import { setupProvidersHandlers } from "./providers.handlers";
import { setupProxyHandlers } from "./proxy.handlers";
import { setupQuotaHandlers } from "./quota.handlers";
import { setupSettingsHandlers } from "./settings.handlers";

export function setupIpcHandlers(): void {
  setupProxyHandlers();
  setupSettingsHandlers();
  setupApiKeysHandlers();
  setupProvidersHandlers();
  setupCustomProvidersHandlers();
  setupQuotaHandlers();
  setupCliHandlers();
  setupLogsHandlers();
}
