import {Component, Input, OnInit} from '@angular/core';
import {AppComponent} from "../app.component";
import * as RCPJson from "private/PythonScripts/registeredCoinPreferences.json";

interface RegisteredCoinData {
  [coinChainName: string]: {
    chainId: number;
    paymentManagerContractAddress: string;
    registeredCoinAddresses: {
      [gameCoinAddress: string]: {
        ticketCost: number,
        isTicketPurchaseActive: boolean,
        otherOptions?: any
      }
    }
  }
}

@Component({
  selector: 'app-ticket-buy-window[appComponent]',
  templateUrl: './ticket-buy-window.component.html',
  styleUrls: ['./ticket-buy-window.component.css']
})
export class TicketBuyWindowComponent implements OnInit {

  @Input() appComponent!: AppComponent;
  chainId: number = -1;
  paymentManagerContractAddress: string = "";
  buildSuccess: boolean = false;
  localCoinData: any;

  constructor() {
  }


  ngOnInit(): void {
    let registeredCoinData = <RegisteredCoinData>RCPJson;
    let localCoinChainName: string = this.appComponent.gameManagerService.localCoinChainName;
    let localGameCoinAddress: string = this.appComponent.gameManagerService.localGameCoinAddress;

    try {
      this.chainId = registeredCoinData[localCoinChainName].chainId;
      this.paymentManagerContractAddress = this.appComponent.web3Service.web3.utils.toChecksumAddress(
        registeredCoinData[localCoinChainName].paymentManagerContractAddress, this.chainId
      );
      this.localCoinData = registeredCoinData[localCoinChainName].registeredCoinAddresses[localGameCoinAddress];
      this.buildSuccess = true;
    } catch (err) {
      console.log(err);
    }
  }

}
