import {Component, Input, OnInit} from '@angular/core';
import {AppComponent} from "../app.component";
import * as RCPJson from "private/PythonScripts/registeredCoinPreferences.json";

interface CoinData {
  symbol: string
  decimals: number,
  ticketCost: number,
  isTicketPurchaseActive: boolean,
  otherOptions?: any
}

interface CoinCollectionData {
  [coinChainName: string]: {
    chainId: number;
    paymentManagerContractAddress: string;
    registeredCoinAddresses: {
      [gameCoinAddress: string]: CoinData
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
  localCoinChainName: string = "";
  localGameCoinAddress: string = "";
  chainId: number = -1;
  paymentManagerContractAddress: string = "";
  buildSuccess: boolean = false;
  localCoinData: CoinData = {
    symbol: "",
    decimals: 0,
    ticketCost: 0,
    isTicketPurchaseActive: false
  };
  amountToBuy: number = 0;

  constructor() {
  }

  ngOnInit(): void {
    let registeredCoinData = <CoinCollectionData>RCPJson;
    this.localCoinChainName = this.appComponent.gameManagerService.localCoinChainName;
    this.localGameCoinAddress = this.appComponent.gameManagerService.localGameCoinAddress;

    try {
      this.chainId = registeredCoinData[this.localCoinChainName].chainId;
      try {
        this.paymentManagerContractAddress = this.appComponent.web3Service.web3.utils.toChecksumAddress(
          registeredCoinData[this.localCoinChainName].paymentManagerContractAddress, this.chainId
        );
      } catch (err) {
      }
      if (registeredCoinData[this.localCoinChainName] == null ||
        registeredCoinData[this.localCoinChainName].registeredCoinAddresses[this.localGameCoinAddress] == null) {
        return;
      }
      this.localCoinData = registeredCoinData[this.localCoinChainName].registeredCoinAddresses[this.localGameCoinAddress];
      let len = this.localCoinData.symbol.length;
      if (len > 5) {
        this.localCoinData.symbol = this.localCoinData.symbol.substr(0, 5) + "...";
      }
      this.buildSuccess = true;
    } catch (err) {
      console.log(err);
    }
  }

  onClickSub = () => {
    if (this.amountToBuy > 0) {
      this.amountToBuy--;
    }
  };

  onClickAdd = () => {
    if (this.amountToBuy < 10) {
      this.amountToBuy++;
    }
  };

}
