import { config } from "../package.json";
import { ColumnOptions, DialogHelper } from "zotero-plugin-toolkit";
import hooks from "./hooks";
import { createZToolkit } from "./utils/ztoolkit";
import { getString } from "./utils/locale";
import { RAGFlowUI } from "./modules/ragflowUI";
import { RAGFlowService } from "./modules/ragflowService";
import { Logger } from "./modules/logger";

class Addon {
  public data: {
    alive: boolean;
    config: typeof config;
    // Env type, see build.js
    env: "development" | "production";
    ztoolkit: ReturnType<typeof createZToolkit>;
    locale?: {
      current: any;
    };
    prefs?: {
      window: Window;
      columns: Array<ColumnOptions>;
      rows: Array<{ [dataKey: string]: string }>;
    };
    dialog?: DialogHelper;
    // 添加 RAGFlow 特定数据
    kbId?: string | null;
  };
  // Lifecycle hooks
  public hooks: typeof hooks;
  // APIs
  public api: object;

  private chatAssistantId?: string;
  private sessionId?: string;

  constructor() {
    this.data = {
      alive: true,
      config,
      env: __env__,
      ztoolkit: createZToolkit(),
      kbId: null,
    };
    this.hooks = hooks;
    this.api = {};
  }

  public async onStartup() {
    // 注册 UI 组件
    RAGFlowUI.registerUI();

    // 加载之前保存的知识库 ID 和名称
    this.data.kbId =
      (Zotero.Prefs.get(`${config.prefsPrefix}.kbId`, true) as string) || null;
    const kbName =
      (Zotero.Prefs.get(`${config.prefsPrefix}.kbName`, true) as string) ||
      "未命名知识库";

    // 初始化 RAGFlow 服务配置
    this.updateRAGFlowSettings();

    // 添加调试信息
    Logger.info(
      `API Key状态: ${Zotero.Prefs.get(`${config.prefsPrefix}.apiKey`, true) ? "已设置" : "未设置"}`,
    );
    Logger.info(`使用配置前缀: ${config.prefsPrefix}`);
    Logger.info(`知识库ID: ${this.data.kbId || "未设置"}`);
    Logger.info(`知识库名称: ${kbName}`);
    Logger.info("RAGFlow插件启动完成");
  }

  /**
   * 更新 RAGFlow 服务配置
   */
  public updateRAGFlowSettings() {
    const apiKey = Zotero.Prefs.get(
      `${config.prefsPrefix}.apiKey`,
      true,
    ) as string;
    const apiUrl = Zotero.Prefs.get(
      `${config.prefsPrefix}.apiUrl`,
      true,
    ) as string;

    if (apiKey) {
      RAGFlowService.setApiKey(apiKey);
    }

    if (apiUrl) {
      RAGFlowService.setBaseURL(apiUrl);
    }
  }

  /**
   * 打开设置对话框
   */
  public openSettings() {
    // 不需要调用 dialog.open()，因为 createSettingsUI 内部已经调用了
    RAGFlowUI.createSettingsUI();
  }

