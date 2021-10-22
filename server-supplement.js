"use strict";

const toolSet = require("./private/ToolSet");

const adminUsername = process.env["adminUsername"];
const adminPassword = process.env["adminPassword"];

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
  if (connectedSockets[socketId] != null) {
    // TODO : Use web3 to decode the signedMessage using connectedSockets[socketId]["signCode"]
    //  and compare the result with playerAddress.
    //  Also check that playerAddress is a valid value.
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
    connectedSockets[adminSocketId]["socket"].emit('setOutput', packet);
  }
  if (packet["Header"] != null && packet["Body"] != null) {
    switch (packet["Header"]["command"]) {
      case "gameCreation":
        gameIdToPlayerCollectionMap[packet["Body"]["gameId"]] = {};
        break;

      case "playerAddition":
        let gameId = packet["Body"]["gameId"];
        let playerAddress = packet["Body"]["playerAddress"];
        playerAddressToGameIdMap[playerAddress] = gameId;
        gameIdToPlayerCollectionMap[gameId][playerAddress] = true;
        break;

      case "informPlayers":
        // TODO : Complete this...
        break;

      case "playerRemovalFromGame":
        // TODO : Complete this...
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
