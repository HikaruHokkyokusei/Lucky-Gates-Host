import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {ThemeService} from "../../theme.service";

@Component({
  selector: 'app-button',
  templateUrl: './button.component.html',
  styleUrls: ['./button.component.css']
})
export class ButtonComponent implements OnInit {
  @Input() buttonText: string = "";
  @Input() millisBetweenClicks: number = 2500;
  @Output() onButtonClick: EventEmitter<any> = new EventEmitter();

  nextClickTime: number = Date.now();
  textColor: string;
  buttonBgColor: string; // TODO : Bind this var in the html file

  constructor() {
    let theme = ThemeService.getTheme();
    this.textColor = theme.buttonTextColor;
    this.buttonBgColor = theme.buttonBgColor;
  }

  ngOnInit(): void {
    if (this.millisBetweenClicks < 0) {
      this.millisBetweenClicks = 1000;
    }
  }

  onClick() {
    if (Date.now() >= this.nextClickTime) {
      this.onButtonClick.emit();
      this.nextClickTime = Date.now() + this.millisBetweenClicks;
    }
  }
}
