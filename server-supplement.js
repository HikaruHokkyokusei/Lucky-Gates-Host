"use strict";

const toolSet = require("./private/ToolSet");
const blockchainManager = require("./private/BlockchainManager");
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
const connectedClients = {};  // socketId => { "signCode" => str, "socket" => object }
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

const playerAddressToSocketIdMap = new toolSet.TwoWayMap({});  // playerAddress <<==>> socketId
const bindAddress = (socketId, signedMessage, playerAddress) => {
  if (connectedClients[socketId] != null && Web3.utils.isAddress(playerAddress)) {
    playerAddress = Web3.utils.toChecksumAddress(playerAddress);

    try {
      if (tools.equalsIgnoreCase(playerAddress, web3.eth.accounts.recover(connectedClients[socketId]["signCode"], signedMessage))) {
        playerAddressToSocketIdMap.setKeyAndValue(playerAddress, socketId);
        if (playerAddressToGameIdMap[playerAddress] != null) {
          connectedClients[socketId]["socket"].join(playerAddressToGameIdMap[playerAddress]);
          connectedClients[socketId]["socket"].emit("rejoinGame", lastGameStateMap[playerAddressToGameIdMap[playerAddress]]);
        }
      }
    } catch {
      console.log("Unable to bind player address.");
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


const playerAddressToGameIdMap = {};  // playerAddress => gameId
const lastGameStateMap = {};  // gameId => gameState

/*
* "gameId" => {
*   "gameCoinAddress" => string,
*   "coinChainName" => string,
*   "currentStage" => number,
*   "gameCreator" => string,
*   "playerAddresses" => {
*     "playerAddress" => boolean
*   }
* }
* */
const gameIdToPlayerCollectionMap = {};
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
    const playerSocketId = (playerAddress == null) ? null : playerAddressToSocketIdMap.getValueFromKey(playerAddress);
    const gameState = packet["Body"]["gameState"];
    if (gameState != null) {
      lastGameStateMap[gameId] = gameState;
      gameCreator = gameState["gameCreator"];
      isGameCreatorAdmin = gameCreator === "admin";
      if (gameIdToPlayerCollectionMap[gameId] != null) {
        gameIdToPlayerCollectionMap[gameId]["currentStage"] = gameState["currentStage"];
      }
    }

    if (packet["Body"]["error"] == null || packet["Header"]["command"] === "ticket") {
      switch (packet["Header"]["command"]) {
        case "gameCreation":
          gameIdToPlayerCollectionMap[gameId] = {
            "gameCoinAddress": gameState["gameCoinAddress"],
            "coinChainName": gameState["coinChainName"],
            "currentStage": gameState["currentStage"],
            "gameCreator": gameCreator,
            "playerAddresses": {}
          };
          if (!isGameCreatorAdmin) {
            connectedClients[playerAddressToSocketIdMap.getValueFromKey(gameCreator)]["socket"].emit('synchronizeGamePacket', packet);
          }
          shouldForwardToPlayers = false;
          break;

        case "playerAddition":
          playerAddressToGameIdMap[playerAddress] = gameId;
          gameIdToPlayerCollectionMap[gameId]["playerAddresses"][playerAddress] = true;
          if (connectedClients[playerSocketId] != null) {
            connectedClients[playerSocketId]["socket"].join(gameId);
          }
          break;

        case "informPlayers":
          if (packet["Header"]["action"] === "stageUpdated") {
            addPlayerToGame(gameId, gameCreator, null);
            shouldForwardToPlayers = false;
          } else if (packet["Header"]["action"] === "winnerSelected") {
            blockchainManager.sendRewardToWinner(gameId, packet["Body"]["playerAddress"], packet["Body"]["coinChainName"],
              packet["Body"]["gameCoinAddress"], packet["Body"]["rewardAmount"], packet["Body"]["gameFee"])
              .then(({success, gameId, trxHash}) => {
                console.log("Send Reward (" + gameId + ") Success : " + success);
                if (success) {
                  pythonProcess.sendRawPacketToScript({
                      command: "game", action: "rewardSent", body: {
                        gameId,
                        trxHash
                      }
                    }
                  );
                }
              });
          }
          break;

        case "playerRemovalFromGame":
          if (connectedClients[playerSocketId] != null) {
            emitter(gameId, 'synchronizeGamePacket', packet);
            connectedClients[playerSocketId]["socket"].leave(gameId);
          }
          delete playerAddressToGameIdMap[playerAddress];
          delete gameIdToPlayerCollectionMap[gameId]["playerAddresses"][playerAddress];
          break;

        case "gameDeletion":
          delete lastGameStateMap[gameId];
          delete gameIdToPlayerCollectionMap[gameId];
          shouldForwardToPlayers = false;
          break;

        case "ticket":
          if (playerSocketId != null) {
            if (packet["Header"]["action"] === "buy") {
              connectedClients[playerSocketId]["socket"].emit("ticketPurchase", {
                success: packet["Body"]["error"] == null,
                ticketCount: packet["Body"]["ticketCount"],
                reasonIfNotSuccess: packet["Body"]["error"]
              });
            } else if (packet["Header"]["action"] === "get") {
              connectedClients[playerSocketId]["socket"].emit("ticketCount", {
                ticketCount: packet["Body"]["ticketCount"]
              });
            }
          }
          break;
      }

      if (!isGameCreatorAdmin && shouldForwardToPlayers) {
        emitter(gameId, 'synchronizeGamePacket', packet);
      }
    } else if (!isGameCreatorAdmin) {
      let emitSocketId = null;
      if (playerAddress) {
        emitSocketId = playerSocketId;
      } else if (gameCreator) {
        emitSocketId = playerAddressToSocketIdMap.getValueFromKey(gameCreator);
      }

      if (connectedClients[emitSocketId] != null) {
        connectedClients[emitSocketId]["socket"].emit("error", packet["Body"]["error"]);
      }
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
    emitter(creatorSocketId, "error", "Player is already part of another game. Cannot create new game.");
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
const addPlayerToGame = (gameId, playerAddress = null, socketId = null) => {
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
const beginGameEarly = (gameId, creatorCheck, socketId) => {
  if (gameId && gameIdToPlayerCollectionMap[gameId]) {
    if (creatorCheck && (socketId == null ||
      gameIdToPlayerCollectionMap[gameId]["gameCreator"] !== playerAddressToSocketIdMap.getKeyFromValue(socketId))) {
      return;
    }
  }

  let body = {
    gameId: gameId
  };
  pythonProcess.sendRawPacketToScript({command: "game", action: "beginGameEarly", body: body});
};
const savePlayerDoorSelection = (gameId, playerAddress = null, socketId = null, doorNumber = null) => {
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
const savePlayerSwitchSelection = (gameId, playerAddress = null, socketId = null, wantToSwitch = null) => {
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
const buyTicketsForPlayer = (referenceId, coinChainName, playerAddress = null, socketId = null) => {
  if (referenceId != null && coinChainName != null) {
    if (playerAddress == null) {
      if (socketId == null) {
        return;
      }

      playerAddress = playerAddressToSocketIdMap.getKeyFromValue(socketId);

      if (playerAddress == null) {
        return;
      }
    }

    blockchainManager.verifyPaymentForPlayer(referenceId, playerAddress, coinChainName)
      .then(({success, ticketCount, gameCoinAddress, reasonIfNotSuccess}) => {
        let message = {success, ticketCount, reasonIfNotSuccess};
        if (success) {
          pythonProcess.sendRawPacketToScript({
            command: "ticket", action: "buy", body: {
              playerAddress,
              ticketCount,
              referenceId,
              coinChainName,
              gameCoinAddress
            }
          });
        } else {
          let socket = connectedClients[socketId]["socket"];
          if (socket != null) {
            socket.emit("ticketPurchase", message);
          }
        }
      });
  }
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
