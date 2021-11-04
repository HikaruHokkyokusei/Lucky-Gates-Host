import {Component, Input, OnInit} from '@angular/core';
import * as uuid from "uuid";

@Component({
  selector: 'app-animated-image',
  templateUrl: './animated-image.component.html',
  styleUrls: ['./animated-image.component.css']
})
export class AnimatedImageComponent implements OnInit {

  containerId: string = uuid.v4();
  @Input() src: string = "";
  @Input() alt: string = "";

  @Input() originalGifHeightPX: number = 1;
  @Input() originalGifWidthPX: number = 1;
  gifAspectRatio: number = this.originalGifWidthPX / this.originalGifHeightPX;

  @Input() frameCount: number = 1;
  @Input() duration: number = 1;
  @Input() durationUnit: string = "s";

  @Input() iterationCount: number = -1;

  containerElement: HTMLElement | null = null;

  constructor() {
  }

  ngOnInit(): void {
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
