import {AfterViewInit, ChangeDetectorRef, Component, Input} from "@angular/core";
import * as uuid from "uuid";

export abstract class CanSetAspectVideo {
  abstract setAspectVideoComponent: (recogniseId: any, aspectVideoComponent: AspectVideoComponent) => void;
}

@Component({
  selector: 'app-aspect-video[recogniseId][src][type][originalVidHeightPX][originalVidWidthPX][shouldPlay]',
  templateUrl: './aspect-video.component.html',
  styleUrls: ['./aspect-video.component.css']
})
export class AspectVideoComponent implements AfterViewInit {

  containerId: string = uuid.v4();
  videoElement: HTMLVideoElement | null = null;
  @Input() notifiableComponent: null | CanSetAspectVideo = null;
  @Input() recogniseId!: any;

  @Input() src!: string;
  @Input() type!: string;
  @Input() originalVidHeightPX!: number;
  @Input() originalVidWidthPX!: number;
  vidAspectRatio: number = this.originalVidWidthPX / this.originalVidHeightPX;

  @Input() shouldPlay: boolean = false;
  defaultPlayState: boolean = false;

  constructor(private changeDetector: ChangeDetectorRef) {
  }

  ngAfterViewInit() {
    this.videoElement = <HTMLVideoElement>document.getElementById(this.containerId + "Vid");
    this.vidAspectRatio = this.originalVidWidthPX / this.originalVidHeightPX;
    this.defaultPlayState = this.shouldPlay;
    if (this.notifiableComponent != null) {
      this.notifiableComponent.setAspectVideoComponent(this.recogniseId, this);
    }
    if (this.defaultPlayState) {
      this.playVideo();
    } else {
      this.pauseVideo();
    }
  }

  playVideo = () => {
    if (this.videoElement != null) {
      this.videoElement.play().then();
      this.shouldPlay = true;
    }
    this.changeDetector.detectChanges();
  };

  pauseVideo = () => {
    if (this.videoElement != null) {
      this.videoElement.pause();
      this.shouldPlay = false;
    }
    this.changeDetector.detectChanges();
  };

  resetVideo = () => {
    if (this.videoElement != null) {
      if (!this.defaultPlayState) {
        this.shouldPlay = this.defaultPlayState;
        this.videoElement.pause();
      }
      this.videoElement.currentTime = 0;
    }
    this.changeDetector.detectChanges();
  };

}
