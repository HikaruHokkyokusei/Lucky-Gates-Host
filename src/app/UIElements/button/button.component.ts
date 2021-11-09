import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';

@Component({
  selector: 'app-button',
  templateUrl: './button.component.html',
  styleUrls: ['./button.component.css']
})
export class ButtonComponent implements OnInit {
  @Input() buttonText: string = "";
  @Input() millisBetweenClicks: number = 1000;
  nextClickTime: number = Date.now();
  @Output() onButtonClick: EventEmitter<any> = new EventEmitter();

  constructor() {
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
