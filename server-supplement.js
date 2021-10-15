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

  // TODO : Complete this function...
}

let pythonProcess;
pythonProcess = new toolSet.PythonProcess("./private/PythonScripts/", scriptOutputHandler);

pythonProcess.sendRawPacketToScript({command: "rebuildFromDB"});

function createNewGame(gameCoinAddress, coinChainName) {
  let body = {};
  if (gameCoinAddress != null && coinChainName != null) {
    body["gameCoinAddress"] = gameCoinAddress;
    body["coinChainName"] = coinChainName;
  }
  pythonProcess.sendRawPacketToScript({command: "game", action: "createNewGame", body: body});
}

function addPlayerToGame() {
  // TODO : Complete this...
}

function buyTicketsForPlayer() {
  // TODO : Complete this...
}

let pythonFunctions = {
  "sendRawPacketToScript": pythonProcess.sendRawPacketToScript,
  "createNewGame": createNewGame,
  "addPlayerToGame": addPlayerToGame,
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
