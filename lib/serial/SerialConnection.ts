import {SerialPort} from "serialport";

export class SerialConnection {
  private _ready: boolean
  private _port: SerialPort
  private _debug: boolean
  private _txData: string[]

  constructor(serialPort: SerialPort, debug: boolean = false) {
    this._ready = false;
    this._port = serialPort
    this._debug = debug
    this._txData = []

    // Poll for data to write
    if(this._debug) {
      console.log("Starting write poller");
    }
    setInterval(() => this.bufferedWrite(), 50)
  }

  private bufferedWrite() {
    if(this._ready) {
      const data = this._txData.shift()
      if(data != undefined) {
        if (this._debug) {
          console.log("Writing to serial: " + data.toString());
        }
        this._port.write(data, (err) => {
          if (err) {
            return console.error("Error on write: ", err);
          }
        })
      }
    }
  }

  write(data: string) {
    this._txData.push(data)
  }

  get isReady() {
      return this._ready
  }

  set setReady(value: boolean) {
      this._ready = value
  }

  get port() {
      return this._port
  }
}
