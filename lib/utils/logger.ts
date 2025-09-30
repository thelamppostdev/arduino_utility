import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG'
}

export class Logger {
  private logDir: string;
  private logFile: string;

  constructor(serviceName: string = 'arduino-daemon') {
    this.logDir = path.join(os.homedir(), 'Library', 'Logs', 'arduino-utility');
    this.logFile = path.join(this.logDir, `${serviceName}.log`);
    this.ensureLogDirectory();
  }

  private ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] ${level}: ${message}\n`;
  }

  private writeLog(level: LogLevel, message: string) {
    const formattedMessage = this.formatMessage(level, message);
    
    // Write to file
    fs.appendFileSync(this.logFile, formattedMessage);
    
    // Also log to console in development
    if (process.env.NODE_ENV !== 'production') {
      console.log(formattedMessage.trim());
    }
  }

  error(message: string) {
    this.writeLog(LogLevel.ERROR, message);
  }

  warn(message: string) {
    this.writeLog(LogLevel.WARN, message);
  }

  info(message: string) {
    this.writeLog(LogLevel.INFO, message);
  }

  debug(message: string) {
    this.writeLog(LogLevel.DEBUG, message);
  }

  getLogFile(): string {
    return this.logFile;
  }

  rotateLog() {
    if (fs.existsSync(this.logFile)) {
      const stats = fs.statSync(this.logFile);
      // Rotate if file is larger than 10MB
      if (stats.size > 10 * 1024 * 1024) {
        const rotatedFile = `${this.logFile}.${Date.now()}`;
        fs.renameSync(this.logFile, rotatedFile);
        this.info('Log file rotated');
      }
    }
  }
}

export const logger = new Logger();