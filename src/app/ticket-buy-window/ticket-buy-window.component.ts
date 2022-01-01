import {Component, Input, OnDestroy, OnInit} from '@angular/core';
import {AppComponent} from "../app.component";
import * as uuid from "uuid";
import * as RCPJson from "private/PythonScripts/configsForRegisteredCoin.json";
import * as configSmartContract from "private/PythonScripts/configsForSmartContract.json";
import {ButtonData} from "../UIElements/pop-up/pop-up.component";
import {ToolSetService} from "../services/tool-set.service";

interface CoinData {
  symbol: string
  decimals: number,
  ticketCost: number,
  serverTicketCost: number,
  isTicketPurchaseActive: boolean,
  otherOptions: any
}

export interface CoinCollectionData {
  [coinChainName: string]: {
    chainId: number;
    paymentManagerContractAddress: string;
    registeredCoinAddresses: {
      [gameCoinAddress: string]: CoinData
    }
  }
}

interface PurchaseData {
  id: string,
  encounteredError: boolean,
  hasEnded: boolean,
  amountToBuy: number,
  costOfPurchase: bigint,
  purchaseCostWithDecimals: bigint,
  hasFetchedData: boolean,
  playerBalance: bigint,
  coinAllowance: bigint,
  networkGasFee: bigint
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
  smartContractConfigs: any = (<any>configSmartContract).default;
  buildSuccess: boolean = false;
  errorMessage: string = "";

  paymentManagerContract: any = null;
  erc20Contract: any = null;
  displayTicketCost: string = "0";
  localCoinData: CoinData = {
    symbol: "",
    decimals: 0,
    ticketCost: 0,
    serverTicketCost: 0,
    isTicketPurchaseActive: false,
    otherOptions: null
  };
  amountToBuy: number = 0;
  activePopUpId: string = "";
  lastPopUpMessage: string = "";
  currentActivePurchase: PurchaseData = {
    id: "",
    encounteredError: false,
    hasEnded: true,
    amountToBuy: 0,
    costOfPurchase: BigInt(0),
    hasFetchedData: false,
    purchaseCostWithDecimals: BigInt(0),
    playerBalance: BigInt(0),
    coinAllowance: BigInt(0),
    networkGasFee: BigInt(0)
  };

  constructor() {
  }

