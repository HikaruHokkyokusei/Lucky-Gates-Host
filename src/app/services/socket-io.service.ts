import {io} from 'socket.io-client';
import {AppComponent} from "../app.component";
import {GameState} from "./game-manager.service";

export class SocketIOService {
  socket;
  signCode: string = "";

  constructor(private appComponent: AppComponent) {
    this.socket = io(window.location.origin, {
      'reconnectionDelay': 2500,
      "reconnectionAttempts": 100
    });

    this.setActionForEvent("signCode", (signCode) => {
      this.signCode = signCode;
      this.appComponent.bindPlayerAddress();
    });

    this.setActionForEvent("error", (message) => {
      this.appComponent.popNewPopUp("Error!!! : " + message, 5000);
    });

    this.setActionForEvent("rejoinGame", (gameState) => {
      if (gameState != null) {
        try {
          this.appComponent.gameManagerService.synchroniseGameData(<GameState>gameState);
          this.appComponent.gameManagerService.postGameRejoin();
        } catch (err) {
        }
      }
    });

    this.setActionForEvent("synchronizeGamePacket", async (gamePacket) => {
      let header = gamePacket["Header"];
      let body = gamePacket["Body"];

      if (body["gameState"] != null) {
        try {
          let gameState: GameState = body["gameState"];
          await this.appComponent.gameManagerService.synchroniseGameData(gameState);
        } catch (err) {
        }
      }

      switch (header["command"]) {
        case "gameCreation":
          if (body["error"] == null) {
            this.appComponent.setWindowNumberToShowTo(1);
          } else {
            this.appComponent.popNewPopUp("Unable to create new game. Reason : " + gamePacket["Body"]["error"], 5000);
          }
          break;

        case "playerRemovalFromGame":
          if (gamePacket["Body"]["playerAddress"] === this.appComponent.web3Service.userAccount) {
            this.appComponent.popNewPopUp("You have been removed from the game. Reason : " + gamePacket["Body"]["reasonForRemoval"],
              5000);
            this.appComponent.gameManagerService.resetGameState();
          } else {
            // TODO : Complete this...
          }
          break;
      }
    });

    this.setActionForEvent("availableGameList", (gameListPacket) => {
      this.appComponent.setWindowNumberToShowTo(3);
      this.appComponent.gameManagerService.synchronizeAvailableGameList(gameListPacket);
    });
  }

  setActionForEvent(eventName: string, callback: (...args: any) => any) {
    this.socket.on(eventName, callback);
  }

  emitEventToServer(eventName: string, data: any) {
    this.socket.emit(eventName, data);
  }
}
