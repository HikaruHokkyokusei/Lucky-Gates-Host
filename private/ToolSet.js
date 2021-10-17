"use strict";

const childProcess = require('child_process');
const uuid = require("uuid");
const splitter = new RegExp("[\r\n]+");

function PythonProcess({ pythonFilePath = './PythonScripts/',
                         scriptOutputHandler = (generatedOutput) => { console.log(generatedOutput); },
                         pythonFileName = '__main__.py' }) {

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
  this.pythonProcess.stderr.on('data', (data) => {
    console.log('Py Err : ' + data);
  });
  this.pythonProcess.on('exit', (code, signal) => {
    console.log('Python Script exited with ' + `code : ${code} and signal : ${signal}`);
  });

  this.sendInputToScript = (message) => {
    if (typeof message == "object") {
      message = JSON.stringify(message)
    }
    this.pythonProcess.stdin.write(message + "\n");
  }
  this.sendRawPacketToScript = ({command, action = null, requestId = uuid.v4(), origin = "js", body = {}}) => {
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

  this.stopScript = () => {
    this.sendRawPacketToScript({command: "exit"});
  };

  return this;
}

module.exports = {
  PythonProcess: PythonProcess
};
