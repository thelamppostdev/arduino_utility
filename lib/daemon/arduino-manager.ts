import {SerialConnection} from "../serial/SerialConnection";
import {selectSerialPort} from "../serial/serial";
import {ReadlineParser} from "serialport";
import {logger} from "../utils/logger";
import {EventEmitter} from "events";

interface ArduinoManagerEvents {
  'ready': () => void;
  'disconnected': () => void;
  'reconnected': () => void;
  'error': (error: Error) => void;
  'data': (data: string) => void;
}

export class ArduinoManager extends EventEmitter {
  private connection: SerialConnection | null = null;
  private parser: ReadlineParser | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectInterval: NodeJS.Timeout | null = null;
  private isReconnecting = false;
  private debug: boolean;

  constructor(debug: boolean = false) {
    super();
    this.debug = debug;
  }

  async connect(): Promise<void> {
    try {
      logger.info('Attempting to connect to Arduino...');
      const serialPort = await selectSerialPort(false, this.debug);
      
      this.connection = new SerialConnection(serialPort, this.debug);
      this.parser = this.connection.port.pipe(new ReadlineParser({ delimiter: '\r\n' }));
      
      this.setupEventHandlers();
      logger.info('Arduino connection established');
      
    } catch (error) {
      logger.error(`Failed to connect to Arduino: ${error.message}`);
      throw error;
    }
  }

  private setupEventHandlers(): void {
    if (!this.connection || !this.parser) return;

    this.parser.on('data', (data: string) => {
      if (this.debug) {
        logger.debug(`RX: ${data}`);
      }

      if (data === "Initialized!") {
        logger.info("Arduino ready!");
        this.connection!.setReady = true;
        this.reconnectAttempts = 0;
        this.emit('ready');
      }

      this.emit('data', data);
    });

    this.connection.port.on('close', (err: any) => {
      if (err) {
        logger.error(`Arduino port closed with error: ${err.message}`);
      } else {
        logger.warn("Arduino port closed");
      }
      
      this.connection!.setReady = false;
      this.emit('disconnected');
      this.scheduleReconnect();
    });

    this.connection.port.on('error', (err: any) => {
      logger.error(`Arduino port error: ${err.message}`);
      this.emit('error', new Error(err.message));
    });
  }

  private scheduleReconnect(): void {
    if (this.isReconnecting || this.reconnectAttempts >= this.maxReconnectAttempts) {
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        logger.error(`Max reconnection attempts (${this.maxReconnectAttempts}) reached`);
      }
      return;
    }

    this.isReconnecting = true;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // Exponential backoff, max 30s
    
    logger.info(`Scheduling reconnection attempt ${this.reconnectAttempts + 1} in ${delay}ms`);
    
    this.reconnectInterval = setTimeout(async () => {
      try {
        this.reconnectAttempts++;
        await this.reconnect();
        this.isReconnecting = false;
        logger.info('Arduino reconnected successfully');
        this.emit('reconnected');
      } catch (error) {
        logger.error(`Reconnection attempt ${this.reconnectAttempts} failed: ${error.message}`);
        this.isReconnecting = false;
        this.scheduleReconnect();
      }
    }, delay);
  }

  private async reconnect(): Promise<void> {
    this.cleanup();
    await this.connect();
  }

  private cleanup(): void {
    if (this.reconnectInterval) {
      clearTimeout(this.reconnectInterval);
      this.reconnectInterval = null;
    }

    if (this.connection) {
      try {
        this.connection.port.removeAllListeners();
        if (this.connection.port.isOpen) {
          this.connection.port.close();
        }
      } catch (error) {
        logger.error(`Error during cleanup: ${error.message}`);
      }
    }

    if (this.parser) {
      this.parser.removeAllListeners();
    }
  }

  write(command: string): boolean {
    if (!this.connection || !this.connection.isReady) {
      logger.warn(`Cannot write to Arduino: not ready. Command: ${command}`);
      return false;
    }

    try {
      // Ensure command ends with semicolon for Arduino protocol
      const formattedCommand = command.endsWith(';') ? command : `${command};`;
      this.connection.write(formattedCommand);
      
      if (this.debug) {
        logger.debug(`TX: ${formattedCommand}`);
      }
      
      return true;
    } catch (error) {
      logger.error(`Failed to write to Arduino: ${error.message}`);
      return false;
    }
  }

  isReady(): boolean {
    return this.connection?.isReady || false;
  }

  getStatus(): object {
    return {
      connected: this.isReady(),
      reconnectAttempts: this.reconnectAttempts,
      isReconnecting: this.isReconnecting,
      maxReconnectAttempts: this.maxReconnectAttempts
    };
  }

  disconnect(): void {
    logger.info('Disconnecting from Arduino...');
    this.cleanup();
    this.removeAllListeners();
  }
}

export declare interface ArduinoManager {
  on<K extends keyof ArduinoManagerEvents>(event: K, listener: ArduinoManagerEvents[K]): this;
  emit<K extends keyof ArduinoManagerEvents>(event: K, ...args: Parameters<ArduinoManagerEvents[K]>): boolean;
}