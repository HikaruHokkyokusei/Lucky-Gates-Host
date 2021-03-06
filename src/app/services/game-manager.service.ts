import {AppComponent} from "../app.component";
import {ActivatedRoute, Router} from "@angular/router";
import {GameWindowComponent} from "../game-window/game-window.component";
import {CookieService} from "./cookie.service";
import {GameState} from "../models/GameManager/game-state.model";
import {AvailableGame} from "../models/GameManager/available-game.model";
import {AvailableGameListJSON} from "../models/GameManager/available-game-list-json.model";
import {TransferData} from "../models/GameManager/transfer-data.model";

export class GameManagerService {
  playerTicketCount: number = 0;
  hasSetCoinInformation: boolean = false;
  qGCA: string | null = null;
  qCCN: string | null = null;
  localGameCoinAddress: string = "0xCB18D3fE531cefe86d11eB42F1C5d47d20f046e9";  // Default Value
  localCoinChainName: string = "GOERLI";  // Default Value

  gameState: GameState = {
    players: [],
    removedPlayers: []
  };
  ourIndex: number = -1;
  previousStage: number = -1;
  stageDuration: number = 0;
  availableGameList: AvailableGame[] = [];

  currentGameWindow: GameWindowComponent | null = null;

  constructor(private router: Router, private activatedRoute: ActivatedRoute, private appComponent: AppComponent) {
  }

  finalizeRoutes = () => {
    if (!this.hasSetCoinInformation) {
      if (this.qCCN == null) {
        this.qCCN = "BSC"; // Default
      }
      if (this.qGCA == null) {
        this.qGCA = "0x64F36701138f0E85cC10c34Ea535FdBADcB54147"; // Default
      }

      let params = JSON.parse(JSON.stringify(this.activatedRoute.snapshot.queryParams));
      params["CCN"] = this.qCCN;
      params["GCA"] = this.qGCA;
      this.router.navigate([], {queryParams: params}).then(() => {
      });
    }
  };

  setCoinInformation = (localGameCoinAddress?: string, localCoinChainName?: string, GCA?: string | null, CCN?: string | null) => {
    if (GCA) {
      this.qGCA = GCA;
    }
    if (CCN) {
      this.qCCN = CCN;
    }
    if (!this.hasSetCoinInformation) {
      if (localGameCoinAddress || localCoinChainName) {
        if (localGameCoinAddress) {
          this.localGameCoinAddress = localGameCoinAddress;
        }
        if (localCoinChainName) {
          this.localCoinChainName = localCoinChainName;
        }
        CookieService.setCookie({
          name: "CCN",
          value: this.localCoinChainName,
          expireDays: 10 * 365
        });
        CookieService.setCookie({
          name: "GCA",
          value: this.localGameCoinAddress,
          expireDays: 10 * 365
        });
        this.hasSetCoinInformation = true;
        console.log("Coin Info Set To : " + this.localCoinChainName + ", " + this.localGameCoinAddress);
      }
    }
  };

  synchroniseGameData = (gameState: GameState) => {
    if (this.gameState.currentStage != null) {
      this.previousStage = this.gameState.currentStage;
    }
    let keySet = Object.keys(gameState);
    let max: number = keySet.length;
    for (let index: number = 0; index < max; index++) {
      let key = keySet[index];
      let typeKey = <keyof GameState>key;
      this.updateEntryInGameState(typeKey, gameState[typeKey]);
    }

    this.postGameDataSynchronize();
  };

  updateEntryInGameState = <GameStateKey extends keyof GameState>(key: GameStateKey, value: GameState[GameStateKey]) => {
    this.gameState[key] = value;
  };

  postGameDataSynchronize = () => {
    if (this.gameState["currentStage"] != null) {
      if (this.gameState.stageStartTime != null && this.gameState.stageEndTime != null) {
        this.stageDuration = Math.ceil((this.gameState.stageEndTime - this.gameState.stageStartTime));
      } else {
        this.stageDuration = 0;
      }
      if (this.gameState["currentStage"] >= -1 && this.gameState["currentStage"] < 6) {
        if (this.gameState["currentStage"] < 2) {
          this.appComponent.setWindowNumberToShowTo(1);
        } else {
          this.appComponent.setWindowNumberToShowTo(2);
          if (this.previousStage != this.gameState.currentStage && this.gameState.currentStage == 2) {
            this.currentGameWindow?.resetAllDoors();
          }
        }
      } else if (this.appComponent.windowNumberToShow === 1 || this.appComponent.windowNumberToShow === 2) {
        this.appComponent.setWindowNumberToShowTo(0);
      }
    }
  };

