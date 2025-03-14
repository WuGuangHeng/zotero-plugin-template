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
  private static apiKey = "ragflow-ZkZjFlZmIwZjVhNjExZWZhNDNmMDI0Mm"; // RAGFlow API 密钥
  
  /**
   * 设置 API 密钥
   */
  public static setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }
  
  /**
   * 设置基础 URL
   */
  public static setBaseURL(baseURL: string): void {
    this.baseURL = baseURL;
  }

  /**
   * 创建知识库数据集
   */
  /**
 * 创建知识库数据集
 */
public static async createDataset(name: string): Promise<string> {
  try {
    Zotero.debug(`[RAGFlow] createDataset: 开始创建数据集，名称: ${name}`);
    Zotero.debug(`[RAGFlow] createDataset: 使用API地址: ${this.baseURL}`);
    Zotero.debug(`[RAGFlow] createDataset: API密钥长度: ${this.apiKey ? this.apiKey.length : 0}`);
    
    const requestBody = {
      name: name,
      language: "Chinese", // 可设置为 Chinese 或 English
      embedding_model: "BAAI/bge-large-zh-v1.5", // 使用中文嵌入模型
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
    };
    
    Zotero.debug(`[RAGFlow] createDataset: 请求体: ${JSON.stringify(requestBody)}`);
    
    const response = await fetch(`${this.baseURL}/api/v1/datasets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(requestBody)
    });
    
    // 检查HTTP状态
    if (!response.ok) {
      const errorText = await response.text();
      Zotero.debug(`[RAGFlow] createDataset: HTTP错误: ${response.status} ${response.statusText}`);
      Zotero.debug(`[RAGFlow] createDataset: 错误响应内容: ${errorText}`);
      throw new Error(`创建数据集HTTP错误: ${response.status} ${response.statusText}`);
    }
    
    const responseText = await response.text();
    Zotero.debug(`[RAGFlow] createDataset: 响应原始内容: ${responseText}`);
    
    let result;
    try {
      result = JSON.parse(responseText) as RAGFlowAPIResponse<DatasetResponse>;
    } catch (parseError) {
      Zotero.debug(`[RAGFlow] createDataset: JSON解析错误: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
      throw new Error(`JSON解析错误: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
    }
    
    Zotero.debug(`[RAGFlow] createDataset: 响应码: ${result.code}, 消息: ${result.message || "无"}`);
    
    if (result.code !== 0) {
      Zotero.debug(`[RAGFlow] createDataset: API错误: ${result.message}`);
      throw new Error(result.message || "创建知识库失败");
    }
    
    Zotero.debug(`[RAGFlow] createDataset: 数据集创建成功，ID: ${result.data.id}`);
    return result.data.id; // 返回数据集 ID
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    Zotero.debug(`[RAGFlow] createDataset: 捕获到错误: ${errorMessage}`);
    // 记录错误堆栈
    if (error instanceof Error && error.stack) {
      Zotero.debug(`[RAGFlow] createDataset: 错误堆栈: ${error.stack}`);
    }
    // 重新抛出带有更多上下文的错误
    throw new Error(`创建知识库'${name}'失败: ${errorMessage}`);
  }
}
  
  /**
 * 上传文件到 RAGFlow 知识库
 */
public static async uploadFiles(files: Array<{path: string, name: string, mimeType: string}>, collectionName: string): Promise<string> {
  try {
    // 1. 先创建知识库数据集
    Zotero.debug(`[RAGFlow] uploadFiles: 开始上传 ${files.length} 个文件`);
    Zotero.debug(`[RAGFlow] uploadFiles: 文件列表: ${files.map(f => f.name).join(', ')}`);
    Zotero.debug(`[RAGFlow] uploadFiles: 集合名称: ${collectionName}`);
    
    // 创建数据集
    Zotero.debug(`[RAGFlow] uploadFiles: 正在创建数据集...`);
    const datasetId = await this.createDataset(collectionName);
    Zotero.debug(`[RAGFlow] uploadFiles: 数据集创建成功，ID: ${datasetId}`);
    
    // 2. 逐个上传文件
    for (const file of files) {
      Zotero.debug(`[RAGFlow] uploadFiles: 开始处理文件: ${file.name}, 路径: ${file.path}`);
      
      try {
        // 创建XMLHttpRequest对象，它在Zotero环境中可用
        const xhr = new XMLHttpRequest();
        
        // 使用XMLHttpRequest来处理二进制文件上传
        xhr.open("POST", `${this.baseURL}/api/v1/datasets/${datasetId}/documents`);
        xhr.setRequestHeader("Authorization", `Bearer ${this.apiKey}`);
        
        // 使用变量和索引表示法来避免TypeScript错误
        const CC: any = Components.classes;
        const CI: any = Components.interfaces;
        
        // 创建表单数据对象
        const formDataPath = "@mozilla.org/files/formdata;1";
        const formData = CC[formDataPath].createInstance(CI.nsIFormData);
        
        // 获取文件对象
        Zotero.debug(`[RAGFlow] uploadFiles: 创建文件对象: ${file.path}`);
        const filePath = "@mozilla.org/file/local;1";
        const nsFile = CC[filePath].createInstance(CI.nsILocalFile || CI.nsIFile);
        nsFile.initWithPath(file.path);
        
        // 检查文件是否存在
        if (!nsFile.exists()) {
          throw new Error(`文件不存在: ${file.path}`);
        }
        
        // 添加文件到表单
        Zotero.debug(`[RAGFlow] uploadFiles: 将文件添加到表单: ${file.name}`);
        formData.append("file", nsFile, file.name);
        
        // 上传完成回调
        xhr.onload = function() {
          if (xhr.status !== 200) {
            Zotero.debug(`[RAGFlow] uploadFiles: HTTP错误: ${xhr.status} ${xhr.statusText}`);
          } else {
            Zotero.debug(`[RAGFlow] uploadFiles: 文件 ${file.name} 上传成功`);
          }
        };
        
        // 上传错误回调
        xhr.onerror = function() {
          Zotero.debug(`[RAGFlow] uploadFiles: 网络错误`);
        };
        
        // 发送请求
        Zotero.debug(`[RAGFlow] uploadFiles: 正在上传文件: ${file.name}`);
        xhr.send(formData);
        
        // 等待上传完成 - 一个简单的promise包装
        await new Promise((resolve, reject) => {
          xhr.onload = function() {
            if (xhr.status !== 200) {
              reject(new Error(`上传文件HTTP错误: ${xhr.status} ${xhr.statusText}`));
            } else {
              try {
                const result = JSON.parse(xhr.responseText);
                if (result.code !== 0) {
                  reject(new Error(result.message || `上传文件 ${file.name} 失败`));
                } else {
                  Zotero.debug(`[RAGFlow] uploadFiles: 文件 ${file.name} 上传成功`);
                  resolve(true);
                }
              } catch (e) {
                reject(new Error(`解析响应失败: ${e.message}`));
              }
            }
          };
          xhr.onerror = function() {
            reject(new Error('网络错误'));
          };
        });
        
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        Zotero.debug(`[RAGFlow] uploadFiles: 上传文件时出错: ${errorMessage}`);
        if (error instanceof Error && error.stack) {
          Zotero.debug(`[RAGFlow] uploadFiles: 错误堆栈: ${error.stack}`);
        }
        throw new Error(`上传文件 ${file.name} 时出错: ${errorMessage}`);
      }
    }
    
    // 3. 获取所有文档ID
    Zotero.debug(`[RAGFlow] uploadFiles: 正在获取文档ID列表...`);
    const documentIds = await this.getDocumentIds(datasetId);
    Zotero.debug(`[RAGFlow] uploadFiles: 获取到 ${documentIds.length} 个文档ID`);
    
    if (documentIds.length > 0) {
      // 4. 解析文档（开始处理文档）
      Zotero.debug(`[RAGFlow] uploadFiles: 开始解析文档...`);
      await this.parseDocuments(datasetId, documentIds);
      Zotero.debug(`[RAGFlow] uploadFiles: 文档解析请求已发送`);
    }
    
    // 5. 返回数据集ID作为知识库ID
    Zotero.debug(`[RAGFlow] uploadFiles: 上传过程完成，知识库ID: ${datasetId}`);
    return datasetId;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    Zotero.debug(`[RAGFlow] uploadFiles: 捕获到错误: ${errorMessage}`);
    // 记录错误堆栈
    if (error instanceof Error && error.stack) {
      Zotero.debug(`[RAGFlow] uploadFiles: 错误堆栈: ${error.stack}`);
    }
    // 重新抛出错误，以便上层函数可以处理
    throw error;
  }
}
  
  /**
   * 获取数据集中的文档 ID 列表
   */
  private static async getDocumentIds(datasetId: string): Promise<string[]> {
    try {
      const response = await fetch(
        `${this.baseURL}/api/v1/datasets/${datasetId}/documents?page=1&page_size=100`, 
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${this.apiKey}`
          }
        }
      );
      
      const result = (await response.json() as unknown) as RAGFlowAPIResponse<DocumentListResponse>;
      
      if (result.code !== 0) {
        throw new Error(result.message || "获取文档列表失败");
      }
      
      return result.data.items.map(doc => doc.id);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("获取文档列表失败:", errorMessage);
      throw error;
    }
  }
  
  /**
   * 解析文档（处理文档）
   */
  private static async parseDocuments(datasetId: string, documentIds: string[]): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/api/v1/datasets/${datasetId}/chunks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          document_ids: documentIds
        })
      });
      
      const result = (await response.json() as unknown) as RAGFlowAPIResponse;
      
      if (result.code !== 0) {
        throw new Error(result.message || "解析文档失败");
      }
      
      return true;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("解析文档失败:", errorMessage);
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
      const response = await fetch(`${this.baseURL}/api/v1/datasets/${datasetId}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`
        }
      });
      
      const result = (await response.json() as unknown) as RAGFlowAPIResponse<DatasetResponse>;
      
      if (result.code !== 0) {
        throw new Error(result.message || "获取数据集状态失败");
      }
      
      const dataset = result.data;
      const processed = dataset.chunk_count || 0;
      const total = dataset.document_count * 10; // 粗略估计每个文档约10个块
      const finished = dataset.status === "finished";
      
      return { processed, total, finished };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("获取数据集状态失败:", errorMessage);
      throw error;
    }
  }
  
  /**
   * 向 RAGFlow 发送问题并获取回答（通过检索 API）
   */
  public static async askQuestion(datasetId: string, question: string): Promise<string> {
    try {
      // 首先进行检索
      const retrievalResponse = await fetch(`${this.baseURL}/api/v1/retrieval`, {
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
      
      const retrievalResult = (await retrievalResponse.json() as unknown) as RAGFlowAPIResponse<RetrievalResponse>;
      
      if (retrievalResult.code !== 0) {
        throw new Error(retrievalResult.message || "检索失败");
      }
      
      // 检索结果为空，则返回提示信息
      if (retrievalResult.data.items.length === 0) {
        return "抱歉，我在知识库中找不到相关信息来回答这个问题。";
      }
      
      // 构建上下文
      const contexts = retrievalResult.data.items.map(item => item.content).join("\n\n");
      
      // 创建聊天完成（chat completion）请求
      const chatId = datasetId; // 使用数据集ID作为聊天ID
      const chatResponse = await fetch(`${this.baseURL}/api/v1/chats_openai/${chatId}/chat/completions`, {
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
      
      const chatResult = (await chatResponse.json() as unknown) as ChatCompletionResponse;
      
      if (chatResult.choices && chatResult.choices.length > 0) {
        return chatResult.choices[0].message.content;
      } else {
        throw new Error("获取回答失败，返回数据格式不正确");
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("获取回答失败:", errorMessage);
      throw error;
    }
  }
  
  /**
   * 获取数据集列表
   */
  public static async listDatasets(): Promise<Array<{id: string, name: string}>> {
    try {
      const response = await fetch(`${this.baseURL}/api/v1/datasets?page=1&page_size=100`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`
        }
      });
      
      const result = (await response.json() as unknown) as RAGFlowAPIResponse<{items: DatasetResponse[]}>;
      
      if (result.code !== 0) {
        throw new Error(result.message || "获取数据集列表失败");
      }
      
      return result.data.items.map(dataset => ({
        id: dataset.id,
        name: dataset.name
      }));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("获取数据集列表失败:", errorMessage);
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
        const response = await fetch(`${this.baseURL}/api/v1/datasets/${datasetId}`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${this.apiKey}`
          }
        });
        
        const result = (await response.json() as unknown) as RAGFlowAPIResponse<DatasetResponse>;
        
        if (result.code !== 0) {
          throw new Error(result.message || "获取数据集信息失败");
        }
        
        // 根据数据集状态返回
        if (result.data.status === "error") {
          return "failed";
        }
        
        return "processing";
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("获取知识库状态失败:", errorMessage);
      throw error;
    }
  }
}

