import {AfterViewInit, ChangeDetectorRef, Component, OnDestroy, OnInit} from '@angular/core';
import {SocketIOService} from './services/socket-io.service'
import {Web3Service} from "./services/web3.service";
import {GameManagerService} from "./services/game-manager.service";
import {PopUpManagerService} from "./services/pop-up-manager.service";
import {AudioManagerService} from "./services/audio-manager.service";
import {ActivatedRoute, Router} from "@angular/router";
import {ThemeService} from "./services/theme.service";
import {CookieService} from "./services/cookie.service";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, AfterViewInit, OnDestroy {

  title: string = 'Lucky-Gates-Bot';
  textureBg: string;
  textureOpacity: number;
  socketIOService: SocketIOService = new SocketIOService(this);
  web3Service: Web3Service = new Web3Service(this);
  gameManagerService: GameManagerService;
  audioManagerService: AudioManagerService = new AudioManagerService(this);
  popUpManagerService: PopUpManagerService = new PopUpManagerService();
  isBindingPlayerAddress: boolean = false;
  playersOnline: number = 0;

  /*
  * 0 => Main Menu
  * 1 => Player Menu
  * 2 => Game Window
  * 3 => Join Menu
  * 4 => Rules Menu
  * 5 => Ticket Buy Window
  * 6 => About Window
  * */
  windowNumberToShow: number = 0;

  constructor(private changeDetector: ChangeDetectorRef, private router: Router, private activatedRoute: ActivatedRoute) {
    this.gameManagerService = new GameManagerService(router, activatedRoute, this);
    let theme = ThemeService.getTheme();
    this.textureBg = theme.bgImage;
    this.textureOpacity = theme.bgOpacity;
  }

  ngOnInit() {
    let CCN = CookieService.getCookie("CCN");
    let GCA = CookieService.getCookie("GCA");

    this.activatedRoute.queryParams.subscribe((params) => {
      this.gameManagerService.setCoinInformation(params["GCA"], params["CCN"], GCA, CCN);
    });

    setTimeout(() => {
      this.gameManagerService.finalizeRoutes();
    }, 1000);
  }

  ngAfterViewInit() {
    this.audioManagerService.audioElement = document.querySelector("audio");

    if (!this.web3Service.web3) {
      this.popUpManagerService.popNewPopUp("No Web3 Support Found! Consider Using Metamask.");
    } else {
      this.audioManagerService.initiateMusic();
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

  ngOnDestroy() {
    if (this.audioManagerService.playerInterval != 0) {
      clearInterval(this.audioManagerService.playerInterval);
    }
  }
}
