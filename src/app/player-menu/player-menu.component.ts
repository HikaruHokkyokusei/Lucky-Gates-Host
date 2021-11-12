import {ChangeDetectorRef, Component, Input, OnDestroy, OnInit} from '@angular/core';
import {AppComponent} from "../app.component";

@Component({
  selector: 'app-player-menu[appComponent]',
  templateUrl: './player-menu.component.html',
  styleUrls: ['./player-menu.component.css']
})
export class PlayerMenuComponent implements OnInit, OnDestroy {

  @Input() appComponent!: AppComponent;
  remainingPercent: number = 100;
  intervalId: number = 0;
  timerValue: number = 0;

  constructor(private changeDetector: ChangeDetectorRef) {
  }

  ngOnInit(): void {
    this.intervalId = setInterval(() => {
      let shouldContinue = this.updateTimerValue();
      this.changeDetector.detectChanges();

      if (!shouldContinue && this.intervalId != 0) {
        clearInterval(this.intervalId);
        this.intervalId = 0;
      }
    }, 900);
  }

  ngOnDestroy() {
    if (this.intervalId != 0) {
      clearInterval(this.intervalId);
    }
  }

  updateTimerValue = () => {
    let shouldRepeat: boolean = true;

    if (this.appComponent.gameManagerService.gameState.currentStage != null &&
      this.appComponent.gameManagerService.gameState.currentStage >= 0) {

      if (this.appComponent.gameManagerService.gameState.currentStage < 1) {
        if (this.appComponent.gameManagerService.gameState.stageEndTime != null) {
          let timeDiff = Math.floor(this.appComponent.gameManagerService.gameState.stageEndTime - (Date.now() / 1000));
          this.timerValue = ((timeDiff < 0) ? 0 : timeDiff);
        }
      } else {
        this.timerValue = 0;
        shouldRepeat = false;
      }
      this.remainingPercent = Math.floor(this.timerValue * 100 / this.appComponent.gameManagerService.stageDuration);
    }

    return shouldRepeat;
  };

}
