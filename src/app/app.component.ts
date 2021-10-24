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
  web3Service: Web3Service = new Web3Service();
  signCode: string = "";

  constructor() {
    this.socketIOService.setActionForEvent("signCode", (signCode) => {
      console.log("Received Sign Code From Server : " + signCode);
      this.signCode = signCode;
    });
  }

  bindPlayerAddress() {
    console.log("Button Clicked");

    if (this.socketIOService != null) {
      // TODO : Change values here...
      // let playerAddressInput = document.getElementById("addressInput");
      // let playerAddress = (playerAddressInput == null) ? "" : (<HTMLInputElement>playerAddressInput).value;
      if (this.web3Service.userAccount !== "") {
        this.socketIOService.emitEventToServer("bindAddress", {
          "playerAddress": this.web3Service.userAccount,
          "signedMessage": "Lorem Ipsum"
        });
      }
    }
  }
}