  public async openCollectionSelector() {
    // 首先检查是否配置了API密钥
    const apiKey = Zotero.Prefs.get(
      `${config.prefsPrefix}.apiKey`,
      true,
    ) as string;
    if (!apiKey) {
      // 修改: 使用正确的 ProgressWindow 创建方式
      const progressWindow = new ztoolkit.ProgressWindow("RAGFlow 提示");
      progressWindow.createLine({
        text: "请先在设置中配置 RAGFlow API 密钥",
      });
      progressWindow.show();
      progressWindow.startCloseTimer(3000);

      // 打开设置页面
      setTimeout(() => this.openSettings(), 1000);
      return;
    }

    // 获取当前选中的集合
    const collection = Zotero.getActiveZoteroPane().getSelectedCollection();
    if (!collection) {
      // 修改: 使用正确的 ProgressWindow 创建方式
      const progressWindow = new ztoolkit.ProgressWindow("RAGFlow 错误");
      progressWindow.createLine({ text: "请先选择一个集合" });
      progressWindow.show();
      progressWindow.startCloseTimer(3000);
      return;
    }

    // 使用ztoolkit创建确认对话框，替换原生confirm()
    const confirmDialog = new ztoolkit.Dialog(1, 1)
      .addCell(0, 0, {
        tag: "description",
        properties: {
          innerHTML: `是否将集合 "${collection.name}" 发送到 RAGFlow 构建知识库？`,
        },
      })
      .addButton("确定", "ok")
      .addButton("取消", "cancel")
      .setDialogData({
        // 使用正确的回调名称
        unloadCallback: () => {
          // 添加调试日志
          const dialogData = confirmDialog.dialogData;
          Zotero.debug(
            "[RAGFlow] 对话框关闭，最后点击的按钮: " + dialogData._lastButtonId,
          );

          if (dialogData._lastButtonId === "ok") {
            // 添加调试日志
            Zotero.debug(
              "[RAGFlow] 用户点击了确定按钮，准备上传集合: " + collection.name,
            );
            this.uploadCollectionToRAGFlow(collection);
          } else {
            // 添加调试日志
            Zotero.debug("[RAGFlow] 用户取消了上传操作");
          }
        },
      });

    // 尝试添加额外调试信息
    Zotero.debug("[RAGFlow] 准备打开确认对话框");
    confirmDialog.open("RAGFlow 确认", {
      centerscreen: true,
      resizable: false,
    });
    Zotero.debug("[RAGFlow] 对话框已打开");
  }

  public async uploadCollectionToRAGFlow(collection: Zotero.Collection) {
    try {
      Zotero.debug(
        `[RAGFlow] 开始上传集合: ${collection.name}, ID: ${collection.id}`,
      );

      // 显示进度窗口
      const progressWindow = new ztoolkit.ProgressWindow("RAGFlow 上传", {
        closeOnClick: false,
      });
      progressWindow.createLine({ text: "正在准备上传文件..." });
      progressWindow.show();

      // 获取集合中所有条目
      const items = collection.getChildItems();
      Zotero.debug(`[RAGFlow] 集合中有 ${items.length} 个条目`);

      // 获取所有附件
      const attachments = [];
      for (const item of items) {
        // Fix: getAttachments() cannot be called on attachment items
        if (item.isAttachment()) {
          Zotero.debug(
            `[RAGFlow] 条目 ${item.id} (${item.getField("title")}) 是附件，跳过`,
          );
          continue;
        }
        const itemAttachments = item.getAttachments();
        Zotero.debug(
          `[RAGFlow] 条目 ${item.id} (${item.getField("title")}) 有 ${itemAttachments.length} 个附件`,
        );

        for (const attachmentID of itemAttachments) {
          const attachment = Zotero.Items.get(attachmentID);
          if (attachment.isFileAttachment()) {
            const path = attachment.getFilePath();
            if (path) {
              const name = attachment.getField("title");
              const mimeType =
                attachment.attachmentContentType || this.guessMimeType(path);

              Zotero.debug(
                `[RAGFlow] 添加附件: ${name}, 路径: ${path}, 类型: ${mimeType}`,
              );
              attachments.push({ path, name, mimeType });
            } else {
              Zotero.debug(`[RAGFlow] 附件文件路径为空: ${attachment.id}`);
            }
          } else {
            Zotero.debug(`[RAGFlow] 附件不是文件附件: ${attachment.id}`);
          }
        }
      }

      if (attachments.length === 0) {
        Zotero.debug(`[RAGFlow] 没有找到可上传的附件文件`);
        progressWindow.createLine({ text: "没有找到可上传的附件文件" });
        progressWindow.startCloseTimer(3000);
        return;
      }

      Zotero.debug(`[RAGFlow] 找到 ${attachments.length} 个附件文件`);
      progressWindow.createLine({
        text: `找到 ${attachments.length} 个附件文件`,
      });

      // 上传文件到 RAGFlow
      progressWindow.createLine({ text: "正在上传文件到 RAGFlow..." });

      Zotero.debug(`[RAGFlow] 调用 RAGFlowService.uploadFiles...`);
      // 使用集合名称而不是ID
      const kbId = await RAGFlowService.uploadFiles(
        attachments,
        collection.name,
      );
      Zotero.debug(`[RAGFlow] 上传成功，知识库ID: ${kbId}`);

      // 保存知识库 ID
      this.data.kbId = kbId;
      Zotero.Prefs.set(`${config.prefsPrefix}.kbId`, kbId, true);

      progressWindow.createLine({ text: "上传成功，知识库构建中..." });

      // 开始定期检查知识库状态
      this.checkKnowledgeBaseStatus(kbId, progressWindow);
    } catch (error: unknown) {
      // 详细记录错误
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      Zotero.debug(`[RAGFlow] 上传失败: ${errorMessage}`);
      // if (error instanceof Error && error.stack) {
      //   Zotero.debug(`[RAGFlow] 错误堆栈: ${error.stack}`);
      // }
      let userMessage = "上传失败";
      // 为常见错误提供更友好的信息
      if (
        errorMessage.includes("不支持的HTML快照文件") ||
        errorMessage.includes("This type of file has not been supported yet")
      ) {
        userMessage =
          "上传失败: RAGFlow目前不支持HTML快照文件，请使用PDF或文本文件";
      } else if (errorMessage.includes("没有找到RAGFlow支持的文件类型")) {
        userMessage =
          "上传失败: 没有找到RAGFlow支持的文件类型。目前支持PDF、TXT等文件，不支持HTML快照";
      } else {
        userMessage = `上传失败: ${errorMessage}`;
      }
      const progressWindow = new ztoolkit.ProgressWindow("RAGFlow 错误");
      progressWindow.createLine({ text: `上传失败: ${errorMessage}` });
      progressWindow.show();
      progressWindow.startCloseTimer(3000);
    }
  }

