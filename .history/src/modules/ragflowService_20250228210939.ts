// src/modules/ragflowService.ts

// 定义API响应的接口
interface RAGFlowAPIResponse<T = any> {
  code: number;
  message?: string;
  data: T;
}

// 数据集响应接口
interface DatasetResponse {
  id: string;
  name: string;
  status: string;
  chunk_count: number;
  document_count: number;
  token_num: number;
  create_time: number;
  update_time: number;
  embedding_model: string;
  chunk_method: string;
  parser_config: {
    chunk_token_count?: number;
    delimiter?: string;
    layout_recognize?: boolean;
    html4excel?: boolean;
    raptor?: {
      use_raptor: boolean;
    };
    entity_types?: string[];
    task_page_size?: number;
  };
}

// 文档列表响应接口
interface DocumentListResponse {
  items: Array<{
    id: string;
    name: string;
    location: string;
    run: string;
    status: string;
    chunk_count: number;
    size: number;
    type: string;
  }>;
  total: number;
}

// 检索响应接口
interface RetrievalResponse {
  items: Array<{
    id: string;
    content: string;
    document_id: string;
    document_keyword: string;
    highlight?: string;
    similarity: number;
    term_similarity: number;
    vector_similarity: number;
  }>;
  doc_aggs: Array<{
    doc_id: string;
    doc_name: string;
    count: number;
  }>;
  total: number;
}

// 聊天完成响应接口
interface ChatCompletionResponse {
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
    finish_reason?: string;
    index?: number;
  }>;
  id: string;
  created: number;
  model: string;
  object: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class RAGFlowService {
  private static baseURL = "http://127.0.0.1:8000"; // 更改为实际 RAGFlow API 地址
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

