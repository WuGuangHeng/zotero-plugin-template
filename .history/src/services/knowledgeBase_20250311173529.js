// ...existing code...

class KnowledgeBase {
  // ...existing code...
  
  /**
   * 发送问题到知识库并获取回答，支持对话历史
   * @param {string} question - 用户问题
   * @param {Array} history - 对话历史
   * @returns {Promise<string>} - AI回答
   */
  async askQuestion(question, history = []) {
    try {
      // 准备发送的数据，加入历史对话
      const payload = {
        question,
        history: history.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      };
      
      // 如果有文件上下文，添加到payload
      if (this.currentContext && this.currentContext.length > 0) {
        payload.context = this.currentContext;
      }
      
      const response = await this._sendRequest(payload);
      return response.answer || "抱歉，无法获取回答。";
    } catch (error) {
      console.error("Knowledge Base Error:", error);
      throw new Error("问答出错: " + (error.message || "未知错误"));
    }
  }
  
  // ...existing code...
  
  /**
   * 发送请求到知识库API
   * @private
   */
  async _sendRequest(payload) {
    // ...existing code...
  }
}

// ...existing code...
