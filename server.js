"use strict";

const express = require('express');
const http = require('http');
const {Server} = require('socket.io');
const uuid = require('uuid');
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
    setTimeout(() => {
      console.log("Shutdown Handler Over (Success)");
      process.exit();
    }, 15000);
    serverSupplement.pythonFunctions["stopScript"]();
  } catch (e) {
    console.log(e);
    console.log("Shutdown Handler Over (Error)");
    process.exit();
  }
});

io.on('connection', (socket) => {
  console.log('Socket connection made. Id : ' + socket.id + ", IP : " + ", Active Connections : " + serverSupplement.connectionCount());
  let signCode = uuid.v4();
  serverSupplement.updateConnectionList(socket, signCode);
  socket.emit('signCode', signCode);

  socket.on('bindAddress', (options) => {
    if (options["signedMessage"] != null && options["playerAddress"] != null) {
      serverSupplement.bindAddress(socket.id, options["signedMessage"], options["playerAddress"]);
    }
  });

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
          reply = "Transloaded"
          break;
      }
    } else {
      reply = "You do not have admin access";
    }

    socket.emit("setOutput", reply);
  });

  socket.on('createNewGame', (options) => {
    if (serverSupplement.isAdmin(socket.id)) {
      if (options != null && options["gameCoinAddress"] != null && options["coinChainName"] != null) {
        serverSupplement.pythonFunctions["createNewGame"](options["gameCoinAddress"], options["coinChainName"]);
      } else {
        serverSupplement.pythonFunctions["createNewGame"]();
      }
    } else if (serverSupplement.isSocketBoundToAddress(socket.id)) {
      if (options != null && options["gameCoinAddress"] != null && options["coinChainName"] != null) {
        serverSupplement.pythonFunctions["createNewGame"](options["gameCoinAddress"], options["coinChainName"]);
      } else {
        serverSupplement.pythonFunctions["createNewGame"]();
      }

      // TODO : Add player to the create game using the bound address
    }
  });

  socket.on('addPlayerToGame', (options) => {
    if (serverSupplement.isAdmin(socket.id)) {
      if (options != null && options["gameId"] != null && options["playerAddress"] != null) {
        serverSupplement.pythonFunctions["addPlayerToGame"]({gameId: options["gameId"], playerAddress: options["playerAddress"]});
      }
    } else if (serverSupplement.isSocketBoundToAddress(socket.id)) {
      if (options != null && options["gameId"] != null) {
        serverSupplement.pythonFunctions["addPlayerToGame"]({gameId: options["gameId"], socketId: socket.id});
      }
    }
  });

  socket.on('beginGameEarly', (options) => {
    if (serverSupplement.isAdmin(socket.id)) {
      if (options != null && options["gameId"] != null) {
        serverSupplement.pythonFunctions["beginGameEarly"](options["gameId"], false, null);
      }
    } else if (serverSupplement.isSocketBoundToAddress(socket.id)) {
      if (options != null && options["gameId"] != null) {
        serverSupplement.pythonFunctions["beginGameEarly"](options["gameId"], true, socket.id);
      }
    }
  });

  socket.on('acceptPlayerInput', (options) => {
    if (serverSupplement.isAdmin(socket.id)) {
      if (options != null && options["gameId"] != null && options["playerAddress"] != null) {
        if (options["doorNumber"] != null) {
          serverSupplement.pythonFunctions["savePlayerDoorSelection"]({
            gameId: options["gameId"],
            playerAddress: options["playerAddress"],
            doorNumber: options["doorNumber"]
          });
        } else if (options["wantToSwitch"] != null) {
          serverSupplement.pythonFunctions["savePlayerSwitchSelection"]({
            gameId: options["gameId"],
            playerAddress: options["playerAddress"],
            wantToSwitch: options["wantToSwitch"]
          });
        }
      }
    } else if (serverSupplement.isSocketBoundToAddress(socket.id)) {
      if (options != null && options["gameId"] != null) {
        if (options["doorNumber"] != null) {
          serverSupplement.pythonFunctions["savePlayerDoorSelection"]({
            gameId: options["gameId"],
            socketId: socket.id,
            doorNumber: options["doorNumber"]
          });
        } else if (options["wantToSwitch"] != null) {
          serverSupplement.pythonFunctions["savePlayerSwitchSelection"]({
            gameId: options["gameId"],
            socketId: socket.id,
            wantToSwitch: options["wantToSwitch"]
          });
        }
      }
    }
  });

  socket.on('buyTicketsForPlayer', () => {
    if (serverSupplement.isAdmin(socket.id) || serverSupplement.isSocketBoundToAddress(socket.id)) {
      // TODO : Add options here...
      serverSupplement.pythonFunctions["buyTicketsForPlayer"]();
    }
  });

  socket.on('disconnect', () => {
    serverSupplement.deleteConnection(socket);
    console.log('Socket connection closed. Active Connections : ' + serverSupplement.connectionCount());
  });
});
