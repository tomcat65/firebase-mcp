declare module '../utils/logger.js' {
  export enum LogLevel {
    DEBUG = 'debug',
    INFO = 'info',
    WARN = 'warn',
    ERROR = 'error'
  }

  export interface Logger {
    debug(message: string, data?: any): void;
    info(message: string, data?: any): void;
    warn(message: string, data?: any): void;
    error(message: string, data?: any): void;
    getLogs(): LogEntry[];
    getLogsByLevel(level: LogLevel): LogEntry[];
    clearLogs(): void;
  }

  export interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    data?: any;
  }

  export const logger: Logger;
} 