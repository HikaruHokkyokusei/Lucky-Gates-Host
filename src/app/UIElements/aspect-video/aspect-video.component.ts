import {AfterViewInit, ChangeDetectorRef, Component, Input} from "@angular/core";
import * as uuid from "uuid";
import {ToolSetService} from "../../services/tool-set.service";

export abstract class CanSetAspectVideo {
  abstract setAspectVideoComponent: (recogniseId: any, aspectVideoComponent: AspectVideoComponent) => void;
}

@Component({
  selector: 'app-aspect-video[recogniseId][videoSrc][videoType][originalVidHeightPX][originalVidWidthPX][shouldPlay]',
  templateUrl: './aspect-video.component.html',
  styleUrls: ['./aspect-video.component.css']
})
export class AspectVideoComponent implements AfterViewInit {

  containerId: string = uuid.v4();
  toolSetService: ToolSetService = new ToolSetService();
  videoElement: HTMLVideoElement | null = null;
  pointImgElement: HTMLElement | null = null;
  @Input() notifiableComponent: null | CanSetAspectVideo = null;
  @Input() recogniseId!: any;

  @Input() videoSrc!: string;
  @Input() videoType!: string;
  @Input() originalVidHeightPX!: number;
  @Input() originalVidWidthPX!: number;
  vidAspectRatio: number = this.originalVidWidthPX / this.originalVidHeightPX;

  @Input() shouldPlay: boolean = false;
  defaultPlayState: boolean = false;

  pointSrc: string = "";
  pointAlt: string = "";

  constructor(private changeDetector: ChangeDetectorRef) {
  }

  ngAfterViewInit() {
    this.videoElement = <HTMLVideoElement>document.getElementById(this.containerId + "Vid");
    this.pointImgElement = <HTMLElement>document.getElementById(this.containerId + "Img");
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

  setPoints = (points: number, setStart: number, setEnd: number) => {
    let setNumber = this.toolSetService.getRandomNumber(setStart, setEnd + 1);

    this.pointSrc = "assets/images/Numbers/Set " + setNumber + "/" + points + ".png";
    this.pointAlt = "" + points;
  };

  playVideo = () => {
    this.videoElement?.play().then();
    this.shouldPlay = true;

    if (this.pointSrc != "") {
      setTimeout(() => {
        if (this.pointImgElement != null) {
          this.pointImgElement.style.removeProperty("width");
          this.pointImgElement.style.removeProperty("height");
          this.pointImgElement.style.animationPlayState = "running";
          this.changeDetector.detectChanges();
        }
      }, 3000);
    }

    this.changeDetector.detectChanges();
  };

  pauseVideo = () => {
    this.videoElement?.pause();
    this.shouldPlay = false;
    this.changeDetector.detectChanges();
  };

  resetVideo = () => {
    if (this.pointImgElement != null) {
      this.pointImgElement.style.height = "0";
      this.pointImgElement.style.width = "0";
      this.pointImgElement.style.animationPlayState = "paused";
    }
    this.pointImgElement?.classList.remove("Points-Animation");
    void this.pointImgElement?.offsetWidth;
    setTimeout(() => {
      this.pointImgElement?.classList.add("Points-Animation");
    }, 25);

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
