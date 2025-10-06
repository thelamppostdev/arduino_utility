import { spawn } from 'child_process';
import { ArduinoManager } from './arduino-manager';
import { EventEmitter } from 'events';
import * as path from 'path';

export class OnAirMonitor extends EventEmitter {
  private isMonitoring = false;
  private manualOverride: 'on' | 'off' | null = null;
  private lastStatus: 'available' | 'on-call' = 'available';
  private arduinoManager: ArduinoManager;
  private cameraMonitorProcess: any = null;
  private onCall = false;

  constructor(arduinoManager: ArduinoManager) {
    super();
    this.arduinoManager = arduinoManager;
  }

  public start(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    console.log('🎥 Starting camera monitoring...');
    
    // Start with available status
    this.updateStatus('available');
    
    // Start the camera monitoring process
    this.startCameraMonitoring();
  }

  public stop(): void {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    console.log('🎥 Stopping camera monitoring...');
    
    if (this.cameraMonitorProcess) {
      this.cameraMonitorProcess.kill();
      this.cameraMonitorProcess = null;
    }
  }

  public setManualOverride(status: 'on' | 'off' | null): void {
    this.manualOverride = status;
    
    if (status === 'on') {
      this.updateStatus('on-call');
      console.log('🔴 Manual override: ON CALL (red)');
    } else if (status === 'off') {
      this.updateStatus('available');
      console.log('🟢 Manual override: AVAILABLE (green)');
    } else {
      console.log('🔄 Manual override disabled - returning to automatic detection');
    }
  }

  public getStatus(): { status: 'available' | 'on-call', manualOverride: boolean, monitoring: boolean, lastStatus: boolean, checkInterval: number, mode: 'on' | 'off' | 'auto' } {
    const mode: 'on' | 'off' | 'auto' = this.manualOverride === 'on' ? 'on' : (this.manualOverride === 'off' ? 'off' : 'auto');

    return {
      status: this.lastStatus,
      manualOverride: this.manualOverride !== null,
      monitoring: this.isMonitoring,
      lastStatus: this.lastStatus === 'on-call',
      checkInterval: 5000, // Default check interval in ms
      mode
    };
  }

  private startCameraMonitoring(): void {
    // Use the same camera detection approach that was working
    const scriptPath = path.join(__dirname, '../scripts/check_camera.sh');
    console.log(`🎥 Starting camera monitoring with script: ${scriptPath}`);
    
    this.cameraMonitorProcess = spawn('bash', [scriptPath]);

    this.cameraMonitorProcess.stdout.on('data', (data: Buffer) => {
      // Skip manual override
      if (this.manualOverride !== null) return;
      
      const logEntry = data.toString();
      console.log(`🎥 Camera log: ${logEntry.trim()}`);

      if (logEntry.includes("AppleH13CamIn")) {
        if (logEntry.includes("power_on_hardware")) {
          console.log("📹 Camera powered ON - setting red LED");
          if (!this.onCall) {
            this.onCall = true;
            this.updateStatus('on-call');
          }
        }
        if (logEntry.includes("power_off_hardware")) {
          console.log("📹 Camera powered OFF - setting green LED");
          if (this.onCall) {
            this.onCall = false;
            this.updateStatus('available');
          }
        }
      }
    });

    this.cameraMonitorProcess.stderr.on('data', (data: Buffer) => {
      console.error(`🎥 Camera monitor error: ${data.toString()}`);
    });

    this.cameraMonitorProcess.on('close', (code: number) => {
      console.log(`🎥 Camera monitor script exited with code ${code}`);
      
      // Restart if we're still monitoring and it wasn't manually stopped
      if (this.isMonitoring && code !== 0) {
        console.log('🔄 Restarting camera monitor...');
        setTimeout(() => this.startCameraMonitoring(), 2000);
      }
    });
  }

  private updateStatus(status: 'available' | 'on-call'): void {
    if (this.lastStatus === status) return;
    
    this.lastStatus = status;
    const command = status === 'on-call' ? 'onair-red' : 'onair-green';
    
    if (this.arduinoManager.write(command)) {
      console.log(`✅ Status updated: ${status.toUpperCase()}`);
      this.emit('statusChanged', status);
    } else {
      console.log(`❌ Failed to update status: ${status}`);
    }
  }

  // Allow manual override for testing
  setOnAirStatus(isOnAir: boolean): boolean {
    if (isOnAir) {
      this.setManualOverride('on');
    } else {
      this.setManualOverride('off');
    }
    return true;
  }
}