import {AfterViewInit, Component, OnInit} from '@angular/core';
import * as uuid from 'uuid';

export interface ButtonData {
  buttonText: string;
  onClickFunction: () => any;
  millisBeforeClose: number;
}

@Component({
  selector: 'app-pop-up',
  templateUrl: './pop-up.component.html',
  styleUrls: ['./pop-up.component.css']
})
export class PopUpComponent implements OnInit, AfterViewInit {

  divElement: HTMLElement | null = null;
  popUpCount: number = 0;
  text: string = "";
  buttonList: ButtonData[] = [];
  id: string = uuid.v4();

  constructor() { }

  ngOnInit(): void {
  }

  ngAfterViewInit() {
    this.divElement = document.getElementById(this.id);
  }

  autoClose = (millisBeforeClose: number) => {
    if (millisBeforeClose >= 0 && this.divElement?.style.display !== 'none') {
      setTimeout(() => { this.setPopUpVisibilityTo(false); }, millisBeforeClose);
    }
  };

  setPopUpVisibilityTo = (shouldShow: boolean, closeOverride: boolean = false, autoCloseAfterMillis: number = -1) => {
    if (shouldShow) {
      this.popUpCount++;
      if (this.divElement != null && this.divElement.style.display !== 'flex') {
        this.divElement.style.display = 'flex';
      }
      this.autoClose(autoCloseAfterMillis);
    } else if (this.popUpCount > 0 || closeOverride) {
      if (closeOverride) {
        this.popUpCount = 0;
      } else {
        this.popUpCount--;
      }
      if (this.popUpCount == 0 && this.divElement != null && this.divElement.style.display !== 'none') {
        this.divElement.style.display = 'none';
      }
    }
  };

  callButtonFunction = (buttonIndex: number) => {
    if (buttonIndex < this.buttonList.length) {
      this.buttonList[buttonIndex].onClickFunction();
      this.autoClose(this.buttonList[buttonIndex].millisBeforeClose);
    }
  };

  setText = (text: string) => {
    this.text = text;
  };

  setButtonList = (buttonList: ButtonData[]) => {
    this.buttonList = buttonList;
  }

}
