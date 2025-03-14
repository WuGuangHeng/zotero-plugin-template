import { config } from "../package.json";
import { ColumnOptions, DialogHelper } from "zotero-plugin-toolkit";
import hooks from "./hooks";
import { createZToolkit } from "./utils/ztoolkit";
import { getString } from "./utils/locale";
import { RAGFlowUI } from "./modules/ragflowUI";
import { RAGFlowService } from "./modules/ragflowService";

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

  constructor() {
    this.data = {
      alive: true,
      config,
      env: __env__,
      ztoolkit: createZToolkit(),
      kbId: null
    };
    this.hooks = hooks;
    this.api = {};
  }

  public async onStartup() {
    // 注册 UI 组件
    RAGFlowUI.registerUI();
    
    // 加载之前保存的知识库 ID
    this.data.kbId = Zotero.Prefs.get(`${config.prefsPrefix}.kbId`, true) as string || null;
    
    // 初始化 RAGFlow 服务配置
    this.updateRAGFlowSettings();

    // 添加调试代码，查看设置是否正确读取
    const apiKey = Zotero.Prefs.get(`${config.prefsPrefix}.apiKey`, true);
    Zotero.debug(`RAGFlow API Key: ${apiKey ? "已设置" : "未设置"}`);
    Zotero.debug(`prefsPrefix: ${config.prefsPrefix}`);
  }
  
  /**
   * 更新 RAGFlow 服务配置
   */
  public updateRAGFlowSettings() {
    const apiKey = Zotero.Prefs.get(`${config.prefsPrefix}.apiKey`, true) as string;
    const apiUrl = Zotero.Prefs.get(`${config.prefsPrefix}.apiUrl`, true) as string;
    
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
    const apiKey = Zotero.Prefs.get(`${config.prefsPrefix}.apiKey`, true) as string;
    if (!apiKey) {
      // 修改: 使用正确的 ProgressWindow 创建方式
      const progressWindow = new ztoolkit.ProgressWindow("RAGFlow 提示");
      progressWindow.createLine({ 
        text: "请先在设置中配置 RAGFlow API 密钥" 
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
          innerHTML: `是否将集合 "${collection.name}" 发送到 RAGFlow 构建知识库？`
        }
      })
      .addButton("确定", "ok")
      .addButton("取消", "cancel")
      .setDialogData({
        // 使用正确的回调名称
        unloadCallback: () => {
          // 添加调试日志
          const dialogData = confirmDialog.dialogData;
          Zotero.debug("[RAGFlow] 对话框关闭，最后点击的按钮: " + dialogData._lastButtonId);

          if (dialogData._lastButtonId === "ok") {
            // 添加调试日志
            Zotero.debug("[RAGFlow] 用户点击了确定按钮，准备上传集合: " + collection.name);
            this.uploadCollectionToRAGFlow(collection);
          } else {
            // 添加调试日志
            Zotero.debug("[RAGFlow] 用户取消了上传操作");
          }
        }
      });
      
    // 尝试添加额外调试信息
    Zotero.debug("[RAGFlow] 准备打开确认对话框");
    confirmDialog.open("RAGFlow 确认", {
      centerscreen: true,
      resizable: false
    });
    Zotero.debug("[RAGFlow] 对话框已打开");
  }
  
  public async uploadCollectionToRAGFlow(collection: Zotero.Collection) {
    try {
      // 修改: 使用正确的 ProgressWindow 创建方式
      const progressWindow = new ztoolkit.ProgressWindow(
        "RAGFlow 上传",
        { closeOnClick: false }
      );
      progressWindow.createLine({ text: "正在准备上传文件..." });
      progressWindow.show();
      
      // 获取集合中所有条目
      const items = collection.getChildItems();
      
      // 获取所有附件
      const attachments = [];
      for (const item of items) {
        const itemAttachments = item.getAttachments();
        for (const attachmentID of itemAttachments) {
          const attachment = Zotero.Items.get(attachmentID);
          if (attachment.isFileAttachment()) {
            const path = attachment.getFilePath();
            if (path) {
              attachments.push({
                path: path,
                name: attachment.getField("title"),
                mimeType: attachment.attachmentContentType || this.guessMimeType(path)
              });
            }
          }
        }
      }
      
      if (attachments.length === 0) {
        progressWindow.createLine({ text: "没有找到可上传的附件文件" });
        progressWindow.startCloseTimer(3000);
        return;
      }
      
      progressWindow.createLine({ text: `找到 ${attachments.length} 个附件文件` });
      
      // 上传文件到 RAGFlow
      progressWindow.createLine({ text: "正在上传文件到 RAGFlow..." });

      // 使用集合名称而不是ID
      const kbId = await RAGFlowService.uploadFiles(attachments, collection.name);
      // debug
      Zotero.debug(`[RAGFlow] 上传成功，知识库ID: ${kbId}`);
      // 保存知识库 ID
      this.data.kbId = kbId;
      Zotero.Prefs.set(`${config.prefsPrefix}.kbId`, kbId, true);
      
      progressWindow.createLine({ text: "上传成功，知识库构建中..." });
      
      // 开始定期检查知识库状态
      this.checkKnowledgeBaseStatus(kbId, progressWindow);
    } catch (error: unknown) {
      // 修改: 使用正确的 ProgressWindow 创建方式
      const progressWindow = new ztoolkit.ProgressWindow("RAGFlow 错误");
      const errorMessage = error instanceof Error ? error.message : String(error);
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
        progressWindow.createLine({ text: "✅ 知识库已准备就绪，可以开始提问" });
        progressWindow.startCloseTimer(5000);
      } else if (status === "processing") {
        progressWindow.createLine({ text: "📊 知识库正在构建中..." });
        // 10秒后再次检查
        setTimeout(() => this.checkKnowledgeBaseStatus(kbId, progressWindow), 10000);
      } else if (status === "failed") {
        progressWindow.createLine({ text: "❌ 知识库构建失败，请检查文件格式" });
        progressWindow.startCloseTimer(5000);
      } else {
        progressWindow.createLine({ text: `⚠️ 未知状态: ${status}` });
        progressWindow.startCloseTimer(5000);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      progressWindow.createLine({ text: `检查知识库状态失败: ${errorMessage}` });
      progressWindow.startCloseTimer(3000);
    }
  }
  
  /**
   * 猜测文件MIME类型
   */
  private guessMimeType(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return 'application/pdf';
      case 'doc': return 'application/msword';
      case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'txt': return 'text/plain';
      case 'json': return 'application/json';
      case 'csv': return 'text/csv';
      default: return 'application/octet-stream';
    }
  }
  
  public async openQuestionDialog() {
    // 首先检查是否配置了API密钥
    const apiKey = Zotero.Prefs.get(`${config.prefsPrefix}.apiKey`, true) as string;
    if (!apiKey) {
      // 修改: 使用正确的 ProgressWindow 创建方式
      const progressWindow = new ztoolkit.ProgressWindow("RAGFlow 提示");
      progressWindow.createLine({ 
        text: "请先在设置中配置 RAGFlow API 密钥" 
      });
      progressWindow.show();
      progressWindow.startCloseTimer(3000);
      
      // 打开设置页面
      setTimeout(() => this.openSettings(), 1000);
      return;
    }
    
    if (!this.data.kbId) {
      // 修改: 使用正确的 ProgressWindow 创建方式
      const progressWindow = new ztoolkit.ProgressWindow("RAGFlow 错误");
      progressWindow.createLine({ 
        text: "尚未创建知识库，请先选择集合并上传到 RAGFlow" 
      });
      progressWindow.show();
      progressWindow.startCloseTimer(3000);
      return;
    }
    
    // 修改: 使用正确的 Dialog 创建方式
    const dialogWindow = new ztoolkit.Dialog(2, 1)
      .addCell(0, 0, {
        tag: "h3",
        properties: { innerHTML: "请输入您的问题：" },
        styles: { marginBottom: "10px" }
      })
      .addCell(1, 0, {
        tag: "textarea",
        namespace: "html",
        id: "question-input",
        attributes: { 
          "data-bind": "question",
          "data-prop": "value",
          rows: "5"
        },
        styles: { 
          width: "100%", 
          minHeight: "100px", 
          padding: "10px", 
          marginBottom: "20px" 
        }
      })
      .addButton("提问", "ask")
      .addButton("取消", "cancel")
      .setDialogData({
        question: "",
        onUnload: (dialogData: any) => {
          if (dialogData._lastButtonId === "ask" && dialogData.question.trim()) {
            this.processQuestion(dialogData.question.trim());
          }
        }
      });
      
    dialogWindow.open("RAGFlow 问答", {
      width: 500,
      height: 250,
      centerscreen: true,
      resizable: true
    });
  }
  
  /**
   * 处理问题并获取回答
   */
  private async processQuestion(question: string) {
    try {
      // 检查 kbId 是否存在
      if (!this.data.kbId) {
        const progressWindow = new ztoolkit.ProgressWindow("RAGFlow 错误");
        progressWindow.createLine({ text: "知识库ID不存在，请重新上传集合" });
        progressWindow.show();
        progressWindow.startCloseTimer(3000);
        return;
      }
      
      // 修改: 使用正确的 ProgressWindow 创建方式
      const progressWindow = new ztoolkit.ProgressWindow("RAGFlow 问答");
      progressWindow.createLine({ text: "正在获取回答..." });
      progressWindow.show();
      
      // 由于前面已经检查了 kbId 不为空，这里可以使用非空断言或类型断言
      const answer = await RAGFlowService.askQuestion(this.data.kbId as string, question);
      // 或者使用非空断言: 
      // const answer = await RAGFlowService.askQuestion(this.data.kbId!, question);
      
      // 关闭进度窗口
      progressWindow.close();
      
      // 显示回答窗口
      RAGFlowUI.createQuestionDialog(question, answer);
    } catch (error: unknown) {
      const progressWindow = new ztoolkit.ProgressWindow("RAGFlow 错误");
      const errorMessage = error instanceof Error ? error.message : String(error);
      progressWindow.createLine({ text: `获取回答失败: ${errorMessage}` });
      progressWindow.show();
      progressWindow.startCloseTimer(3000);
    }
  }
}

export default Addon;
