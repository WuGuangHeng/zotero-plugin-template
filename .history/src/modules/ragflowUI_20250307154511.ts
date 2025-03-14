// src/modules/ragflowUI.ts
import { console } from "inspector";
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
    // 使用DOM方法创建顶部菜单
    const menubar = Zotero.getMainWindow().document.getElementById("main-menubar");
    
    // 添加 null 检查
    if (!menubar) {
      ztoolkit.log("Error: Main menubar not found", "error");
      return;
    }
    
    // 使用正确的 createElement 语法
    const ragflowMenu = ztoolkit.UI.createElement(
      Zotero.getMainWindow().document, 
      "menu", 
      {
        namespace: "xul",
        id: "zotero-ragflow",
        attributes: {
          label: "RAGFlow"
        }
      }
    );
    
    const ragflowMenuPopup = ztoolkit.UI.createElement(
      Zotero.getMainWindow().document, 
      "menupopup", 
      {
        namespace: "xul",
        id: "zotero-ragflow-popup"
      }
    );
    
    // 创建菜单项
    const uploadItem = ztoolkit.UI.createElement(
      Zotero.getMainWindow().document, 
      "menuitem", 
      {
        namespace: "xul",
        id: "zotero-ragflow-upload",
        attributes: {
          label: "发送到 RAGFlow 知识库",
          oncommand: "Zotero.ZoteroRAGFlow.openCollectionSelector()"
        }
      }
    );
    
    const questionItem = ztoolkit.UI.createElement(
      Zotero.getMainWindow().document, 
      "menuitem", 
      {
        namespace: "xul",
        id: "zotero-ragflow-question",
        attributes: {
          label: "RAGFlow 知识库问答",
          oncommand: "Zotero.ZoteroRAGFlow.openQuestionDialog()"
        }
      }
    );
    
    const separator = ztoolkit.UI.createElement(
      Zotero.getMainWindow().document, 
      "menuseparator", 
      {
        namespace: "xul"
      }
    );
    
    const settingsItem = ztoolkit.UI.createElement(
      Zotero.getMainWindow().document, 
      "menuitem", 
      {
        namespace: "xul",
        id: "zotero-ragflow-settings",
        attributes: {
          label: "设置",
          oncommand: "Zotero.ZoteroRAGFlow.openSettings()"
        }
      }
    );
    
    // 组装菜单
    ragflowMenuPopup.appendChild(uploadItem);
    ragflowMenuPopup.appendChild(questionItem);
    ragflowMenuPopup.appendChild(separator);
    ragflowMenuPopup.appendChild(settingsItem);
    ragflowMenu.appendChild(ragflowMenuPopup);
    menubar.appendChild(ragflowMenu);
    
    // 创建集合右键菜单项 - 使用正确的选择器 "collection"
    ztoolkit.Menu.register("collection", {
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
    // menuTools 是支持的选择器，不需要修改
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
    // 创建一个新的 Dialog 实例 (行数，列数)
    const dialog = new ztoolkit.Dialog(3, 1)
      // 添加标题
      .addCell(0, 0, {
        tag: "h2",
        properties: { innerHTML: "RAGFlow API 设置" },
        styles: { marginBottom: "20px" }
      })
      // API 密钥相关元素
      .addCell(1, 0, {
        tag: "div",
        styles: { marginBottom: "15px" },
        children: [
          {
            tag: "label",
            namespace: "html",
            attributes: { for: "ragflow-api-key" },
            properties: { innerHTML: "API 密钥" },
            styles: { display: "block", marginBottom: "5px" }
          },
          {
            tag: "input",
            namespace: "html",
            id: "ragflow-api-key",
            attributes: { 
              type: "password",
              "data-bind": "apiKey",
              "data-prop": "value"
            },
            styles: { width: "100%", padding: "5px" }
          }
        ]
      })
      // API URL相关元素
      .addCell(2, 0, {
        tag: "div",
        styles: { marginBottom: "15px" },
        children: [
          {
            tag: "label",
            namespace: "html",
            attributes: { for: "ragflow-api-url" },
            properties: { innerHTML: "API URL" },
            styles: { display: "block", marginBottom: "5px" }
          },
          {
            tag: "input",
            namespace: "html",
            id: "ragflow-api-url",
            attributes: {
              type: "text",
              "data-bind": "apiUrl",
              "data-prop": "value"
            },
            styles: { width: "100%", padding: "5px" }
          }
        ]
      })
      // 添加保存按钮
      .addButton("保存", "save")
      // 添加取消按钮
      .addButton("取消", "cancel")
      // 设置对话框数据
      .setDialogData({
        apiKey: Zotero.Prefs.get(`${config.prefsPrefix}.apiKey`, true) as string || "ragflow-ZkZjFlZmIwZjVhNjExZWZhNDNmMDI0Mm",
        apiUrl: Zotero.Prefs.get(`${config.prefsPrefix}.apiUrl` true) as string || "http://127.0.0.1",
        // 添加关闭时的回调函数
        onUnload: (dialogData: any) => {  // 修改: unloadCallback 改为 onUnload
          if (dialogData._lastButtonId === "save") {
            //保存前记录
            Zotero.debug("保存前API Key:"+ Zotero.Prefs.get(`${config.prefsPrefix}.apiKey`));
            // 保存设置
            Zotero.Prefs.set(`${config.prefsPrefix}.apiKey`, dialogData.apiKey);
            Zotero.Prefs.set(`${config.prefsPrefix}.apiUrl`, dialogData.apiUrl);
            //保存后记录
            Zotero.debug("保存后API Key:"+ Zotero.Prefs.get(`${config.prefsPrefix}.apiKey`));
            Zotero.debug("dialogData.apiKey:"+ dialogData.apiKey);
            // 同步到服务
            addon.updateRAGFlowSettings();
          }
        }
      });
    
    // 打开对话框
    dialog.open("RAGFlow 设置", { 
      width: 400, 
      centerscreen: true,
      resizable: true 
    });
    
    return dialog;
  }

  /**
   * 创建更美观的问答对话框
   */
  public static createQuestionDialog(question: string, answer: string) {
    // 创建一个新的 Dialog 实例 (行数，列数)
    const dialog = new ztoolkit.Dialog(2, 1)
      // 问题区域
      .addCell(0, 0, {
        tag: "div",
        styles: { marginBottom: "20px" },
        children: [
          {
            tag: "h3",
            styles: { marginBottom: "10px", color: "#2d2d2d" },
            properties: { innerHTML: "问题：" }
          },
          {
            tag: "div",
            id: "question",
            styles: { 
              backgroundColor: "#f5f5f5", 
              borderRadius: "5px", 
              padding: "10px", 
              fontWeight: "bold" 
            },
            properties: { textContent: question }
          }
        ]
      })
      // 回答区域
      .addCell(1, 0, {
        tag: "div",
        styles: { flex: "1" },
        children: [
          {
            tag: "h3",
            styles: { marginBottom: "10px", color: "#2d2d2d" },
            properties: { innerHTML: "回答：" }
          },
          {
            tag: "div",
            id: "answer",
            styles: { 
              backgroundColor: "#f9f9f9", 
              borderRadius: "5px", 
              padding: "10px", 
              maxHeight: "300px", 
              overflow: "auto", 
              whiteSpace: "pre-wrap", 
              lineHeight: "1.5" 
            },
            properties: { textContent: answer }
          }
        ]
      })
      // 添加关闭按钮
      .addButton("关闭", "close");
    
    // 打开对话框
    dialog.open("RAGFlow 知识问答", {
      width: 600,
      height: 400,
      centerscreen: true,
      resizable: true
    });
    
    return dialog;
  }
}