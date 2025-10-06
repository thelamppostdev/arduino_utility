export interface DaemonRequest {
  type: 'ARDUINO' | 'STATUS' | 'PING' | 'CONTROL';
  command?: string;
  id?: string;
}

export interface DaemonResponse {
  success: boolean;
  message?: string;
  data?: any;
  id?: string;
}

export class Protocol {
  static createRequest(type: DaemonRequest['type'], command?: string, id?: string): string {
    const request: DaemonRequest = { type };
    if (command) request.command = command;
    if (id) request.id = id;
    return JSON.stringify(request) + '\n';
  }

  static createResponse(success: boolean, message?: string, data?: any, id?: string): string {
    const response: DaemonResponse = { success };
    if (message) response.message = message;
    if (data) response.data = data;
    if (id) response.id = id;
    return JSON.stringify(response) + '\n';
  }

  static parseMessage(message: string): DaemonRequest | DaemonResponse | null {
    try {
      return JSON.parse(message.trim());
    } catch (error) {
      return null;
    }
  }

  // Arduino command helpers
  static createArduinoCommand(command: string): string {
    return this.createRequest('ARDUINO', command);
  }

  static createStatusRequest(): string {
    return this.createRequest('STATUS');
  }

  static createPingRequest(): string {
    return this.createRequest('PING');
  }

  static createControlRequest(command: string): string {
    return this.createRequest('CONTROL', command);
  }
}

export const SOCKET_PATH = '/tmp/arduino-daemon.sock';