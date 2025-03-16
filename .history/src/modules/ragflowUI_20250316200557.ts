// src/modules/ragflowUI.ts
import { config } from "../../package.json";
import { RAGFlowService, ChatAssistantParams } from "./ragflowService";
import { Logger } from "./logger";
import { StorageManager, ChatHistoryEntry } from "./storageManager";

// 添加一个类型定义来支持字符串索引
interface ChatSettings {
  model: string;
  temperature: number;
  top_p: number;
  max_tokens: number;
  similarity_threshold: number;
  top_n: number;
  [key: string]: string | number; // 允许通过字符串索引访问
}

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
 * 修改 createRagFlowMenu 方法，增加知识库选择菜单项
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
    
    // 新增 - 选择知识库菜单项
    const selectKbItem = ztoolkit.UI.createElement(
      Zotero.getMainWindow().document, 
      "menuitem", 
      {
        namespace: "xul",
        id: "zotero-ragflow-select-kb",
        attributes: {
          label: "选择已有知识库",
          oncommand: "Zotero.ZoteroRAGFlow.openKnowledgeBaseSelector()"
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

    // 聊天助手设置菜单项
    const chatAssistantSettingsMenu = ztoolkit.UI.createElement(
      Zotero.getMainWindow().document, 
      "menuitem", 
      {
        namespace: "xul",
        id: "zotero-ragflow-assistant-settings",
        attributes: {
          label: "聊天助手设置",
          oncommand: "Zotero.ZoteroRAGFlow.openChatAssistantSettings()"
        }
      }
    );
    ragflowMenuPopup.appendChild(chatAssistantSettingsMenu);
    
    // 组装菜单
    ragflowMenuPopup.appendChild(uploadItem);
    ragflowMenuPopup.appendChild(selectKbItem); // 新增的知识库选择菜单项
    
    // 添加分隔线
    const separator1 = ztoolkit.UI.createElement(
      Zotero.getMainWindow().document, 
      "menuseparator", 
      { namespace: "xul" }
    );
    ragflowMenuPopup.appendChild(separator1);
    
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
      .addButton("保存", "save")
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
 * 修改 createQuestionInputDialog 方法，显示当前知识库信息
 */
  public static createQuestionInputDialog() {
    Logger.info("创建问题输入对话框");
    
    // 获取当前知识库名称
    const kbId = Zotero.Prefs.get(`${config.prefsPrefix}.kbId`, true) as string;
    const kbName = Zotero.Prefs.get(`${config.prefsPrefix}.kbName`, true) as string || "未命名知识库";
    
    const dialog = new ztoolkit.Dialog(4, 1) // 增加一行显示知识库信息
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
      // 知识库信息
      .addCell(1, 0, {
        tag: "div",
        styles: {
          display: "flex",
          alignItems: "center",
          backgroundColor: "#f0f7ff",
          padding: "8px 12px",
          borderRadius: "4px",
          marginBottom: "15px"
        },
        children: [
          {
            tag: "span",
            styles: {
              marginRight: "10px",
              fontWeight: "bold",
              color: "#0066cc"
            },
            properties: { textContent: "当前知识库:" }
          },
          {
            tag: "span",
            styles: {
              flex: "1",
              color: "#333"
            },
            properties: { textContent: kbName }
          },
          {
            tag: "button",
            namespace: "html",
            attributes: { 
              type: "button",
              id: "kb-switch-button" 
            },
            properties: { textContent: "切换" },
            styles: {
              padding: "2px 8px",
              fontSize: "0.85em",
              cursor: "pointer"
            }
          }
        ]
      })
      // 说明文本
      .addCell(2, 0, {
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
      .addCell(3, 0, {
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
      .addButton("提问", "ask")
      .addButton("取消", "cancel")
      .setDialogData({
        question: "",
        loadCallback: () => {
          // 为切换按钮添加点击事件
          const switchButton = dialog.window.document.getElementById("kb-switch-button");
          if (switchButton) {
            switchButton.addEventListener("click", () => {
              dialog.window.close();
              setTimeout(() => addon.openKnowledgeBaseSelector(), 100);
            });
          }
        },
        unloadCallback: () => {
          const dialogData = dialog.dialogData;
          if (dialogData._lastButtonId === "ask" && dialogData.question.trim()) {
            Logger.info(`用户提问: ${dialogData.question.trim()}`);
            addon.processQuestion(dialogData.question.trim());
          }
        }
      });
        
    dialog.open("RAGFlow 问答", {
      width: 550,
      height: 350, // 增加高度以容纳新内容
      centerscreen: true,
      resizable: true
    });
    
    return dialog;
  }

  /**
 * 创建问答结果对话框
 * @param question 问题文本
 * @param answer 回答文本
 * @param sources 可选的参考来源信息
 */
  public static createQuestionDialog(question: string, answer: string, sources?: Array<{content: string, document_name: string}>) {
    Logger.info("创建问答结果对话框");
    
    // 计算对话框高度，根据是否有来源信息调整
    const dialogHeight = sources && sources.length > 0 ? 650 : 500;
    const rowCount = sources && sources.length > 0 ? 4 : 3;
    
    // 创建一个新的 Dialog 实例 (行数，列数)
    const dialog = new ztoolkit.Dialog(rowCount, 1)
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
              maxHeight: sources && sources.length > 0 ? "200px" : "350px", 
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
      });

    // 如果有来源信息，添加来源区域
    if (sources && sources.length > 0) {
      dialog.addCell(3, 0, {
        tag: "div",
        styles: { marginTop: "20px" },
        children: [
          {
            tag: "div",
            styles: { 
              marginBottom: "5px", 
              fontWeight: "bold", 
              color: "#444",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            },
            children: [
              {
                tag: "div",
                styles: {
                  display: "flex",
                  alignItems: "center"
                },
                children: [
                  {
                    tag: "span",
                    styles: {
                      backgroundColor: "#f97316",
                      color: "white",
                      padding: "2px 8px",
                      borderRadius: "10px",
                      marginRight: "8px",
                      fontSize: "0.85em"
                    },
                    properties: { innerHTML: "参考来源" }
                  },
                  {
                    tag: "span",
                    styles: {
                      fontSize: "0.85em",
                      color: "#666"
                    },
                    properties: { textContent: `${sources.length} 个来源` }
                  }
                ]
              }
            ]
          },
          {
            tag: "div",
            id: "sources-container",
            styles: { 
              backgroundColor: "#fff7ed", 
              borderRadius: "6px", 
              padding: "12px", 
              maxHeight: "200px", 
              overflow: "auto", 
              lineHeight: "1.5",
              border: "1px solid #ffedd5" 
            },
            children: sources.map((source, index) => ({
              tag: "div",
              styles: {
                marginBottom: index < sources.length - 1 ? "15px" : "0",
                paddingBottom: index < sources.length - 1 ? "15px" : "0",
                borderBottom: index < sources.length - 1 ? "1px solid #ffedd5" : "none"
              },
              children: [
                {
                  tag: "div",
                  styles: {
                    fontWeight: "500",
                    marginBottom: "4px",
                    fontSize: "0.9em",
                    color: "#9a3412"
                  },
                  properties: { textContent: `来源 ${index + 1}: ${source.document_name}` }
                },
                {
                  tag: "div",
                  styles: {
                    fontSize: "0.85em",
                    color: "#666",
                    whiteSpace: "pre-wrap",
                    backgroundColor: "#fffbf7",
                    padding: "8px",
                    borderRadius: "4px",
                    border: "1px solid #ffeacb"
                  },
                  properties: { 
                    textContent: source.content.length > 300 
                      ? source.content.substring(0, 300) + "..." 
                      : source.content 
                  }
                }
              ]
            }))
          }
        ]
      });
    }
    
    // 添加按钮
    dialog.addButton("复制回答", "copy")
      .addButton("再次提问", "ask-again")
      .addButton("关闭", "close")
      // 设置对话框数据
      .setDialogData({
        question: question,
        answer: answer,
        unloadCallback: () => {
          const dialogData = dialog.dialogData;
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
      height: dialogHeight,
      centerscreen: true,
      resizable: true
    });
    
    // 保存问答历史 - 使用异步调用，不等待完成
    this.saveQuestionAnswerHistory(question, answer, sources).catch(e => {
      Logger.error("保存历史失败", e);
    });
    
    return dialog;
  }
  
  /**
 * 保存问答历史
 * @param question 问题文本
 * @param answer 回答文本
 * @param sources 可选的参考来源信息
 */
  private static saveQuestionAnswerHistory(question: string, answer: string, sources?: Array<{content: string, document_name: string}>) {
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
        sources: sources || [],
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
 * 修改 createHistoryDialog 方法，添加来源信息显示
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
          const hasSources = item.sources && item.sources.length > 0;
          
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
                  border: "1px solid #d1fae5",
                  marginBottom: hasSources ? "10px" : "0"
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
              // 来源信息 (如果有)
              ...(hasSources ? [{
                tag: "div",
                styles: {
                  marginTop: "10px",
                  backgroundColor: "#fff7ed",
                  padding: "10px",
                  borderRadius: "4px",
                  fontSize: "0.9em",
                  border: "1px solid #ffedd5",
                  maxHeight: "100px",
                  overflowY: "auto"
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
                          backgroundColor: "#f97316",
                          color: "white",
                          padding: "2px 6px",
                          borderRadius: "10px",
                          marginRight: "8px",
                          fontSize: "0.75em"
                        },
                        properties: { innerHTML: "来源" }
                      },
                      {
                        tag: "span",
                        styles: {
                          fontSize: "0.8em",
                          color: "#666"
                        },
                        properties: { textContent: `${item.sources.length} 个参考来源` }
                      }
                    ]
                  },
                  ...item.sources.slice(0, 2).map((source: any, sourceIdx: number) => ({
                    tag: "div",
                    styles: {
                      fontSize: "0.8em",
                      color: "#555",
                      paddingLeft: "10px",
                      borderLeft: "2px solid #ffedd5",
                      marginTop: "5px"
                    },
                    properties: { textContent: `${source.document_name}` }
                  })),
                  ...(item.sources.length > 2 ? [{
                    tag: "div",
                    styles: {
                      fontSize: "0.8em",
                      color: "#888",
                      marginTop: "5px",
                      fontStyle: "italic"
                    },
                    properties: { textContent: `...还有 ${item.sources.length - 2} 个来源` }
                  }] : [])
                ]
              }] : []),
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
                      "class": "history-btn-copy"
                    },
                    styles: {
                      padding: "3px 8px",
                      marginRight: "8px",
                      cursor: "pointer",
                      backgroundColor: "#f0f0f0",
                      border: "1px solid #ddd",
                      borderRadius: "3px"
                    },
                    properties: { textContent: "复制回答" }
                  },
                  {
                    tag: "button",
                    namespace: "html",
                    attributes: {
                      type: "button",
                      "data-index": index.toString(),
                      "class": "history-btn-reask"
                    },
                    styles: {
                      padding: "3px 8px",
                      cursor: "pointer",
                      backgroundColor: "#4b6bfb",
                      border: "1px solid #4b6bfb",
                      borderRadius: "3px",
                      color: "white"
                    },
                    properties: { textContent: "再次提问" }
                  }
                ]
              }
            ]
          };
        })
      })
      // 添加按钮
      .addButton("关闭", "close")
      .setDialogData({
        loadCallback: () => {
          // 为所有复制按钮添加事件
          const copyButtons = dialog.window.document.querySelectorAll(".history-btn-copy");
          copyButtons.forEach((button) => {
            button.addEventListener("click", (event) => {
              const target = event.currentTarget as HTMLElement;
              const index = parseInt(target.getAttribute("data-index") || "0");
              Zotero.Utilities.Internal.copyTextToClipboard(history[index].answer);
              const notification = new ztoolkit.ProgressWindow("RAGFlow");
              notification.createLine({ text: "回答已复制到剪贴板", type: "success" });
              notification.show();
              notification.startCloseTimer(1500);
            });
          });
          
          // 为所有再次提问按钮添加事件
          const reaskButtons = dialog.window.document.querySelectorAll(".history-btn-reask");
          reaskButtons.forEach((button) => {
            button.addEventListener("click", (event) => {
              const target = event.currentTarget as HTMLElement;
              const index = parseInt(target.getAttribute("data-index") || "0");
              dialog.window.close();
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
            });
          });
        }
      });
    
    // 打开对话框
    dialog.open("RAGFlow 问答历史", {
      width: 700,
      height: 600,
      centerscreen: true,
      resizable: true
    });
    
    return dialog;
  }

    /**
   * 创建历史管理对话框
   */
  public static createHistoryManagementDialog() {
    Logger.info("创建历史管理对话框");
    
    const dialog = new ztoolkit.Dialog(2, 1)
      .addCell(0, 0, {
        tag: "h3",
        properties: { innerHTML: "RAGFlow 历史记录管理" },
        styles: { 
          margin: "10px 0 20px 0", 
          color: "#2d2d2d",
          textAlign: "center"
        }
      })
      .addCell(1, 0, {
        tag: "div",
        styles: {
          margin: "0 auto",
          textAlign: "center",
          padding: "20px"
        },
        children: [
          {
            tag: "p",
            properties: { textContent: "您可以清除所有历史记录。此操作不可撤销。" },
            styles: {
              marginBottom: "20px",
              color: "#666"
            }
          },
          {
            tag: "button",
            namespace: "html",
            id: "clear-history-button",
            properties: { textContent: "清除所有历史记录" },
            styles: {
              padding: "8px 15px",
              backgroundColor: "#f56565",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer"
            }
          }
        ]
      })
      .addButton("关闭", "close")
      .setDialogData({
        loadCallback: () => {
          // 为清除按钮添加点击事件
          const clearButton = dialog.window.document.getElementById("clear-history-button");
          if (clearButton) {
            clearButton.addEventListener("click", async () => {
              // 二次确认
              const confirmResult = dialog.window.confirm("确定要清除所有历史记录吗？此操作不可撤销。");
              if (confirmResult) {
                try {
                  await StorageManager.clearQuestionAnswerHistory();
                  
                  const notification = new ztoolkit.ProgressWindow("RAGFlow");
                  notification.createLine({ text: "已清除所有历史记录", type: "success" });
                  notification.show();
                  notification.startCloseTimer(1500);
                  
                  // 关闭对话框
                  dialog.window.close();
                } catch (error) {
                  Logger.error("清除历史记录失败", error);
                  
                  const notification = new ztoolkit.ProgressWindow("RAGFlow 错误");
                  notification.createLine({ text: "清除历史记录失败", type: "error" });
                  notification.show();
                  notification.startCloseTimer(2000);
                }
              }
            });
          }
        }
      });
    
    // 打开对话框
    dialog.open("RAGFlow 历史管理", {
      width: 400,
      height: 250,
      centerscreen: true,
      resizable: false
    });
  }

  /**
 * 创建知识库选择对话框
 */
  public static async createKnowledgeBaseSelector() {
    Logger.info("创建知识库选择对话框");
    
    // 获取可用的知识库列表
    try {
      // 显示加载中提示
      const loadingWindow = new ztoolkit.ProgressWindow("RAGFlow 知识库");
      loadingWindow.createLine({ 
        text: "正在获取知识库列表...",
        type: "default" 
      });
      loadingWindow.show();
      
      // 获取知识库列表
      const datasets = await RAGFlowService.listDatasets();
      
      // 关闭加载提示
      loadingWindow.close();
      
      if (datasets.length === 0) {
        const notificationWindow = new ztoolkit.ProgressWindow("RAGFlow 知识库");
        notificationWindow.createLine({ 
          text: "未找到知识库，请先创建知识库", 
          type: "warning" 
        });
        notificationWindow.show();
        notificationWindow.startCloseTimer(3000);
        return;
      }
      
      // 创建对话框
      const dialog = new ztoolkit.Dialog(3, 1)
        // 标题
        .addCell(0, 0, {
          tag: "h3",
          properties: { innerHTML: "选择要使用的知识库" },
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
            innerHTML: "请从下列知识库中选择一个用于问答："
          },
          styles: { 
            marginBottom: "10px", 
            color: "#666"
          }
        })
        // 知识库列表
        .addCell(2, 0, {
          tag: "div",
          styles: {
            maxHeight: "300px",
            overflowY: "auto",
            border: "1px solid #eee",
            borderRadius: "4px",
            padding: "5px"
          },
          children: datasets.map((dataset, index) => {
            const currentKbId = Zotero.Prefs.get(`${config.prefsPrefix}.kbId`, true) as string;
            const isSelected = currentKbId === dataset.id;
            
            return {
              tag: "div",
              attributes: {
                "data-kb-id": dataset.id,
                "data-kb-name": dataset.name,
                "data-index": index.toString(),
                "class": "kb-item"
              },
              styles: {
                padding: "10px 15px",
                margin: "5px 0",
                backgroundColor: isSelected ? "#e6f7ff" : "#f9f9f9",
                border: `1px solid ${isSelected ? "#91d5ff" : "#eee"}`,
                borderRadius: "4px",
                cursor: "pointer",
                position: "relative"
              },
              properties: {
                innerHTML: `<span style="font-weight: ${isSelected ? 'bold' : 'normal'};">${dataset.name}</span>
                            ${isSelected ? '<span style="color: #1890ff; position: absolute; right: 15px;">✓ 当前使用</span>' : ''}`
              }
            };
          })
        })
        .addButton("选择", "select")
        .addButton("取消", "cancel")
        .setDialogData({
          selectedId: Zotero.Prefs.get(`${config.prefsPrefix}.kbId`, true) as string || null,
          selectedName: "",
          loadCallback: () => {
            // 为所有知识库项添加点击事件
            const kbItems = dialog.window.document.querySelectorAll(".kb-item");
            kbItems.forEach((item) => {
              item.addEventListener("click", (event) => {
                // 清除所有高亮
                kbItems.forEach(item => {
                  (item as HTMLElement).style.backgroundColor = "#f9f9f9";
                  (item as HTMLElement).style.border = "1px solid #eee";
                  item.querySelector("span")!.style.fontWeight = "normal";
                });
                
                // 高亮选中的条目
                const target = event.currentTarget as HTMLElement;
                target.style.backgroundColor = "#e6f7ff";
                target.style.border = "1px solid #91d5ff";
                target.querySelector("span")!.style.fontWeight = "bold";
                
                // 更新选中的知识库ID
                dialog.dialogData.selectedId = target.getAttribute("data-kb-id");
                dialog.dialogData.selectedName = target.getAttribute("data-kb-name");
              });
            });
          },
          unloadCallback: () => {
            if (dialog.dialogData._lastButtonId === "select" && dialog.dialogData.selectedId) {
              Logger.info(`用户选择了知识库: ${dialog.dialogData.selectedId}`);
              addon.setKnowledgeBase(
                dialog.dialogData.selectedId,
                dialog.dialogData.selectedName
              );
            }
          }
        });
        
      dialog.open("RAGFlow 知识库选择", {
        width: 500,
        height: 400,
        centerscreen: true,
        resizable: true
      });
      
      return dialog;
    } catch (error) {
      Logger.error("获取知识库列表失败", error);
      
      const errorWindow = new ztoolkit.ProgressWindow("RAGFlow 错误");
      errorWindow.createLine({ 
        text: "获取知识库列表失败", 
        type: "error" 
      });
      errorWindow.show();
      errorWindow.startCloseTimer(3000);
    }
  }

   /**
   * 创建聊天助手参数设置对话框
   * @param datasetId 知识库ID
   * @param callback 回调函数，用于返回用户设置的参数
   * @param existingChatId 可选，现有聊天助手ID，传入时表示这是一个更新操作
   */
   public static createChatAssistantSettingsDialog(datasetId: string, callback: (params: ChatAssistantParams) => void, existingChatId?: string): void {
    Logger.info("创建聊天助手参数设置对话框" + (existingChatId ? "（更新模式）" : "（新建模式）"));
    
    // 对话框标题
    const dialogTitle = existingChatId ? "更新聊天助手设置" : "聊天助手设置";
    
    // 默认设置值
    const defaultSettings: ChatSettings = {
      model: "qwen-turbo",
      temperature: 0.7,
      top_p: 0.95,
      max_tokens: 4000,
      similarity_threshold: 0.2,
      top_n: 5
    };
    
    // 使用单选按钮而非下拉框
    const modelOptions = ["deepseek-resoner","deepseek-chat", "qwen-turbo", "qwen-max", "qwen-plus", "qwen-long"];
    
    // 初始化对话框
    const dialog = new ztoolkit.Dialog(8, 2);
    
    // 添加标题
    dialog.addCell(0, 0, {
      tag: "h3",
      properties: { innerHTML: dialogTitle },
      styles: { 
        marginBottom: "15px", 
        color: "#2d2d2d",
        textAlign: "center",
        gridColumn: "1 / span 2",
        borderBottom: "1px solid #eee",
        paddingBottom: "10px"
      }
    });
    
    // 添加说明文本
    dialog.addCell(1, 0, {
      tag: "p",
      properties: { 
        innerHTML: existingChatId 
          ? "您正在更新聊天助手的参数，这些更改将立即生效："
          : "请配置聊天助手参数，这些参数将影响问答质量和效率："
      },
      styles: { 
        marginBottom: "15px", 
        color: "#666",
        gridColumn: "1 / span 2"
      }
    });
    
    // 模型选择 - 使用单选按钮
    dialog.addCell(2, 0, {
      tag: "label",
      properties: { textContent: "模型" },
      styles: { 
        fontWeight: "bold", 
        padding: "8px 0",
        textAlign: "right",
        paddingRight: "15px"
      }
    });
    
    dialog.addCell(2, 1, {
      tag: "div",
      id: "model-options",
      styles: {
        display: "flex",
        flexDirection: "column",
        gap: "8px"
      },
      children: modelOptions.map(model => ({
        tag: "div",
        styles: {
          display: "flex",
          alignItems: "center",
          marginBottom: "5px"
        },
        children: [
          {
            tag: "input",
            namespace: "html",
            id: `model-${model}`,
            attributes: {
              type: "radio",
              name: "model-choice",
              value: model,
              checked: model === defaultSettings.model ? "checked" : undefined
            },
            styles: {
              marginRight: "8px"
            }
          },
          {
            tag: "label",
            attributes: {
              for: `model-${model}`
            },
            properties: { textContent: model },
            styles: {
              userSelect: "none"
            }
          }
        ]
      }))
    });
    
    // 温度参数
    dialog.addCell(3, 0, {
      tag: "label",
      properties: { textContent: "温度" },
      styles: { 
        fontWeight: "bold", 
        padding: "8px 0",
        textAlign: "right",
        paddingRight: "15px"
      }
    });
    
    dialog.addCell(3, 1, {
      tag: "input",
      namespace: "html",
      id: "temperature",
      attributes: {
        type: "number",
        step: "0.1",
        min: "0",
        max: "1",
        value: defaultSettings.temperature.toString()
      },
      styles: {
        width: "100%", 
        padding: "6px",
        borderRadius: "4px",
        border: "1px solid #ccc"
      }
    });
    
    // Top P
    dialog.addCell(4, 0, {
      tag: "label",
      properties: { textContent: "Top P" },
      styles: { 
        fontWeight: "bold", 
        padding: "8px 0",
        textAlign: "right",
        paddingRight: "15px"
      }
    });
    
    dialog.addCell(4, 1, {
      tag: "input",
      namespace: "html",
      id: "top_p",
      attributes: {
        type: "number",
        step: "0.01",
        min: "0",
        max: "1",
        value: defaultSettings.top_p.toString()
      },
      styles: {
        width: "100%", 
        padding: "6px",
        borderRadius: "4px",
        border: "1px solid #ccc"
      }
    });
    
    // 最大输出长度
    dialog.addCell(5, 0, {
      tag: "label",
      properties: { textContent: "最大输出长度" },
      styles: { 
        fontWeight: "bold", 
        padding: "8px 0",
        textAlign: "right",
        paddingRight: "15px"
      }
    });
    
    dialog.addCell(5, 1, {
      tag: "input",
      namespace: "html",
      id: "max_tokens",
      attributes: {
        type: "number",
        step: "100",
        min: "100",
        max: "8000",
        value: defaultSettings.max_tokens.toString()
      },
      styles: {
        width: "100%", 
        padding: "6px",
        borderRadius: "4px",
        border: "1px solid #ccc"
      }
    });
    
    // 相似度阈值
    dialog.addCell(6, 0, {
      tag: "label",
      properties: { textContent: "相似度阈值" },
      styles: { 
        fontWeight: "bold", 
        padding: "8px 0",
        textAlign: "right",
        paddingRight: "15px"
      }
    });
    
    dialog.addCell(6, 1, {
      tag: "input",
      namespace: "html",
      id: "similarity_threshold",
      attributes: {
        type: "number",
        step: "0.05",
        min: "0",
        max: "1",
        value: defaultSettings.similarity_threshold.toString()
      },
      styles: {
        width: "100%", 
        padding: "6px",
        borderRadius: "4px",
        border: "1px solid #ccc"
      }
    });
    
    // 检索结果数量
    dialog.addCell(7, 0, {
      tag: "label",
      properties: { textContent: "检索结果数量" },
      styles: { 
        fontWeight: "bold", 
        padding: "8px 0",
        textAlign: "right",
        paddingRight: "15px"
      }
    });
    
    dialog.addCell(7, 1, {
      tag: "input",
      namespace: "html",
      id: "top_n",
      attributes: {
        type: "number",
        step: "1",
        min: "1",
        max: "10",
        value: defaultSettings.top_n.toString()
      },
      styles: {
        width: "100%", 
        padding: "6px",
        borderRadius: "4px",
        border: "1px solid #ccc"
      }
    });
    
    // 添加按钮
    dialog.addButton(existingChatId ? "更新" : "确定", "save");
    dialog.addButton("取消", "cancel");
    
    // 设置对话框数据和回调函数
    dialog.setDialogData({
      // 加载回调
      loadCallback: async () => {
        // 如果是更新模式，获取远程设置
        if (existingChatId) {
          try {
            // 创建加载提示
            const loadingMessage = dialog.window.document.createElement("div");
            loadingMessage.textContent = "正在加载聊天助手设置...";
            loadingMessage.style.textAlign = "center";
            loadingMessage.style.padding = "10px";
            loadingMessage.style.gridColumn = "1 / span 2";
            loadingMessage.style.backgroundColor = "#f0f7ff";
            loadingMessage.style.borderRadius = "4px";
            loadingMessage.style.margin = "0 0 15px 0";
            
            // 添加到对话框中
            const container = dialog.window.document.querySelector(".dialog-content");
            if (container) {
              container.insertBefore(loadingMessage, container.firstChild);
            }
            
            // 获取远程设置
            const assistant = await RAGFlowService.getChatAssistantDetails(existingChatId);
            
            // 移除加载提示
            if (loadingMessage.parentNode) {
              loadingMessage.parentNode.removeChild(loadingMessage);
            }
            
            if (assistant && assistant.llm) {
              // 更新模型选择
              if (assistant.llm.model_name) {
                const modelRadio = dialog.window.document.getElementById(`model-${assistant.llm.model_name}`) as HTMLInputElement;
                if (modelRadio) {
                  modelRadio.checked = true;
                }
                Logger.debug(`从远程加载模型设置: ${assistant.llm.model_name}`);
              }
              
              // 更新其他参数
              const updateInput = (id: string, value: any) => {
                const input = dialog.window.document.getElementById(id) as HTMLInputElement;
                if (input && value !== undefined && value !== null) {
                  input.value = value.toString();
                }
              };
              
              updateInput("temperature", assistant.llm.temperature);
              updateInput("top_p", assistant.llm.top_p);
              updateInput("max_tokens", assistant.llm.max_tokens);
              
              if (assistant.prompt) {
                updateInput("similarity_threshold", assistant.prompt.similarity_threshold);
                updateInput("top_n", assistant.prompt.top_n);
              }
              
              Logger.info("已加载聊天助手设置，ID: " + existingChatId);
            }
          } catch (error) {
            Logger.error(`加载聊天助手设置失败: ${error instanceof Error ? error.message : String(error)}`);
            
            // 显示错误提示
            const container = dialog.window.document.querySelector(".dialog-content");
            const loadingMessage = container?.querySelector("div");
            if (loadingMessage && loadingMessage.parentNode) {
              loadingMessage.textContent = "加载设置失败，使用默认值";
              loadingMessage.style.backgroundColor = "#fff0f0";
              loadingMessage.style.color = "#e53e3e";
              
              setTimeout(() => {
                if (loadingMessage.parentNode) {
                  loadingMessage.parentNode.removeChild(loadingMessage);
                }
              }, 3000);
            }
          }
        }
      },
      
      // 卸载回调 - 当对话框关闭时执行
      unloadCallback: () => {
        // 只有点击保存/更新按钮时才处理
        if (dialog.dialogData._lastButtonId === "save") {
          Logger.info("保存聊天助手参数设置");
          
          try {
            // 获取选中的模型值 - 通过检查哪个单选按钮被选中
            let selectedModel = defaultSettings.model;
            for (const model of modelOptions) {
              const radioElement = dialog.window.document.getElementById(`model-${model}`) as HTMLInputElement;
              if (radioElement && radioElement.checked) {
                selectedModel = model;
                break;
              }
            }
            
            // 从DOM元素获取其他参数值
            const getValue = (id: string, defaultValue: string = ""): string => {
              const element = dialog.window.document.getElementById(id) as HTMLInputElement;
              return element ? element.value : defaultValue;
            };
            
            // 验证数值参数
            const validateNumberParam = (value: string, min: number, max: number, defaultVal: number): number => {
              const numValue = parseFloat(value);
              if (isNaN(numValue) || numValue < min || numValue > max) {
                return defaultVal;
              }
              return numValue;
            };
            
            // 构造参数对象
            const params: ChatAssistantParams = {
              model: selectedModel,
              temperature: validateNumberParam(getValue("temperature"), 0, 1, defaultSettings.temperature),
              top_p: validateNumberParam(getValue("top_p"), 0, 1, defaultSettings.top_p),
              max_tokens: validateNumberParam(getValue("max_tokens"), 100, 8000, defaultSettings.max_tokens),
              similarity_threshold: validateNumberParam(getValue("similarity_threshold"), 0, 1, defaultSettings.similarity_threshold),
              top_n: validateNumberParam(getValue("top_n"), 1, 10, defaultSettings.top_n)
            };
            
            // 记录最终参数值
            Logger.info(`聊天助手最终参数: ${JSON.stringify(params)}`);
            Logger.info(`- 模型: ${params.model}`);
            
            // 调用回调函数
            callback(params);
          } catch (e) {
            Logger.error(`保存参数设置时发生错误: ${e}`);
            
            // 构造备用参数
            const fallbackParams: ChatAssistantParams = {
              model: defaultSettings.model,
              temperature: defaultSettings.temperature,
              top_p: defaultSettings.top_p,
              max_tokens: defaultSettings.max_tokens,
              similarity_threshold: defaultSettings.similarity_threshold,
              top_n: defaultSettings.top_n
            };
            
            Logger.info(`使用备用参数: ${JSON.stringify(fallbackParams)}`);
            callback(fallbackParams);
          }
        }
      }
    });
    
    // 打开对话框
    dialog.open("RAGFlow " + dialogTitle, {
      width: 500,
      height: 480,
      centerscreen: true,
      resizable: true
    });
  }
}