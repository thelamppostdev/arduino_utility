import type {Arguments, CommandBuilder, CommandModule} from 'yargs';
import * as readline from "readline";
import {ReadlineParser} from "serialport";
import {SerialConnection} from "../serial/SerialConnection";
import {ITermArguments} from "../utils/Interfaces";
import {startGithubPrChecker} from "../utils/githubPrChecker";
import {GitState} from "../utils/GitState";
import {selectSerialPort} from "../serial/serial";
import {startOnCallChecker} from "../utils/onCallCheck";

const termBuilder: CommandBuilder = (yargs) =>
  yargs.options({
    manual: {alias: 'm', type: 'boolean', default: false},
    text: {alias: 't', type: 'boolean', default: true, description: "Text input (as opposed to space-delimited hexadecimal)"},
    debug: {alias: 'D', type: 'boolean', default: false, description: "Debugging on/off"},
  })

const termCommand: CommandModule = {
  handler: async (argv: Arguments<ITermArguments>) => {
    let serialPort = await selectSerialPort(argv.manual, argv.debug)
    const serial = new SerialConnection(serialPort, argv.debug);
    const gitState = new GitState();

    let parser = serial.port.pipe(new ReadlineParser({ delimiter: '\r\n' }));
    parser.on('data', (data: string) => {
      if(argv.debug) {
        console.log(`RX: ${data}`);
      }

      if(data == "Initialized!") {
        if(argv.debug) {
          console.log("Serial ready!");
        }
        serial.setReady = true;
      }
    });

    // setInterval(() => startGithubPrChecker(argv, serial, gitState), 5000);
    startOnCallChecker(argv, serial);

    serialPort.on('close', (err: any) => {
      if(err) {
        console.error("Error closing port: ", err.message);
      }
      console.log("Port closed...reconnecting!");
      serial.setReady = false;
      setTimeout(() => {
        selectSerialPort(false, false).then((port) => {
          serialPort = port;
          parser = serial.port.pipe(new ReadlineParser({ delimiter: '\r\n' }));
          parser.on('data', (data: string) => {
            if(argv.debug) {
              console.log(`RX: ${data}`);
            }

            if(data == "Initialized!") {
              if(argv.debug) {
                console.log("Serial ready!");
              }
              serial.setReady = true;
            }
          });
        })
      }, 10000)
    })

    const terminalRead = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    terminalRead.on('line', (input: string) => {
      if (input == "exit") {
        terminalRead.close();
        serialPort.close()
        process.exit(0);
      } else if(input.startsWith("pr")) {
        gitState.prNumber = input.split(" ")[1];
      } else {
        if(argv.debug) {
          console.log(`Add to TX Buffer: ${input}`);
        }
        serial.write(input);
      }
    });
  },
  describe: 'A simple serial terminal',
  builder: termBuilder,
  command: 'term'
}

export = termCommand;
