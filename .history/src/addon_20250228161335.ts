import { config } from "../package.json";
import { ColumnOptions, DialogHelper } from "zotero-plugin-toolkit";
import hooks from "./hooks";
import { createZToolkit } from "./utils/ztoolkit";
import { getString } from "./utils/locale";
// import { ztoolkit } from "./utils/ztoolkit";
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
    this.data.kbId = Zotero.Prefs.get(`${config.prefsPrefix}.kbId`) as string || null;
    
    // 初始化 RAGFlow 服务配置
    this.updateRAGFlowSettings();
  }
  
  /**
   * 更新 RAGFlow 服务配置
   */
  public updateRAGFlowSettings() {
    const apiKey = Zotero.Prefs.get(`${config.prefsPrefix}.apiKey`) as string;
    const apiUrl = Zotero.Prefs.get(`${config.prefsPrefix}.apiUrl`) as string;
    
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
    const dialog = RAGFlowUI.createSettingsUI();
    dialog.open();
  }
  
  public async openCollectionSelector() {
    // 首先检查是否配置了API密钥
    const apiKey = Zotero.Prefs.get(`${config.prefsPrefix}.apiKey`) as string;
    if (!apiKey) {
      const progressWindow = ztoolkit.ProgressWindow.create("RAGFlow 提示");
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
      const progressWindow = ztoolkit.ProgressWindow.create("RAGFlow 错误");
      progressWindow.createLine({ text: "请先选择一个集合" });
      progressWindow.show();
      progressWindow.startCloseTimer(3000);
      return;
    }
    
    // 打开确认对话框
    const confirmed = confirm(
      `是否将集合 "${collection.name}" 发送到 RAGFlow 构建知识库？`
    );
    
    if (confirmed) {
      await this.uploadCollectionToRAGFlow(collection);
    }
  }
  
  public async uploadCollectionToRAGFlow(collection) {
    try {
      // 显示进度窗口
      const progressWindow = ztoolkit.ProgressWindow.create(
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
      
      // 保存知识库 ID
      this.data.kbId = kbId;
      Zotero.Prefs.set(`${config.prefsPrefix}.kbId`, kbId);
      
      progressWindow.createLine({ text: "上传成功，知识库构建中..." });
      
      // 开始定期检查知识库状态
      this.checkKnowledgeBaseStatus(kbId, progressWindow);
    } catch (error) {
      const progressWindow = ztoolkit.ProgressWindow.create("RAGFlow 错误");
      progressWindow.createLine({ text: `上传失败: ${error.message}` });
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
    } catch (error) {
      progressWindow.createLine({ text: `检查知识库状态失败: ${error.message}` });
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
    const apiKey = Zotero.Prefs.get(`${config.prefsPrefix}.apiKey`) as string;
    if (!apiKey) {
      const progressWindow = ztoolkit.ProgressWindow.create("RAGFlow 提示");
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
      const progressWindow = ztoolkit.ProgressWindow.create("RAGFlow 错误");
      progressWindow.createLine({ 
        text: "尚未创建知识库，请先选择集合并上传到 RAGFlow" 
      });
      progressWindow.show();
      progressWindow.startCloseTimer(3000);
      return;
    }
    
    // 创建问答对话框（使用更友好的输入框）
    const promptDialog = ztoolkit.Dialog.create({
      id: "ragflow-question-prompt",
      title: "RAGFlow 问答",
      buttons: ["accept", "cancel"],
      buttonCallbacks: {
        accept: (dialog) => {
          const doc = dialog.window.document;
          const questionInput = doc.getElementById("question-input") as HTMLTextAreaElement;
          const question = questionInput.value.trim();
          
          if (question) {
            this.processQuestion(question);
          }
        }
      },
      html: `
        <div style="display: flex; flex-direction: column; padding: 20px; min-width: 500px;">
          <h3 style="margin-bottom: 10px;">请输入您的问题：</h3>
          <textarea id="question-input" style="width: 100%; min-height: 100px; padding: 10px; margin-bottom: 20px;"></textarea>
          <p style="color: #666;">问题将基于您上传的知识库内容进行回答</p>
        </div>
      `
    });
    
    promptDialog.open();
  }
  
  /**
   * 处理问题并获取回答
   */
  private async processQuestion(question: string) {
    try {
      const progressWindow = ztoolkit.ProgressWindow.create("RAGFlow 问答");
      progressWindow.createLine({ text: "正在获取回答..." });
      progressWindow.show();
      
      const answer = await RAGFlowService.askQuestion(this.data.kbId, question);
      
      // 关闭进度窗口
      progressWindow.close();
      
      // 显示回答窗口
      const dialog = RAGFlowUI.createQuestionDialog(question, answer);
      dialog.open();
    } catch (error) {
      const progressWindow = ztoolkit.ProgressWindow.create("RAGFlow 错误");
      progressWindow.createLine({ text: `获取回答失败: ${error.message}` });
      progressWindow.show();
      progressWindow.startCloseTimer(3000);
    }
  }
}

export default Addon;
