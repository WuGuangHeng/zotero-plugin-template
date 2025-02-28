// src/modules/ragflowService.ts
export class RAGFlowService {
  private static baseURL = "http://localhost:8000/api/v1"; // 更改为实际 RAGFlow API 地址
  private static apiKey = "ragflow-ZkZjFlZmIwZjVhNjExZWZhNDNmMDI0Mm"; // RAGFlow API 密钥
  
  /**
   * 设置 API 密钥和基础 URL
   */
  // public static setConfig(baseURL: string, apiKey: string) {
  //   this.baseURL = baseURL;
  //   this.apiKey = apiKey;
  // }
  public static setApiKey(apiKey: string) {
    this.apiKey = apiKey;
  }
  public static setBaseURL(baseURL: string) {
    this.baseURL = baseURL;
  }

  /**
   * 创建知识库数据集
   */
  public static async createDataset(name: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseURL}/datasets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          name: name,
          language: "Chinese", // 可设置为 Chinese 或 English
          embedding_model: "BAAI/bge-zh-v1.5", // 使用中文嵌入模型
          permission: "me",
          chunk_method: "naive", // 使用通用分块方法
          parser_config: {
            chunk_token_count: 256,
            layout_recognize: true,
            html4excel: false,
            delimiter: "\n!?。；！？",
            task_page_size: 12,
            raptor: { use_raptor: false }
          }
        })
      });
      
      const result = await response.json();
      if (result.code !== 0) {
        throw new Error(result.message || "创建知识库失败");
      }
      
      return result.data.id; // 返回数据集 ID
    } catch (error) {
      console.error("创建知识库失败:", error);
      throw error;
    }
  }
  
  /**
 * 上传文件到 RAGFlow 知识库
 */
