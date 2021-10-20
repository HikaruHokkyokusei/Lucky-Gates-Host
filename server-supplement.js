"use strict";

const toolSet = require("./private/ToolSet");

const adminUsername = process.env["adminUsername"];
const adminPassword = process.env["adminPassword"];
let adminSocketId = null;
const setAdmin = (socketId, credentials) => {
  if (socketId == null || credentials == null) {
    adminSocketId = null;
    return false;
  }

  if (credentials["username"] === adminUsername && credentials["password"] === adminPassword) {
    adminSocketId = socketId;
    console.log(socketId + " has gained admin privileges...");
    return true;
  } else {
    return false;
  }
};
const isAdmin = (socketId) => {
  return socketId === adminSocketId;
};

let activeSocketConnections = 0;
let connectedSockets = {};
const updateConnectionList = (socket) => {
  activeSocketConnections++;
  connectedSockets[socket.id] = socket;
}
const connectionCount = () => {
  return activeSocketConnections;
}
const deleteConnection = (socket) => {
  activeSocketConnections--;
  delete connectedSockets[socket.id];
  if (isAdmin(socket.id)) {
    setAdmin(null);
  }
}

function scriptOutputHandler(packet) {
  if (adminSocketId != null) {
    connectedSockets[adminSocketId].emit('setOutput', packet);
  }
  if (packet["message"] === "Python Script Exited") {
    console.log("Python Script Exited");
  }

  // TODO : Complete this function...
}

let pythonProcess;
pythonProcess = new toolSet.PythonProcess({
  pythonFilePath: "./private/PythonScripts/", scriptOutputHandler: scriptOutputHandler
});

pythonProcess.sendRawPacketToScript({command: "rebuildFromDB"});

function createNewGame(gameCoinAddress, coinChainName) {
  let body = {};
  if (gameCoinAddress != null && coinChainName != null) {
    body["gameCoinAddress"] = gameCoinAddress;
    body["coinChainName"] = coinChainName;
  }
  pythonProcess.sendRawPacketToScript({command: "game", action: "createNewGame", body: body});
}

function addPlayerToGame(gameId, playerAddress) {
  if (gameId != null && playerAddress != null) {
    // TODO : Below Stuff: -
    // Check if gameId is valid...
    // Validate player address...
    // Link player with socketId...
    let body = {
      "gameId": gameId,
      "playerAddress": playerAddress
    };
    pythonProcess.sendRawPacketToScript({command: "game", action: "addPlayerToGame", body: body});
  }
}

function beginGameEarly(gameId) {
  if (gameId != null) {
    let body = {
      gameId: gameId
    };

    pythonProcess.sendRawPacketToScript({command: "game", action: "beginGameEarly", body: body});
  }
}

function savePlayerDoorSelection(gameId, playerAddress, doorNumber) {
  if (gameId != null && playerAddress != null && doorNumber != null) {
    let body = {
      "gameId": gameId,
      "playerAddress": playerAddress,
      "doorNumber": doorNumber
    };
    pythonProcess.sendRawPacketToScript({command: "game", action: "savePlayerDoorSelection", body: body});
  }
}

function savePlayerSwitchSelection(gameId, playerAddress, wantToSwitch) {
  if (gameId != null && playerAddress != null && wantToSwitch != null) {
    let body = {
      "gameId": gameId,
      "playerAddress": playerAddress,
      "wantToSwitch": wantToSwitch
    };
    pythonProcess.sendRawPacketToScript({command: "game", action: "savePlayerSwitchSelection", body: body});
  }
}

function buyTicketsForPlayer() {
  // TODO : Complete this...
}

let pythonFunctions = {
  "sendRawPacketToScript": pythonProcess.sendRawPacketToScript,
  "createNewGame": createNewGame,
  "addPlayerToGame": addPlayerToGame,
  "beginGameEarly": beginGameEarly,
  "savePlayerDoorSelection": savePlayerDoorSelection,
  "savePlayerSwitchSelection": savePlayerSwitchSelection,
  "buyTicketsForPlayer": buyTicketsForPlayer,
  "stopScript": pythonProcess.stopScript,
};

Object.freeze(pythonFunctions);

module.exports = {
  setAdmin: setAdmin,
  isAdmin: isAdmin,
  updateConnectionList: updateConnectionList,
  connectionCount: connectionCount,
  deleteConnection: deleteConnection,
  pythonFunctions: pythonFunctions
};
