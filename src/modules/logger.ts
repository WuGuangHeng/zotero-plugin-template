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
    ERROR: 3,
  };

  // 当前日志级别，可通过 setLogLevel 方法修改
  private static currentLevel = Logger.LEVELS.DEBUG;

  /**
   * 设置日志级别
   * @param level 日志级别: "debug" | "info" | "warn" | "error"
   */
  public static setLogLevel(level: "debug" | "info" | "warn" | "error"): void {
    // 使用类型断言解决类型检查问题
    const upperLevel = level.toUpperCase() as keyof typeof Logger.LEVELS;
    const levelValue = this.LEVELS[upperLevel];

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
      const stack = err.stack || "";

      // 调试: 输出完整堆栈以便分析格式
      // Zotero.debug(`${this.PREFIX} DEBUG STACK: ${stack}`);

      // 解析调用栈，找到调用者信息
      const stackLines = stack.split("\n");

      // 跳过前几行找到真正的调用者
      // 第0行通常是 "Error"
      // 第1行是当前 getCallerInfo 方法
      // 第2行是 Logger 的具体方法 (info/debug 等)
      // 第3行才是真正的调用者
      const callerLineIndex = 3;

      // 检查堆栈深度是否足够
      if (stackLines.length <= callerLineIndex) {
        return "stack-too-shallow";
      }

      // 获取调用者行并清除前后空白
      const callerLine = stackLines[callerLineIndex].trim();

      // 尝试多种正则表达式匹配不同的堆栈格式

      // 格式1: "at FunctionName (file:line:column)"
      let match = callerLine.match(/at\s+([^\s]+)\s+\(([^:]+):(\d+):(\d+)\)/);
      if (match) {
        const [, functionName, filePath, line] = match;
        const fileName = this.extractFileName(filePath);
        return `${fileName}:${line} [${functionName}]`;
      }

      // 格式2: "at file:line:column"
      match = callerLine.match(/at\s+([^:]+):(\d+):(\d+)/);
      if (match) {
        const [, filePath, line] = match;
        const fileName = this.extractFileName(filePath);
        return `${fileName}:${line} [anonymous]`;
      }

      // 格式3: "at Object.FunctionName (file:line:column)"
      match = callerLine.match(
        /at\s+Object\.([^\s]+)\s+\(([^:]+):(\d+):(\d+)\)/,
      );
      if (match) {
        const [, functionName, filePath, line] = match;
        const fileName = this.extractFileName(filePath);
        return `${fileName}:${line} [${functionName}]`;
      }

      // 如果没有匹配，返回原始调用行以便诊断
      return `unknown-format: ${callerLine}`;
    } catch (e) {
      // 解析调用者信息失败，返回错误信息
      return `parse-error: ${e instanceof Error ? e.message : String(e)}`;
    }
  }

  /**
   * 从文件路径中提取文件名
   * @param filePath 文件路径
   * @returns 文件名
   */
  private static extractFileName(filePath: string): string {
    // 处理 Windows 和 Unix 风格的路径
    const parts = filePath.split(/[/\\]/);
    return parts[parts.length - 1] || filePath;
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
