"use strict";

const logger = global["globalLoggerObject"];

const childProcess = require('child_process');
const uuid = require("uuid");
const splitter = new RegExp("[\r\n]+");

class PythonProcess {
  constructor({
                pythonFilePath = './PythonScripts/',
                scriptOutputHandler = (generatedOutput) => {
                  logger.info(generatedOutput);
                },
                pythonFileName = 'main.py'
              }) {
    this.pythonProcess = childProcess.spawn('python',
      [pythonFileName, process.env["DBUsername"], process.env["DBPassword"],
        process.env["DBClusterName"], process.env["DBName"], process.env["BoxClientId"],
        process.env["BoxClientSecret"], process.env["BoxDeveloperToken"]],
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
            logger.info("Parsing Error : " + err);
            logger.info(data);
          }
        }
      }
    });
    this.pythonProcess.stderr.on('data', (data) => {
      logger.error(data);
    });
    this.pythonProcess.on('exit', (code, signal) => {
      logger.info('Python Script exited with ' + `code : ${code} and signal : ${signal}`);
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
    for (const key in keyMap) {
      this.valueMap[keyMap[key]] = key;
    }
  }

  getValueFromKey(key) {
    return this.keyMap[key];
  }

  getKeyFromValue(value) {
    return this.valueMap[value];
  }

  setKeyAndValue(key, value) {
    this.unsetWithKey(key);
    this.unsetWithValue(value);
    this.keyMap[key] = value;
    this.valueMap[value] = key;
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

class Miscellaneous {
  static equalsIgnoreCase = (stringA, stringB) => {
    return stringA.localeCompare(stringB, undefined, {sensitivity: 'variant'}) === 0;
  };
  static getRandomNumber = (start, end) => {
    return Math.floor((end - start) * Math.random()) + start;
  };
  static deleteKeyFromObject = (keyToDelete, inObject) => {
    for (let key in inObject) {
      if (key === keyToDelete) {
        delete inObject[key];
      } else if (typeof inObject[key] == "object") {
        Miscellaneous.deleteKeyFromObject(inObject[key]);
      }
    }
  };
}

module.exports = {
  PythonProcess: PythonProcess,
  TwoWayMap: TwoWayMap,
  Miscellaneous: Miscellaneous
};