  postGameRejoin = () => {
    // TODO : Complete this... Things to do after rejoining & synchronizing with a game.
    if (this.gameState.currentStage === 3) {
      if (this.gameState.currentChoiceMakingPlayer != null && this.gameState.players != null) {
        let isMe = this.gameState.players[this.gameState.currentChoiceMakingPlayer || 0]?.playerAddress === this.appComponent.web3Service.userAccount;

        let len = (this.gameState.players[this.gameState.currentChoiceMakingPlayer].doorsOpenedByGame?.length) || 0;
        let indexArr = [], pointsArr = [];
        for (let i = 0; i < len; i++) {
          let tempArr = this.gameState.players[this.gameState.currentChoiceMakingPlayer].doorsOpenedByGame?.at(i) || [0, 0];
          indexArr.push(tempArr[0]);
          pointsArr.push(tempArr[1]);
        }

        this.doorsOpenedByGame(indexArr, pointsArr, isMe, 500);
      }
    }
  };

  synchronizeAvailableGameList = (availableGameList: AvailableGameListJSON) => {
    this.availableGameList = [];

    let keySet = Object.keys(availableGameList);
    for (let i = 0; i < keySet.length; i++) {
      let typeKey = <keyof AvailableGameListJSON>keySet[i];
      if (availableGameList[typeKey].gameCoinAddress === this.localGameCoinAddress &&
        availableGameList[typeKey].coinChainName === this.localCoinChainName &&
        availableGameList[typeKey].currentStage === 0) {
        this.availableGameList.push({
          gameId: <string>typeKey,
          playerCount: Object.keys(availableGameList[typeKey].playerAddresses).length
        });
      }
    }
  };

  setGameWindow = (gameWindow: GameWindowComponent) => {
    this.currentGameWindow = gameWindow;
  };

  createNewGame = () => {
    if (!this.gameState["gameId"]) {
      let data: TransferData = {};
      if (this.localGameCoinAddress !== "") {
        data["gameCoinAddress"] = this.localGameCoinAddress;
      }
      if (this.localCoinChainName !== "") {
        data["coinChainName"] = this.localCoinChainName;
      }

      this.appComponent.socketIOService.emitEventToServer('createNewGame', data);
    }
  };

  getAvailableGameList = () => {
    this.appComponent.socketIOService.emitEventToServer("getAvailableGameList", {});
  };

  addPlayerToGame = (gameId: string) => {
    if (!this.gameState["gameId"]) {
      let data: TransferData = {
        gameId: gameId
      };

      this.appComponent.socketIOService.emitEventToServer('addPlayerToGame', data);
    }
  };

  beginGameEarly = () => {
    if (this.gameState["gameId"]) {
      if (this.appComponent.web3Service.userAccount !== this.gameState["gameCreator"] || !this.gameState["players"] ||
        !this.gameState["minPlayers"] || this.gameState["players"].length < this.gameState["minPlayers"]) {
        this.appComponent.popUpManagerService.popNewPopUp("Only the game creator can begin the game early when at least " +
          this.gameState.minPlayers + " players have joined the game.", 5000);
        return;
      }
      let data: TransferData = {
        gameId: this.gameState["gameId"]
      };

      this.appComponent.socketIOService.emitEventToServer("beginGameEarly", data);
    }
  };

