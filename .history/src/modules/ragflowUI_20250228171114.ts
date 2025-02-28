// src/modules/ragflowUI.ts
import { ztoolkit } from "../utils/ztoolkit";
import { config } from "../../package.json";
import { RAGFlowService } from "./ragflowService";

export class RAGFlowUI {
  public static registerUI() {
    this.createRagFlowMenu();
    this.createSettingsMenuItem();
  }

  /**
   * 创建RAGFlow主菜单
   */
  private static createRagFlowMenu() {
    // 创建顶部菜单
    ztoolkit.Menu.register("menubar", {
      id: "zotero-ragflow",
      label: "RAGFlow",
      children: [
        {
          tag: "menuitem",
          id: "zotero-ragflow-upload",
          label: "发送到 RAGFlow 知识库",
          oncommand: "Zotero.ZoteroRAGFlow.openCollectionSelector()",
        },
        {
          tag: "menuitem",
          id: "zotero-ragflow-question",
          label: "RAGFlow 知识库问答",
          oncommand: "Zotero.ZoteroRAGFlow.openQuestionDialog()",
        },
        {
          tag: "menuseparator",
        },
        {
          tag: "menuitem",
          id: "zotero-ragflow-settings",
          label: "设置",
          oncommand: "Zotero.ZoteroRAGFlow.openSettings()",
        }
      ],
    });
    
    // 创建集合右键菜单项
    ztoolkit.Menu.register("collectionPopup", {
      tag: "menuitem",
      id: "zotero-ragflow-collection-context",
      label: "发送到 RAGFlow 知识库",
      oncommand: "Zotero.ZoteroRAGFlow.openCollectionSelector()",
    });
  }

  /**
   * 创建设置菜单项
   */
  private static createSettingsMenuItem() {
    ztoolkit.Menu.register("menuTools", {
      tag: "menuitem",
      id: "zotero-ragflow-tools-settings",
      label: "RAGFlow 设置",
      oncommand: "Zotero.ZoteroRAGFlow.openSettings()",
    });
  }

  /**
   * 创建设置页面
   */
  public static createSettingsUI() {
    const dialog = ztoolkit.Dialog.create({
      id: "ragflow-settings-dialog",
      title: "RAGFlow 设置",
      listeners: {
        load: (event) => {
          const doc = event.target.ownerDocument;
          
          // 填充现有设置
          const apiKeyInput = doc.getElementById("ragflow-api-key") as HTMLInputElement;
          const apiUrlInput = doc.getElementById("ragflow-api-url") as HTMLInputElement;
          
          // 加载保存的设置
          apiKeyInput.value = Zotero.Prefs.get(`${config.prefsPrefix}.apiKey`) as string || "";
          apiUrlInput.value = Zotero.Prefs.get(`${config.prefsPrefix}.apiUrl`) as string || "http://localhost:8000/api/v1";
          
          // 保存按钮事件
          const saveBtn = doc.getElementById("ragflow-settings-save");
          saveBtn.addEventListener("click", () => {
            // 保存设置
            Zotero.Prefs.set(`${config.prefsPrefix}.apiKey`, apiKeyInput.value);
            Zotero.Prefs.set(`${config.prefsPrefix}.apiUrl`, apiUrlInput.value);
            
            // 同步到服务
            addon.updateRAGFlowSettings();
            
            dialog.window.close();
          });
          
          // 取消按钮事件
          const cancelBtn = doc.getElementById("ragflow-settings-cancel");
          cancelBtn.addEventListener("click", () => {
            dialog.window.close();
          });
        }
      },
      html: `
        <div style="display: flex; flex-direction: column; padding: 20px; min-width: 400px;">
          <h2>RAGFlow API 设置</h2>
          <div style="margin-bottom: 15px;">
            <label for="ragflow-api-key" style="display: block; margin-bottom: 5px;">API 密钥</label>
            <input type="password" id="ragflow-api-key" style="width: 100%; padding: 5px;">
          </div>
          <div style="margin-bottom: 15px;">
            <label for="ragflow-api-url" style="display: block; margin-bottom: 5px;">API URL</label>
            <input type="text" id="ragflow-api-url" style="width: 100%; padding: 5px;">
          </div>
          <div style="display: flex; justify-content: flex-end; margin-top: 20px;">
            <button id="ragflow-settings-cancel" style="margin-right: 10px;">取消</button>
            <button id="ragflow-settings-save">保存</button>
          </div>
        </div>
      `
    });
    
    return dialog;
  }

  /**
   * 创建更美观的问答对话框
   */
  public static createQuestionDialog(question: string, answer: string) {
    const dialog = ztoolkit.Dialog.create({
      id: "ragflow-answer-dialog",
      title: "RAGFlow 知识问答",
      data: { question, answer },
      buttons: ["close"],
      listeners: {
        load(event) {
          const doc = event.target.ownerDocument;
          const questionEl = doc.getElementById("question");
          const answerEl = doc.getElementById("answer");
          
          questionEl.textContent = question;
          answerEl.textContent = answer;
        }
      },
      html: `
        <div style="display: flex; flex-direction: column; padding: 20px; min-width: 600px; min-height: 400px;">
          <div style="margin-bottom: 20px;">
            <h3 style="margin-bottom: 10px; color: #2d2d2d;">问题：</h3>
            <div id="question" style="background-color: #f5f5f5; border-radius: 5px; padding: 10px; font-weight: bold;"></div>
          </div>
          <div style="flex: 1;">
            <h3 style="margin-bottom: 10px; color: #2d2d2d;">回答：</h3>
            <div id="answer" style="background-color: #f9f9f9; border-radius: 5px; padding: 10px; max-height: 300px; overflow: auto; white-space: pre-wrap; line-height: 1.5;"></div>
          </div>
        </div>
      `
    });
    
    return dialog;
  }
}