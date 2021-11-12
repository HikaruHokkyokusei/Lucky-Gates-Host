import {AfterViewInit, ChangeDetectorRef, Component} from '@angular/core';
import {SocketIOService} from './services/socket-io.service'
import {Web3Service} from "./services/web3.service";
import {GameManagerService} from "./services/game-manager.service";
import {PopUpManagerService} from "./services/pop-up-manager.service";
import {AudioManagerService} from "./services/audio-manager.service";
import {ActivatedRoute} from "@angular/router";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements AfterViewInit {

  title: string = 'Lucky-Gates-Bot';
  socketIOService: SocketIOService = new SocketIOService(this);
  web3Service: Web3Service = new Web3Service(this);
  gameManagerService: GameManagerService;
  audioManagerService: AudioManagerService = new AudioManagerService(this);
  popUpManagerService: PopUpManagerService = new PopUpManagerService();
  hasUserInteracted: boolean = false;
  isBindingPlayerAddress: boolean = false;

  /*
  * 0 => Main Menu
  * 1 => Player Menu
  * 2 => Game Window
  * 3 => Join Menu
  * 4 => Rules Menu
  * 5 => Ticket Buy Window
  * */
  windowNumberToShow: number = 0;

  constructor(private changeDetector: ChangeDetectorRef, private activatedRoute: ActivatedRoute) {
    this.gameManagerService = new GameManagerService(activatedRoute, this);
  }

  ngAfterViewInit() {
    this.audioManagerService.audioElement = document.querySelector("audio");
    if (this.audioManagerService.audioElement != null) {
      this.audioManagerService.changeAudioTrack();
      this.audioManagerService.audioElement.addEventListener("ended", () => {
        this.audioManagerService.changeAudioTrack();
      });
    }
    let shouldPlayBG: string | boolean = this.audioManagerService.getShouldPlayBGCookieValue();
    this.audioManagerService.pauseAudio(false);
    shouldPlayBG = shouldPlayBG === '' || shouldPlayBG === 'true';

    if (!this.web3Service.web3) {
      this.popUpManagerService.popNewPopUp("No Web3 Support Found! Consider Using Metamask.");
    } else {
      document.body.addEventListener("mousemove", () => {
        if (!this.hasUserInteracted) {
          if (shouldPlayBG) {
            this.audioManagerService.playAudio();
          }
          this.hasUserInteracted = true;
        }
      });
    }
  }

  shouldShowLoadingScreen = () => {
    return this.socketIOService.signCode === "" || !this.web3Service.web3BuildSuccess || !this.web3Service.didSignMessage ||
      this.isBindingPlayerAddress;
  };

  setWindowNumberToShowTo = (windowNumberToShow: number) => {
    if (this.windowNumberToShow !== windowNumberToShow) {
      let shouldChangeAudioTrack = this.windowNumberToShow === 2 || windowNumberToShow === 2;
      this.windowNumberToShow = windowNumberToShow;
      if (shouldChangeAudioTrack) {
        this.audioManagerService.changeAudioTrack();
      }
    }
  };

  bindPlayerAddress = () => {
    if (this.web3Service.userAccount !== "" && this.socketIOService.signCode !== "" && !this.isBindingPlayerAddress) {
      this.isBindingPlayerAddress = true;
      this.changeDetector.detectChanges();
      this.web3Service.requestSignatureFromUser(this.socketIOService.signCode).then((signedMessage) => {
        if (signedMessage != null) {
          this.socketIOService.emitEventToServer("bindAddress", {
            "playerAddress": this.web3Service.userAccount,
            "signedMessage": signedMessage
          });
        }
      }).finally(() => {
        this.isBindingPlayerAddress = false;
        this.changeDetector.detectChanges();
      });
    }
  };
}
