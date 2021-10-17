"use strict";

const express = require('express');
const http = require('http');
const {Server} = require('socket.io');
const angularJson = require('./angular.json');
const serverSupplement = require("./server-supplement");

let portNumber = process.env["PORT"];
if (portNumber == null) {
  portNumber = 6969;
}

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer);
const outputFolder = __dirname + "/" + angularJson["projects"]["Lucky-Gates-Host"]["architect"]["build"]["options"]["outputPath"];

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

// Shutdown Handler
process.on("SIGINT", () => {
  console.log("Shutdown Handler Start");
  try {
    serverSupplement.pythonFunctions["stopScript"]();
    setTimeout(() => {
      console.log("Shutdown Handler Over (Success)");
      process.exit();
    }, 15000);
  } catch (e) {
    console.log(e);
    console.log("Shutdown Handler Over (Error)");
    process.exit();
  }
});

io.on('connection', (socket) => {
  serverSupplement.updateConnectionList(socket);
  console.log('Socket connection made. Id : ' + socket.id + ", IP : " + ", Active Connections : " + serverSupplement.connectionCount());

  socket.on("authenticateAdmin", (credentials) => {
    if (serverSupplement.setAdmin(socket.id, credentials)) {
      socket.emit("hideForum");
    }
  });

  socket.on("adminAction", (commands) => {
    let reply;
    if (serverSupplement.isAdmin(socket.id)) {
      switch (commands["command"]) {
        case "transloadPacket":
          serverSupplement.pythonFunctions["sendRawPacketToScript"](commands["options"]);
          reply = "Success"
          break;
      }
    } else {
      reply = "You do not have admin access";
    }

    socket.emit("setOutput", reply);
  });

  socket.on('createNewGame', (options) => {
    if (options != null && options["gameCoinAddress"] != null && options["coinChainName"] != null) {
      serverSupplement.pythonFunctions["createNewGame"](options["gameCoinAddress"], options["coinChainName"]);
    } else {
      serverSupplement.pythonFunctions["createNewGame"]();
    }
  });

  socket.on('addPlayerToGame', (options) => {
    if (options != null && options["gameId"] != null && options["playerAddress"] != null) {
      serverSupplement.pythonFunctions["addPlayerToGame"](options["gameId"], options["playerAddress"]);
    }
  });

  socket.on('beginGameEarly', (options) => {
    if (options != null && options["gameId"] != null) {
      serverSupplement.pythonFunctions["beginGameEarly"](options["gameId"]);
    }
  });

  socket.on('acceptPlayerInput', (options) => {
    if (options != null && options["gameId"] != null && options["playerAddress"] != null) {
      // Mimicking XOR
      if ((options["doorNumber"] == null) !== (options["wantToSwitch"] == null)) {
        if (options["doorNumber"] != null) {
          serverSupplement.pythonFunctions["savePlayerDoorSelection"](options["gameId"], options["playerAddress"], options["doorNumber"]);
        } else {
          serverSupplement.pythonFunctions["savePlayerSwitchSelection"](options["gameId"], options["playerAddress"], options["wantToSwitch"]);
        }
      }
    }
  });

  socket.on('buyTicketsForPlayer', () => {
    // TODO : Add options here...
    serverSupplement.pythonFunctions["buyTicketsForPlayer"]();
  });

  socket.on('disconnect', () => {
    serverSupplement.deleteConnection(socket);
    console.log('Socket connection closed. Active Connections : ' + serverSupplement.connectionCount());
  });
});