  /**
   * 定期检查知识库状态
   */
  private async checkKnowledgeBaseStatus(kbId: string, progressWindow: any) {
    try {
      const status = await RAGFlowService.getKnowledgeBaseStatus(kbId);

      if (status === "ready") {
        progressWindow.createLine({
          text: "✅ 知识库已准备就绪，可以开始提问",
        });
        progressWindow.startCloseTimer(5000);
      } else if (status === "processing") {
        progressWindow.createLine({ text: "📊 知识库正在构建中..." });
        // 10秒后再次检查
        setTimeout(
          () => this.checkKnowledgeBaseStatus(kbId, progressWindow),
          10000,
        );
      } else if (status === "failed") {
        progressWindow.createLine({
          text: "❌ 知识库构建失败，请检查文件格式",
        });
        progressWindow.startCloseTimer(5000);
      } else {
        progressWindow.createLine({ text: `⚠️ 未知状态: ${status}` });
        progressWindow.startCloseTimer(5000);
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      progressWindow.createLine({
        text: `检查知识库状态失败: ${errorMessage}`,
      });
      progressWindow.startCloseTimer(3000);
    }
  }

  /**
   * 猜测文件MIME类型
   */
  private guessMimeType(filePath: string): string {
    const ext = filePath.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "pdf":
        return "application/pdf";
      case "doc":
        return "application/msword";
      case "docx":
        return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      case "txt":
        return "text/plain";
      case "json":
        return "application/json";
      case "csv":
        return "text/csv";
      default:
        return "application/octet-stream";
    }
  }

  /**
   * 打开知识库选择对话框
   */
  public async openKnowledgeBaseSelector() {
    Logger.info("打开知识库选择对话框");

    // 首先检查是否配置了API密钥
    const apiKey = Zotero.Prefs.get(
      `${config.prefsPrefix}.apiKey`,
      true,
    ) as string;
    if (!apiKey) {
      Logger.warn("未配置API密钥，提示用户配置");

      const progressWindow = new this.data.ztoolkit.ProgressWindow(
        "RAGFlow 提示",
      );
      progressWindow.createLine({
        text: "请先在设置中配置 RAGFlow API 密钥",
        type: "warning",
      });
      progressWindow.show();
      progressWindow.startCloseTimer(3000);

      // 打开设置页面
      setTimeout(() => this.openSettings(), 1000);
      return;
    }

    // 打开知识库选择器
    RAGFlowUI.createKnowledgeBaseSelector();
  }

