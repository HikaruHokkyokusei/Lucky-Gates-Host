"use strict";

const fs = require('fs');
const childProcess = require('child_process');

function PythonProcess(pythonFilePath = './PythonScripts/',
                       scriptOutputHandler = (generatedOutput) => { console.log(generatedOutput); },
                       pythonFileName = '__main__.py',
                       communicationFileName = 'communicationFile.txt') {

  this.pythonProcess = childProcess.spawn('python',
    [pythonFileName, process.env["DBUsername"], process.env["DBPassword"], process.env["DBClusterName"], process.env["DBName"]],
    {cwd: pythonFilePath});
  this.pythonProcess.stdout.on('data', (data) => {
    data = JSON.parse("" + data);
    scriptOutputHandler(data);
  });
  this.pythonProcess.stderr.on('data', (data) => {
    console.log('Error during execution of Py script :\n' + data);
  });
  this.pythonProcess.on('exit', (code, signal) => {
    console.log('Python Script exited with ' + `code : ${code} and signal : ${signal}`);
  });

  this.communicationFilePath = pythonFilePath + communicationFileName;
  this.pythonProcess.stdin.setDefaultEncoding('utf-8');
  fs.writeFile(this.communicationFilePath, '', () => {
  });

  this.sendInputToScript = (message) => {
    if (typeof message == "object") {
      message = JSON.stringify(message)
      fs.appendFile(this.communicationFilePath, message + "\n", () => {
      });
    }
  }

  this.stopScript = () => {
    this.sendInputToScript({"command": "exit"});
  };

  return this;
}

module.exports = {
  PythonProcess: PythonProcess
};
