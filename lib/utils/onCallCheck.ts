import {spawn} from "node:child_process";
import {Arguments} from "yargs";
import {SerialConnection} from "../serial/SerialConnection";
import {ITermArguments} from "./Interfaces";
import * as path from "path";

export const startOnCallChecker = (
  argv: Arguments<ITermArguments>,
  serial: SerialConnection,
) => {
  if(argv.debug) {
    console.log("Starting on-call checker");
  }
  let onCall = false;
  
  // Get the path to the bundled script
  const scriptPath = path.join(__dirname, '../scripts/check_camera.sh');
  const camCheckScript = spawn('bash', [scriptPath]);

  camCheckScript.stdout.on('data', (data: Buffer) => {
    const logEntry = data.toString();

    if(logEntry.includes("AppleH13CamIn")) {
      if(logEntry.includes("power_on_hardware")) {
        if(argv.debug) {
          console.log("Camera is powered on");
        }

        if(serial.isReady && !onCall) {
          serial.write("onair-red;");
        }
        onCall = true;
      }
      if (logEntry.includes("power_off_hardware")) {
        if (argv.debug) {
          console.log("Camera is powered off");
        }

        if(serial.isReady && onCall) {
          serial.write("onair-green;");
        }
        onCall = false;
      }
    }
  });

  camCheckScript.stderr.on('data', (data: Buffer) => {
    console.error(`Error: ${data.toString()}`);
  });

  camCheckScript.on('close', (code: number) => {
    console.log(`Bash script exited with code ${code}`);
  });
}
