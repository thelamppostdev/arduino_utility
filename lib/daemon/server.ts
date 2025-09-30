import * as net from 'net';
import * as fs from 'fs';
import {ArduinoManager} from './arduino-manager';
import {OnAirMonitor} from './on-air-monitor';
import {logger} from '../utils/logger';
import {DaemonRequest, DaemonResponse, Protocol, SOCKET_PATH} from '../client/protocol';

export class DaemonServer {
  private server: net.Server;
  private arduino: ArduinoManager;
  private onAirMonitor: OnAirMonitor;
  private clients: Set<net.Socket> = new Set();
  private isRunning = false;

  constructor(debug: boolean = false) {
    this.arduino = new ArduinoManager(debug);
    this.onAirMonitor = new OnAirMonitor(this.arduino);
    this.server = net.createServer(this.handleClient.bind(this));
    
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.arduino.on('ready', () => {
      logger.info('Arduino connected and ready');
      this.onAirMonitor.start();
    });

    this.arduino.on('disconnected', () => {
      logger.warn('Arduino disconnected');
      this.onAirMonitor.stop();
    });

    this.arduino.on('reconnected', () => {
      logger.info('Arduino reconnected');
      this.onAirMonitor.start();
    });

    this.arduino.on('error', (error) => {
      logger.error(`Arduino error: ${error.message}`);
    });

    this.server.on('error', (error) => {
      logger.error(`Server error: ${error.message}`);
    });

    // Graceful shutdown
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());
  }

  private handleClient(socket: net.Socket): void {
    logger.debug('Client connected');
    this.clients.add(socket);

    let buffer = '';

    socket.on('data', (data) => {
      buffer += data.toString();
      
      // Process complete messages (ending with newline)
      let newlineIndex;
      while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
        const message = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);
        
        this.handleMessage(socket, message);
      }
    });

    socket.on('close', () => {
      logger.debug('Client disconnected');
      this.clients.delete(socket);
    });

    socket.on('error', (error) => {
      logger.error(`Client socket error: ${error.message}`);
      this.clients.delete(socket);
    });
  }

  private handleMessage(socket: net.Socket, message: string): void {
    const request = Protocol.parseMessage(message) as DaemonRequest;
    
    if (!request) {
      this.sendResponse(socket, false, 'Invalid message format');
      return;
    }

    logger.debug(`Received request: ${request.type}${request.command ? ` - ${request.command}` : ''}`);

    switch (request.type) {
      case 'ARDUINO':
        this.handleArduinoCommand(socket, request);
        break;
      case 'STATUS':
        this.handleStatusRequest(socket, request);
        break;
      case 'PING':
        this.sendResponse(socket, true, 'pong', null, request.id);
        break;
      default:
        this.sendResponse(socket, false, `Unknown command type: ${request.type}`, null, request.id);
    }
  }

  private handleArduinoCommand(socket: net.Socket, request: DaemonRequest): void {
    if (!request.command) {
      this.sendResponse(socket, false, 'Arduino command is required', null, request.id);
      return;
    }

    const success = this.arduino.write(request.command);
    this.sendResponse(
      socket, 
      success, 
      success ? 'Command sent' : 'Failed to send command to Arduino',
      null,
      request.id
    );
  }

  private handleStatusRequest(socket: net.Socket, request: DaemonRequest): void {
    const status = {
      daemon: {
        running: this.isRunning,
        clients: this.clients.size,
        uptime: process.uptime()
      },
      arduino: this.arduino.getStatus(),
      onAirMonitor: this.onAirMonitor.getStatus()
    };

    this.sendResponse(socket, true, 'Status retrieved', status, request.id);
  }

  private sendResponse(socket: net.Socket, success: boolean, message?: string, data?: any, id?: string): void {
    const response = Protocol.createResponse(success, message, data, id);
    socket.write(response);
  }

  async start(): Promise<void> {
    try {
      // Remove existing socket file if it exists
      if (fs.existsSync(SOCKET_PATH)) {
        fs.unlinkSync(SOCKET_PATH);
      }

      // Connect to Arduino first
      await this.arduino.connect();
      
      // Start the server
      return new Promise((resolve, reject) => {
        this.server.listen(SOCKET_PATH, () => {
          this.isRunning = true;
          logger.info(`Daemon server started on ${SOCKET_PATH}`);
          resolve();
        });

        this.server.on('error', reject);
      });
    } catch (error) {
      logger.error(`Failed to start daemon: ${error.message}`);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down daemon...');
    this.isRunning = false;

    // Stop monitoring
    this.onAirMonitor.stop();

    // Close all client connections
    for (const client of this.clients) {
      client.end();
    }
    this.clients.clear();

    // Close server
    return new Promise((resolve) => {
      this.server.close(() => {
        // Disconnect Arduino
        this.arduino.disconnect();

        // Remove socket file
        if (fs.existsSync(SOCKET_PATH)) {
          fs.unlinkSync(SOCKET_PATH);
        }

        logger.info('Daemon shutdown complete');
        resolve();
      });
    });
  }
}