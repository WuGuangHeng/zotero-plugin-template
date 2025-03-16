import { config } from "../../package.json";
import { Logger } from "./logger";

/**
 * 聊天历史记录条目接口
 */
export interface ChatHistoryEntry {
  question: string;
  answer: string;
  sources: Array<{content: string, document_name: string}>;
  timestamp: string;
}

/**
 * 存储管理器 - 负责处理聊天历史等数据的持久化存储
 */
export class StorageManager {
  /**
   * 存储目录路径
   */
  private static get storageDirectory(): string {
    return Zotero.getZoteroDirectory().path;
  }
  
  /**
   * 历史记录目录路径
   */
  private static get historyDirectory(): string {
    const path = `${this.storageDirectory}/ragflow-history`;
    // 确保目录存在 - 使用正确的Zotero File API
    try {
      // 创建目录（如果不存在）
      Zotero.File.createDirectoryIfMissing(path);
      Logger.info(`确保历史记录目录存在: ${path}`);
    } catch (e) {
      Logger.error(`创建历史记录目录失败: ${e}`);
    }
    return path;
  }
  
  /**
   * 历史记录文件路径
   */
  private static get historyFilePath(): string {
    return `${this.historyDirectory}/qa-history.json`;
  }
  
  /**
   * 保存问答历史记录
   * @param question 问题
   * @param answer 回答
   * @param sources 参考来源
   */
  public static async saveQuestionAnswerHistory(
    question: string, 
    answer: string, 
    sources?: Array<{content: string, document_name: string}>
  ): Promise<void> {
    try {
      Logger.info("开始保存问答历史记录");
      
      // 读取现有记录
      const history = await this.getQuestionAnswerHistory();
      
      // 添加新记录
      history.unshift({
        question,
        answer,
        sources: sources || [],
        timestamp: new Date().toISOString()
      });
      
      // 限制历史记录数量（保留最近100条）
      if (history.length > 100) {
        history.length = 100;
      }
      
      // 写入文件
      await Zotero.File.putContentsAsync(
        this.historyFilePath,
        JSON.stringify(history, null, 2)
      );
      
      Logger.info("问答历史记录保存成功");
    } catch (error) {
      Logger.error("保存问答历史记录失败", error);
    }
  }
  
  /**
   * 获取问答历史记录
   * @returns 历史记录数组
   */
  public static async getQuestionAnswerHistory(): Promise<ChatHistoryEntry[]> {
    try {
      // 使用正确的API检查文件是否存在
      const fileExists = await OS.File.exists(this.historyFilePath);
      
      if (!fileExists) {
        Logger.info("历史记录文件不存在，返回空列表");
        return [];
      }
      
      // 读取文件内容
      const contentRaw = await Zotero.File.getContentsAsync(this.historyFilePath);
      
      // 确保内容是字符串类型
      let contentStr: string;
      if (typeof contentRaw === 'string') {
        contentStr = contentRaw;
      } else if (contentRaw instanceof Uint8Array) {
        // 如果是 Uint8Array，转换为字符串
        const decoder = new TextDecoder('utf-8');
        contentStr = decoder.decode(contentRaw);
      } else if (contentRaw) {
        // 如果是其他不为null的值，尝试字符串转换
        contentStr = String(contentRaw);
      } else {
        // 如果为null或undefined，返回空数组
        Logger.warn("历史记录文件内容为空");
        return [];
      }
      
      // 解析JSON
      try {
        const history = JSON.parse(contentStr);
        return Array.isArray(history) ? history : [];
      } catch (parseError) {
        Logger.error("解析历史记录JSON失败", parseError);
        return [];
      }
    } catch (error) {
      Logger.error("获取问答历史记录失败", error);
      return [];
    }
  }
  
  /**
   * 清除所有问答历史记录
   */
  public static async clearQuestionAnswerHistory(): Promise<boolean> {
    try {
      // 使用正确的API检查文件是否存在
      const fileExists = await OS.File.exists(this.historyFilePath);
      
      if (fileExists) {
        await OS.File.remove(this.historyFilePath);
        Logger.info("已清除问答历史记录");
      }
      return true;
    } catch (error) {
      Logger.error("清除问答历史记录失败", error);
      return false;
    }
  }
}