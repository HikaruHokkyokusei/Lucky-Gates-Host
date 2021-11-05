import {AfterViewInit, Component, ViewChild} from '@angular/core';
import {SocketIOService} from './services/socket-io.service'
import {Web3Service} from "./services/web3.service";
import {GameManagerService} from "./services/game-manager.service";
import {PopUpComponent} from "./UIElements/pop-up/pop-up.component";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements AfterViewInit {
  @ViewChild("RootPopUp") rootPopUp!: PopUpComponent;

  title: string = 'Lucky-Gates-Bot';
  socketIOService: SocketIOService = new SocketIOService(this);
  web3Service: Web3Service = new Web3Service(this);
  gameManagerService: GameManagerService = new GameManagerService(this);
  isBindingPlayerAddress: boolean = false;

  /*
  * 0 => Main Menu
  * 1 => Player Menu
  * 2 => Game Window
  * 3 => Join Menu
  * */
  windowNumberToShow: number = 0;

  constructor() {
  }

  ngAfterViewInit() {
    if (!this.web3Service.web3) {
      this.showPopUP("No Web3 Support Found! Consider Using Metamask.");
    }
  }

  shouldShowLoadingScreen = () => {
    return this.socketIOService.signCode === "" || !this.web3Service.web3BuildSuccess || !this.web3Service.didSignMessage;
  };

  setWindowNumberToShowTo = (windowNumberToShow: number) => {
    if (this.windowNumberToShow !== windowNumberToShow) {
      this.windowNumberToShow = windowNumberToShow;
    }
  };

  bindPlayerAddress = () => {
    if (this.web3Service.userAccount !== "" && this.socketIOService.signCode !== "" && !this.isBindingPlayerAddress) {
      this.isBindingPlayerAddress = true;
      this.web3Service.requestSignatureFromUser(this.socketIOService.signCode).then((signedMessage) => {
        if (signedMessage != null) {
          this.socketIOService.emitEventToServer("bindAddress", {
            "playerAddress": this.web3Service.userAccount,
            "signedMessage": signedMessage
          });
        }
      }).finally(() => {
        this.isBindingPlayerAddress = false;
      });
    }
  };

  showPopUP = (displayText: string = "", closeOverride: boolean = false, millisBeforeAutoClose: number = -1) => {
    this.rootPopUp.setText(displayText);
    this.rootPopUp.setPopUpVisibilityTo(true, closeOverride, millisBeforeAutoClose);
  };

  hidePopUp = () => {
    this.rootPopUp.setPopUpVisibilityTo(false);
  };
}
