import {AfterViewInit, Component} from '@angular/core';
import {SocketIOService} from './services/socket-io.service'
import {Web3Service} from "./services/web3.service";
import {GameManagerService} from "./services/game-manager.service";
import {ButtonData} from "./UIElements/pop-up/pop-up.component";
import * as uuid from 'uuid';
import {CookieService} from "./services/cookie.service";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements AfterViewInit {

  title: string = 'Lucky-Gates-Bot';
  socketIOService: SocketIOService = new SocketIOService(this);
  web3Service: Web3Service = new Web3Service(this);
  gameManagerService: GameManagerService = new GameManagerService(this);
  cookieService: CookieService = new CookieService();
  hasUserInteracted: boolean = false;
  audioElement: HTMLAudioElement | null = null;
  audioTrackList: string[] = [
    "assets/audio/bensound-endlessMotion.mp3",
    "assets/audio/bensound-creativeMinds.mp3",
    "assets/audio/bensound-moose.mp3",
    "assets/audio/bensound-birthOfAHero.mp3",
    "assets/audio/bensound-evolution.mp3"
  ];
  audioIcon: string = "assets/images/MusicPause.png";
  isPlayingAudio: boolean = false;
  isBindingPlayerAddress: boolean = false;

  /*
  * 0 => Main Menu
  * 1 => Player Menu
  * 2 => Game Window
  * 3 => Join Menu
  * 4 => Rules Menu
  * */
  windowNumberToShow: number = 0;

  activePopUps: { [id: string]: { text: string, autoCloseAfterMillis: number, isClosable: boolean, buttonList: ButtonData[] } } = {};
  activePopUpKeys: string[] = Object.keys(this.activePopUps);

  constructor() {
  }

  ngAfterViewInit() {
    this.audioElement = document.querySelector("audio");
    if (this.audioElement != null) {
      this.changeAudioTrack();
      this.audioElement.addEventListener("ended", () => {
        this.changeAudioTrack();
      });
    }
    let shouldPlayBG: string | boolean = this.cookieService.getCookie("shouldPlayBG");
    this.pauseAudio(false);
    shouldPlayBG = shouldPlayBG === '' || shouldPlayBG === 'true';

    if (!this.web3Service.web3) {
      this.popNewPopUp("No Web3 Support Found! Consider Using Metamask.");
    } else {
      document.body.addEventListener("mousemove", () => {
        if (!this.hasUserInteracted) {
          if (shouldPlayBG) {
            this.playAudio();
          }
          this.hasUserInteracted = true;
        }
      });
    }
  }

  playAudio = (shouldRetry: boolean = true) => {
    if (this.audioElement != null && this.audioElement.paused) {
      this.audioElement.volume = 0.1;
      this.audioElement.play().then().catch(() => {
        if (shouldRetry) {
          setTimeout(() => {
            this.playAudio(false);
          }, 1000);
        } else if (this.shouldShowLoadingScreen()) {
          setTimeout(() => {
            this.playAudio(false);
          }, 1000);
        }
      });
    }
    this.isPlayingAudio = true;
    this.cookieService.setCookie({
      name: "shouldPlayBG",
      value: "true",
      expireDays: 10 * 365
    });
    this.audioIcon = "assets/images/MusicPlay.png";
  };

  pauseAudio = (shouldSetCookie: boolean = true) => {
    if (this.audioElement != null && (!this.audioElement.paused || this.audioElement.currentTime !== 0)) {
      this.audioElement.currentTime = 0;
      this.audioElement.pause();
    }
    this.isPlayingAudio = false;
    if (shouldSetCookie) {
      this.cookieService.setCookie({
        name: "shouldPlayBG",
        value: "false",
        expireDays: 10 * 365
      });
    }
    this.audioIcon = "assets/images/MusicPause.png";
  };

  changeAudioTrack = () => {
    if (this.audioElement != null) {
      this.audioElement.src = this.audioTrackList[this.getRandomNumber(
        (this.windowNumberToShow === 2) ? 2 : 0, (this.windowNumberToShow === 2) ? this.audioTrackList.length : 2
      )];
      this.playAudio();
    }
  };

  getRandomNumber = (start: number, end: number) => {
    let num = Math.floor(Math.random() * (end - start));
    num += start;
    return num;
  }

  toggleAudio = () => {
    if (this.isPlayingAudio) {
      this.pauseAudio();
    } else {
      this.playAudio();
    }
  };

  shouldShowLoadingScreen = () => {
    return this.socketIOService.signCode === "" || !this.web3Service.web3BuildSuccess || !this.web3Service.didSignMessage;
  };

  setWindowNumberToShowTo = (windowNumberToShow: number) => {
    if (this.windowNumberToShow !== windowNumberToShow) {
      let shouldChangeAudioTrack = this.windowNumberToShow === 2 || windowNumberToShow === 2;
      this.windowNumberToShow = windowNumberToShow;
      if (shouldChangeAudioTrack) {
        this.changeAudioTrack();
      }
    }
  };

  bindPlayerAddress = () => {
    if (this.web3Service.userAccount !== "" && this.socketIOService.signCode !== "" && !this.isBindingPlayerAddress) {
      this.isBindingPlayerAddress = true;
      this.web3Service.requestSignatureFromUser(this.socketIOService.signCode).then((signedMessage) => {
        if (signedMessage != null) {
          this.socketIOService.emitEventToServer("bindAddress", {
            "playerAddress": this.web3Service.userAccount,
            "signedMessage": signedMessage
          });
        }
      }).finally(() => {
        this.isBindingPlayerAddress = false;
      });
    }
  };

  popNewPopUp = (text: string, autoCloseAfterMillis: number = -1, isClosable: boolean = true, buttonList: ButtonData[] = []) => {
    let id: string = uuid.v4();
    this.activePopUps[id] = {
      text,
      autoCloseAfterMillis,
      isClosable,
      buttonList
    };
    this.activePopUpKeys = Object.keys(this.activePopUps);
  };

  popUpClosed = (id: string) => {
    delete this.activePopUps[id];
    this.activePopUpKeys = Object.keys(this.activePopUps);
  };
}
