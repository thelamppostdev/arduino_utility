import * as net from 'net';
import {Protocol, SOCKET_PATH, DaemonResponse} from './protocol';
import {logger} from '../utils/logger';

export class DaemonClient {
  private socket: net.Socket | null = null;
  private connectionTimeout = 5000; // 5 seconds

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = net.createConnection(SOCKET_PATH);
      
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, this.connectionTimeout);

      this.socket.on('connect', () => {
        clearTimeout(timeout);
        resolve();
      });

      this.socket.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  async sendCommand(type: 'ARDUINO' | 'STATUS' | 'PING' | 'CONTROL', command?: string): Promise<DaemonResponse> {
    if (!this.socket) {
      throw new Error('Not connected to daemon');
    }

    return new Promise((resolve, reject) => {
      const requestId = Math.random().toString(36).substring(7);
      const request = Protocol.createRequest(type, command, requestId);
      
      let buffer = '';
      const onData = (data: Buffer) => {
        buffer += data.toString();
        
        let newlineIndex;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          const message = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          
          const response = Protocol.parseMessage(message) as DaemonResponse;
          if (response && response.id === requestId) {
            if (this.socket) {
              this.socket.removeListener('data', onData);
            }
            clearTimeout(timeout);
            resolve(response);
            return;
          }
        }
      };

      this.socket.on('data', onData);
      
      // Set timeout for response
      const timeout = setTimeout(() => {
        if (this.socket) {
          this.socket.removeListener('data', onData);
        }
        reject(new Error('Response timeout'));
      }, this.connectionTimeout);

      this.socket.write(request, (error) => {
        if (error) {
          clearTimeout(timeout);
          if (this.socket) {
            this.socket.removeListener('data', onData);
          }
          reject(error);
        }
      });
    });
  }

  async sendArduinoCommand(command: string): Promise<DaemonResponse> {
    return this.sendCommand('ARDUINO', command);
  }

  async getStatus(): Promise<DaemonResponse> {
    return this.sendCommand('STATUS');
  }

  async ping(): Promise<DaemonResponse> {
    return this.sendCommand('PING');
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.end();
      this.socket = null;
    }
  }

  // Static helper method for one-off commands
  static async executeCommand(type: 'ARDUINO' | 'STATUS' | 'PING' | 'CONTROL', command?: string): Promise<DaemonResponse> {
    const client = new DaemonClient();
    try {
      await client.connect();
      const response = await client.sendCommand(type, command);
      return response;
    } finally {
      client.disconnect();
    }
  }
}