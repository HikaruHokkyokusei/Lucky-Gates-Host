import {ChangeDetectorRef, Component, Input, OnDestroy, OnInit} from '@angular/core';
import {AppComponent} from "../app.component";

@Component({
  selector: 'app-game-window[appComponent]',
  templateUrl: './game-window.component.html',
  styleUrls: ['./game-window.component.css']
})
export class GameWindowComponent implements OnInit, OnDestroy {

  @Input() appComponent!: AppComponent;
  intervalId: number = 0;
  executeCount: number = 0;
  timerValue: number = 0;
  remainingPercent: number = 100;
  headerText: string = "...Initializing...";
  doorIndices: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

  constructor(private changeDetectorRef: ChangeDetectorRef) {
  }

  ngOnInit(): void {
    this.intervalId = setInterval(() => {
      this.updateTimerValue();

      if (this.executeCount >= 4) {
        this.setHeaderText();
        this.executeCount = 0;
      } else {
        this.executeCount++;
      }

      this.changeDetectorRef.detectChanges();
    }, 250);
  }

  ngOnDestroy() {
    if (this.intervalId != 0) {
      clearInterval(this.intervalId);
    }
  }

  setHeaderText = () => {
    let data = this.appComponent.gameManagerService.getChoiceMaker();
    if (data.playerAddress != "") {
      if (data.isMe) {
        this.headerText = "It is YOUR turn. Please make choice.";
      } else {
        this.headerText = "Player " + data.playerAddress.substr(0, Math.min(10, data.playerAddress.length)) +
          "... is playing their turn.";
      }
    }
  };

  updateTimerValue = () => {
    if (this.appComponent.gameManagerService.gameState.stageEndTime != null) {
      let timeDiff = Math.floor(this.appComponent.gameManagerService.gameState.stageEndTime - (Date.now() / 1000));
      this.timerValue = ((timeDiff < 0) ? 0 : timeDiff);
    }
    this.remainingPercent = Math.floor(this.timerValue * 100 / this.appComponent.gameManagerService.stageDuration);
  };

}
