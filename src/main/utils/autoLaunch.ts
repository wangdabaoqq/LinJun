import { app } from "electron";

export function setAutoLaunch(enable: boolean): void {
  app.setLoginItemSettings({
    openAtLogin: enable,
    openAsHidden: true,
    // Windows 需要通过启动参数实现隐藏启动
    ...(process.platform === "win32" && {
      args: ["--hidden"],
    }),
  });
}

export function getAutoLaunch(): boolean {
  return app.getLoginItemSettings().openAtLogin;
}
