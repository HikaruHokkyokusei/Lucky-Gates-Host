import {Injectable} from '@angular/core';
import {AppComponent} from "../app.component";
import {CookieService} from "./cookie.service";

@Injectable({
  providedIn: 'root'
})
export class AudioManagerService {

  appComponent: AppComponent | null = null;
  cookieService: CookieService = new CookieService();
  audioElement: HTMLAudioElement | null = null;
  audioTrackList = [
    "assets/audio/bensound-endlessMotion.mp3",
    "assets/audio/bensound-creativeMinds.mp3",
    "assets/audio/bensound-moose.mp3",
    "assets/audio/bensound-birthOfAHero.mp3",
    "assets/audio/bensound-evolution.mp3"
  ];
  audioIcon = "assets/images/MusicPause.png";
  isPlayingAudio = false;

  constructor() {
  }

  getRandomNumber = (start: number, end: number) => {
    let num = Math.floor(Math.random() * (end - start));
    num += start;
    return num;
  };

  getShouldPlayBGCookieValue = () => {
    return this.cookieService.getCookie("shouldPlayBG");
  };

  playAudio = (shouldRetry: boolean = true) => {
    if (this.audioElement != null && this.audioElement.paused) {
      this.audioElement.volume = 0.1;
      this.audioElement.play().then().catch(() => {
        if (shouldRetry) {
          setTimeout(() => {
            this.playAudio(false);
          }, 1000);
        } else if (this.appComponent && this.appComponent.shouldShowLoadingScreen()) {
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
    if (this.audioElement != null && this.isPlayingAudio) {
      this.audioElement.src = this.audioTrackList[this.getRandomNumber(
        (this.appComponent?.windowNumberToShow === 2) ? 2 : 0, (this.appComponent?.windowNumberToShow === 2) ? this.audioTrackList.length : 2
      )];
      this.playAudio();
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
