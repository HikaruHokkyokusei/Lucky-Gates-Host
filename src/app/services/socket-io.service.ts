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

    this.setActionForEvent("synchronizeGamePacket", (gamePacket) => {
      let header = gamePacket["Header"];
      let body = gamePacket["Body"];

      if (body["gameState"] != null) {
        try {
          let gameState: GameState = body["gameState"];
          this.appComponent.gameManagerService.synchroniseGameData(gameState);
        } catch (err) {
        }
      }

      switch (header["command"]) {
        case "gameCreation":
          if (body["error"] == null) {
            this.appComponent.setWindowNumberToShowTo(1);
          }
      }
    });

    this.setActionForEvent("availableGameList", (gameListPacket) => {
      this.appComponent.gameManagerService.synchronizeAvailableGameList(gameListPacket);
    })
  }

  setActionForEvent(eventName: string, callback: (...args: any[]) => any) {
    this.socket.on(eventName, callback);
  }

  emitEventToServer(eventName: string, data: any) {
    this.socket.emit(eventName, data);
  }
}
