import {AppComponent} from "../app.component";
import {CookieService} from "./cookie.service";
import {ToolSetService} from "./tool-set.service";

export class AudioManagerService {

  audioElement: HTMLAudioElement | null = null;
  audioTrackList = [
    "assets/audio/bensound-endlessMotion.mp3",
    "assets/audio/bensound-creativeMinds.mp3",
    "assets/audio/bensound-moose.mp3",
    "assets/audio/bensound-birthOfAHero.mp3",
    "assets/audio/bensound-evolution.mp3"
  ];
  audioIcon = "assets/images/MusicPause.png";
  playerInterval: number = 0;
  hasUserInteracted: boolean = false;
  shouldPlayBG: boolean = false;
  shouldPlayAudio: boolean = false;
  isPlayingAudio = false;

  constructor(private appComponent: AppComponent) {
  }

  initiateMusic = () => {
    let cookieData = CookieService.getCookie("shouldPlayBG");
    this.shouldPlayBG = cookieData === 'true' || cookieData == null;
    this.pauseAudio(false);

    setTimeout(() => {
      if (this.audioElement != null) {
        this.changeAudioTrack();
        this.audioElement.addEventListener("ended", () => {
          this.changeAudioTrack();
        });
      }
      document.body.addEventListener("mousemove", this.userInteractionHandler);
    }, 100);
  };

  userInteractionHandler = () => {
    if (!this.hasUserInteracted) {
      this.hasUserInteracted = true;
      if (this.shouldPlayBG) {
        this.playAudio();
      }
    } else {
      document.body.removeEventListener("mousemove", this.userInteractionHandler);
    }
  };

  playAudio = (isRetry: boolean = false) => {
    if (isRetry && !this.shouldPlayAudio) {
      clearInterval(this.playerInterval);
      this.playerInterval = 0;
      return;
    }

    this.shouldPlayAudio = true;
    CookieService.setCookie({
      name: "shouldPlayBG",
      value: "true",
      expireDays: 10 * 365
    });

    if (this.audioElement != null && this.audioElement.paused) {
      this.audioElement.load();
      this.audioElement.volume = 0.1;
      this.audioElement.play().then(() => {
        if (this.playerInterval != 0 && !this.audioElement?.paused) {
          clearInterval(this.playerInterval);
          this.playerInterval = 0;
        }
        this.isPlayingAudio = true;
        this.audioIcon = "assets/images/MusicPlay.png";
      }).catch(() => {
        if (this.playerInterval == 0) {
          this.playerInterval = setInterval(() => {
            this.playAudio(true);
          }, 2500);
        }
      });
    }
  };

  pauseAudio = (shouldSetCookie: boolean = true) => {
    this.shouldPlayAudio = false;
    this.isPlayingAudio = false;
    if (this.audioElement != null && (!this.audioElement.paused || this.audioElement.currentTime !== 0)) {
      this.audioElement.currentTime = 0;
      this.audioElement.pause();
    }
    if (shouldSetCookie) {
      CookieService.setCookie({
        name: "shouldPlayBG",
        value: "false",
        expireDays: 10 * 365
      });
    }
    this.audioIcon = "assets/images/MusicPause.png";
  };

  changeAudioTrack = () => {
    if (this.audioElement != null) {
      this.audioElement.src = this.audioTrackList[ToolSetService.getRandomNumber(
        (this.appComponent?.windowNumberToShow === 2) ? 2 : 0, (this.appComponent?.windowNumberToShow === 2) ? this.audioTrackList.length : 2
      )];
      if (this.isPlayingAudio) {
        this.playAudio();
      }
    }
  };

  toggleAudio = () => {
    if (this.isPlayingAudio) {
      this.pauseAudio();
    } else {
      this.playAudio();
    }
  };
}
