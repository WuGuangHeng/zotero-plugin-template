// ...existing code...
import chatPanel from './modules/chatPanel';
import './styles/chatPanel.css';

// ...existing code...

// 添加新的命令来打开聊天面板
function initCommands() {
  // ...existing code...
  
  // 添加打开聊天面板的命令
  Zotero.KB = {
    // ...existing code...
    
    openChatPanel: function() {
      // 获取适合的父容器
      const parentElement = document.getElementById('zotero-pane') || document.body;
      
      // 显示聊天面板
      chatPanel.show(parentElement);
    },
    
    // 如果已有对话框方式，保留兼容性
    openDialog: function() {
      // 提示用户新功能
      const useNewPanel = confirm("知识库问答现已改进！您想使用新的聊天面板体验吗？");
      if (useNewPanel) {
        this.openChatPanel();
      } else {
        // 调用旧的对话框方法
        this.legacyOpenDialog();
      }
    },
    
    legacyOpenDialog: function() {
      // 这里调用原来的对话框逻辑
      // ...existing code...
    }
    
    // ...existing code...
  };
  
  // 更新菜单项
  if (Zotero.KB.menu) {
    Zotero.KB.menu.addMenuItem({
      id: 'kb-chat-panel',
      label: '知识库聊天',
      commandListener: () => Zotero.KB.openChatPanel()
    });
    
    // 可以考虑更新或保留原有菜单项
    // ...existing code...
  }
}

// ...existing code...
