// ...existing code...

function addKnowledgeBaseChatButton(toolbar) {
  // ...existing code...
  
  const chatButton = document.createElement('button');
  chatButton.className = 'kb-toolbar-button kb-chat-toggle';
  chatButton.title = '打开知识库聊天';
  chatButton.innerHTML = '<svg>...</svg>'; // 添加一个合适的图标
  chatButton.addEventListener('click', () => Zotero.KB.openChatPanel());
  
  toolbar.appendChild(chatButton);
  
  // ...existing code...
}

// ...existing code...