  doorsOpenedByGame = (doorsOpened: number[], respectivePoints: number[], isMe: boolean, timeoutDuration: number = 5750) => {
    if (this.currentGameWindow != null) {
      for (let i = 0; i < doorsOpened.length; i++) {
        this.currentGameWindow.openDoorAnimation(doorsOpened[i], respectivePoints[i], isMe ? "Door already open" : "");
      }
    }

    if (isMe) {
      setTimeout(() => {
        let len = respectivePoints.length;
        let message: string = "You choose door ";
        let val: number | string | undefined;
        if (this.gameState["players"] != null && this.gameState["currentChoiceMakingPlayer"] != null) {
          val = this.gameState["players"][this.gameState["currentChoiceMakingPlayer"]]["selectedDoor"];
          if (val != null) {
            val += 1;
          } else {
            val = "-";
          }
        } else {
          val = "-";
        }

        message += (val + ".<br><br>" + len + " other doors contain ");
        for (let i = 0; i < len; i++) {
          if (i < len - 2) {
            message += respectivePoints[i] + ", ";
          } else if (i < len - 1) {
            message += respectivePoints[i] + " and "
          } else {
            message += respectivePoints[i] + " points.";
          }
        }
        message += " Would you like to stick with current choice, or switch the door?";

        this.appComponent.popUpManagerService.popNewPopUp(message, 45000, false, [
          {
            buttonText: "Switch",
            onClickFunction: () => {
              this.sendPlayerSwitchSelection(true);
            },
            millisBeforeClose: 500
          },
          {
            buttonText: "Don't Switch",
            onClickFunction: () => {
              this.sendPlayerSwitchSelection(false);
            },
            millisBeforeClose: 500
          }
        ]);
      }, timeoutDuration);
    }
  };

  sendPlayerDoorSelection = (doorNumber: number) => {
    if (this.gameState["gameId"] && this.gameState["currentChoiceMakingPlayer"] != null &&
      this.gameState["players"] != null && this.gameState.currentStage != null) {
      if ((this.gameState.currentStage === 2 || this.gameState.currentStage === 4) &&
        this.gameState["players"][this.gameState.currentChoiceMakingPlayer].playerAddress === this.appComponent.web3Service.userAccount) {
        let data: TransferData = {
          gameId: this.gameState["gameId"],
          doorNumber: doorNumber
        };
        this.appComponent.socketIOService.emitEventToServer('acceptPlayerInput', data);
        this.currentGameWindow?.buttonComponents[doorNumber].disable("Cannot open previously chosen door");
      } else {
        this.appComponent.popUpManagerService.popNewPopUp("You are not allowed to make the choice right now.", 3000);
      }
    }
  };

  sendPlayerSwitchSelection = (wantToSwitch: boolean) => {
    if (this.gameState["gameId"] && this.gameState["currentChoiceMakingPlayer"] != null &&
      this.gameState["players"] != null && this.gameState.currentStage != null) {
      if (this.gameState.currentStage === 3 &&
        this.gameState["players"][this.gameState.currentChoiceMakingPlayer].playerAddress === this.appComponent.web3Service.userAccount) {
        let data: TransferData = {
          gameId: this.gameState["gameId"],
          wantToSwitch: wantToSwitch
        };

        this.appComponent.socketIOService.emitEventToServer('acceptPlayerInput', data);
      }
    } else {
      this.appComponent.popUpManagerService.popNewPopUp("You are not allowed to make the choice right now.", 3000);
    }
  };

  resetGameState = () => {
    this.gameState = {
      players: [],
      removedPlayers: []
    }

    this.appComponent.setWindowNumberToShowTo(0);
  };

  getChoiceMaker = () => {
    let data = {
      isMe: false,
      playerAddress: ""
    };

    if (this.gameState.currentChoiceMakingPlayer != null && this.gameState.players != null) {
      try {
        data.playerAddress = this.gameState.players[this.gameState.currentChoiceMakingPlayer].playerAddress;
      } catch {
      }
      data.isMe = data.playerAddress === this.appComponent.web3Service.userAccount;
    }

    return data;
  };

  getTotalPlayerPoints = () => {
    let points = 0;

    if (this.gameState.players != null) {
      if (this.ourIndex === -1 || this.ourIndex >= this.gameState["players"].length ||
        this.gameState["players"][this.ourIndex].playerAddress !== this.appComponent.web3Service.userAccount) {
        for (let i = 0; i < this.gameState["players"].length; i++) {
          if (this.gameState["players"][i].playerAddress === this.appComponent.web3Service.userAccount) {
            this.ourIndex = i;
            break;
          } else {
            this.ourIndex = -1;
          }
        }
      }

      if (this.ourIndex >= 0) {
        let temp = this.gameState["players"][this.ourIndex].totalPoints;
        points = (temp == null) ? 0 : temp;
      }
    }

    return points;
  };
}
