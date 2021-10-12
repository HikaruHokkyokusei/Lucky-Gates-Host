"use strict";

const express = require('express');
const http = require('http');
const {Server} = require('socket.io');
const angularJson = require('./angular.json');
const toolSet = require("./private/ToolSet");

const adminUsername = process.env["adminUsername"];
const adminPassword = process.env["adminPassword"];

let portNumber = process.env["PORT"];
if (portNumber == null) {
  portNumber = 6969;
}

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer);
const outputFolder = __dirname + "/" + angularJson["projects"]["Lucky-Gates-Bot"]["architect"]["build"]["options"]["outputPath"];

httpServer.listen(portNumber, () => {
  console.log('Listening on port ' + process.env.PORT);
});

// --- SERVE MODULES --- //
app.get('*/web3.min.js', (req, res) => {
  res.sendFile(__dirname + '/node_modules/web3/dist/web3.min.js');
});

app.get('*/socket.io.js', (req, res) => {
  res.sendFile(__dirname + '/node_modules/socket.io/client-dist/socket.io.js');
});

// --- SERVE ADMIN FILES --- //
app.get("*/admin-access/:fileName", (req, res) => {
  res.sendFile(__dirname + "/admin-access/" + req.params.fileName);
})

// ---- SERVE STATIC FILES ---- //
app.get('*.*', express.static(outputFolder, {maxAge: '1y'}));

// ---- SERVE APPLICATION PATHS ---- //
app.all('*', function (req, res) {
  res.status(200).sendFile(`/`, {root: outputFolder});
});


let adminSocketId = null;
let activeSocketConnections = 0;
let pythonProcess;
pythonProcess = new toolSet.PythonProcess("./private/PythonScripts/"); // TODO : Set output handler

// Shutdown Handler
process.on("SIGINT", () => {
  console.log("Shutdown Handler Start");
  try {
    pythonProcess.stopScript();
  } catch (e) {

  }
  console.log("Shutdown Handler Over");
  process.exit();
});

io.on('connection', (socket) => {
  activeSocketConnections++;
  console.log('Socket connection made. Id : ' + socket.id + ", IP : " + ", Active Connections : " + activeSocketConnections);

  socket.on("authenticateAdmin", (credentials) => {
    if (credentials["username"] === adminUsername && credentials["password"] === adminPassword) {
      adminSocketId = socket.id;
      console.log(adminSocketId + " has gained admin privileges...");
      socket.emit("hideForum");
    }
  });

  socket.on("adminAction", (commands) => {
    let reply;
    if (socket.id === adminSocketId) {

      switch (commands["command"]) {
        case "exit":
          if (pythonProcess != null) {
            pythonProcess.stopScript();
          }
          reply = "Success"
          break;
      }
    } else {
      reply = "You do not have admin access";
    }

    socket.emit("setOutput", reply);
  });

  // TODO : Handle Socket Events...
  socket.on('createNewGame', () => {
    try {
      pythonProcess.sendInputToScript({"command": "game", "action": "createNewGame", "options": { }}); // TODO : Add options
      const newGame = -1;
      console.log("New Game Created : " + newGame);

      socket.emit('newGameCreated', {
        gameId: newGame
      });
    } catch (e) {
      socket.emit('gameCreationError', {
        error: e,
      });
    }
  });

  socket.on('disconnect', () => {
    if (socket.id === adminSocketId) {
      adminSocketId = null;
    }
    activeSocketConnections--;
    console.log('Socket connection closed. Active Connections : ' + activeSocketConnections);
  });
});

// setTimeout(() => { pythonProcess.stopScript(); }, 7500);