  /**
   * 设置当前使用的知识库
   * @param kbId 知识库ID
   * @param kbName 知识库名称
   */
  public setKnowledgeBase(kbId: string, kbName: string) {
    try {
      Logger.info(`设置当前知识库: ${kbId} (${kbName})`);

      // 保存知识库ID
      this.data.kbId = kbId;
      Zotero.Prefs.set(`${config.prefsPrefix}.kbId`, kbId, true);

      // 可选: 保存知识库名称，方便显示
      Zotero.Prefs.set(`${config.prefsPrefix}.kbName`, kbName, true);

      // 显示成功提示
      const progressWindow = new this.data.ztoolkit.ProgressWindow("RAGFlow");
      progressWindow.createLine({
        text: `已切换到知识库: ${kbName}`,
        type: "success",
      });
      progressWindow.show();
      progressWindow.startCloseTimer(3000);
    } catch (error) {
      Logger.error("设置知识库失败", error);

      const progressWindow = new this.data.ztoolkit.ProgressWindow(
        "RAGFlow 错误",
      );
      progressWindow.createLine({
        text: "设置知识库失败",
        type: "error",
      });
      progressWindow.show();
      progressWindow.startCloseTimer(3000);
    }
  }

  public async openQuestionDialog() {
    // 首先检查是否配置了API密钥
    const apiKey = Zotero.Prefs.get(
      `${config.prefsPrefix}.apiKey`,
      true,
    ) as string;
    if (!apiKey) {
      const progressWindow = new this.data.ztoolkit.ProgressWindow(
        "RAGFlow 提示",
      );
      progressWindow.createLine({
        text: "请先在设置中配置 RAGFlow API 密钥",
      });
      progressWindow.show();
      progressWindow.startCloseTimer(3000);

      // 打开设置页面
      setTimeout(() => this.openSettings(), 1000);
      return;
    }

    if (!this.data.kbId) {
      const progressWindow = new this.data.ztoolkit.ProgressWindow(
        "RAGFlow 错误",
      );
      progressWindow.createLine({
        text: "尚未创建知识库，请先选择集合并上传到 RAGFlow",
      });
      progressWindow.show();
      progressWindow.startCloseTimer(3000);
      return;
    }

    // 直接调用 RAGFlowUI 中的方法，避免重复实现
    RAGFlowUI.createQuestionInputDialog();
  }

  public async processQuestion(question: string) {
    try {
      Logger.info(`处理用户问题: ${question}`);

      // 检查 kbId 是否存在
      if (!this.data.kbId) {
        Logger.warn("知识库ID不存在");
        const progressWindow = new this.data.ztoolkit.ProgressWindow(
          "RAGFlow 错误",
        );
        progressWindow.createLine({
          text: "请先选择知识库",
          type: "error",
        });
        progressWindow.show();
        progressWindow.startCloseTimer(3000);

        // 1秒后打开知识库选择器
        setTimeout(() => this.openKnowledgeBaseSelector(), 1000);
        return;
      }

      // 将 kbId 明确为 string 类型，解决后续所有类型问题
      const kbId: string = this.data.kbId;

      // 显示处理中提示
      const progressWindow = new this.data.ztoolkit.ProgressWindow(
        "RAGFlow 问答",
      );
      progressWindow.createLine({
        text: "正在准备聊天助手...",
        type: "default",
      });
      progressWindow.show();

      // 先尝试从存储中获取聊天助手ID
      let chatAssistantId = this.getChatAssistantId(kbId);

      // 如果没有聊天助手ID，创建一个新的聊天助手
      if (!chatAssistantId) {
        progressWindow.createLine({
          text: "正在创建聊天助手...",
          type: "default",
        });

        // 获取知识库名称
        const kbName =
          (Zotero.Prefs.get(`${config.prefsPrefix}.kbName`, true) as string) ||
          "Zotero知识库";

        // 打开聊天助手参数设置对话框
        RAGFlowUI.createChatAssistantSettingsDialog(kbId, async (params) => {
          try {
            // 创建聊天助手
            const assistantName = this.generateAssistantName(kbName);
            chatAssistantId = await RAGFlowService.createChatAssistant(
              kbId,
              assistantName,
              params,
            );

            // 保存聊天助手与知识库的映射关系
            this.saveChatAssistantMapping(kbId, chatAssistantId);

            // 继续处理会话
            this.continueQuestionProcessing(
              chatAssistantId,
              question,
              progressWindow,
            );
          } catch (error) {
            this.handleQuestionError(error, progressWindow);
          }
        });

        return;
      } else {
        // 已有聊天助手，继续处理会话
        this.continueQuestionProcessing(
          chatAssistantId,
          question,
          progressWindow,
        );
      }
    } catch (error) {
      this.handleQuestionError(error);
    }
  }

