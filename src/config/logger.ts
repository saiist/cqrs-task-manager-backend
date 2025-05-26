
export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
  }
  
  const logLevelMap: Record<string, LogLevel> = {
    debug: LogLevel.DEBUG,
    info: LogLevel.INFO,
    warn: LogLevel.WARN,
    error: LogLevel.ERROR
  };
  
  export class Logger {
    private static currentLevel: LogLevel = logLevelMap[process.env.LOG_LEVEL || 'info'];
  
    private static formatMessage(level: string, message: string, data?: any): string {
      const timestamp = new Date().toISOString();
      const baseMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
      
      if (data) {
        return `${baseMessage} ${JSON.stringify(data, null, 2)}`;
      }
      
      return baseMessage;
    }
  
    static debug(message: string, data?: any): void {
      if (this.currentLevel <= LogLevel.DEBUG) {
        console.log(this.formatMessage('debug', message, data));
      }
    }
  
    static info(message: string, data?: any): void {
      if (this.currentLevel <= LogLevel.INFO) {
        console.log(this.formatMessage('info', message, data));
      }
    }
  
    static warn(message: string, data?: any): void {
      if (this.currentLevel <= LogLevel.WARN) {
        console.warn(this.formatMessage('warn', message, data));
      }
    }
  
    static error(message: string, data?: any): void {
      if (this.currentLevel <= LogLevel.ERROR) {
        console.error(this.formatMessage('error', message, data));
      }
    }
  }