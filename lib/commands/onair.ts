import type {Arguments, CommandBuilder, CommandModule} from 'yargs';
import {DaemonClient} from '../client/client';

interface OnAirArguments {
  status: 'on' | 'off' | 'auto';
}

const onairBuilder: CommandBuilder = (yargs) =>
  yargs
    .positional('status', {
      describe: 'Set on-air status: on (red), off (green), auto (resume automatic detection)',
      type: 'string',
      choices: ['on', 'off', 'auto'],
      demandOption: true
    });

const onairCommand: CommandModule = {
  handler: async (argv: Arguments<OnAirArguments>) => {
    try {
      let command: string;
      
      switch (argv.status) {
        case 'on':
          command = 'onair-red';
          console.log('🔴 Manual override: ON CALL (red)');
          break;
        case 'off':
          command = 'onair-green';
          console.log('🟢 Manual override: AVAILABLE (green)');
          break;
        case 'auto':
          // This would need daemon support to resume auto-detection
          console.log('🤖 Resuming automatic detection...');
          // For now, just set to green and let auto-detection take over
          command = 'onair-green';
          break;
        default:
          console.error('Invalid status. Use: on, off, or auto');
          process.exit(1);
      }
      
      const response = await DaemonClient.executeCommand('ARDUINO', command);
      
      if (!response.success) {
        console.error(`✗ Error: ${response.message}`);
        process.exit(1);
      }
      
    } catch (error) {
      console.error(`✗ Failed to set on-air status: ${error.message}`);
      console.error('Make sure the daemon is running with: arduino-cli daemon');
      process.exit(1);
    }
  },
  describe: 'Manually control on-air status',
  builder: onairBuilder,
  command: 'onair <status>'
};

export = onairCommand;