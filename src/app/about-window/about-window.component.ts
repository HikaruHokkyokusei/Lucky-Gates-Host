import {AfterViewInit, Component, Input, OnDestroy} from '@angular/core';
import {AppComponent} from "../app.component";

class Particle {
  canvasContext: CanvasRenderingContext2D | null;
  x: number;
  y: number;
  s: number;
  a: number;
  w: number;
  h: number;
  radius: number;
  color: string;

  constructor(canvas: HTMLCanvasElement, windowWidth: number, windowHeight: number) {
    this.canvasContext = canvas.getContext('2d');
    this.x = windowWidth / 2;
    this.y = windowHeight / 2;
    this.s = (3 + Math.random());
    this.a = 0;
    this.w = windowWidth;
    this.h = windowHeight;
    this.radius = 0.5 + Math.random() * 20;
    this.color = this.radius > 5 ? "#ff1a00" : "#c5241f";
  }

  render() {
    this.canvasContext?.beginPath();
    this.canvasContext?.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
    if (this.canvasContext != null) {
      this.canvasContext.lineWidth = 2;
      this.canvasContext.fillStyle = this.color;
    }
    this.canvasContext?.fill();
    this.canvasContext?.closePath();
  }

  move() {
    this.x += Math.cos(this.a) * this.s;
    this.y += Math.sin(this.a) * this.s;
    this.a += Math.random() * 0.8 - 0.4;

    if (this.x < 0 || this.x > this.w - this.radius) {
      return false;
    }

    if (this.y < 0 || this.y > this.h - this.radius) {
      return false;
    }
    this.render();
    return true;
  }
}

@Component({
  selector: 'app-about-window[appComponent]',
  templateUrl: './about-window.component.html',
  styleUrls: ['./about-window.component.css']
})
export class AboutWindowComponent implements AfterViewInit, OnDestroy {

  @Input() appComponent!: AppComponent;

  canvas1!: HTMLCanvasElement;
  context1!: CanvasRenderingContext2D;
  canvas2!: HTMLCanvasElement;
  context2!: CanvasRenderingContext2D;
  canvas3!: HTMLCanvasElement;
  context3!: CanvasRenderingContext2D;

  intervalId: number = 0;
  particles: Particle[] = [];
  frequency: number = 30;
  windowWidth: number = 600;
  windowHeight: number = 350;

  constructor() {
  }

  ngAfterViewInit(): void {
    let canvas = document.getElementById("c1");

    this.canvas1 = <HTMLCanvasElement>canvas;
    this.canvas2 = <HTMLCanvasElement>document.getElementById("c2");
    this.canvas3 = <HTMLCanvasElement>document.getElementById("c3");

    let context = this.canvas1.getContext('2d');
    if (context != null) {
      this.context1 = context;
    }
    context = this.canvas2.getContext('2d');
    if (context != null) {
      this.context2 = context;
    }
    context = this.canvas3.getContext('2d');
    if (context != null) {
      this.context3 = context;
    }

    this.writeText(this.canvas2, this.context2, "LUCKY\nGATES\nHOST");
    setInterval(() => {
      this.populate();
    }, this.frequency);
    this.update();
  }

  writeText = (canvas: HTMLCanvasElement, context: CanvasRenderingContext2D, text: string) => {
    let size = 50;
    context.font = size + "px Montserrat";
    context.fillStyle = "#111111";
    context.textAlign = "center";
    let lineHeight = 35;
    let lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      context.fillText(lines[i], canvas.width / 2, canvas.height / 2 + lineHeight * i - (lineHeight * (lines.length - 1)) / 3);
    }
  };

  blur = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, amt: number) => {
    ctx.filter = `blur(${amt}px)`;
    ctx.drawImage(canvas, 0, 0);
    ctx.filter = 'none';
  };

  clear = () => {
    this.context1.globalAlpha = 0.03;
    this.context1.fillStyle = '#111111';
    this.context1.fillRect(0, 0, this.canvas1.width, this.canvas1.height);
    this.context1.globalAlpha = 1;
  };

  maskCanvas = () => {
    this.context3.drawImage(this.canvas2, 0, 0, this.canvas2.width, this.canvas2.height);
    this.context3.globalCompositeOperation = 'source-atop';
    this.context3.drawImage(this.canvas1, 0, 0);
    this.blur(this.context1, this.canvas1, 2);
  };

  populate = () => {
    this.particles.push(new Particle(this.canvas1, this.windowWidth, this.windowHeight));
    return this.particles.length;
  };

  update = () => {
    this.clear();
    this.particles = this.particles.filter((p) => {
      return p.move();
    });
    this.maskCanvas();
    requestAnimationFrame(this.update);
  };

  ngOnDestroy() {
    if (this.intervalId != 0) {
      clearInterval(this.intervalId);
    }
  }

}
