// src/modules/ragflowService.ts
// 在文件顶部添加导入
import { Logger } from "./logger";


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
  docs: Array<{
    id: string;
    name: string;
    location: string;
    chunk_count: number;
    create_time: number;
    update_time: number;
    created_by: string;
    knowledgebase_id: string;
    parser_config?: {
      chunk_token_count: number;
      delimiter: string;
      layout_recognize: boolean;
      task_page_size: number;
    };
    chunk_method: string;
    process_begin_at: string | null;
    process_duation: number;
  }>;
  total: number;
}

// 修改 RetrievalResponse 接口定义
interface RetrievalResponse {
  chunks: Array<{
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
      
      // 过滤不支持的文件类型
      const supportedFiles = files.filter(file => {
        // 检查文件类型
        const isHTML = file.mimeType === "text/html" || 
                      file.path.toLowerCase().endsWith(".html") ||
                      file.path.toLowerCase().endsWith(".htm");
        
        const isSnapshot = file.name.includes("Snapshot") || file.path.includes("Snapshot");
        
        if (isHTML || isSnapshot) {
          Zotero.debug(`[RAGFlow] uploadFiles: 跳过不支持的HTML快照文件: ${file.name}`);
          return false;
        }
        
        // 其他支持的文件类型保留
        return true;
      });
      
      Zotero.debug(`[RAGFlow] uploadFiles: 过滤后剩余 ${supportedFiles.length} 个支持的文件`);
      
      if (supportedFiles.length === 0) {
        throw new Error("没有找到RAGFlow支持的文件类型。目前不支持HTML快照文件。");
      }
      
      // 创建数据集
      Zotero.debug(`[RAGFlow] uploadFiles: 正在创建数据集...`);
      const datasetId = await this.createDataset(collectionName);
      Zotero.debug(`[RAGFlow] uploadFiles: 数据集创建成功，ID: ${datasetId}`);
      
      // 2. 逐个上传文件 - 使用过滤后的supportedFiles
      for (const file of supportedFiles) {
        Zotero.debug(`[RAGFlow] uploadFiles: 开始处理文件: ${file.name}, 路径: ${file.path}`);
        
        try {
          // 读取文件内容
          Zotero.debug(`[RAGFlow] uploadFiles: 正在读取文件内容: ${file.name}`);
          const fileContent = await Zotero.File.getBinaryContentsAsync(file.path);
          Zotero.debug(`[RAGFlow] uploadFiles: 文件内容读取成功，大小: ${fileContent.length} 字节`);
          
          // 使用fetch API上传文件
          Zotero.debug(`[RAGFlow] uploadFiles: 正在准备上传请求...`);
          
          // 构建表单数据 - 使用手动方法而非FormData
          const boundary = '----WebKitFormBoundary' + Math.random().toString(16).slice(2);
          
          // 构建请求头部
          const headers = new Headers();
          headers.append('Authorization', `Bearer ${this.apiKey}`);
          headers.append('Content-Type', `multipart/form-data; boundary=${boundary}`);
          
          // 构建请求主体 - 手动构建multipart/form-data
          let requestBody = `--${boundary}\r\n`;
          requestBody += `Content-Disposition: form-data; name="file"; filename="${file.name}"\r\n`;
          requestBody += `Content-Type: ${file.mimeType}\r\n\r\n`;
          
          // 将请求头和文件内容转换为Uint8Array
          const encoder = new TextEncoder();
          const headerBytes = encoder.encode(requestBody);
          const footerBytes = encoder.encode(`\r\n--${boundary}--\r\n`);
          
          // 将文件内容转换为Uint8Array
          const contentBytes = new Uint8Array(fileContent.length);
          for (let i = 0; i < fileContent.length; i++) {
            contentBytes[i] = fileContent.charCodeAt(i) & 0xff;
          }
          
          // 合并头部、文件内容和尾部
          const body = new Uint8Array(
            headerBytes.length + contentBytes.length + footerBytes.length
          );
          body.set(headerBytes, 0);
          body.set(contentBytes, headerBytes.length);
          body.set(footerBytes, headerBytes.length + contentBytes.length);
          
          // 使用XMLHttpRequest发送，因为fetch可能对二进制数据处理有问题
          Zotero.debug(`[RAGFlow] uploadFiles: 开始上传文件: ${file.name}`);
          
          await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', `${this.baseURL}/api/v1/datasets/${datasetId}/documents`);
            xhr.setRequestHeader('Authorization', `Bearer ${this.apiKey}`);
            xhr.setRequestHeader('Content-Type', `multipart/form-data; boundary=${boundary}`);
            
            xhr.onload = function() {
              if (xhr.status === 200) {
                try {
                  const response = JSON.parse(xhr.responseText);
                  if (response.code === 0) {
                    Zotero.debug(`[RAGFlow] uploadFiles: 文件 ${file.name} 上传成功`);
                    resolve(response);
                  } else {
                    // 处理API错误，如不支持的文件类型
                    if (response.message && response.message.includes("This type of file has not been supported yet")) {
                      Zotero.debug(`[RAGFlow] uploadFiles: 文件类型不支持: ${file.name} (${file.mimeType})`);
                      reject(new Error(`文件类型不支持: ${file.name}`));
                    } else {
                      reject(new Error(response.message || `上传文件失败: API错误`));
                    }
                  }
                } catch (e) {
                  const errorMessage = e instanceof Error ? e.message : String(e);
                  reject(new Error(`解析响应失败: ${errorMessage}`));
                }
              } else {
                reject(new Error(`上传文件HTTP错误: ${xhr.status} ${xhr.statusText}`));
              }
            };
            
            xhr.onerror = function() {
              reject(new Error('网络错误'));
            };
            
            // 发送二进制数据
            xhr.send(body);
          });
          
          Zotero.debug(`[RAGFlow] uploadFiles: 文件 ${file.name} 上传完成`);
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          
          // 如果是不支持的文件类型，则记录但继续处理其他文件
          if (errorMessage.includes("文件类型不支持") || 
              errorMessage.includes("This type of file has not been supported yet")) {
            Zotero.debug(`[RAGFlow] uploadFiles: 跳过不支持的文件类型: ${file.name}`);
            continue;
          }
          
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
      
      if (documentIds.length === 0) {
        throw new Error("没有可处理的文档。所有上传的文件类型可能均不被支持。");
      }
      
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
      Zotero.debug(`[RAGFlow] getDocumentIds: 开始获取数据集 ${datasetId} 的文档列表`);
      
      const url = `${this.baseURL}/api/v1/datasets/${datasetId}/documents?page=1&page_size=100`;
      Zotero.debug(`[RAGFlow] getDocumentIds: 请求URL: ${url}`);
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`
        }
      });
      
      // 检查HTTP响应状态
      if (!response.ok) {
        const errorText = await response.text();
        Zotero.debug(`[RAGFlow] getDocumentIds: HTTP错误: ${response.status} ${response.statusText}`);
        Zotero.debug(`[RAGFlow] getDocumentIds: 错误响应内容: ${errorText}`);
        throw new Error(`获取文档列表HTTP错误: ${response.status} ${response.statusText}`);
      }
      
      // 获取响应文本并解析
      const responseText = await response.text();
      Zotero.debug(`[RAGFlow] getDocumentIds: 响应原始内容: ${responseText}`);
      
      let result;
      try {
        result = JSON.parse(responseText) as RAGFlowAPIResponse<DocumentListResponse>;
      } catch (parseError) {
        Zotero.debug(`[RAGFlow] getDocumentIds: JSON解析错误: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
        throw new Error(`JSON解析错误: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
      }
      
      // 检查API响应码
      Zotero.debug(`[RAGFlow] getDocumentIds: 响应码: ${result.code}, 消息: ${result.message || "无"}`);
      
      if (result.code !== 0) {
        Zotero.debug(`[RAGFlow] getDocumentIds: API错误: ${result.message}`);
        throw new Error(result.message || "获取文档列表失败");
      }
      
      // 注意这里的修改: 使用 data.docs 而不是 data.items
      if (!result.data || !result.data.docs || !Array.isArray(result.data.docs)) {
        Zotero.debug(`[RAGFlow] getDocumentIds: 响应数据结构不正确: ${JSON.stringify(result.data)}`);
        throw new Error("获取文档列表失败: 响应数据结构不正确");
      }
      
      // 从docs数组中提取每个文档的id
      const documentIds = result.data.docs.map(doc => doc.id);
      Zotero.debug(`[RAGFlow] getDocumentIds: 获取到 ${documentIds.length} 个文档ID: ${documentIds.join(', ')}`);
      
      return documentIds;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Zotero.debug(`[RAGFlow] getDocumentIds: 捕获到错误: ${errorMessage}`);
      // 记录错误堆栈
      if (error instanceof Error && error.stack) {
        Zotero.debug(`[RAGFlow] getDocumentIds: 错误堆栈: ${error.stack}`);
      }
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
  public static async askQuestion(datasetId: string, question: string): Promise<{answer: string, sources: Array<{content: string, document_name: string}>}> {
    try {
      Logger.info(`向知识库 ${datasetId} 发送问题: ${question}`);
      
      // 首先进行检索
      Logger.info(`调用检索API: ${this.baseURL}/api/v1/retrieval`);
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
      
      // 获取并记录原始响应内容
      const responseText = await retrievalResponse.text();
      Logger.debug(`检索API原始响应: ${responseText.substring(0, 200)}...`);
      
      let retrievalResult;
      try {
        retrievalResult = JSON.parse(responseText) as RAGFlowAPIResponse<RetrievalResponse>;
      } catch (parseError) {
        Logger.error(`检索API返回内容解析失败: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
        throw new Error(`检索结果解析失败: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
      }
      
      if (retrievalResult.code !== 0) {
        Logger.error(`检索API返回错误: ${retrievalResult.message}`);
        throw new Error(retrievalResult.message || "检索失败");
      }
      
      // 检查响应数据结构
      if (!retrievalResult.data || !retrievalResult.data.chunks) {
        Logger.error(`检索API返回的数据结构异常: ${JSON.stringify(retrievalResult)}`);
        throw new Error("检索API返回的数据结构不符合预期");
      }
      
      Logger.info(`检索结果: ${retrievalResult.data.chunks.length} 个匹配项`);
      
      // 检索结果为空，则返回提示信息
      if (retrievalResult.data.chunks.length === 0) {
        return {
          answer: "抱歉，我在知识库中找不到相关信息来回答这个问题。",
          sources: []
        };
      }
      
      // 构建上下文
      const contexts = retrievalResult.data.chunks.map(item => item.content).join("\n\n");
      
      // 准备来源信息
      const sources = retrievalResult.data.chunks.map(item => {
        // 查找文档名称
        const docInfo = retrievalResult.data.doc_aggs.find(doc => doc.doc_id === item.document_id);
        const docName = docInfo ? docInfo.doc_name : "未知文档";
        
        return {
          content: item.content,
          document_name: docName
        };
      });
      
      Logger.info(`检索到 ${sources.length} 个参考来源`);
      
      // 创建聊天完成（chat completion）请求
      const chatId = datasetId; // 使用数据集ID作为聊天ID
      Logger.info(`调用聊天API: ${this.baseURL}/api/v1/chats_openai/${chatId}/chat/completions`);
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
        Logger.info(`成功获取到回答，长度: ${chatResult.choices[0].message.content.length} 字符`);
        return {
          answer: chatResult.choices[0].message.content,
          sources: sources
        };
      } else {
        Logger.error("获取回答失败，返回数据格式不正确", chatResult);
        throw new Error("获取回答失败，返回数据格式不正确");
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logger.error(`获取回答失败: ${errorMessage}`, error);
      throw error;
    }
  }
  
  /**
 * 获取知识库列表
 */
  public static async listDatasets(): Promise<Array<{id: string, name: string}>> {
    try {
      Logger.info("开始获取知识库列表");
      
      const response = await fetch(`${this.baseURL}/api/v1/datasets?page=1&page_size=100`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`
        }
      });
      
      const result = (await response.json() as unknown) as RAGFlowAPIResponse<DatasetResponse[]>;
      
      if (result.code !== 0) {
        Logger.error(`获取知识库列表API返回错误: ${result.message}`);
        throw new Error(result.message || "获取数据集列表失败");
      }
      
      Logger.info(`成功获取到 ${result.data.length} 个知识库`);
      return result.data.map(dataset => ({
        id: dataset.id,
        name: dataset.name
      }));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logger.error("获取知识库列表失败", error);
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

