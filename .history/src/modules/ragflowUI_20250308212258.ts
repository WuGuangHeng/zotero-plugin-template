// src/modules/ragflowUI.ts
import { config } from "../../package.json";
import { RAGFlowService } from "./ragflowService";
import { Logger } from "./logger";

export class RAGFlowUI {
  /**
   * 注册UI组件
   */
  public static registerUI() {
    Logger.info("正在注册RAGFlow UI组件...");
    this.createRagFlowMenu();
    this.createSettingsMenuItem();
    Logger.info("RAGFlow UI组件注册完成");
  }

  /**
   * 创建RAGFlow主菜单
   */
  private static createRagFlowMenu() {
    // 使用DOM方法创建顶部菜单
    const menubar = Zotero.getMainWindow().document.getElementById("main-menubar");
    
    // 添加 null 检查
    if (!menubar) {
      Logger.error("主菜单栏未找到");
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

    const historyItem = ztoolkit.UI.createElement(
      Zotero.getMainWindow().document, 
      "menuitem", 
      {
        namespace: "xul",
        id: "zotero-ragflow-history",
        attributes: {
          label: "查看问答历史",
          oncommand: "Zotero.ZoteroRAGFlow.openHistoryDialog()"
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
    ragflowMenuPopup.appendChild(historyItem);
    ragflowMenuPopup.appendChild(separator);
    ragflowMenuPopup.appendChild(settingsItem);
    ragflowMenu.appendChild(ragflowMenuPopup);
    menubar.appendChild(ragflowMenu);
    
    // 创建集合右键菜单项
    ztoolkit.Menu.register("collection", {
      tag: "menuitem",
      id: "zotero-ragflow-collection-context",
      label: "发送到 RAGFlow 知识库",
      oncommand: "Zotero.ZoteroRAGFlow.openCollectionSelector()",
    });

    Logger.info("RAGFlow菜单创建完成");
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
    Logger.info("RAGFlow设置菜单项创建完成");
  }

  /**
   * 创建设置页面
   */
  public static createSettingsUI() {
    Logger.info("创建设置界面");
    // 创建一个新的 Dialog 实例 (行数，列数)
    const dialog = new ztoolkit.Dialog(4, 1)
      // 添加标题
      .addCell(0, 0, {
        tag: "h2",
        properties: { innerHTML: "RAGFlow API 设置" },
        styles: { marginBottom: "20px", color: "#2d2d2d", textAlign: "center" }
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
            styles: { display: "block", marginBottom: "5px", fontWeight: "bold" }
          },
          {
            tag: "input",
            namespace: "html",
            id: "ragflow-api-key",
            attributes: { 
              type: "password",
              "data-bind": "apiKey",
              "data-prop": "value",
              placeholder: "输入您的 RAGFlow API 密钥"
            },
            styles: { width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }
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
            styles: { display: "block", marginBottom: "5px", fontWeight: "bold" }
          },
          {
            tag: "input",
            namespace: "html",
            id: "ragflow-api-url",
            attributes: {
              type: "text",
              "data-bind": "apiUrl",
              "data-prop": "value",
              placeholder: "如: http://127.0.0.1:8000"
            },
            styles: { width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }
          }
        ]
      })
      // 帮助信息
      .addCell(3, 0, {
        tag: "div",
        styles: { margin: "15px 0", padding: "10px", backgroundColor: "#f8f8f8", borderRadius: "4px", fontSize: "0.9em" },
        properties: { innerHTML: "请配置您的 RAGFlow API 密钥和 URL。如果您使用的是本地部署的 RAGFlow，默认 URL 通常为 http://127.0.0.1:8000。" }
      })
      // 添加保存按钮
      .addButton("保存", "save", { "primary": true })
      // 添加取消按钮
      .addButton("取消", "cancel")
      // 设置对话框数据
      .setDialogData({
        apiKey: Zotero.Prefs.get(`${config.prefsPrefix}.apiKey`, true) as string || "",
        apiUrl: Zotero.Prefs.get(`${config.prefsPrefix}.apiUrl`, true) as string || "http://127.0.0.1:8000",
        unloadCallback: () => {
          const dialogData = dialog.dialogData;
          if (dialogData._lastButtonId === "save") {
            Logger.info("正在保存RAGFlow配置设置");
            // 保存设置
            Zotero.Prefs.set(`${config.prefsPrefix}.apiKey`, dialogData.apiKey, true);
            Zotero.Prefs.set(`${config.prefsPrefix}.apiUrl`, dialogData.apiUrl, true);
            Logger.info("RAGFlow配置已保存");
            
            // 同步到服务
            addon.updateRAGFlowSettings();
            
            // 显示保存成功提示
            const successWindow = new ztoolkit.ProgressWindow("RAGFlow 设置");
            successWindow.createLine({ 
              text: "设置已保存", 
              type: "success" 
            });
            successWindow.show();
            successWindow.startCloseTimer(2000);
          }
        }
      });
    
    // 打开对话框
    dialog.open("RAGFlow 设置", { 
      width: 450, 
      centerscreen: true,
      resizable: true 
    });
    
    return dialog;
  }

  /**
   * 创建问题输入对话框
   */
  public static createQuestionInputDialog() {
    Logger.info("创建问题输入对话框");
    
    const dialog = new ztoolkit.Dialog(3, 1)
      // 标题
      .addCell(0, 0, {
        tag: "h3",
        properties: { innerHTML: "知识库问答" },
        styles: { 
          marginBottom: "15px", 
          color: "#2d2d2d",
          textAlign: "center",
          borderBottom: "1px solid #eee",
          paddingBottom: "10px"
        }
      })
      // 说明文本
      .addCell(1, 0, {
        tag: "p",
        properties: { 
          innerHTML: "请输入您想要咨询的问题，系统将从您的知识库中查找相关信息并回答："
        },
        styles: { 
          marginBottom: "15px", 
          color: "#666",
          fontSize: "0.9em"
        }
      })
      // 输入框
      .addCell(2, 0, {
        tag: "textarea",
        namespace: "html",
        id: "question-input",
        attributes: { 
          "data-bind": "question",
          "data-prop": "value",
          rows: "5",
          placeholder: "请在此处输入您的问题..."
        },
        styles: { 
          width: "100%", 
          minHeight: "120px", 
          padding: "10px", 
          marginBottom: "10px",
          borderRadius: "4px",
          border: "1px solid #ccc",
          fontFamily: "inherit",
          fontSize: "1em",
          resize: "vertical"
        }
      })
      // 按钮
      .addButton("提问", "ask", { className: "primary" })
      .addButton("取消", "cancel")
      .setDialogData({
        question: "",
        unloadCallback: (dialogData: any) => {
          if (dialogData._lastButtonId === "ask" && dialogData.question.trim()) {
            Logger.info(`用户提问: ${dialogData.question.trim()}`);
            addon.processQuestion(dialogData.question.trim());
          }
        }
      });
      
    dialog.open("RAGFlow 问答", {
      width: 550,
      height: 300,
      centerscreen: true,
      resizable: true
    });
    
    return dialog;
  }

  /**
   * 创建问答结果对话框
   */
  public static createQuestionDialog(question: string, answer: string) {
    Logger.info("创建问答结果对话框");
    
    // 创建一个新的 Dialog 实例 (行数，列数)
    const dialog = new ztoolkit.Dialog(3, 1)
      // 标题
      .addCell(0, 0, {
        tag: "h3",
        properties: { innerHTML: "知识库问答结果" },
        styles: { 
          marginBottom: "15px", 
          color: "#2d2d2d",
          textAlign: "center",
          borderBottom: "1px solid #eee",
          paddingBottom: "10px"
        }
      })
      // 问题区域
      .addCell(1, 0, {
        tag: "div",
        styles: { marginBottom: "20px" },
        children: [
          {
            tag: "div",
            styles: { 
              marginBottom: "5px", 
              fontWeight: "bold", 
              color: "#444",
              display: "flex",
              alignItems: "center"
            },
            children: [
              {
                tag: "span",
                styles: {
                  backgroundColor: "#4b6bfb",
                  color: "white",
                  padding: "2px 8px",
                  borderRadius: "10px",
                  marginRight: "8px",
                  fontSize: "0.85em"
                },
                properties: { innerHTML: "问题" }
              }
            ]
          },
          {
            tag: "div",
            id: "question",
            styles: { 
              backgroundColor: "#f5f7ff", 
              borderRadius: "6px", 
              padding: "12px", 
              fontWeight: "500",
              color: "#333",
              border: "1px solid #e0e5ff"
            },
            properties: { textContent: question }
          }
        ]
      })
      // 回答区域
      .addCell(2, 0, {
        tag: "div",
        styles: { flex: "1" },
        children: [
          {
            tag: "div",
            styles: { 
              marginBottom: "5px", 
              fontWeight: "bold", 
              color: "#444",
              display: "flex",
              alignItems: "center"
            },
            children: [
              {
                tag: "span",
                styles: {
                  backgroundColor: "#10b981",
                  color: "white",
                  padding: "2px 8px",
                  borderRadius: "10px",
                  marginRight: "8px",
                  fontSize: "0.85em"
                },
                properties: { innerHTML: "回答" }
              }
            ]
          },
          {
            tag: "div",
            id: "answer-container",
            styles: { 
              backgroundColor: "#f0fdf4", 
              borderRadius: "6px", 
              padding: "12px", 
              maxHeight: "350px", 
              overflow: "auto", 
              lineHeight: "1.6",
              border: "1px solid #d1fae5" 
            },
            children: [
              {
                tag: "p",
                id: "answer",
                styles: {
                  whiteSpace: "pre-wrap",
                  margin: "0"
                },
                properties: { textContent: answer }
              }
            ]
          }
        ]
      })
      // 添加按钮
      .addButton("复制回答", "copy")
      .addButton("再次提问", "ask-again")
      .addButton("关闭", "close")
      // 设置对话框数据
      .setDialogData({
        question: question,
        answer: answer,
        unloadCallback: (dialogData: any) => {
          if (dialogData._lastButtonId === "copy") {
            // 复制回答到剪贴板
            Zotero.Utilities.Internal.copyTextToClipboard(answer);
            const notification = new ztoolkit.ProgressWindow("RAGFlow");
            notification.createLine({ text: "回答已复制到剪贴板", type: "success" });
            notification.show();
            notification.startCloseTimer(1500);
          } else if (dialogData._lastButtonId === "ask-again") {
            // 关闭当前对话框并打开新的问题输入对话框
            setTimeout(() => RAGFlowUI.createQuestionInputDialog(), 100);
          }
        }
      });
    
    // 打开对话框
    dialog.open("RAGFlow 知识问答", {
      width: 700,
      height: 500,
      centerscreen: true,
      resizable: true
    });
    
    // 保存问答历史
    this.saveQuestionAnswerHistory(question, answer);
    
    return dialog;
  }
  
  /**
   * 保存问答历史
   */
  private static saveQuestionAnswerHistory(question: string, answer: string) {
    try {
      // 获取当前历史记录
      const historyJSON = Zotero.Prefs.get(`${config.prefsPrefix}.qaHistory`, true) as string || "[]";
      let history = [];
      try {
        history = JSON.parse(historyJSON);
      } catch (e) {
        Logger.error("解析问答历史记录失败", e);
        history = [];
      }
      
      // 添加新的记录
      history.unshift({
        question,
        answer,
        timestamp: new Date().toISOString()
      });
      
      // 限制历史记录数量（保留最近50条）
      if (history.length > 50) {
        history = history.slice(0, 50);
      }
      
      // 保存回偏好设置
      Zotero.Prefs.set(`${config.prefsPrefix}.qaHistory`, JSON.stringify(history), true);
      Logger.info("问答历史记录已保存");
    } catch (e) {
      Logger.error("保存问答历史记录失败", e);
    }
  }
  
  /**
   * 创建问答历史对话框
   */
  public static createHistoryDialog() {
    Logger.info("创建问答历史对话框");
    
    // 获取历史记录
    const historyJSON = Zotero.Prefs.get(`${config.prefsPrefix}.qaHistory`, true) as string || "[]";
    let history = [];
    try {
      history = JSON.parse(historyJSON);
    } catch (e) {
      Logger.error("解析问答历史记录失败", e);
      history = [];
    }
    
    // 如果没有历史记录
    if (history.length === 0) {
      const notification = new ztoolkit.ProgressWindow("RAGFlow 历史记录");
      notification.createLine({ text: "暂无问答历史记录", type: "default" });
      notification.show();
      notification.startCloseTimer(2000);
      return;
    }
    
    // 创建对话框
    const dialog = new ztoolkit.Dialog(2, 1)
      // 标题
      .addCell(0, 0, {
        tag: "h3",
        properties: { innerHTML: "RAGFlow 问答历史记录" },
        styles: { 
          margin: "10px 0 20px 0", 
          color: "#2d2d2d",
          textAlign: "center"
        }
      })
      // 历史记录列表
      .addCell(1, 0, {
        tag: "div",
        styles: { 
          overflowY: "auto", 
          maxHeight: "500px",
          padding: "0 5px"
        },
        children: history.map((item: any, index: number) => {
          const date = new Date(item.timestamp);
          const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
          
          return {
            tag: "div",
            styles: {
              marginBottom: "20px",
              padding: "15px",
              backgroundColor: index % 2 === 0 ? "#f8f9fa" : "#fff",
              borderRadius: "6px",
              border: "1px solid #eee"
            },
            children: [
              // 时间戳
              {
                tag: "div",
                styles: {
                  fontSize: "0.8em",
                  color: "#888",
                  marginBottom: "8px"
                },
                properties: { textContent: formattedDate }
              },
              // 问题
              {
                tag: "div",
                styles: {
                  marginBottom: "10px"
                },
                children: [
                  {
                    tag: "span",
                    styles: {
                      backgroundColor: "#4b6bfb",
                      color: "white",
                      padding: "2px 6px",
                      borderRadius: "10px",
                      marginRight: "8px",
                      fontSize: "0.75em"
                    },
                    properties: { innerHTML: "问题" }
                  },
                  {
                    tag: "span",
                    styles: {
                      fontWeight: "500"
                    },
                    properties: { textContent: item.question }
                  }
                ]
              },
              // 回答
              {
                tag: "div",
                styles: {
                  backgroundColor: "#f0fdf4",
                  padding: "10px",
                  borderRadius: "4px",
                  fontSize: "0.95em",
                  border: "1px solid #d1fae5"
                },
                children: [
                  {
                    tag: "div",
                    styles: {
                      display: "flex",
                      marginBottom: "5px"
                    },
                    children: [
                      {
                        tag: "span",
                        styles: {
                          backgroundColor: "#10b981",
                          color: "white",
                          padding: "2px 6px",
                          borderRadius: "10px",
                          marginRight: "8px",
                          fontSize: "0.75em"
                        },
                        properties: { innerHTML: "回答" }
                      }
                    ]
                  },
                  {
                    tag: "div",
                    styles: {
                      whiteSpace: "pre-wrap",
                      maxHeight: "150px",
                      overflowY: "auto"
                    },
                    properties: { textContent: item.answer }
                  }
                ]
              },
              // 操作按钮
              {
                tag: "div",
                styles: {
                  marginTop: "10px",
                  textAlign: "right"
                },
                children: [
                  {
                    tag: "button",
                    namespace: "html",
                    attributes: {
                      type: "button",
                      "data-index": index.toString(),
                      "data-action": "copy"
                    },
                    styles: {
                      padding: "3px 8px",
                      marginRight: "8px",
                      cursor: "pointer",
                      backgroundColor: "#f0f0f0",
                      border: "1px solid #ddd",
                      borderRadius: "3px"
                    },
                    properties: { textContent: "复制回答" },
                    events: {
                      click: (event: any) => {
                        const index = parseInt(event.target.getAttribute("data-index"));
                        Zotero.Utilities.Internal.copyTextToClipboard(history[index].answer);
                        const notification = new ztoolkit.ProgressWindow("RAGFlow");
                        notification.createLine({ text: "回答已复制到剪贴板", type: "success" });
                        notification.show();
                        notification.startCloseTimer(1500);
                      }
                    }
                  },
                  {
                    tag: "button",
                    namespace: "html",
                    attributes: {
                      type: "button",
                      "data-index": index.toString(),
                      "data-action": "reask"
                    },
                    styles: {
                      padding: "3px 8px",
                      cursor: "pointer",
                      backgroundColor: "#4b6bfb",
                      border: "1px solid #4b6bfb",
                      borderRadius: "3px",
                      color: "white"
                    },
                    properties: { textContent: "再次提问" },
                    events: {
                      click: (event: any) => {
                        const index = parseInt(event.target.getAttribute("data-index"));
                        dialog.close();
                        // 打开提问对话框并预填问题
                        setTimeout(() => {
                          const questionDialog = RAGFlowUI.createQuestionInputDialog();
                          if (questionDialog.dialogData) {
                            questionDialog.dialogData.question = history[index].question;
                            // 更新文本框中的值
                            const textArea = questionDialog.window.document.getElementById("question-input");
                            if (textArea) {
                              (textArea as HTMLTextAreaElement).value = history[index].question;
                            }
                          }
                        }, 100);
                      }
                    }
                  }
                ]
              }
            ]
          };
        })
      })
      // 添加按钮
      .addButton("关闭", "close");
    
    // 打开对话框
    dialog.open("RAGFlow 问答历史", {
      width: 700,
      height: 600,
      centerscreen: true,
      resizable: true
    });
    
    return dialog;
  }
}