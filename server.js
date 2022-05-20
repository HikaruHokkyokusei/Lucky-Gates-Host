"use strict";

const startTime = Date.now();

const winston = require('winston');
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: {service: 'user-service'},
  transports: [
    // - Write all logs with level `info` and below to `combined.log`
    new winston.transports.File({filename: './private/PythonScripts/jsLog.log', options: {flags: "w"}})
  ],
});

// If we're not in production then log to the `console` with the format: `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
if (process.env["NODE_ENV"] !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}
Object.freeze(logger);

// Putting it in global object so that it can be accessed from anywhere.
// This practice should be avoided and be used in cases only like this.
global["globalLoggerObject"] = logger;

const express = require('express');
const http = require('http');
const {Server} = require('socket.io');
const uuid = require('uuid');
const angularJson = require('./angular.json');
const serverSupplement = require("./server-supplement");

let portNumber = process.env["PORT"];
if (!portNumber) {
  portNumber = 6969;
}

const app = express();
const httpServer = http.createServer(app);
const outputFolder = __dirname + "/" + angularJson["projects"]["Lucky-Gates-Host"]["architect"]["build"]["options"]["outputPath"];

// Shutdown Handler
const shutdownHandler = (event) => {
  logger.info("Shutdown Handler Start for " + event);
  serverSupplement.pythonFunctions["stopScript"]();

  setTimeout(() => {
    logger.info("Shutdown Handler End");
    process.exit(1);
  }, 25000);
};
// if (process.stdin.isTTY && !process.stdin.isRaw) {
//   process.stdin.setRawMode(true);
// }
process.on("SIGINT", shutdownHandler);
process.on("SIGTERM", shutdownHandler);
process.stdin.resume();

const io = new Server(httpServer);
const ioEmitter = (roomId, emitEvent, data) => {
  if (data == null) {
    io.to(roomId).emit(emitEvent);
  } else {
    io.to(roomId).emit(emitEvent, data);
  }
};
serverSupplement.setEmitter(ioEmitter);

// --- SERVE NODE MODULES --- //
app.get('/node_modules/*.*', (req, res) => {
  try {
    res.status(200).sendFile(__dirname + req.path);
  } catch {
    res.sendStatus(404);
  }
});

// --- SERVE STATIC ADMIN FILES --- //
app.get("/admin-access/*.*", (req, res) => {
  try {
    res.status(200).sendFile(__dirname + req.path);
  } catch {
    res.sendStatus(404);
  }
});

// ---- SERVE STATIC FILES ---- //
app.get('*.*', express.static(outputFolder, {maxAge: '3d'}));

// ---- SERVE APPLICATION PATHS ---- //
app.all('*', function (req, res) {
  res.status(200).sendFile(`/`, {root: outputFolder});
});

io.on('connection', (socket) => {
  let signCode = "Please sign this message with unique code : " + uuid.v4() + ", to verify ownership of the address. " +
    "This will NOT cost you gas fees OR anything else.";
  serverSupplement.updateConnectionList(socket, signCode);
  io.sockets.emit("activePlayerCountUpdated", serverSupplement.connectionCount());
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
        serverSupplement.pythonFunctions["addPlayerToGame"](options["gameId"], options["playerAddress"], null);
      }
    } else if (serverSupplement.isSocketBoundToAddress(socket.id)) {
      if (options != null && options["gameId"] != null) {
        serverSupplement.pythonFunctions["addPlayerToGame"](options["gameId"], null, socket.id);
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
          serverSupplement.pythonFunctions["savePlayerDoorSelection"](options["gameId"], options["playerAddress"], null, options["doorNumber"]);
        } else if (options["wantToSwitch"] != null) {
          serverSupplement.pythonFunctions["savePlayerSwitchSelection"](options["gameId"], options["playerAddress"], null, options["wantToSwitch"]);
        }
      }
    } else if (serverSupplement.isSocketBoundToAddress(socket.id)) {
      if (options != null && options["gameId"] != null) {
        if (options["doorNumber"] != null) {
          serverSupplement.pythonFunctions["savePlayerDoorSelection"](options["gameId"], null, socket.id, options["doorNumber"]);
        } else if (options["wantToSwitch"] != null) {
          serverSupplement.pythonFunctions["savePlayerSwitchSelection"](options["gameId"], null, socket.id, options["wantToSwitch"]);
        }
      }
    }
  });

  socket.on('buyTicketsForPlayer', (options) => {
    if (options["referenceId"] != null && options["coinChainName"] != null) {
      let playerAddress = null, socketId = null;
      if (serverSupplement.isAdmin(socket.id) && options["playerAddress"] != null) {
        playerAddress = options["playerAddress"];
        socketId = socket.id;
      } else if (serverSupplement.isSocketBoundToAddress(socket.id)) {
        socketId = socket.id;
      }

      if (socketId != null) {
        serverSupplement.pythonFunctions["buyTicketsForPlayer"](options["referenceId"], options["coinChainName"], playerAddress, socketId);
      }
    }
  });

  socket.on('getPlayerTicketCount', (options) => {
    if (serverSupplement.isAdmin(socket.id)) {
      if (options != null && options["coinChainName"] != null && options["gameCoinAddress"] != null && options["playerAddress"] != null) {
        serverSupplement.pythonFunctions["getPlayerTicketCount"](options["coinChainName"], options["gameCoinAddress"], options["playerAddress"], null);
      }
    } else if (serverSupplement.isSocketBoundToAddress(socket.id)) {
      if (options != null && options["coinChainName"] != null && options["gameCoinAddress"] != null) {
        serverSupplement.pythonFunctions["getPlayerTicketCount"](options["coinChainName"], options["gameCoinAddress"], null, socket.id);
      }
    }
  });

  socket.on('disconnect', () => {
    serverSupplement.deleteConnection(socket);
    io.sockets.emit("activePlayerCountUpdated", serverSupplement.connectionCount());
  });
});

serverSupplement.initInformer.on("initializationComplete", () => {
  const endTime = Date.now();
  logger.info("Initialization Complete in " + (endTime - startTime) / 1000 + " seconds");
  httpServer.listen(portNumber, () => {
    logger.info('Listening on port ' + process.env.PORT);
  });
});
