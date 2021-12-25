import {AfterViewInit, Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import * as uuid from "uuid";
import {ThemeService} from "../../services/theme.service";

export abstract class CanSetButtonComponent {
  abstract setButtonComponent: (recogniseId: any, buttonComponent: ButtonComponent) => void;
}

@Component({
  selector: 'app-button',
  templateUrl: './button.component.html',
  styleUrls: ['./button.component.css']
})
export class ButtonComponent implements OnInit, AfterViewInit {
  @Input() buttonText: string = "";
  @Input() millisBetweenClicks: number = 2500;
  @Input() notifiableComponent: null | CanSetButtonComponent = null;
  @Input() recogniseId!: any;
  @Output() onButtonClick: EventEmitter<any> = new EventEmitter();

  id: string = uuid.v4();
  buttonBg: HTMLElement | null = null;
  nextClickTime: number = Date.now();
  textColor: string;
  buttonBgColor: string;
  disabledReason: string = "";
  isEnabled: boolean = true;

  constructor() {
    let theme = ThemeService.getTheme();
    this.textColor = theme.buttonTextColor;
    this.buttonBgColor = theme.buttonBgColor;
  }

  ngOnInit(): void {
    if (this.millisBetweenClicks < 0) {
      this.millisBetweenClicks = 1000;
    }
    if (this.notifiableComponent != null) {
      this.notifiableComponent.setButtonComponent(this.recogniseId, this);
    }
  }

  ngAfterViewInit() {
    this.buttonBg = document.getElementById(this.id);
  }

  onClick() {
    if (this.isEnabled) {
      if (Date.now() >= this.nextClickTime) {
        this.onButtonClick.emit();
        this.nextClickTime = Date.now() + this.millisBetweenClicks;
      }
    }
  }

  shrink() {
    if (this.isEnabled && this.buttonBg != null) {
      this.buttonBg.style.opacity = "0";
      this.buttonBg.style.transform = "scale(0.4, 0.4)";
    }
  }

  expand() {
    if (this.buttonBg != null) {
      this.buttonBg.style.opacity = "1";
      this.buttonBg.style.transform = "scale(1, 1)";
    }
  }

  enable() {
    this.isEnabled = true;
    this.disabledReason = "";
  }

  disable(reason: string) {
    this.isEnabled = false;
    this.disabledReason = reason;
  }
}
