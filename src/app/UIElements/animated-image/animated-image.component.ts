import {AfterViewInit, ChangeDetectorRef, Component, Input} from '@angular/core';
import * as uuid from "uuid";

export abstract class CanSetAnimatedImage {
  abstract setAnimatedImageComponent: (recogniseId: any, animatedImageComponent: AnimatedImageComponent) => void;
}

interface AnimationState {
  src: string,
  alt: string,
  originalGifHeightPX: number,
  originalGifWidthPX: number,
  frameCount: number,
  gifAspectRatio: number,
  duration: number,
  durationUnit: string,
  iterationCount: number,
  shouldPlay: boolean
}

@Component({
  selector: 'app-animated-image[recogniseId][src][alt][originalGifHeightPX][originalGifWidthPX][frameCount][duration]',
  templateUrl: './animated-image.component.html',
  styleUrls: ['./animated-image.component.css']
})
export class AnimatedImageComponent implements AfterViewInit {

  imageElement: HTMLImageElement | null = null;
  @Input() notifiableComponent: null | CanSetAnimatedImage = null;
  @Input() recogniseId!: any;
  containerId: string = uuid.v4();

  @Input() src!: string;
  @Input() alt!: string;
  @Input() originalGifHeightPX!: number;
  @Input() originalGifWidthPX!: number;
  @Input() frameCount!: number;
  gifAspectRatio: number = this.originalGifWidthPX / this.originalGifHeightPX;

  @Input() duration!: number;
  @Input() durationUnit: string = "s";
  @Input() iterationCount: number = -1;
  @Input() shouldPlay: boolean = false;

  defaultState: AnimationState = {
    src: "",
    alt: "",
    originalGifHeightPX: 1,
    originalGifWidthPX: 1,
    frameCount: 1,
    gifAspectRatio: 1,
    duration: 1,
    durationUnit: "s",
    iterationCount: -1,
    shouldPlay: false
  };

  constructor(private changeDetector: ChangeDetectorRef) {
  }

  ngAfterViewInit(): void {
    this.imageElement = <HTMLImageElement>document.getElementById(this.containerId + "Img");

    if (this.shouldPlay) {
      this.playAnimation();
    } else {
      this.pauseAnimation();
    }

    this.gifAspectRatio = this.originalGifWidthPX / this.originalGifHeightPX;
    this.defaultState = {
      src: this.src,
      alt: this.alt,
      originalGifHeightPX: this.originalGifHeightPX,
      originalGifWidthPX: this.originalGifWidthPX,
      frameCount: this.frameCount,
      gifAspectRatio: this.gifAspectRatio,
      duration: this.duration,
      durationUnit: this.durationUnit,
      iterationCount: this.iterationCount,
      shouldPlay: this.shouldPlay
    };
    this.changeDetector.detectChanges();

    if (this.notifiableComponent != null) {
      this.notifiableComponent.setAnimatedImageComponent(this.recogniseId, this);
    }
  }

  resetToDefaultState = (shouldResetPosition: boolean = true) => {
    this.src = this.defaultState["src"];
    this.alt = this.defaultState["alt"];
    this.originalGifHeightPX = this.defaultState["originalGifHeightPX"];
    this.originalGifWidthPX = this.defaultState["originalGifWidthPX"];
    this.frameCount = this.defaultState["frameCount"];
    this.gifAspectRatio = this.defaultState["gifAspectRatio"];
    this.duration = this.defaultState["duration"];
    this.durationUnit = this.defaultState["durationUnit"];
    this.iterationCount = this.defaultState["iterationCount"];
    this.shouldPlay = this.defaultState["shouldPlay"];

    if (shouldResetPosition && this.imageElement != null) {
      this.imageElement.style.animation = "none";
    }

    if (this.shouldPlay) {
      this.playAnimation();
    } else {
      this.pauseAnimation();
    }
  };

  playAnimation = () => {
    if (this.imageElement != null) {
      this.imageElement.style.animationPlayState = 'running';
    }

    this.shouldPlay = true;
    this.changeDetector.detectChanges();
  };

  pauseAnimation = () => {
    if (this.imageElement != null) {
      this.imageElement.style.animationPlayState = 'paused';
    }

    this.shouldPlay = false;
    this.changeDetector.detectChanges();
  };

  changeAnimationDurationByFactorOf = (factor: number) => {
    if (factor > 0) {
      this.duration *= factor;
      this.changeDetector.detectChanges();
    }
  };

}
