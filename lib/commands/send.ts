import type {Arguments, CommandBuilder, CommandModule} from 'yargs';
import {DaemonClient} from '../client/client';

interface SendArguments {
  command: string;
  debug?: boolean;
}

const sendBuilder: CommandBuilder = (yargs) =>
  yargs
    .positional('command', {
      describe: 'Arduino command to send (e.g., "onair-red", "ring-blue-pulse")',
      type: 'string',
      demandOption: true
    })
    .options({
      debug: {alias: 'D', type: 'boolean', default: false, description: "Enable debug output"},
    });

const sendCommand: CommandModule = {
  handler: async (argv: Arguments<SendArguments>) => {
    try {
      const response = await DaemonClient.executeCommand('ARDUINO', argv.command);
      
      if (response.success) {
        if (argv.debug) {
          console.log('✓ Command sent successfully');
        }
      } else {
        console.error(`✗ Error: ${response.message}`);
        process.exit(1);
      }
      
    } catch (error) {
      console.error(`✗ Failed to send command: ${error.message}`);
      console.error('Make sure the daemon is running with: cli daemon');
      process.exit(1);
    }
  },
  describe: 'Send a command to the Arduino daemon',
  builder: sendBuilder,
  command: 'send <command>'
};

export = sendCommand;