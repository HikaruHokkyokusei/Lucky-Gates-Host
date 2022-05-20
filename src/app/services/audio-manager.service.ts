import {AppComponent} from "../app.component";
import {CookieService} from "./cookie.service";
import {ToolSetService} from "./tool-set.service";
import {AudioDetails} from "../models/Audio/AudioDetails.model";

export class AudioManagerService {

  audioElement: HTMLAudioElement | null = null;
  audioTrackList: AudioDetails[] = [
    {
      src: "assets/audio/bensound-endlessMotion.mp3",
      requiredAudioLevel: 0.1
    },
    {
      src: "assets/audio/bensound-creativeMinds.mp3",
      requiredAudioLevel: 0.1
    },
    {
      src: "assets/audio/chosic-adventure.mp3",
      requiredAudioLevel: 0.3
    },
    {
      src: "assets/audio/chosic-leavingForValhalla.mp3",
      requiredAudioLevel: 0.2
    },
    {
      src: "assets/audio/chosic-sparks.mp3",
      requiredAudioLevel: 0.25
    },
    {
      src: "assets/audio/chosic-sweetDreams.mp3",
      requiredAudioLevel: 0.4
    },
    {
      src: "assets/audio/bensound-moose.mp3",
      requiredAudioLevel: 0.1
    },
    {
      src: "assets/audio/bensound-birthOfAHero.mp3",
      requiredAudioLevel: 0.1
    },
    {
      src: "assets/audio/bensound-evolution.mp3",
      requiredAudioLevel: 0.1
    },
    {
      src: "assets/audio/chosic-celtycDream.mp3",
      requiredAudioLevel: 0.15
    },
    {
      src: "assets/audio/chosic-chase.mp3",
      requiredAudioLevel: 0.17
    },
    {
      src: "assets/audio/chosic-heroism.mp3",
      requiredAudioLevel: 0.17
    },
    {
      src: "assets/audio/chosic-theEpic2.mp3",
      requiredAudioLevel: 0.15
    },
    {
      src: "assets/audio/chosic-theInspiration.mp3",
      requiredAudioLevel: 0.2
    }
  ];
  splitPosition: number = 6;
  audioIcon = "assets/images/MusicPause.png";
  playerInterval: number = 0;
  hasUserInteracted: boolean = false;
  shouldPlayBG: boolean = false;
  shouldPlayAudio: boolean = false;
  isPlayingAudio = false;
  requiredAudioLevel: number = 0.15;

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
      this.audioElement.volume = this.requiredAudioLevel;
      this.audioElement.play().then(() => {
        if (this.playerInterval != 0 && !this.audioElement?.paused) {
          clearInterval(this.playerInterval);
          this.playerInterval = 0;
        }
        this.isPlayingAudio = true;
        this.audioIcon = "assets/images/MusicPlay.png";
      }).catch(() => {
        if (this.playerInterval == 0) {
          this.playerInterval = window.setInterval(() => {
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
      let audioDetails = this.audioTrackList[ToolSetService.getRandomNumber(
        (this.appComponent?.windowNumberToShow === 2) ? this.splitPosition : 0,
        (this.appComponent?.windowNumberToShow === 2) ? this.audioTrackList.length : this.splitPosition
      )];
      this.audioElement.src = audioDetails.src;
      this.requiredAudioLevel = audioDetails.requiredAudioLevel;
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