  /**
   * 继续问题处理流程（处理会话部分）
   */
  private async continueQuestionProcessing(
    chatAssistantId: string,
    question: string,
    progressWindow: any,
  ) {
    try {
      // 获取当前活动会话ID
      let sessionId = this.getActiveSessionId(chatAssistantId);

      // 如果没有会话ID，创建一个新的会话
      if (!sessionId) {
        progressWindow.createLine({
          text: "正在创建问答会话...",
          type: "default",
        });

        const sessionName = `Zotero问答-${new Date().toISOString().slice(0, 10)}`;
        Logger.info(`创建会话: ${sessionName}, 聊天助手ID: ${chatAssistantId}`);

        sessionId = await RAGFlowService.createSession(
          chatAssistantId,
          sessionName,
        );
        Logger.info(`会话创建成功，ID: ${sessionId}`);

        // 保存会话信息
        this.saveSessionInfo(chatAssistantId, sessionId, sessionName);
      }

      // 使用聊天助手和会话发送问题
      progressWindow.createLine({
        text: "正在获取回答...",
        type: "default",
      });

      Logger.info(
        `向聊天助手 ${chatAssistantId} 的会话 ${sessionId} 发送问题: ${question}`,
      );

      // 调用askQuestion方法，传入正确的参数
      const result = await RAGFlowService.askQuestion(
        chatAssistantId,
        sessionId,
        question,
      );
      Logger.info("成功获取回答");

      // 关闭进度窗口
      progressWindow.close();

      // 显示回答窗口
      RAGFlowUI.createQuestionDialog(question, result.answer, result.sources);
    } catch (error) {
      this.handleQuestionError(error, progressWindow);
    }
  }

  /**
   * 处理问答过程中的错误
   */
  private handleQuestionError(error: unknown, progressWindow?: any) {
    Logger.error("处理问题失败", error);

    const errorMessage = error instanceof Error ? error.message : String(error);

    // 关闭现有进度窗口
    if (progressWindow) {
      progressWindow.close();
    }

    // 创建错误提示窗口
    const errorWindow = new this.data.ztoolkit.ProgressWindow("RAGFlow 错误");

    // 处理特定错误类型
    if (
      errorMessage.includes("聊天助手") ||
      errorMessage.includes("chat assistant")
    ) {
      // 聊天助手相关错误，尝试重置聊天助手ID
      errorWindow.createLine({
        text: `聊天助手错误，请重试: ${errorMessage}`,
        type: "error",
      });
    } else if (
      errorMessage.includes("会话") ||
      errorMessage.includes("session")
    ) {
      // 会话相关错误，尝试重置会话ID
      errorWindow.createLine({
        text: `会话错误，请重试: ${errorMessage}`,
        type: "error",
      });
    } else if (
      errorMessage.includes("余额不足") ||
      errorMessage.includes("Insufficient Balance")
    ) {
      // API余额不足错误
      errorWindow.createLine({
        text: "RAGFlow API账户余额不足，请充值后再试",
        type: "error",
      });
    } else {
      // 其他一般错误
      errorWindow.createLine({
        text: `获取回答失败: ${errorMessage}`,
        type: "error",
      });
    }

    errorWindow.show();
    errorWindow.startCloseTimer(5000);
  }

