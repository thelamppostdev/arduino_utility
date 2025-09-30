import type {Arguments, CommandBuilder, CommandModule} from 'yargs';
import * as readline from "readline";
import {DaemonClient} from "../client/client";
import {ITermArguments} from "../utils/Interfaces";

const termBuilder: CommandBuilder = (yargs) =>
  yargs.options({
    debug: {alias: 'D', type: 'boolean', default: false, description: "Debugging on/off"},
  })

const termCommand: CommandModule = {
  handler: async (argv: Arguments<ITermArguments>) => {
    console.log('Arduino Terminal Client');
    console.log('Commands: onair-red, onair-blue, ring-color-animation, exit');
    console.log('Example: onair-red, ring-purple-pulse, ring-green-fire');
    console.log('');

    let client: DaemonClient | null = null;

    try {
      client = new DaemonClient();
      await client.connect();
      console.log('✓ Connected to daemon');
    } catch (error) {
      console.error(`✗ Failed to connect to daemon: ${error.message}`);
      console.error('Make sure the daemon is running with: cli daemon');
      process.exit(1);
    }

    const terminalRead = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: 'arduino> '
    });

    terminalRead.prompt();

    terminalRead.on('line', async (input: string) => {
      const command = input.trim();
      
      if (command === "exit") {
        terminalRead.close();
        if (client) client.disconnect();
        process.exit(0);
      } else if (command === "status") {
        try {
          const response = await client!.getStatus();
          if (response.success) {
            console.log('Daemon Status:', JSON.stringify(response.data, null, 2));
          } else {
            console.error(`Error: ${response.message}`);
          }
        } catch (error) {
          console.error(`Failed to get status: ${error.message}`);
        }
      } else if (command.length > 0) {
        try {
          const response = await client!.sendArduinoCommand(command);
          if (response.success) {
            if (argv.debug) {
              console.log('✓ Command sent');
            }
          } else {
            console.error(`Error: ${response.message}`);
          }
        } catch (error) {
          console.error(`Failed to send command: ${error.message}`);
        }
      }
      
      terminalRead.prompt();
    });

    terminalRead.on('close', () => {
      console.log('Goodbye!');
      if (client) client.disconnect();
      process.exit(0);
    });
  },
  describe: 'Interactive terminal client for Arduino daemon',
  builder: termBuilder,
  command: 'term'
}

export = termCommand;
