"use strict";

const toolSet = require("./private/ToolSet");

const adminUsername = process.env["adminUsername"];
const adminPassword = process.env["adminPassword"];
let adminSocketId = null;
const setAdmin = (socketId, credentials) => {
  if (credentials["username"] === adminUsername && credentials["password"] === adminPassword) {
    adminSocketId = socketId;
    console.log(socket.id + " has gained admin privileges...");
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

let pythonProcess;
pythonProcess = new toolSet.PythonProcess("./private/PythonScripts/"); // TODO : Set output handler

pythonProcess.sendInputToScript({"command": "rebuildFromDB"});

function stopScript() {
  pythonProcess.stopScript();
}

function createNewGame() {
  pythonProcess.sendInputToScript({"command": "game", "action": "createNewGame", "options": { }}); // TODO : Add options
}

function addPlayerToGame() {
  // TODO : Complete this...
}

function buyTicketsForPlayer() {
  // TODO : Complete this...
}

let pythonFunctions = {
  "createNewGame": createNewGame,
  "stopScript": stopScript,
  "addPlayerToGame": addPlayerToGame,
  "buyTicketsForPlayer": buyTicketsForPlayer
};

module.exports = {
  setAdmin: setAdmin,
  isAdmin: isAdmin,
  updateConnectionList: updateConnectionList,
  connectionCount: connectionCount,
  deleteConnection: deleteConnection,
  pythonFunctions: pythonFunctions
};
