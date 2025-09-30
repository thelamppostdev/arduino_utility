import type {Arguments, CommandBuilder, CommandModule} from 'yargs';
import {DaemonServer} from '../daemon/server';
import {logger} from '../utils/logger';

interface DaemonArguments {
  debug?: boolean;
}

const daemonBuilder: CommandBuilder = (yargs) =>
  yargs.options({
    debug: {alias: 'D', type: 'boolean', default: false, description: "Enable debug logging"},
  });

const daemonCommand: CommandModule = {
  handler: async (argv: Arguments<DaemonArguments>) => {
    logger.info('Starting Arduino Daemon...');
    
    const daemon = new DaemonServer(argv.debug);
    
    try {
      await daemon.start();
      logger.info('Daemon started successfully');
      
      // Keep the process running
      process.on('SIGINT', async () => {
        logger.info('Received SIGINT, shutting down...');
        await daemon.shutdown();
        process.exit(0);
      });
      
      process.on('SIGTERM', async () => {
        logger.info('Received SIGTERM, shutting down...');
        await daemon.shutdown();
        process.exit(0);
      });
      
    } catch (error) {
      logger.error(`Failed to start daemon: ${error.message}`);
      process.exit(1);
    }
  },
  describe: 'Start the Arduino daemon server',
  builder: daemonBuilder,
  command: 'daemon'
};

export = daemonCommand;