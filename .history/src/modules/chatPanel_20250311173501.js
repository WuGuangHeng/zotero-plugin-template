class ChatPanel {
  constructor() {
    this.panel = null;
    this.chatHistory = [];
    this.isInitialized = false;
  }

  init() {
    if (this.isInitialized) return;
    
    // 创建面板容器
    this.panel = document.createElement('div');
    this.panel.id = 'kb-chat-panel';
    this.panel.className = 'kb-chat-panel';
    
    // 创建聊天历史区域
    const historyContainer = document.createElement('div');
    historyContainer.className = 'kb-chat-history';
    this.panel.appendChild(historyContainer);
    
    // 创建输入区域
    const inputContainer = document.createElement('div');
    inputContainer.className = 'kb-chat-input-container';
    
    const textarea = document.createElement('textarea');
    textarea.className = 'kb-chat-input';
    textarea.placeholder = '请输入问题...';
    
    const sendButton = document.createElement('button');
    sendButton.className = 'kb-chat-send-btn';
    sendButton.textContent = '发送';
    sendButton.addEventListener('click', () => this.handleSendMessage(textarea.value));
    
    // 添加键盘事件，按Ctrl+Enter发送
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        this.handleSendMessage(textarea.value);
      }
    });
    
    const clearButton = document.createElement('button');
    clearButton.className = 'kb-chat-clear-btn';
    clearButton.textContent = '清除对话';
    clearButton.addEventListener('click', () => this.clearChat());
    
    inputContainer.appendChild(textarea);
    inputContainer.appendChild(sendButton);
    inputContainer.appendChild(clearButton);
    this.panel.appendChild(inputContainer);
    
    this.isInitialized = true;
    return this.panel;
  }
  
  show(parentElement) {
    if (!this.isInitialized) {
      this.init();
    }
    
    if (!this.panel.isConnected) {
      parentElement.appendChild(this.panel);
    }
    
    this.panel.style.display = 'flex';
  }
  
  hide() {
    if (this.panel) {
      this.panel.style.display = 'none';
    }
  }
  
  async handleSendMessage(message) {
    if (!message.trim()) return;
    
    const historyContainer = this.panel.querySelector('.kb-chat-history');
    const textarea = this.panel.querySelector('.kb-chat-input');
    
    // 添加用户问题到历史
    this.addMessageToHistory('user', message);
    textarea.value = '';
    
    try {
      // 调用知识库问答API
      const response = await window.KnowledgeBase.askQuestion(message, this.chatHistory);
      this.addMessageToHistory('assistant', response);
    } catch (error) {
      this.addMessageToHistory('system', `出错了: ${error.message}`);
    }
  }
  
  addMessageToHistory(role, content) {
    const historyContainer = this.panel.querySelector('.kb-chat-history');
    const messageDiv = document.createElement('div');
    messageDiv.className = `kb-chat-message kb-${role}-message`;
    
    // 添加头像或标识
    const iconSpan = document.createElement('span');
    iconSpan.className = `kb-message-icon kb-${role}-icon`;
    iconSpan.textContent = role === 'user' ? '我' : role === 'assistant' ? 'AI' : '系统';
    
    // 添加内容
    const contentDiv = document.createElement('div');
    contentDiv.className = 'kb-message-content';
    contentDiv.textContent = content;
    
    messageDiv.appendChild(iconSpan);
    messageDiv.appendChild(contentDiv);
    historyContainer.appendChild(messageDiv);
    
    // 自动滚动到底部
    historyContainer.scrollTop = historyContainer.scrollHeight;
    
    // 保存到历史记录
    this.chatHistory.push({ role, content });
  }
  
  clearChat() {
    const historyContainer = this.panel.querySelector('.kb-chat-history');
    historyContainer.innerHTML = '';
    this.chatHistory = [];
  }
}

// 导出单例
if (!window.chatPanel) {
  window.chatPanel = new ChatPanel();
}

export default window.chatPanel;
