import {AfterViewInit, ChangeDetectorRef, Component, Input, OnDestroy, OnInit} from '@angular/core';
import {AppComponent} from "../app.component";
import {AspectVideoComponent, CanSetAspectVideo} from "../UIElements/aspect-video/aspect-video.component";
import {ThemeService} from "../theme.service";
import {ButtonComponent, CanSetButtonComponent} from "../UIElements/button/button.component";

@Component({
  selector: 'app-game-window[appComponent]',
  templateUrl: './game-window.component.html',
  styleUrls: ['./game-window.component.css']
})
export class GameWindowComponent implements CanSetButtonComponent, CanSetAspectVideo, OnInit, AfterViewInit, OnDestroy {

  @Input() appComponent!: AppComponent;
  intervalId: number = 0;
  executeCount: number = 0;
  timerValue: number = 0;
  remainingPercent: number = 100;
  headerText: string = "...Initializing...";
  doorIndices: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  doorComponents: { [recogniseId: number]: AspectVideoComponent } = {};
  buttonComponents: { [recogniseId: number]: ButtonComponent } = {};
  areDoorsDisabled: boolean = false;
  myTurnColor: string = "";
  otherTurnColor: string = "";
  currentTurnColor: string = "";
  currentPlayer: string = "";
  isMe: boolean = false;

  constructor(private changeDetectorRef: ChangeDetectorRef) {
    let theme = ThemeService.getTheme();
    this.myTurnColor = theme.myTurnHeaderColor;
    this.otherTurnColor = theme.otherTurnHeaderColor;
    this.currentTurnColor = this.otherTurnColor;
  }

  ngOnInit(): void {
    this.appComponent.gameManagerService.setGameWindow(this);
    this.intervalId = setInterval(() => {
      this.updateTimerValue();

      if (this.executeCount >= 4) {
        this.setHeaderText();
        this.executeCount = 0;
      } else {
        this.executeCount++;
      }

      this.changeDetectorRef.detectChanges();
    }, 500);
  }

  ngAfterViewInit() {
    window["customParticleJs"]("particles-js", {
      "particles": {
        "number": {
          "value": 100,
          "density": {
            "enable": true,
            "value_area": 800
          }
        },
        "color": {
          "value": "#ffffff"
        },
        "shape": {
          "type": "circle",
          "stroke": {
            "width": 0,
            "color": "#000000"
          },
          "polygon": {
            "nb_sides": 5
          },
          "image": {
            "src": "img/github.svg",
            "width": 100,
            "height": 100
          }
        },
        "opacity": {
          "value": 0.6,
          "random": false,
          "anim": {
            "enable": false,
            "speed": 1,
            "opacity_min": 0.1,
            "sync": false
          }
        },
        "size": {
          "value": 3,
          "random": true,
          "anim": {
            "enable": false,
            "speed": 30,
            "size_min": 0.2,
            "sync": false
          }
        },
        "line_linked": {
          "enable": true,
          "distance": 150,
          "color": "#ffffff",
          "opacity": 0.5,
          "width": 1
        },
        "move": {
          "enable": true,
          "speed": 4,
          "direction": "none",
          "random": false,
          "straight": false,
          "out_mode": "out",
          "bounce": false,
          "attract": {
            "enable": false,
            "rotateX": 600,
            "rotateY": 1200
          }
        }
      },
      "interactivity": {
        "detect_on": "canvas",
        "events": {
          "onhover": {
            "enable": true,
            "mode": "grab"
          },
          "onclick": {
            "enable": true,
            "mode": "push"
          },
          "resize": true
        },
        "modes": {
          "grab": {
            "distance": 140,
            "line_linked": {
              "opacity": 1
            }
          },
          "bubble": {
            "distance": 400,
            "size": 40,
            "duration": 2,
            "opacity": 8,
            "speed": 3
          },
          "repulse": {
            "distance": 200,
            "duration": 0.4
          },
          "push": {
            "particles_nb": 4
          },
          "remove": {
            "particles_nb": 2
          }
        }
      },
      "retina_detect": true
    });
  }

  setAspectVideoComponent = (recogniseId: any, animatedImageComponent: AspectVideoComponent) => {
    this.doorComponents[recogniseId] = animatedImageComponent;
  };

  setButtonComponent = (recogniseId: any, buttonComponent: ButtonComponent) => {
    this.buttonComponents[recogniseId] = buttonComponent;
  };

  setHeaderText = () => {
    let data = this.appComponent.gameManagerService.getChoiceMaker();
    if (data.playerAddress != "") {
      this.currentPlayer = data.playerAddress;
      this.isMe = data.isMe;
      if (data.isMe) {
        this.headerText = "It is YOUR turn. Please make choice.";
        this.currentTurnColor = this.myTurnColor;
        if (this.areDoorsDisabled) {
          let keySet = Object.keys(this.buttonComponents);
          for (let key in keySet) {
            this.buttonComponents[key].enable();
          }
          this.areDoorsDisabled = false;
        }
      } else {
        this.headerText = "Player " + data.playerAddress.substr(0, Math.min(10, data.playerAddress.length)) +
          "... is playing their turn.";
        this.currentTurnColor = this.otherTurnColor;
        if (!this.areDoorsDisabled) {
          let keySet = Object.keys(this.buttonComponents);
          for (let key in keySet) {
            this.buttonComponents[key].disable("Wait for your turn");
          }
          this.areDoorsDisabled = true;
        }
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

  openDoorAnimation = (doorNumber: number, pointsBehindDoor: number, disableMessage: string) => {
    try {
      let aVComponent = this.doorComponents[doorNumber];
      if (disableMessage) {
        this.buttonComponents[doorNumber].disable(disableMessage);
      }
      aVComponent.setPoints(pointsBehindDoor, 0, 0);
      aVComponent.playVideo();
    } catch {
    }
  };

  resetAllDoors = () => {
    let keySet = Object.keys(this.doorComponents);
    for (let key in keySet) {
      this.doorComponents[key].resetVideo();
    }
  };

  ngOnDestroy() {
    if (this.intervalId != 0) {
      clearInterval(this.intervalId);
    }
  }
}
