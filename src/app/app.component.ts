import {AfterViewInit, Component} from '@angular/core';
import {SocketIOService} from './services/socket-io.service'
import {Web3Service} from "./services/web3.service";
import {GameManagerService} from "./services/game-manager.service";
import {ButtonData} from "./UIElements/pop-up/pop-up.component";
import * as uuid from 'uuid';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements AfterViewInit {

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

  activePopUps: { [id: string]: { text: string, autoCloseAfterMillis: number, buttonList: ButtonData[] } } = {};
  activePopUpKeys: string[] = Object.keys(this.activePopUps);

  constructor() {
  }

  ngAfterViewInit() {
    if (!this.web3Service.web3) {
      this.popNewPopUp("No Web3 Support Found! Consider Using Metamask.");
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

  popNewPopUp = (text: string, autoCloseAfterMillis: number = -1, buttonList: ButtonData[] = []) => {
    let id: string = uuid.v4();
    this.activePopUps[id] = {
      text,
      autoCloseAfterMillis,
      buttonList
    };
    this.activePopUpKeys = Object.keys(this.activePopUps);
  };

  popUpClosed = (id: string) => {
    delete this.activePopUps[id];
    this.activePopUpKeys = Object.keys(this.activePopUps);
  };
}
