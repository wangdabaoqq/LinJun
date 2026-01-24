import Store from "electron-store";

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
    port: 8080,
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
