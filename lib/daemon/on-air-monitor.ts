import {ArduinoManager} from "./arduino-manager";
import {logger} from "../utils/logger";
import {exec} from "child_process";
import {promisify} from "util";

const execAsync = promisify(exec);

export class OnAirMonitor {
  private arduino: ArduinoManager;
  private isMonitoring = false;
  private monitorInterval: NodeJS.Timeout | null = null;
  private lastOnAirStatus: boolean | null = null;
  private checkIntervalMs = 5000; // Check every 5 seconds

  constructor(arduino: ArduinoManager) {
    this.arduino = arduino;
  }

  start(): void {
    if (this.isMonitoring) {
      logger.warn('On-air monitoring is already running');
      return;
    }

    logger.info('Starting on-air monitoring');
    this.isMonitoring = true;
    
    // Start monitoring immediately and then at intervals
    this.checkOnAirStatus();
    this.monitorInterval = setInterval(() => {
      this.checkOnAirStatus();
    }, this.checkIntervalMs);
  }

  stop(): void {
    if (!this.isMonitoring) {
      return;
    }

    logger.info('Stopping on-air monitoring');
    this.isMonitoring = false;
    
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
  }

  private async checkOnAirStatus(): Promise<void> {
    try {
      const isOnCall = await this.detectCallStatus();
      
      // Only send command if status changed
      if (isOnCall !== this.lastOnAirStatus) {
        const command = isOnCall ? 'onair-red' : 'onair-blue';
        const success = this.arduino.write(command);
        
        if (success) {
          logger.info(`On-air status changed: ${isOnCall ? 'ON CALL' : 'AVAILABLE'}`);
          this.lastOnAirStatus = isOnCall;
        } else {
          logger.warn(`Failed to send on-air command: ${command}`);
        }
      }
    } catch (error) {
      logger.error(`Error checking on-air status: ${error.message}`);
    }
  }

  private async detectCallStatus(): Promise<boolean> {
    try {
      // Check for common video call applications on macOS
      const { stdout } = await execAsync('ps aux | grep -E "(zoom|teams|webex|meet|facetime|skype|discord)" | grep -v grep | wc -l');
      const runningApps = parseInt(stdout.trim());
      
      if (runningApps > 0) {
        // Additional check for camera usage (more reliable indicator)
        try {
          const { stdout: cameraCheck } = await execAsync('lsof | grep "AppleCamera\\|VDCAssistant" | wc -l');
          const cameraInUse = parseInt(cameraCheck.trim());
          return cameraInUse > 0;
        } catch (cameraError) {
          // Fallback to just process detection if camera check fails
          logger.debug('Camera check failed, using process detection only');
          return runningApps > 0;
        }
      }
      
      return false;
    } catch (error) {
      logger.error(`Error detecting call status: ${error.message}`);
      return false;
    }
  }

  getStatus(): object {
    return {
      monitoring: this.isMonitoring,
      lastStatus: this.lastOnAirStatus,
      checkInterval: this.checkIntervalMs
    };
  }

  // Allow manual override for testing
  setOnAirStatus(isOnAir: boolean): boolean {
    const command = isOnAir ? 'onair-red' : 'onair-blue';
    const success = this.arduino.write(command);
    
    if (success) {
      logger.info(`Manual on-air status set: ${isOnAir ? 'ON CALL' : 'AVAILABLE'}`);
    }
    
    return success;
  }
}