  ngOnInit(): void {
    this.appComponent.socketIOService.setActionForEvent("ticketPurchase",
      (data: any) => {
        this.onResponseFromServer(data["success"], data["ticketCount"], data["reasonIfNotSuccess"]);
      });
    let registeredCoinData = <CoinCollectionData>RCPJson;
    this.localCoinChainName = this.appComponent.gameManagerService.localCoinChainName;
    this.localGameCoinAddress = this.appComponent.gameManagerService.localGameCoinAddress;

    try {
      this.chainId = registeredCoinData[this.localCoinChainName].chainId;
      this.paymentManagerContractAddress = this.appComponent.web3Service.web3.utils.toChecksumAddress(
        registeredCoinData[this.localCoinChainName].paymentManagerContractAddress, this.chainId
      );
      this.paymentManagerContract = new this.appComponent.web3Service.web3.eth.Contract(
        this.smartContractConfigs["paymentManagerABI"], this.paymentManagerContractAddress
      );
      this.erc20Contract = new this.appComponent.web3Service.web3.eth.Contract(
        this.smartContractConfigs["erc20ABI"], this.localGameCoinAddress
      );

      if (registeredCoinData[this.localCoinChainName] != null &&
        registeredCoinData[this.localCoinChainName].registeredCoinAddresses[this.localGameCoinAddress] != null) {
        this.localCoinData = registeredCoinData[this.localCoinChainName].registeredCoinAddresses[this.localGameCoinAddress];
        this.displayTicketCost = ToolSetService.nFormatter(this.localCoinData.ticketCost);
        let len = this.localCoinData.symbol.length;
        if (len > 9) {
          this.localCoinData.symbol = this.localCoinData.symbol.substr(0, 7) + "...";
        }
        if (this.localCoinData.isTicketPurchaseActive) {
          this.buildSuccess = true;
        }
      }
    } catch (err) {
      this.buildSuccess = false;
      console.log(err);
    }

    if (!this.buildSuccess) {
      if (!this.localCoinData.isTicketPurchaseActive) {
        this.errorMessage = "Purchase for the selected coin is not active at the moment.";
      } else {
        this.errorMessage = "Provided Coin Address on the Selected Chain is not registered.";
      }
    } else if (this.chainId != this.appComponent.web3Service.chainId) {
      this.buildSuccess = false;
      this.errorMessage = "Invalid Chain Selected in Web3 Provider. Please select " + this.localCoinChainName + " chain.";
      window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{chainId: "0x" + this.appComponent.web3Service.chainId.toString(16)}]
      }).then(() => {
      }).catch((switchError: any) => {
        if (switchError === 4902) {
          // TODO : Do something if chain is not added to player's metamask...
        }
      });
    }
  }

  resetCurrentPurchase = () => {
    this.currentActivePurchase = {
      id: "",
      encounteredError: false,
      hasEnded: true,
      amountToBuy: 0,
      costOfPurchase: BigInt(0),
      hasFetchedData: false,
      purchaseCostWithDecimals: BigInt(0),
      playerBalance: BigInt(0),
      coinAllowance: BigInt(0),
      networkGasFee: BigInt(0)
    };
  };

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

  generateNewPopUp = (saveMsg: boolean, text: string, autoCloseAfterMillis: number = -1,
                      isClosable: boolean = true, buttonList?: ButtonData[]) => {
    this.closeOldPopUpIfAny();
    this.activePopUpId = this.appComponent.popUpManagerService.popNewPopUp(text, autoCloseAfterMillis, isClosable, buttonList);
    if (saveMsg) {
      this.lastPopUpMessage = text;
    } else {
      this.lastPopUpMessage = "";
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

  onClickBuy = () => {
    this.resetCurrentPurchase();
    if (this.amountToBuy <= 0 || this.amountToBuy > 10) {
      return;
    }

    if (this.buildSuccess && this.paymentManagerContract != null) {
      let id: string = uuid.v4() + uuid.v4();
      let costOfPurchase = BigInt(this.amountToBuy) * BigInt(this.localCoinData.ticketCost);
      this.currentActivePurchase = {
        id: id,
        encounteredError: false,
        hasEnded: false,
        amountToBuy: 0,
        costOfPurchase: costOfPurchase,
        purchaseCostWithDecimals: costOfPurchase * (BigInt(10) ** BigInt(this.localCoinData.decimals)),
        hasFetchedData: false,
        playerBalance: BigInt(0),
        coinAllowance: BigInt(0),
        networkGasFee: BigInt(0)
      };

      this.generateNewPopUp(false, "You are about to buy " + this.amountToBuy + " ticket(s) of " + this.localCoinData.symbol +
        " on " + this.localCoinChainName + " network. Once bought, they cannot be converted back. It is recommended to buy " +
        "tickets in small batches and use them in game before buying more.", -1, true, [
        {
          buttonText: "Confirm",
          onClickFunction: this.displayPaymentSummary,
          millisBeforeClose: 500
        }
      ]);

      this.paymentManagerContract.methods["getPrepData"](
        this.appComponent.web3Service.userAccount,
        this.localGameCoinAddress
      ).call().then((prepData: any) => {
        this.currentActivePurchase.playerBalance = prepData["0"];
        this.currentActivePurchase.coinAllowance = prepData["1"];
        this.currentActivePurchase.networkGasFee = prepData["2"];
        this.currentActivePurchase.hasFetchedData = true;
      }).catch(() => {
        this.currentActivePurchase.encounteredError = true;
      });

    }
  };

  displayPaymentSummary = () => {
    if (!this.currentActivePurchase.hasEnded) {
      if (this.currentActivePurchase.encounteredError) {
        this.generateNewPopUp(false, "Unable to fetch data from blockchain. Please try again later.");
      } else if (this.currentActivePurchase.hasFetchedData) {
        if (this.currentActivePurchase.playerBalance >= this.currentActivePurchase.purchaseCostWithDecimals) {
          let isApprovalNeeded = this.currentActivePurchase.purchaseCostWithDecimals > this.currentActivePurchase.coinAllowance;
          let popUpMessage = "Once you click continue, you need to :<br>";
          if (isApprovalNeeded) {
            popUpMessage += "Approve " + this.currentActivePurchase.costOfPurchase + " " + this.localCoinData.symbol + "<br>";
          }
          popUpMessage += "Pay " + this.currentActivePurchase.costOfPurchase + " " + this.localCoinData.symbol + "<br>";

          this.generateNewPopUp(false, popUpMessage, -1, true, [
            {
              buttonText: "Continue",
              onClickFunction: (isApprovalNeeded) ? this.approveCoins : this.payCoins,
              millisBeforeClose: 500
            }
          ]);
        } else {
          this.generateNewPopUp(false, "You do not have enough " + this.localCoinData.symbol + " to make the purchase.");
          this.currentActivePurchase.hasEnded = true;
        }
      } else {
        if (this.lastPopUpMessage != "Please Wait. Gathering Information!!") {
          this.generateNewPopUp(true, "Please Wait. Gathering Information!!", -1, false);
        }
        setTimeout(this.displayPaymentSummary, 2000);
      }
    } else {
      this.generateNewPopUp(false, "Purchase Ended / Cancelled.", 1500);
    }
  };

  approveCoins = () => {
    this.generateNewPopUp(false, "Waiting for Approval Transaction to complete.", -1, false);
    this.erc20Contract.methods.approve(this.paymentManagerContractAddress, this.currentActivePurchase.purchaseCostWithDecimals)
      .send({
        from: this.appComponent.web3Service.userAccount
      }).then((result: any) => {
      if (result.status) {
        this.payCoins();
      } else {
        this.generateNewPopUp(false, "Transaction Reverted. Please try again later.", 2000);
        this.resetCurrentPurchase();
        console.log(result);
      }
    }).catch((err: any) => {
      this.generateNewPopUp(false, "Transaction Cancelled.", 2000);
      this.resetCurrentPurchase();
      console.log(err);
    });
  };

  payCoins = () => {
    if (this.buildSuccess && !this.currentActivePurchase.encounteredError &&
      !this.currentActivePurchase.hasEnded && this.currentActivePurchase.hasFetchedData) {
      this.generateNewPopUp(false, "Waiting for Payment Transaction to complete.<br>" +
        "Before signing the transaction, copy the ref. ID below (Required in case an error occurs).<br>" + this.currentActivePurchase.id,
        -1, false);

      this.paymentManagerContract.methods.initiateNewPayment(
        this.currentActivePurchase.id,
        this.localGameCoinAddress,
        this.currentActivePurchase.purchaseCostWithDecimals
      ).send({
        from: this.appComponent.web3Service.userAccount,
        value: this.currentActivePurchase.networkGasFee
      }).then((result: any) => {
        if (result.status) {
          this.sendPaymentInformationToServer();
        } else {
          this.generateNewPopUp(false, "Transaction Reverted. Please try again later.", 2000);
          this.resetCurrentPurchase();
          console.log(result);
        }
      }).catch((err: any) => {
        this.generateNewPopUp(false, "Transaction Cancelled.", 2000);
        this.resetCurrentPurchase();
        console.log(err);
      });

    } else {
      this.generateNewPopUp(false, "This purchase is no longer valid. Please try again.", 3000);
      this.resetCurrentPurchase();
    }
  };

  sendPaymentInformationToServer = () => {
    this.generateNewPopUp(false, "Payment Successful. Waiting for confirmation from server.<br>" +
      "PLEASE DO NOT RELOAD THE PAGE.<br>(Due to communication with blockchain, it can take few minutes.)",
      -1, false);

    this.appComponent.socketIOService.emitEventToServer("buyTicketsForPlayer", {
      referenceId: this.currentActivePurchase.id,
      coinChainName: this.localCoinChainName
    });
  };

  onResponseFromServer = (success: boolean, ticketCount: number, reasonIfNotSuccess: string = "") => {
    if (success) {
      this.generateNewPopUp(false, "Successfully added " + ticketCount + " tickets.", 3500);
      this.appComponent.gameManagerService.playerTicketCount += ticketCount;
    } else {
      this.generateNewPopUp(false, "Error!!<br>Reason : " + reasonIfNotSuccess);
    }

    this.currentActivePurchase.hasEnded = true;
  };

  ngOnDestroy() {
    this.closeOldPopUpIfAny(false);
  }

}
