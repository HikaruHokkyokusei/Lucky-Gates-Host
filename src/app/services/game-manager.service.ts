import {AppComponent} from "../app.component";

export interface TransferData {
  gameCoinAddress?: string,
  coinChainName?: string,
  gameId?: string,
  doorNumber?: number,
  wantToSwitch?: boolean
}

export interface Player {
  playerAddress?: string
  reasonForRemovalFromGame?: string,
  doorsOpenedByGame?: number[],
  hasMadeChoice?: boolean,
  selectedDoor?: number,
  wantToSwitchDoor?: boolean,
  totalPoints?: number
}

export interface GameState {
  gameId?: string,
  gameCoinAddress?: string,
  coinChainName?: string,
  gameCreator?: string,
  minPlayers?: number,
  maxPlayers?: number,
  players?: Player[],
  removedPlayers?: Player[],
  currentStage?: number,
  gameStartTime?: number,
  stageStartTime?: number,
  stageEndTime?: number,
  gameEndTime?: number,
  requiredDoorSelectionStage?: number,
  currentChoiceMakingPlayer?: number,
  gameEndReason?: string,
}

export interface AvailableGameListJSON {
  [gameId: string]: {
    gameCoinAddress: string,
    coinChainName: string,
    currentStage: number,
    gameCreator: string,
    playerAddresses: {
      [playerAddress: string]: string
    }
  }
}

export interface AvailableGame {
  gameId: string,
  playerCount: number;
}

export class GameManagerService {

  localGameCoinAddress: string = "0x64F36701138f0E85cC10c34Ea535FdBADcB54147";  // Default Value
  localCoinChainName: string = "BSC";  // Default Value

  gameState: GameState = {
    players: [],
    removedPlayers: []
  };
  availableGameList: AvailableGame[] = [];

  constructor(private appComponent: AppComponent, localGameCoinAddress?: string, localCoinChainName?: string) {
    if (localGameCoinAddress != null) {
      this.localGameCoinAddress = localGameCoinAddress;
    }

    if (localCoinChainName != null) {
      this.localCoinChainName = localCoinChainName;
    }
  }

  synchroniseGameData = (gameState: GameState) => {
    let keySet = Object.keys(gameState);
    let max: number = keySet.length;
    for (let index: number = 0; index < max; index++) {
      let key = keySet[index];
      let typeKey = <keyof GameState>key;
      this.updateEntryInGameState(typeKey, gameState[typeKey]);
    }
  };

  updateEntryInGameState = <GameStateKey extends keyof GameState>(key: GameStateKey, value: GameState[GameStateKey]) => {
    this.gameState[key] = value;
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
    if (this.gameState["gameId"]) {
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
        return;
      }
      let data: TransferData = {
        gameId: this.gameState["gameId"]
      };

      this.appComponent.socketIOService.emitEventToServer("beginGameEarly", data);
    }
  };

  sendPlayerDoorSelection = (doorNumber: number) => {
    if (this.gameState["gameId"]) {
      let data: TransferData = {
        gameId: this.gameState["gameId"],
        doorNumber: doorNumber
      };

      this.appComponent.socketIOService.emitEventToServer('acceptPlayerInput', data);
    }
  };

  sendPlayerSwitchSelection = (wantToSwitch: boolean) => {
    if (this.gameState["gameId"]) {
      let data: TransferData = {
        gameId: this.gameState["gameId"],
        wantToSwitch: wantToSwitch
      };

      this.appComponent.socketIOService.emitEventToServer('acceptPlayerInput', data);
    }
  };
}
