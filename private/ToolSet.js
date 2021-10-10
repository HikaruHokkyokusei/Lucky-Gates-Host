"use strict";

const fs = require('fs');
const childProcess = require('child_process');

function PythonProcess(pythonFilePath = './PythonScripts/',
                       scriptOutputHandler = (generatedOutput) => { console.log(generatedOutput); },
                       pythonFileName = '__main__.py',
                       communicationFileName = 'communicationFile.txt') {

  this.pythonProcess = childProcess.spawn('python', [pythonFileName], {cwd: pythonFilePath});
  this.pythonProcess.stdout.on('data', (data) => {
    data = JSON.parse("" + data);
    scriptOutputHandler(data);
  });
  this.pythonProcess.stderr.on('data', (data) => {
    console.log('Error during execution of Py script :\n' + data);
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

  };

  return this;
}

module.exports = {
  PythonProcess: PythonProcess
};
