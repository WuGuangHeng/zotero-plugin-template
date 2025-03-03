import { getString, initLocale } from "./utils/locale";
import { createZToolkit } from "./utils/ztoolkit";
import { config } from "../package.json";
import { RAGFlowUI } from "./modules/ragflowUI";

async function onStartup() {
  // 初始化插件
  addon.data.env = __env__;
  ztoolkit.log(`${config.addonName} startup`, config.addonName);

  // 等待 Zotero 完全初始化
  await Promise.all([
    Zotero.initializationPromise,
    Zotero.unlockPromise,
    Zotero.uiReadyPromise,
  ]);

  // 初始化本地化资源
  initLocale();

  // 调用 addon 对象的 onStartup 方法
  // 这将触发 RAGFlowUI.registerUI() 和其他初始化
  await addon.onStartup();

  // 为每个主窗口加载插件
  await Promise.all(
    Zotero.getMainWindows().map((win) => onMainWindowLoad(win)),
  );
}

async function onMainWindowLoad(win: Window): Promise<void> {
  // 为每个窗口创建 ztoolkit
  addon.data.ztoolkit = createZToolkit();

  // 加载本地化字符串
  // @ts-ignore This is a moz feature
  win.MozXULElement.insertFTLIfNeeded(
    `${addon.data.config.addonRef}-mainWindow.ftl`,
  );

  // 显示启动通知
  const progressWindow = new ztoolkit.ProgressWindow(addon.data.config.addonName, {
    closeOnClick: true,
    closeTime: 3000,
  })
    .createLine({
      text: getString("startup-finish"),
      type: "success",
      progress: 100,
    })
    .show();
}

async function onMainWindowUnload(win: Window): Promise<void> {
  // 清理资源
  ztoolkit.unregisterAll();
  addon.data.dialog?.window?.close();
}

async function onShutdown(): Promise<void> {
  // 释放资源，取消事件监听器等
  ztoolkit.log(`${config.addonName} shutdown`, config.addonName);
  
  // 注销所有UI元素以避免内存泄漏
  ztoolkit.unregisterAll();
  addon.data.dialog?.window?.close();
  
  // 移除插件实例
  addon.data.alive = false;
  // @ts-ignore - Plugin instance is not typed
  delete Zotero[addon.data.config.addonInstance];
}

/**
 * 通知事件处理
 */
async function onNotify(
  event: string,
  type: string,
  ids: Array<string | number>,
  extraData: { [key: string]: any },
) {
  // RAGFlow 插件可能不需要特别处理通知
  // 如有需要，可以在此添加代码
}

/**
 * 首选项UI事件处理
 */
async function onPrefsEvent(type: string, data: { [key: string]: any }) {
  // 如果 RAGFlow 有特定的首选项处理需求，可以在此添加
}

// 导出所有钩子函数
export default {
  onStartup,
  onShutdown,
  onMainWindowLoad,
  onMainWindowUnload,
  onNotify,
  onPrefsEvent,
};