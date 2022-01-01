import {ChangeDetectorRef, Component, Input, OnInit} from '@angular/core';
import {AppComponent} from "../app.component";
import * as configs from "private/PythonScripts/configs.json";
import * as configsForRegisteredCoin from "private/PythonScripts/configsForRegisteredCoin.json";
import {ToolSetService} from "../services/tool-set.service";
import {CoinCollectionData} from "../models/CoinAndPayment/coin-collection-data.model";

@Component({
  selector: 'app-rules-window[appComponent]',
  templateUrl: './rules-window.component.html',
  styleUrls: ['./rules-window.component.css']
})
export class RulesWindowComponent implements OnInit {

  anyConfigs: any = (<any>configs).default;

  playerGatheringDuration: number = 0;
  minPlayers: number = 0;
  maxPlayers: number = 0;
  doorCount: number = 0;
  doorPoints: string = "";
  openDoorCount: number = 0;
  openDoorPoints: string = "";

  rewardPercent: number = 0;
  serverTicketCost: string = "0";
  coinSymbol: string = "";
  showMismatchNotice: boolean = false;

  @Input() appComponent!: AppComponent;

  constructor(private changeDetector: ChangeDetectorRef) {
  }

  ngOnInit(): void {
    let localCoinChainName = this.appComponent.gameManagerService.localCoinChainName;
    let localGameCoinAddress = this.appComponent.gameManagerService.localGameCoinAddress;
    let registeredCoin = (<CoinCollectionData>configsForRegisteredCoin)[localCoinChainName]["registeredCoinAddresses"][localGameCoinAddress];

    this.playerGatheringDuration = this.anyConfigs.stageDurations["0"];
    this.coinSymbol = registeredCoin.symbol;

    this.maxPlayers = this.anyConfigs.defaultGameValues.maxPlayers;
    if (registeredCoin.otherOptions["minPlayers"] != null) {
      this.minPlayers = registeredCoin.otherOptions["minPlayers"];
    } else {
      this.minPlayers = this.anyConfigs.defaultGameValues.minPlayers;
    }

    this.doorCount = this.anyConfigs.generalValues.doorPointsList.length;
    for (let i = 0; i < this.doorCount - 1; i++) {
      this.doorPoints += this.anyConfigs.generalValues.doorPointsList[i] + ", ";
    }
    this.doorPoints += "and " + this.anyConfigs.generalValues.doorPointsList[this.doorCount - 1];

    this.openDoorCount = this.anyConfigs.generalValues.numberOfDoorsToOpen;
    for (let i = 0; i < this.anyConfigs.generalValues.openableDoorList.length - 1; i++) {
      this.openDoorPoints += this.anyConfigs.generalValues.openableDoorList[i] + ", ";
    }
    this.openDoorPoints += "or " + this.anyConfigs.generalValues.openableDoorList[this.openDoorCount - 1];

    this.rewardPercent = registeredCoin.otherOptions["rewardPercent"] / 100;
    this.serverTicketCost = ToolSetService.nFormatter(registeredCoin.serverTicketCost);

    this.showMismatchNotice = registeredCoin.serverTicketCost != registeredCoin.ticketCost;

    this.changeDetector.detectChanges();
  }

}
