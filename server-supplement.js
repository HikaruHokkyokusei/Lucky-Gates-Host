"use strict";

const toolSet = require("./private/ToolSet");

const adminUsername = process.env["adminUsername"];
const adminPassword = process.env["adminPassword"];

let adminSocketId = null;
let activeSocketConnections = 0;

const playerAddressToSocketIdMap = new toolSet.TwoWayMap({});  // PlayerAddress is Key and SocketId is the value
const connectedSockets = {};


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

const updateConnectionList = (socket, signCode) => {
  activeSocketConnections++;
  connectedSockets[socket.id] = {signCode, socket};
}
const connectionCount = () => {
  return activeSocketConnections;
}
const deleteConnection = (socket) => {
  activeSocketConnections--;
  delete connectedSockets[socket.id];
  playerAddressToSocketIdMap.unsetWithValue(socket.id);
  if (isAdmin(socket.id)) {
    setAdmin(null);
  }
}

const bindAddress = (socketId, signedMessage, playerAddress) => {
  if (connectedSockets[socketId] != null) {
    // TODO : Use web3 to decode the signedMessage using connectedSockets[socketId]["signCode"]
    //  and compare the result with playerAddress
    playerAddressToSocketIdMap.setKeyAndValue(playerAddress, socketId);
    return true;
  } else {
    return false;
  }
};
const isSocketBoundToAddress = (socketId) => {
  return playerAddressToSocketIdMap.getKeyFromValue(socketId) != null;
}


let pythonProcess;
const scriptOutputHandler = (packet) => {
  if (adminSocketId != null) {
    connectedSockets[adminSocketId].emit('setOutput', packet);
  }
  if (packet["message"] === "Python Script Exited") {
    console.log("Python Script Exited");
  }

  // TODO : Complete this function...
};
pythonProcess = new toolSet.PythonProcess({
  pythonFilePath: "./private/PythonScripts/", scriptOutputHandler: scriptOutputHandler
});

pythonProcess.sendRawPacketToScript({command: "rebuildFromDB"});

const createNewGame = (gameCoinAddress, coinChainName) => {
  let body = {};
  if (gameCoinAddress != null && coinChainName != null) {
    body["gameCoinAddress"] = gameCoinAddress;
    body["coinChainName"] = coinChainName;
  }
  pythonProcess.sendRawPacketToScript({command: "game", action: "createNewGame", body: body});
};
const addPlayerToGame = (gameId, playerAddress) => {
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
};
const beginGameEarly = (gameId) => {
  if (gameId != null) {
    let body = {
      gameId: gameId
    };

    pythonProcess.sendRawPacketToScript({command: "game", action: "beginGameEarly", body: body});
  }
};
const savePlayerDoorSelection = (gameId, playerAddress, doorNumber) => {
  if (gameId != null && playerAddress != null && doorNumber != null) {
    let body = {
      "gameId": gameId,
      "playerAddress": playerAddress,
      "doorNumber": doorNumber
    };
    pythonProcess.sendRawPacketToScript({command: "game", action: "savePlayerDoorSelection", body: body});
  }
};
const savePlayerSwitchSelection = (gameId, playerAddress, wantToSwitch) => {
  if (gameId != null && playerAddress != null && wantToSwitch != null) {
    let body = {
      "gameId": gameId,
      "playerAddress": playerAddress,
      "wantToSwitch": wantToSwitch
    };
    pythonProcess.sendRawPacketToScript({command: "game", action: "savePlayerSwitchSelection", body: body});
  }
};
const buyTicketsForPlayer = () => {
  // TODO : Complete this...
};


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
  bindAddress: bindAddress,
  isSocketBoundToAddress: isSocketBoundToAddress,
  updateConnectionList: updateConnectionList,
  connectionCount: connectionCount,
  deleteConnection: deleteConnection,
  pythonFunctions: pythonFunctions
};
