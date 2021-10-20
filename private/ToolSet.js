"use strict";

const childProcess = require('child_process');
const uuid = require("uuid");
const splitter = new RegExp("[\r\n]+");

class PythonProcess {
  constructor({ pythonFilePath = './PythonScripts/',
                scriptOutputHandler = (generatedOutput) => { console.log(generatedOutput); },
                pythonFileName = 'main.py' }) {
    this.pythonProcess = childProcess.spawn('python',
      [pythonFileName, process.env["DBUsername"], process.env["DBPassword"], process.env["DBClusterName"], process.env["DBName"]],
      {cwd: pythonFilePath});

    this.pythonProcess.stdin.setDefaultEncoding('utf-8');
    this.pythonProcess.stdout.setEncoding('utf-8');

    this.pythonProcess.stdout.on('data', (bufferInput) => {
      bufferInput = bufferInput.split(splitter);
      for (let i = 0; i < bufferInput.length; i++) {
        let data = bufferInput[i];
        if (data !== "") {
          try {
            data = JSON.parse(data);
            scriptOutputHandler(data);
          } catch (err) {
            console.log("Parsing Error : " + err);
            console.log(data);
          }
        }
      }
    });
    this.pythonProcess.on('exit', (code, signal) => {
      console.log('Python Script exited with ' + `code : ${code} and signal : ${signal}`);
    });
  }

  sendInputToScript = (message) => {
    if (typeof message == "object") {
      message = JSON.stringify(message)
    }
    this.pythonProcess.stdin.write(message + "\n");
  }

  sendRawPacketToScript = ({command, action = null, requestId = uuid.v4(), origin = "js", body = {}}) => {
    if (command == null) {
      return
    }

    let packet = {
      "Header": {
        "command": command,
        "action": action,
        "requestId": requestId,
        "origin": origin,
        "sender": "js"
      },
      "Body": body
    };

    this.sendInputToScript(packet);
  }

  stopScript = () => {
    this.sendRawPacketToScript({command: "exit"});
  };
}

class TwoWayMap {
  constructor(keyMap) {
    if (typeof keyMap != "object") {
      throw "Parameter has to be a Map"
    }
    this.keyMap = keyMap;
    this.valueMap = {};
    for(const key in keyMap) {
      this.valueMap[keyMap[key]] = key;
    }
  }

  getValueFromKey(key) { return this.keyMap[key]; }
  getKeyFromValue(value) { return this.valueMap[value]; }
  setKeyAndValue(key, value) {
    if ((this.valueMap[value] == null) && (this.keyMap[key] !== value)) {
      this.unsetWithKey(key);
      this.keyMap[key] = value;
      this.valueMap[value] = key;
      return true
    } else {
      return false
    }
  }
  unsetWithKey(key) {
    if (key in this.keyMap) {
      delete this.valueMap[this.keyMap[key]]
      delete this.keyMap[key]
    }
  }
  unsetWithValue(value) {
    if (value in this.valueMap) {
      delete this.keyMap[this.valueMap[value]]
      delete this.valueMap[value]
    }
  }
}

module.exports = {
  PythonProcess: PythonProcess,
  TwoWayMap: TwoWayMap
};
