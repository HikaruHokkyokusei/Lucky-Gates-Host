import {AppComponent} from "../app.component";

interface TransferData {
  gameCoinAddress?: string,
  coinChainName?: string,
  gameId?: string,
  doorNumber?: number,
  wantToSwitch?: boolean
}
interface Player {
  playerAddress?: string
  reasonForRemovalFromGame?: string,
  doorsOpenedByGame?: number[],
  hasMadeChoice?: boolean,
  selectedDoor?: number,
  wantToSwitchDoor?: boolean,
  totalPoints?: number
}
interface GameState {
  gameId?: string,
  gameCoinAddress?: string,
  coinChainName?: string,
  minPlayers?: number,
  maxPlayers?:number,
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

export class GameManagerService {

  localGameCoinAddress: string = "";
  localCoinChainName: string = "";

  gameState: GameState = {};

  constructor(private appComponent: AppComponent, localGameCoinAddress?: string, localCoinChainName?: string) {
    if (localGameCoinAddress != null) {
      this.localGameCoinAddress = localGameCoinAddress;
    }

    if (localCoinChainName != null) {
      this.localCoinChainName = localCoinChainName;
    }
  }

  synchroniseGameData = (gameState: GameState) => {
    for (let key in Object.keys(gameState)) {
      let typeKey = <keyof GameState>key;
      this.updateEntryInGameState(typeKey, gameState[typeKey]);
    }
  };

  updateEntryInGameState = <GameStateKey extends keyof GameState>(key: GameStateKey, value: GameState[GameStateKey]) => {
    this.gameState[key] = value;
  };

  createNewGame = () => {
    let data: TransferData = {};
    if (this.localGameCoinAddress !== "") {
      data["gameCoinAddress"] = this.localGameCoinAddress;
    }
    if (this.localCoinChainName !== "") {
      data["coinChainName"] = this.localCoinChainName;
    }

    this.appComponent.socketIOService.emitEventToServer('createNewGame', data);
  };

  addPlayerToGame = (gameId: string) => {
    if (this.gameState["gameId"] === "") {
      let data: TransferData = {
        gameId: gameId
      };

      this.appComponent.socketIOService.emitEventToServer('addPlayerToGame', data);
    }
  };

  sendPlayerDoorSelection = (doorNumber: number) => {
    if (this.gameState["gameId"] !== "") {
      let data: TransferData = {
        gameId: this.gameState["gameId"],
        doorNumber: doorNumber
      };

      this.appComponent.socketIOService.emitEventToServer('acceptPlayerInput', data);
    }
  };

  sendPlayerSwitchSelection = (wantToSwitch: boolean) => {
    if (this.gameState["gameId"] !== "") {
      let data: TransferData = {
        gameId: this.gameState["gameId"],
        wantToSwitch: wantToSwitch
      };

      this.appComponent.socketIOService.emitEventToServer('acceptPlayerInput', data);
    }
  };
}
