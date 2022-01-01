import {io} from 'socket.io-client';
import {AppComponent} from "../app.component";
import {GameState} from "../models/GameManager/game-state.model";

export class SocketIOService {
  socket;
  signCode: string = "";
  winPopUpId: string = "";

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
      this.appComponent.popUpManagerService.popNewPopUp("Error!!!<br><br>" + message, 5000);
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
      let gameState: GameState | null = body["gameState"];

      if (gameState != null) {
        try {
          await this.appComponent.gameManagerService.synchroniseGameData(gameState);
        } catch (err) {
        }
      }

      console.log("Received : " + header["command"] + ", " + header["action"] + " packet");

      switch (header["command"]) {
        case "gameCreation":
          if (body["error"] == null) {
            this.appComponent.setWindowNumberToShowTo(1);
          } else {
            this.appComponent.popUpManagerService.popNewPopUp("Unable to create new game.<br><br>" + body["error"], 4000);
          }
          break;

        case "playerRemovalFromGame":
          if (body["playerAddress"] === this.appComponent.web3Service.userAccount) {
            if (body["reasonForRemoval"] === "Reward Sent and Game Ended") {
              if (this.winPopUpId !== "") {
                this.appComponent.popUpManagerService.closePopUpWithId(this.winPopUpId);
                this.winPopUpId = "";
              }
              this.appComponent.popUpManagerService.popNewPopUp("Thanks for Playing. Your Reward has been sent.", 5000);
            } else {
              this.appComponent.popUpManagerService.popNewPopUp("You Lost!!<br><br>You have been removed from the game.<br><br>" + body["reasonForRemoval"],
                5000);
            }
            this.appComponent.gameManagerService.resetGameState();
          } else {
            // TODO : Complete this...
          }
          break;

        case "informPlayers":
          switch (header["action"]) {
            case "nonSelectionPenalty":
              let popMessage = "A penalty of " + body["penaltyPoints"] + " points has been applied on ";
              if (this.isAddressOur(body["playerAddress"])) {
                popMessage += "YOU";
              } else {
                popMessage += ("player " + body["playerAddress"].substr(0, Math.min(body["playerAddress"].length, 10)) + "...");
              }

              popMessage += " for not making selection withing stipulated time limit.";
              this.appComponent.popUpManagerService.popNewPopUp(popMessage, 3000);
              break;

            case "earlyGameBeginning":
              this.appComponent.popUpManagerService.popNewPopUp("The game will start in 15 seconds<br><br>Please be ready!!",
                13750, false);
              break;

            case "doorsOpenedByGame":
              if (body["playerAddress"] === this.appComponent.web3Service.userAccount) {
                this.appComponent.gameManagerService.doorsOpenedByGame(body["openedDoors"], body["respectivePoints"]);
              } else {
                let len = body["openedDoors"].length;
                for (let i = 0; i < len; i++) {
                  this.appComponent.gameManagerService.currentGameWindow?.openDoorAnimation(body["openedDoors"][i],
                    body["respectivePoints"][i], "");
                }
              }
              break;

            case "openFinalDoor":
              this.appComponent.gameManagerService.currentGameWindow?.openDoorAnimation(body["openedDoors"][0],
                body["respectivePoints"][0], "Door already open");
              break;

            case "winnerSelected":
              if (body["playerAddress"] === this.appComponent.web3Service.userAccount) {
                this.winPopUpId = this.appComponent.popUpManagerService.popNewPopUp("Congratulations. You have won the game.<br>" +
                  "Your reward : " + body["rewardAmount"] + " coins.<br>Please Wait while your reward is being sent.");
              }
              break;
          }
          break;
      }
    });

    this.setActionForEvent("availableGameList", (gameListPacket) => {
      this.appComponent.setWindowNumberToShowTo(3);
      this.appComponent.gameManagerService.synchronizeAvailableGameList(gameListPacket);
    });

    this.setActionForEvent("activePlayerCountUpdated", (playerCount) => {
      this.appComponent.playersOnline = playerCount;
    });

    this.setActionForEvent("playerTicketCount", (ticketCount) => {
      this.appComponent.gameManagerService.playerTicketCount = ticketCount;
    })
  }

  isAddressOur = (playerAddress?: string | null) => {
    if (playerAddress == null) {
      return false;
    } else {
      return playerAddress === this.appComponent.web3Service.userAccount;
    }
  };

  setActionForEvent = (eventName: string, callback: (...args: any) => any) => {
    this.socket.on(eventName, callback);
  }

  emitEventToServer = (eventName: string, data: any) => {
    this.socket.emit(eventName, data);
  }
}
