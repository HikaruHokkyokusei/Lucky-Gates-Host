"use strict";

const toolSet = require("./private/ToolSet");
const Web3 = require("web3");
const web3 = new Web3();  // No Provider Set Here. Only to be used to recover address from signed Message.

const adminUsername = process.env["adminUsername"];
const adminPassword = process.env["adminPassword"];
const tools = new toolSet.Miscellaneous();

let adminSocketId = null;
let activeSocketConnections = 0;

const playerAddressToSocketIdMap = new toolSet.TwoWayMap({});  // PlayerAddress is Key and SocketId is the value
const playerAddressToGameIdMap = {};
const gameIdToPlayerCollectionMap = {};
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
  connectedSockets[socket.id] = {
    "signCode": signCode,
    "socket": socket};
};
const connectionCount = () => {
  return activeSocketConnections;
};
const deleteConnection = (socket) => {
  activeSocketConnections--;
  delete connectedSockets[socket.id];
  playerAddressToSocketIdMap.unsetWithValue(socket.id);
  if (isAdmin(socket.id)) {
    setAdmin(null);
  }
};

const bindAddress = (socketId, signedMessage, playerAddress) => {
  if (connectedSockets[socketId] != null && Web3.utils.isAddress(playerAddress)) {
    playerAddress = Web3.utils.toChecksumAddress(playerAddress);

    try {
      if (tools.equalsIgnoreCase(playerAddress, web3.eth.accounts.recover(connectedSockets[socketId]["signCode"], signedMessage))) {
        playerAddressToSocketIdMap.setKeyAndValue(playerAddress, socketId);
      }
    } catch { }
  }
};
const isSocketBoundToAddress = (socketId) => {
  return playerAddressToSocketIdMap.getKeyFromValue(socketId) != null;
}


let pythonProcess;
const scriptOutputHandler = (packet) => {
  if (adminSocketId != null) {
    connectedSockets[adminSocketId]["socket"].emit('setOutput', packet);
  }
  if (packet["Header"] != null && packet["Body"] != null) {
    let gameId = packet["Body"]["gameId"]; // In normal situations, should not be null.
    let playerAddress = packet["Body"]["playerAddress"]; // Can be null.

    switch (packet["Header"]["command"]) {
      case "gameCreation":
        gameIdToPlayerCollectionMap[gameId] = {};
        break;

      case "playerAddition":
        playerAddressToGameIdMap[playerAddress] = gameId;
        gameIdToPlayerCollectionMap[gameId][playerAddress] = true;
        break;

      case "informPlayers":
        // TODO : Complete this...
        break;

      case "playerRemovalFromGame":
        delete playerAddressToGameIdMap[playerAddress];
        delete gameIdToPlayerCollectionMap[gameId][playerAddress];
        // TODO : Send msg to players...
        break;

      case "gameDeletion":
        // TODO : Complete this...
        break;
    }
  } else if (packet["message"] === "Python Script Exited") {
    console.log("Python Script Exited");
  }
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
const addPlayerToGame = ({gameId = null, playerAddress = null, socketId = null}) => {
  if (gameId != null && gameIdToPlayerCollectionMap[gameId] != null) {
    if (playerAddress == null) {
      if (socketId == null) {
        return
      }

      playerAddress = playerAddressToSocketIdMap.getKeyFromValue(socketId);

      if (playerAddress == null) {
        return;
      }
    }
    let body = {
      "gameId": gameId,
      "playerAddress": playerAddress
    };
    pythonProcess.sendRawPacketToScript({command: "game", action: "addPlayerToGame", body: body});
  }
};
const beginGameEarly = (gameId, inclusionCheck, socketId) => {
  if (gameId != null && gameIdToPlayerCollectionMap[gameId] != null) {
    if (inclusionCheck) {
      if ((socketId == null) || (!gameIdToPlayerCollectionMap[gameId][playerAddressToSocketIdMap.setKeyAndValue(socketId)])) {
        return
      }
    }

    let body = {
      gameId: gameId
    };
    pythonProcess.sendRawPacketToScript({command: "game", action: "beginGameEarly", body: body});
  }
};
const savePlayerDoorSelection = ({gameId = null, playerAddress = null, socketId = null, doorNumber = null}) => {
  if (gameId != null && gameIdToPlayerCollectionMap[gameId] != null && doorNumber != null) {
    if (playerAddress == null) {
      if (socketId == null) {
        return
      }

      playerAddress = playerAddressToSocketIdMap.getKeyFromValue(socketId);

      if (playerAddress == null) {
        return;
      }
    }
    let body = {
      "gameId": gameId,
      "playerAddress": playerAddress,
      "doorNumber": doorNumber
    };
    pythonProcess.sendRawPacketToScript({command: "game", action: "savePlayerDoorSelection", body: body});
  }
};
const savePlayerSwitchSelection = ({gameId = null, playerAddress = null, socketId = null, wantToSwitch = null}) => {
  if (gameId != null && gameIdToPlayerCollectionMap[gameId] != null && wantToSwitch != null) {
    if (playerAddress == null) {
      if (socketId == null) {
        return
      }

      playerAddress = playerAddressToSocketIdMap.getKeyFromValue(socketId);

      if (playerAddress == null) {
        return;
      }
    }
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
