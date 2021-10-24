import {Component} from '@angular/core';
import {SocketIOService} from './socket-io.service'
import {Web3Service} from "./web3.service";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'Lucky-Gates-Bot';

  socketIOService: SocketIOService = new SocketIOService(window.location.origin);
  web3Service: Web3Service = new Web3Service(this);
  signCode: string = "";

  constructor() {
    this.socketIOService.setActionForEvent("signCode", (signCode) => {
      this.signCode = signCode;
      setTimeout(this.bindPlayerAddress, 500);
    });
  }

  bindPlayerAddress = () => {
    if (this.web3Service.userAccount !== "" && this.signCode !== "") {
      this.web3Service.requestSignatureFromUser(this.signCode).then((signedMessage) => {
        if (signedMessage != null) {
          this.socketIOService.emitEventToServer("bindAddress", {
            "playerAddress": this.web3Service.userAccount,
            "signedMessage": signedMessage
          });
        }
      });
    }
  }
}
