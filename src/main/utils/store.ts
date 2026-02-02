import Store from "electron-store";
import { DEFAULT_PORT } from "../../shared/constants";

interface StoreSchema {
  port: number;
  autoStart: boolean;
  autoLaunch: boolean;
  routingStrategy: "round-robin" | "fill-first";
  language: "en" | "zh";
  theme: "system" | "light" | "dark";
  managementSecret: string;
  requestRetry: number;
  maxRetryInterval: number;
  loggingToFile: boolean;
}

export const store = new Store<StoreSchema>({
  defaults: {
    port: DEFAULT_PORT,
    autoStart: true,
    autoLaunch: false,
    routingStrategy: "round-robin",
    language: "en",
    theme: "system",
    managementSecret: "",
    requestRetry: 3,
    maxRetryInterval: 30,
    loggingToFile: false,
  },
});
