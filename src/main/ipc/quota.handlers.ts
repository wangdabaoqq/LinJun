import { ipcMain } from "electron";

import { managementAPI } from "../proxy/api";
import {
  getProviders,
  getQuotaByProvider,
  getQuotaByProviderStream,
  ProviderType,
  QuotaAccount,
  refreshQuota,
} from "../quota";
import log from "../utils/logger";

export function setupQuotaHandlers(): void {
  ipcMain.handle("quota:getProviders", async () => {
    try {
      return { success: true, providers: await getProviders() };
    } catch (error) {
      log.error("[IPC] Failed to get providers:", error);
      return { success: false, providers: [], error: String(error) };
    }
  });

  ipcMain.handle(
    "quota:getByProvider",
    async (_event, provider: ProviderType) => {
      try {
        const accounts = await getQuotaByProvider(provider);
        return { success: true, accounts };
      } catch (error) {
        log.error("[IPC] Failed to get quota by provider:", error);
        return { success: false, accounts: [], error: String(error) };
      }
    },
  );

  ipcMain.handle("quota:refresh", async (_event, accountId: string) => {
    try {
      const account = await refreshQuota(accountId);
      return { success: true, account };
    } catch (error) {
      log.error("[IPC] Failed to refresh quota:", error);
      return { success: false, error: String(error) };
    }
  });

  ipcMain.on(
    "quota:getByProviderStream",
    async (event, provider: ProviderType, requestId?: string) => {
      try {
        await getQuotaByProviderStream(
          provider,
          (accounts: QuotaAccount[], done: boolean) => {
            if (!event.sender.isDestroyed()) {
              event.sender.send("quota:streamBatch", {
                provider,
                requestId,
                accounts,
                done,
              });
            }
          },
        );
      } catch (error) {
        log.error("[IPC] Failed to stream quota by provider:", error);
        if (!event.sender.isDestroyed()) {
          event.sender.send("quota:streamBatch", {
            provider,
            requestId,
            accounts: [],
            done: true,
            error: String(error),
          });
        }
      }
    },
  );

  ipcMain.handle("quota:refreshAll", async () => {
    try {
      const providers = await getProviders();
      const results = await Promise.allSettled(
        providers.map((provider) => getQuotaByProvider(provider.id)),
      );

      const allAccounts = results.flatMap((result) =>
        result.status === "fulfilled" ? result.value : [],
      );

      const failedCount = results.filter((r) => r.status === "rejected").length;
      if (failedCount > 0) {
        log.warn(
          `[IPC] ${failedCount}/${providers.length} providers failed to refresh`,
        );
      }

      return { success: true, accounts: allAccounts };
    } catch (error) {
      log.error("[IPC] Failed to refresh all quotas:", error);
      return { success: false, accounts: [], error: String(error) };
    }
  });

  ipcMain.handle("models:fetch", async () => {
    try {
      const models = await managementAPI.fetchModels();
      return { success: true, models };
    } catch (error) {
      log.error("[IPC] Failed to fetch models:", error);
      return { success: false, models: [], error: String(error) };
    }
  });
}
