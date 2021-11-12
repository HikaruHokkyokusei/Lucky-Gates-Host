import {ChangeDetectorRef, Component, Input, OnInit} from '@angular/core';
import * as uuid from "uuid";

export abstract class CanSetAnimatedImage {
  abstract setAnimatedImageComponent: (recogniseId: any, animatedImageComponent: AnimatedImageComponent) => void;
}

@Component({
  selector: 'app-animated-image[recogniseId]',
  templateUrl: './animated-image.component.html',
  styleUrls: ['./animated-image.component.css']
})
export class AnimatedImageComponent implements OnInit {

  @Input() notifiableComponent: null | CanSetAnimatedImage = null;
  @Input() recogniseId!: any;
  containerId: string = uuid.v4();
  containerElement: HTMLElement | null = null;

  @Input() src: string = "";
  @Input() alt: string = "";
  @Input() originalGifHeightPX: number = 1;
  @Input() originalGifWidthPX: number = 1;
  @Input() frameCount: number = 1;
  gifAspectRatio: number = this.originalGifWidthPX / this.originalGifHeightPX;

  @Input() duration: number = 1;
  @Input() durationUnit: string = "s";
  @Input() iterationCount: number = -1;

  constructor(private changeDetector: ChangeDetectorRef) {
  }

  ngOnInit(): void {
    if (this.notifiableComponent != null) {
      this.notifiableComponent.setAnimatedImageComponent(this.recogniseId, this);
    }
  }

  getAnimationString = () => {
    let animationString: string = "AnimatePortal " + this.duration + this.durationUnit + " steps(" + this.frameCount + ") ";

    if (this.iterationCount < 0) {
      animationString += "infinite ";
    } else {
      animationString += this.iterationCount + " ";
    }

    return animationString;
  };

  getAspectRatio = () => {
    return this.originalGifWidthPX * this.frameCount / this.originalGifHeightPX;
  }

}
