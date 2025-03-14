/**
 * 统一的日志记录工具
 * 增强版: 包含函数调用位置信息
 */
export class Logger {
  private static readonly PREFIX = "[RAGFlow]";
  
  // 日志级别定义
  private static readonly LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
  };
  
  // 当前日志级别，可通过 setLogLevel 方法修改
  private static currentLevel = Logger.LEVELS.DEBUG;
  
  /**
   * 设置日志级别
   * @param level 日志级别: "debug" | "info" | "warn" | "error"
   */
  public static setLogLevel(level: "debug" | "info" | "warn" | "error"): void {
    const levelValue = this.LEVELS[level.toUpperCase()];
    if (levelValue !== undefined) {
      this.currentLevel = levelValue;
    }
  }
  
  /**
   * 获取调用者信息
   * @returns 包含调用函数、文件和行号的信息
   */
  private static getCallerInfo(): string {
    try {
      // 创建一个错误对象以获取调用栈
      const err = new Error();
      const stack = err.stack || '';
      
      // 解析调用栈，找到调用者信息
      const stackLines = stack.split('\n');
      
      // 我们需要找到调用Logger方法的那一行，通常是第4行（索引3）
      if (stackLines.length > 3) {
        const callerLine = stackLines[3].trim();
        
        // 使用正则表达式提取函数名和位置
        const match = callerLine.match(/at\s+([^\s]+)\s+\(([^:]+):(\d+):(\d+)\)/);
        if (match) {
          const [, functionName, filePath, line] = match;
          
          // 提取文件名 (不含路径)
          const fileName = filePath.split('\\').pop() || filePath;
          
          return `${fileName}:${line} [${functionName}]`;
        }
      }
    } catch (e) {
      // 解析调用者信息失败，返回默认值
      return "unknown";
    }
    
    return 'unknown';
  }
  
  /**
   * 记录信息日志
   * @param message 日志消息
   */
  public static info(message: string): void {
    if (this.currentLevel <= this.LEVELS.INFO) {
      const callerInfo = this.getCallerInfo();
      Zotero.debug(`${this.PREFIX} INFO: [${callerInfo}] ${message}`);
    }
  }
  
  /**
   * 记录错误日志
   * @param message 错误消息
   * @param error 可选的错误对象
   */
  public static error(message: string, error?: unknown): void {
    if (this.currentLevel <= this.LEVELS.ERROR) {
      const callerInfo = this.getCallerInfo();
      Zotero.debug(`${this.PREFIX} ERROR: [${callerInfo}] ${message}`);
      
      if (error) {
        if (error instanceof Error) {
          Zotero.debug(`${this.PREFIX} ERROR DETAILS: ${error.message}`);
          if (error.stack) {
            Zotero.debug(`${this.PREFIX} STACK: ${error.stack}`);
          }
        } else {
          Zotero.debug(`${this.PREFIX} ERROR DETAILS: ${String(error)}`);
        }
      }
    }
  }
  
  /**
   * 记录警告日志
   * @param message 警告消息
   */
  public static warn(message: string): void {
    if (this.currentLevel <= this.LEVELS.WARN) {
      const callerInfo = this.getCallerInfo();
      Zotero.debug(`${this.PREFIX} WARNING: [${callerInfo}] ${message}`);
    }
  }
  
  /**
   * 记录调试日志
   * @param message 调试消息
   */
  public static debug(message: string): void {
    if (this.currentLevel <= this.LEVELS.DEBUG) {
      const callerInfo = this.getCallerInfo();
      Zotero.debug(`${this.PREFIX} DEBUG: [${callerInfo}] ${message}`);
    }
  }
}