  // 会话管理
  /**
   * 保存知识库与聊天助手的关联关系
   */
  private saveChatAssistantMapping(
    datasetId: string,
    assistantId: string,
  ): void {
    try {
      // 先获取现有映射
      const mappingStr =
        (Zotero.Prefs.get(
          `${config.prefsPrefix}.chatAssistantMapping`,
          true,
        ) as string) || "{}";
      const mapping = JSON.parse(mappingStr);

      // 添加/更新映射
      mapping[datasetId] = assistantId;

      // 保存回首选项
      Zotero.Prefs.set(
        `${config.prefsPrefix}.chatAssistantMapping`,
        JSON.stringify(mapping),
        true,
      );
      Logger.info(
        `已保存知识库(${datasetId})与聊天助手(${assistantId})的关联关系`,
      );
    } catch (error) {
      Logger.error("保存聊天助手映射失败", error);
    }
  }

  /**
   * 获取知识库关联的聊天助手ID
   */
  private getChatAssistantId(datasetId: string): string | null {
    try {
      const mappingStr =
        (Zotero.Prefs.get(
          `${config.prefsPrefix}.chatAssistantMapping`,
          true,
        ) as string) || "{}";
      const mapping = JSON.parse(mappingStr);
      return mapping[datasetId] || null;
    } catch (error) {
      Logger.error("获取聊天助手ID失败", error);
      return null;
    }
  }

  /**
   * 保存会话信息
   */
  private saveSessionInfo(
    chatAssistantId: string,
    sessionId: string,
    sessionName: string,
  ): void {
    try {
      // 获取现有会话列表
      const sessionsStr =
        (Zotero.Prefs.get(
          `${config.prefsPrefix}.sessions.${chatAssistantId}`,
          true,
        ) as string) || "[]";
      const sessions = JSON.parse(sessionsStr);

      // 检查会话是否已存在
      const existingIndex = sessions.findIndex(
        (s: { id: string }) => s.id === sessionId,
      );
      if (existingIndex >= 0) {
        // 更新已有会话
        sessions[existingIndex] = {
          id: sessionId,
          name: sessionName,
          lastUsed: Date.now(),
        };
      } else {
        // 添加新会话
        sessions.push({
          id: sessionId,
          name: sessionName,
          lastUsed: Date.now(),
        });
      }

      // 保存回首选项
      Zotero.Prefs.set(
        `${config.prefsPrefix}.sessions.${chatAssistantId}`,
        JSON.stringify(sessions),
        true,
      );

      // 同时更新当前活动会话
      Zotero.Prefs.set(
        `${config.prefsPrefix}.activeSession.${chatAssistantId}`,
        sessionId,
        true,
      );

      Logger.info(
        `已保存会话信息: 助手ID=${chatAssistantId}, 会话ID=${sessionId}, 名称=${sessionName}`,
      );
    } catch (error) {
      Logger.error("保存会话信息失败", error);
    }
  }

  /**
   * 获取聊天助手的会话列表
   */
  private getSessionList(
    chatAssistantId: string,
  ): Array<{ id: string; name: string; lastUsed: number }> {
    try {
      const sessionsStr =
        (Zotero.Prefs.get(
          `${config.prefsPrefix}.sessions.${chatAssistantId}`,
          true,
        ) as string) || "[]";
      return JSON.parse(sessionsStr);
    } catch (error) {
      Logger.error("获取会话列表失败", error);
      return [];
    }
  }

  /**
   * 获取当前活动会话ID
   */
  private getActiveSessionId(chatAssistantId: string): string | null {
    return (
      (Zotero.Prefs.get(
        `${config.prefsPrefix}.activeSession.${chatAssistantId}`,
        true,
      ) as string) || null
    );
  }

