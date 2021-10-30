"use strict";


const toolSet = require("./private/ToolSet");
const Web3 = require("web3");
const web3 = new Web3();  // No Provider Set Here. Only to be used to recover address from signed Message.

const adminUsername = process.env["adminUsername"];
const adminPassword = process.env["adminPassword"];
const tools = new toolSet.Miscellaneous();


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

let emitter;
const setEmitter = (ioEmitter) => {
  emitter = ioEmitter;
};


let activeSocketConnections = 0;
const connectedClients = {};  // "socketId" => { "signCode" => str, "socket" => object }
const updateConnectionList = (socket, signCode) => {
  activeSocketConnections++;
  connectedClients[socket.id] = {
    "signCode": signCode,
    "socket": socket
  };
};
const connectionCount = () => {
  return activeSocketConnections;
};

const playerAddressToSocketIdMap = new toolSet.TwoWayMap({});  // "playerAddress" <<==>> "socketId"
const bindAddress = (socketId, signedMessage, playerAddress) => {
  if (connectedClients[socketId] != null && Web3.utils.isAddress(playerAddress)) {
    playerAddress = Web3.utils.toChecksumAddress(playerAddress);

    try {
      if (tools.equalsIgnoreCase(playerAddress, web3.eth.accounts.recover(connectedClients[socketId]["signCode"], signedMessage))) {
        playerAddressToSocketIdMap.setKeyAndValue(playerAddress, socketId);
      }
    } catch {
    }
  }
};
const isSocketBoundToAddress = (socketId) => {
  return playerAddressToSocketIdMap.getKeyFromValue(socketId) != null;
}

const deleteConnection = (socket) => {
  activeSocketConnections--;
  delete connectedClients[socket.id];
  playerAddressToSocketIdMap.unsetWithValue(socket.id);
  if (isAdmin(socket.id)) {
    setAdmin(null);
  }
};


const playerAddressToGameIdMap = {};  // "playerAddress" => "gameId"
const gameIdToPlayerCollectionMap = {};  // "gameId" => { "currentStage" => number, "playerAddresses" => { "playerAddress" => boolean } }
const getAvailableGameList = () => {
  return gameIdToPlayerCollectionMap;
};

const deleteDoorPatternIfAny = (inObject) => {
  for (let key in inObject) {
    if (key === "doorPattern") {
      delete inObject[key];
    } else if (typeof inObject[key] == "object") {
      deleteDoorPatternIfAny(inObject[key]);
    }
  }
};
const scriptOutputHandler = async (packet) => {
  if (adminSocketId != null) {
    connectedClients[adminSocketId]["socket"].emit('setOutput', packet);
  }
  await deleteDoorPatternIfAny(packet);

  if (packet["Header"] != null && packet["Body"] != null) {
    let gameCreator, isGameCreatorAdmin = false, shouldForwardToPlayers = true;
    const gameId = packet["Body"]["gameId"]; // In normal situations, should never be null.
    const playerAddress = packet["Body"]["playerAddress"]; // Can be null.

    if (packet["Body"]["error"] == null) {
      if (packet["Header"]["command"] !== "gameDeletion") {
        gameCreator = packet["Body"]["gameState"]["gameCreator"];
        isGameCreatorAdmin = gameCreator === "admin";
        if (gameIdToPlayerCollectionMap[gameId] != null) {
          gameIdToPlayerCollectionMap[gameId]["currentStage"] = packet["Body"]["gameState"]["currentStage"];
        }
      }

      switch (packet["Header"]["command"]) {
        case "gameCreation":
          gameIdToPlayerCollectionMap[gameId] = {
            "currentStage": packet["Body"]["gameState"]["currentStage"],
            "playerAddresses": {}
          };
          let socketForEmit = connectedClients[playerAddressToSocketIdMap.getValueFromKey(gameCreator)]["socket"];
          if (socketForEmit !== null) {
            // Means the creator is not admin
            socketForEmit.emit('synchronizeGamePacket', packet);
          }
          shouldForwardToPlayers = false;
          break;

        case "playerAddition":
          if (playerAddressToGameIdMap[playerAddress] == null) {
            playerAddressToGameIdMap[playerAddress] = gameId;
            gameIdToPlayerCollectionMap[gameId]["playerAddresses"][playerAddress] = true;

            let playerSocketId = playerAddressToSocketIdMap.getValueFromKey(playerAddress);
            if (connectedClients[playerSocketId] != null) {
              connectedClients[playerSocketId]["socket"].join(gameId);
            }
          }
          break;

        case "informPlayers":
          // TODO : Complete this...
          if (packet["Header"]["action"] === "stageUpdated") {
            addPlayerToGame({gameId: gameId, playerAddress: gameCreator});
            shouldForwardToPlayers = false;
          }
          break;

        case "playerRemovalFromGame":
          // TODO : Send msg to players...
          let playerSocketId = playerAddressToSocketIdMap.getValueFromKey(playerAddress);
          if (connectedClients[playerSocketId] != null) {
            connectedClients[playerSocketId]["socket"].leave(gameId);
          }

          delete playerAddressToGameIdMap[playerAddress];
          delete gameIdToPlayerCollectionMap[gameId]["playerAddresses"][playerAddress];
          break;

        case "gameDeletion":
          // TODO : Complete this...
          shouldForwardToPlayers = false;
          break;

        default:
          shouldForwardToPlayers = false;
          break;
      }
    } else if (!isGameCreatorAdmin) {
      // TODO : Send 'error' event to client.
      if (playerAddress) {

      } else if (gameCreator) {

      }
    }

    if (!isGameCreatorAdmin && shouldForwardToPlayers) {
      emitter(gameId, 'synchronizeGamePacket', packet);
    }
  } else if (packet["message"] === "Python Script Exited") {
    console.log("Python Script Exited");
  }
};

let pythonProcess;
pythonProcess = new toolSet.PythonProcess({
  pythonFilePath: "./private/PythonScripts/", scriptOutputHandler: scriptOutputHandler
});
pythonProcess.sendRawPacketToScript({command: "rebuildFromDB"});

const createNewGame = (creatorSocketId, gameCoinAddress, coinChainName) => {
  let gameCreator = playerAddressToSocketIdMap.getKeyFromValue(creatorSocketId);
  if (creatorSocketId === adminSocketId) {
    gameCreator = "admin";
  } else if (gameCreator == null || playerAddressToGameIdMap[gameCreator] != null) {
    return;
  }
  let body = {
    "gameCreator": gameCreator
  };
  if (gameCoinAddress != null && coinChainName != null && Web3.utils.isAddress(gameCoinAddress)) {
    body["gameCoinAddress"] = Web3.utils.toChecksumAddress(gameCoinAddress);
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

      if (playerAddress == null || playerAddressToGameIdMap[playerAddress] != null) {
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
      if ((socketId == null) ||
        (!gameIdToPlayerCollectionMap[gameId]["playerAddresses"][playerAddressToSocketIdMap.setKeyAndValue(socketId)])) {
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

    if (!gameIdToPlayerCollectionMap[gameId]["playerAddresses"][playerAddress]) {
      return;
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

    if (!gameIdToPlayerCollectionMap[gameId]["playerAddresses"][playerAddress]) {
      return;
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
  setEmitter: setEmitter,
  setAdmin: setAdmin,
  isAdmin: isAdmin,
  bindAddress: bindAddress,
  isSocketBoundToAddress: isSocketBoundToAddress,
  updateConnectionList: updateConnectionList,
  connectionCount: connectionCount,
  deleteConnection: deleteConnection,
  getAvailableGameList: getAvailableGameList,
  pythonFunctions: pythonFunctions
};
