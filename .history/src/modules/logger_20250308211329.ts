/**
 * 统一的日志记录工具
 */
export class Logger {
  private static readonly PREFIX = "[RAGFlow]";
  
  /**
   * 记录信息日志
   * @param message 日志消息
   */
  public static info(message: string): void {
    Zotero.debug(`${this.PREFIX} INFO: ${message}`);
  }
  
  /**
   * 记录错误日志
   * @param message 错误消息
   * @param error 可选的错误对象
   */
  public static error(message: string, error?: unknown): void {
    Zotero.debug(`${this.PREFIX} ERROR: ${message}`);
    
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
  
  /**
   * 记录警告日志
   * @param message 警告消息
   */
  public static warn(message: string): void {
    Zotero.debug(`${this.PREFIX} WARNING: ${message}`);
  }
  
  /**
   * 记录调试日志
   * @param message 调试消息
   */
  public static debug(message: string): void {
    Zotero.debug(`${this.PREFIX} DEBUG: ${message}`);
  }
}