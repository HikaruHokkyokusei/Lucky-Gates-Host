import {Component, Input, OnDestroy, OnInit} from '@angular/core';
import {AppComponent} from "../app.component";
import * as RCPJson from "private/PythonScripts/configsForRegisteredCoin.json";
import * as configSmartContract from "private/PythonScripts/configsForSmartContract.json";

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
export class TicketBuyWindowComponent implements OnInit, OnDestroy {

  @Input() appComponent!: AppComponent;
  localCoinChainName: string = "";
  localGameCoinAddress: string = "";
  chainId: number = -1;
  paymentManagerContractAddress: string = "";
  paymentManagerContract: any = null;
  buildSuccess: boolean = false;
  localCoinData: CoinData = {
    symbol: "",
    decimals: 0,
    ticketCost: 0,
    isTicketPurchaseActive: false
  };
  amountToBuy: number = 0;
  errorMessage: string = "";
  activePopUpId: string = "";

  constructor() {
  }

  ngOnInit(): void {
    let registeredCoinData = <CoinCollectionData>RCPJson;
    this.localCoinChainName = this.appComponent.gameManagerService.localCoinChainName;
    this.localGameCoinAddress = this.appComponent.gameManagerService.localGameCoinAddress;

    try {
      this.chainId = registeredCoinData[this.localCoinChainName].chainId;
      this.paymentManagerContractAddress = this.appComponent.web3Service.web3.utils.toChecksumAddress(
        registeredCoinData[this.localCoinChainName].paymentManagerContractAddress, this.chainId
      );
      this.paymentManagerContract = new this.appComponent.web3Service.web3.eth.Contract(
        (<any>configSmartContract).default, this.paymentManagerContractAddress
      );

      if (registeredCoinData[this.localCoinChainName] != null &&
        registeredCoinData[this.localCoinChainName].registeredCoinAddresses[this.localGameCoinAddress] != null) {
        this.localCoinData = registeredCoinData[this.localCoinChainName].registeredCoinAddresses[this.localGameCoinAddress];
        let len = this.localCoinData.symbol.length;
        if (len > 9) {
          this.localCoinData.symbol = this.localCoinData.symbol.substr(0, 7) + "...";
        }
        this.buildSuccess = true;
      }
    } catch (err) {
      this.buildSuccess = false;
      console.log(err);
    }

    if (!this.buildSuccess) {
      this.errorMessage = "Provided Coin Address for the Selected Chain is not registered.";
    } else if (this.chainId != this.appComponent.web3Service.chainId) {
      this.buildSuccess = false;
      this.errorMessage = "Invalid Chain Selected in Web3 Provider.";
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

  closeOldPopUpIfAny = (performBuildCheck: boolean = true) => {
    if (performBuildCheck && !this.buildSuccess) {
      return;
    }
    if (this.activePopUpId != "") {
      this.appComponent.popUpManagerService.closePopUpWithId(this.activePopUpId);
    }
  };

  onClickBuy = async () => {
    if (this.amountToBuy < 0 || this.amountToBuy > 10) {
      return;
    }
    let costOfPurchase = BigInt(this.amountToBuy) * BigInt(this.localCoinData.ticketCost);
    let purchaseCostWithDecimals = costOfPurchase * (BigInt(10) ** BigInt(this.localCoinData.decimals));

    if (this.buildSuccess && this.paymentManagerContract != null) {
      this.activePopUpId = this.appComponent.popUpManagerService.popNewPopUp("Please Wait");

      let playerBalance, coinAllowance, networkGasFee;
      try {
        let prepData = await this.paymentManagerContract.methods["getPrepData"](
          this.appComponent.web3Service.userAccount,
          this.localGameCoinAddress
        ).call();

        playerBalance = prepData["0"];
        coinAllowance = prepData["1"];
        networkGasFee = prepData["2"];
      } catch (err) {
        this.closeOldPopUpIfAny();
        this.appComponent.popUpManagerService.popNewPopUp("Unable to communicate payment smart contract. Please contract support.");
        console.log(err);
        return;
      }

    }
  };

  ngOnDestroy() {
    this.closeOldPopUpIfAny(false);
  }

}
