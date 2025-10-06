import type {Arguments, CommandBuilder, CommandModule} from 'yargs';
import {execSync} from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import {DaemonClient} from '../client/client';

interface RestartArguments {
  build?: boolean;
  wait?: number;
}

const restartBuilder: CommandBuilder = (yargs) =>
  yargs.options({
    build: { type: 'boolean', default: false, describe: 'Run npm run build before restarting' },
    wait: { type: 'number', default: 2000, describe: 'Milliseconds to wait after loading the LaunchAgent' }
  });

const restartCommand: CommandModule = {
  command: 'restart',
  describe: 'Restart the Arduino daemon (unload/load LaunchAgent). Does not require daemon socket.',
  builder: restartBuilder,
  handler: async (argv: Arguments<RestartArguments>) => {
    const plistName = 'com.thelamppostdev.arduino-daemon.plist';
    const plistPath = `${os.homedir()}/Library/LaunchAgents/${plistName}`;
    const socketPath = '/tmp/arduino-daemon.sock';

    console.log(`Restarting Arduino daemon using plist: ${plistPath}`);

    // First, try to request a graceful shutdown via the daemon socket
    let didControl = false;
    try {
      console.log('Attempting socket-based shutdown (CONTROL shutdown)...');
      const resp = await DaemonClient.executeCommand('CONTROL', 'shutdown');
      if (resp && resp.success) {
        console.log('Daemon acknowledged shutdown request');
        didControl = true;
      }
    } catch (err) {
      console.warn('Socket-based control not available:', (err as Error).message);
    }

    if (!didControl) {
      // Fallback: unload LaunchAgent and clean up socket
      // Unload (ignore errors)
      try {
        execSync(`launchctl unload "${plistPath}"`, { stdio: 'ignore' });
        console.log('LaunchAgent unloaded');
      } catch (err) {
        console.warn('Could not unload LaunchAgent (it may not be loaded):', (err as Error).message);
      }

      // Remove socket if present
      try {
        if (fs.existsSync(socketPath)) {
          fs.unlinkSync(socketPath);
          console.log(`Removed stale socket: ${socketPath}`);
        }
      } catch (err) {
        console.warn('Failed to remove socket:', (err as Error).message);
      }

      // Kill lingering processes that match the installed wrapper
      try {
        execSync(`pkill -f '/usr/local/bin/arduino-cli' 2>/dev/null || true`);
      } catch (err) {
        // pkill may exit non-zero if no process matched; ignore
      }

      // Optionally build
      if (argv.build) {
        try {
          console.log('Running npm run build...');
          execSync('npm run build', { stdio: 'inherit' });
        } catch (err) {
          console.error('Build failed:', (err as Error).message);
          // continue to attempt restart anyway
        }
      }

      // Load LaunchAgent
      try {
        execSync(`launchctl load "${plistPath}"`);
        console.log('LaunchAgent loaded');
      } catch (err) {
        console.error('Failed to load LaunchAgent:', (err as Error).message);
        console.error('Make sure the plist exists at:', plistPath);
        return;
      }
    } else {
      // If we used socket control, rely on LaunchAgent's KeepAlive to restart the daemon if configured.
      console.log('Socket-based shutdown requested; waiting for daemon to exit...');
    }

    // Wait a bit for daemon to come up
    const waitMs = argv.wait ?? 2000;
    await new Promise((r) => setTimeout(r, waitMs));

    // Try to query status via socket (uses DaemonClient)
    try {
      const response = await DaemonClient.executeCommand('STATUS');
      if (response && response.success) {
        console.log('Daemon restarted and status:');
        console.log(JSON.stringify(response.data, null, 2));
      } else {
        console.warn('Daemon did not return status immediately. Check logs in ~/Library/Logs/arduino-utility/');
      }
    } catch (err) {
      console.warn('Unable to contact daemon after restart:', (err as Error).message);
      console.warn('Check logs: ~/Library/Logs/arduino-utility/');
    }
  }
};

// Use CommonJS-style export to match other command modules (yargs commandDir expects module.exports)
export = restartCommand;