  /**
   * 打开聊天助手设置对话框，用于更新现有聊天助手
   */
  public async openChatAssistantSettings() {
    try {
      // 检查是否有知识库ID
      if (!this.data.kbId) {
        const progressWindow = new this.data.ztoolkit.ProgressWindow(
          "RAGFlow 错误",
        );
        progressWindow.createLine({
          text: "请先选择知识库",
          type: "error",
        });
        progressWindow.show();
        progressWindow.startCloseTimer(3000);
        return;
      }

      // 获取聊天助手ID
      const chatAssistantId = this.getChatAssistantId(this.data.kbId);
      if (!chatAssistantId) {
        const progressWindow = new this.data.ztoolkit.ProgressWindow(
          "RAGFlow 错误",
        );
        progressWindow.createLine({
          text: "当前知识库没有关联的聊天助手，请先提问以创建聊天助手",
          type: "error",
        });
        progressWindow.show();
        progressWindow.startCloseTimer(3000);
        return;
      }

      // 显示处理中提示
      const progressWindow = new this.data.ztoolkit.ProgressWindow("RAGFlow");
      progressWindow.createLine({
        text: "正在加载聊天助手设置...",
        type: "default",
      });
      progressWindow.show();

      // 获取知识库名称
      const kbName =
        (Zotero.Prefs.get(`${config.prefsPrefix}.kbName`, true) as string) ||
        "Zotero知识库";
      const assistantName = this.generateAssistantName(kbName);

      // 打开设置对话框，提供当前聊天助手ID供更新使用
      RAGFlowUI.createChatAssistantSettingsDialog(
        this.data.kbId,
        async (params) => {
          try {
            // 更新聊天助手
            await RAGFlowService.updateChatAssistant(
              chatAssistantId,
              assistantName,
              params,
            );

            // 关闭进度窗口
            progressWindow.close();

            // 显示成功消息
            const successWindow = new this.data.ztoolkit.ProgressWindow(
              "RAGFlow",
            );
            successWindow.createLine({
              text: "聊天助手设置已更新",
              type: "success",
            });
            successWindow.show();
            successWindow.startCloseTimer(3000);
          } catch (error) {
            progressWindow.close();

            const errorMessage =
              error instanceof Error ? error.message : String(error);
            const errorWindow = new this.data.ztoolkit.ProgressWindow(
              "RAGFlow 错误",
            );
            errorWindow.createLine({
              text: `更新聊天助手失败: ${errorMessage}`,
              type: "error",
            });
            errorWindow.show();
            errorWindow.startCloseTimer(3000);
          }
        },
        chatAssistantId,
      ); // 传入现有chatAssistantId表示这是更新操作
    } catch (error) {
      Logger.error("打开聊天助手设置失败", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      const errorWindow = new this.data.ztoolkit.ProgressWindow("RAGFlow 错误");
      errorWindow.createLine({
        text: `打开聊天助手设置失败: ${errorMessage}`,
        type: "error",
      });
      errorWindow.show();
      errorWindow.startCloseTimer(3000);
    }
  }

  /**
   * 生成统一格式的聊天助手名称
   * @param kbName 知识库名称
   * @returns 格式化的聊天助手名称
   */
  private generateAssistantName(kbName: string): string {
    return `Zotero-${kbName}-${new Date().toISOString().slice(0, 10)}`;
  }

  /**
   * 打开历史记录对话框
   */
  public async openHistoryDialog() {
    try {
      Logger.info("打开历史记录对话框");

      // 首先检查是否配置了API密钥 - 虽然不一定需要API密钥来查看历史记录，但保持一致性检查
      const apiKey = Zotero.Prefs.get(
        `${config.prefsPrefix}.apiKey`,
        true,
      ) as string;
      if (!apiKey) {
        const progressWindow = new this.data.ztoolkit.ProgressWindow(
          "RAGFlow 提示",
        );
        progressWindow.createLine({
          text: "请先在设置中配置 RAGFlow API 密钥",
          type: "warning",
        });
        progressWindow.show();
        progressWindow.startCloseTimer(3000);

        // 打开设置页面
        setTimeout(() => this.openSettings(), 1000);
        return;
      }

      // 调用 RAGFlowUI 中的 createHistoryDialog 方法
      await RAGFlowUI.createHistoryDialog();
    } catch (error) {
      Logger.error("打开历史记录对话框失败", error);

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorWindow = new this.data.ztoolkit.ProgressWindow("RAGFlow 错误");
      errorWindow.createLine({
        text: `打开历史记录失败: ${errorMessage}`,
        type: "error",
      });
      errorWindow.show();
      errorWindow.startCloseTimer(3000);
    }
  }
}

export default Addon;
