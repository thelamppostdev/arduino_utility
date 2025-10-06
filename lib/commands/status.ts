import type {Arguments, CommandBuilder, CommandModule} from 'yargs';
import {DaemonClient} from '../client/client';

interface StatusArguments {
  json?: boolean;
}

const statusBuilder: CommandBuilder = (yargs) =>
  yargs.options({
    json: {alias: 'j', type: 'boolean', default: false, description: "Output as JSON"},
  });

const statusCommand: CommandModule = {
  handler: async (argv: Arguments<StatusArguments>) => {
    try {
      const response = await DaemonClient.executeCommand('STATUS');
      
      if (response.success && response.data) {
        if (argv.json) {
          console.log(JSON.stringify(response.data, null, 2));
        } else {
          const status = response.data;
          console.log('Arduino Daemon Status:');
          console.log('');
          console.log('Daemon:');
          console.log(`  Running: ${status.daemon.running ? '✓' : '✗'}`);
          console.log(`  Clients: ${status.daemon.clients}`);
          console.log(`  Uptime: ${Math.floor(status.daemon.uptime)}s`);
          console.log('');
          console.log('Arduino:');
          console.log(`  Connected: ${status.arduino.connected ? '✓' : '✗'}`);
          console.log(`  Reconnect Attempts: ${status.arduino.reconnectAttempts}`);
          console.log(`  Is Reconnecting: ${status.arduino.isReconnecting ? 'Yes' : 'No'}`);
          console.log('');
          console.log('On-Air Monitor:');
          console.log(`  Mode: ${status.onAirMonitor.mode}`);
          console.log(`  Monitoring: ${status.onAirMonitor.monitoring ? '✓' : '✗'}`);
          console.log(`  Last Status: ${status.onAirMonitor.lastStatus === null ? 'Unknown' : 
            (status.onAirMonitor.lastStatus ? 'ON CALL' : 'AVAILABLE')}`);
          console.log(`  Check Interval: ${status.onAirMonitor.checkInterval}ms`);
        }
      } else {
        console.error(`✗ Error: ${response.message}`);
        process.exit(1);
      }
      
    } catch (error) {
      console.error(`✗ Failed to get status: ${error.message}`);
      console.error('Make sure the daemon is running with: cli daemon');
      process.exit(1);
    }
  },
  describe: 'Get status of the Arduino daemon',
  builder: statusBuilder,
  command: 'status'
};

export = statusCommand;