public static async uploadFiles(files: Array<{path: string, name: string, mimeType: string}>, collectionName: string): Promise<string> {
  try {
    // 1. 先创建知识库数据集
    const datasetId = await this.createDataset(collectionName);
    
    // 2. 逐个上传文件
    for (const file of files) {
      // 创建 FormData 对象
      const formData = new FormData();
      
      // 从文件路径异步读取二进制内容
      try {
        const fileContent = await Zotero.File.getBinaryContentsAsync(file.path);
      // 创建 Blob 对象
      const fileBlob = new Blob([fileContent], { type: file.mimeType });
      formData.append("file", fileBlob, file.name);
      } catch (error) {
        console.error(`读取文件 ${file.name} 失败:`, error);
        throw new Error(`无法读取文件 ${file.name}: ${error.message}`);
      }
      // 上传文件
      const response = await fetch(`${this.baseURL}/datasets/${datasetId}/documents`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`
        },
        body: formData
      });
      
      const result = await response.json();
      if (result.code !== 0) {
        throw new Error(result.message || `上传文件 ${file.name} 失败`);
      }
    }
    
    // 3. 获取所有文档ID
    const documentIds = await this.getDocumentIds(datasetId);
    if (documentIds.length > 0) {
      // 4. 解析文档（开始处理文档）
      await this.parseDocuments(datasetId, documentIds);
    }
    
    // 5. 返回数据集ID作为知识库ID
    return datasetId;
  } catch (error) {
    console.error("上传文件失败:", error);
    throw error;
  }
}
  
  /**
   * 获取数据集中的文档 ID 列表
   */
  private static async getDocumentIds(datasetId: string): Promise<string[]> {
    try {
      const response = await fetch(
        `${this.baseURL}/datasets/${datasetId}/documents?page=1&page_size=100`, 
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${this.apiKey}`
          }
        }
      );
      
      const result = await response.json();
      if (result.code !== 0) {
        throw new Error(result.message || "获取文档列表失败");
      }
      
      return result.data.items.map((doc: any) => doc.id);
    } catch (error) {
      console.error("获取文档列表失败:", error);
      throw error;
    }
  }
  
  /**
   * 解析文档（处理文档）
   */
  private static async parseDocuments(datasetId: string, documentIds: string[]): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/datasets/${datasetId}/chunks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          document_ids: documentIds
        })
      });
      
      const result = await response.json();
      if (result.code !== 0) {
        throw new Error(result.message || "解析文档失败");
      }
      
      return true;
    } catch (error) {
      console.error("解析文档失败:", error);
      throw error;
    }
  }
  
  /**
   * 检查数据集处理状态
   */
  public static async checkDatasetStatus(datasetId: string): Promise<{
    processed: number;
    total: number;
    finished: boolean;
  }> {
    try {
      const response = await fetch(`${this.baseURL}/datasets/${datasetId}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`
        }
      });
      
      const result = await response.json();
      if (result.code !== 0) {
        throw new Error(result.message || "获取数据集状态失败");
      }
      
      const dataset = result.data;
      const processed = dataset.chunk_count || 0;
      const total = dataset.document_count * 10; // 粗略估计每个文档约10个块
      const finished = dataset.status === "finished";
      
      return { processed, total, finished };
    } catch (error) {
      console.error("获取数据集状态失败:", error);
      throw error;
    }
  }
  
  /**
   * 向 RAGFlow 发送问题并获取回答（通过检索 API）
   */
  public static async askQuestion(datasetId: string, question: string): Promise<string> {
    try {
      // 首先进行检索
      const retrievalResponse = await fetch(`${this.baseURL}/retrieval`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          question: question,
          dataset_ids: [datasetId],
          page: 1,
          page_size: 5,
          similarity_threshold: 0.2,
          vector_similarity_weight: 0.7,
          highlight: true
        })
      });
      
      const retrievalResult = await retrievalResponse.json();
      if (retrievalResult.code !== 0) {
        throw new Error(retrievalResult.message || "检索失败");
      }
      
      // 检索结果为空，则返回提示信息
      if (retrievalResult.data.items.length === 0) {
        return "抱歉，我在知识库中找不到相关信息来回答这个问题。";
      }
      
      // 构建上下文
      const contexts = retrievalResult.data.items.map((item: any) => item.content).join("\n\n");
      
      // 创建聊天完成（chat completion）请求
      const chatId = datasetId; // 使用数据集ID作为聊天ID
      const chatResponse = await fetch(`${this.baseURL}/chats_openai/${chatId}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo", // 使用支持的模型
          stream: false,
          messages: [
            {
              role: "system",
              content: "您是一个基于知识库的问答助手。您只能根据提供的上下文回答问题，不要编造信息。如果上下文中没有相关信息，请坦诚告知用户。"
            },
            {
              role: "user",
              content: `基于以下上下文回答问题：\n\n${contexts}\n\n问题：${question}`
            }
          ]
        })
      });
      
      const chatResult = await chatResponse.json();
      if (chatResult.choices && chatResult.choices.length > 0) {
        return chatResult.choices[0].message.content;
      } else {
        throw new Error("获取回答失败，返回数据格式不正确");
      }
    } catch (error) {
      console.error("获取回答失败:", error);
      throw error;
    }
  }
  
  /**
   * 获取数据集列表
   */
  public static async listDatasets(): Promise<Array<{id: string, name: string}>> {
    try {
      const response = await fetch(`${this.baseURL}/datasets?page=1&page_size=100`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`
        }
      });
      
      const result = await response.json();
      if (result.code !== 0) {
        throw new Error(result.message || "获取数据集列表失败");
      }
      
      return result.data.items.map((dataset: any) => ({
        id: dataset.id,
        name: dataset.name
      }));
    } catch (error) {
      console.error("获取数据集列表失败:", error);
      throw error;
    }
  }

    /**
   * 获取知识库状态
   */
  public static async getKnowledgeBaseStatus(datasetId: string): Promise<string> {
    try {
      const statusData = await this.checkDatasetStatus(datasetId);
      
      if (statusData.finished) {
        return "ready";
      } else if (statusData.processed > 0) {
        return "processing";
      } else {
        // 检查是否有错误
        const response = await fetch(`${this.baseURL}/datasets/${datasetId}`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${this.apiKey}`
          }
        });
        
        const result = await response.json();
        if (result.code !== 0) {
          throw new Error(result.message || "获取数据集信息失败");
        }
        
        // 根据数据集状态返回
        if (result.data.status === "error") {
          return "failed";
        }
        
        return "processing";
      }
    } catch (error) {
      console.error("获取知识库状态失败:", error);
      throw error;
    }
  }
}

