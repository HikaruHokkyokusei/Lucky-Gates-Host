import {Component, Input, OnInit} from '@angular/core';
import {AppComponent} from "../app.component";

@Component({
  selector: 'app-main-menu[appComponent]',
  templateUrl: './main-menu.component.html',
  styleUrls: ['./main-menu.component.css']
})
export class MainMenuComponent implements OnInit {

  @Input() appComponent!: AppComponent;

  constructor() {
  }

  ngOnInit(): void {
    this.appComponent.socketIOService.emitEventToServer("getPlayerTicketCount", {
      coinChainName: this.appComponent.gameManagerService.localCoinChainName,
      gameCoinAddress: this.appComponent.gameManagerService.localGameCoinAddress
    });
  }

}
