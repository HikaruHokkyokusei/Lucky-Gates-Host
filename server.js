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

const ioEmitter = (roomId, emitEvent, data) => {
  if (data == null) {
    io.to(roomId).emit(emitEvent);
  } else {
    io.to(roomId).emit(emitEvent, data);
  }
};

serverSupplement.setEmitter(ioEmitter);

io.on('connection', (socket) => {
  let signCode = "Please sign this message with unique code : " + uuid.v4() + ", to verify ownership of the address. " +
    "This will NOT cost you gas fees OR anything else.";
  serverSupplement.updateConnectionList(socket, signCode);
  console.log('Socket connection opened. Id : ' + socket.id + ", Active Connections : " + serverSupplement.connectionCount());
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
        serverSupplement.pythonFunctions["createNewGame"](socket.id, options["gameCoinAddress"], options["coinChainName"]);
      } else {
        serverSupplement.pythonFunctions["createNewGame"](socket.id);
      }
    } else if (serverSupplement.isSocketBoundToAddress(socket.id)) {
      if (options != null && options["gameCoinAddress"] != null && options["coinChainName"] != null) {
        serverSupplement.pythonFunctions["createNewGame"](socket.id, options["gameCoinAddress"], options["coinChainName"]);
      } else {
        serverSupplement.pythonFunctions["createNewGame"](socket.id);
      }
    }
  });

  socket.on('getAvailableGameList', () => {
    if (serverSupplement.isAdmin(socket.id) || serverSupplement.isSocketBoundToAddress(socket.id)) {
      socket.emit('availableGameList', serverSupplement.getAvailableGameList());
    }
  });

  socket.on('addPlayerToGame', (options) => {
    if (serverSupplement.isAdmin(socket.id)) {
      if (options != null && options["gameId"] != null && options["playerAddress"] != null) {
        serverSupplement.pythonFunctions["addPlayerToGame"]({
          gameId: options["gameId"],
          playerAddress: options["playerAddress"]
        });
      }
    } else if (serverSupplement.isSocketBoundToAddress(socket.id)) {
      if (options != null && options["gameId"] != null) {
        serverSupplement.pythonFunctions["addPlayerToGame"]({gameId: options["gameId"], socketId: socket.id});
      }
    }
  });

  socket.on('beginGameEarly', (options) => {
    if (options && options["gameId"]) {
      if (serverSupplement.isAdmin(socket.id)) {
        serverSupplement.pythonFunctions["beginGameEarly"](options["gameId"], false, null);
      } else if (serverSupplement.isSocketBoundToAddress(socket.id)) {
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
