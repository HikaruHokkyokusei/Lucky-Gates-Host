import {AfterViewInit, Component, EventEmitter, Input, OnInit, Output} from '@angular/core';

export interface ButtonData {
  buttonText: string;
  onClickFunction: () => any;
  millisBeforeClose: number;
}

@Component({
  selector: 'app-pop-up[id]',
  templateUrl: './pop-up.component.html',
  styleUrls: ['./pop-up.component.css']
})
export class PopUpComponent implements OnInit, AfterViewInit {

  divElement: HTMLElement | null = null;
  @Input() id!: string;
  @Input() isClosable: boolean = true;
  @Input() text: string = "";
  @Input() autoCloseAfterMillis: number = -1;
  @Input() buttonList: ButtonData[] = [];
  @Output() onPopUpClose = new EventEmitter();

  constructor() {
    if (!this.isClosable && this.autoCloseAfterMillis <= 0) {
      throw "Cannot have a non Closable Pop Up without auto close.";
    }
  }

  ngOnInit(): void {
  }

  ngAfterViewInit() {
    this.divElement = document.getElementById(this.id);
    this.autoCloseAfter(this.autoCloseAfterMillis);
  }

  autoCloseAfter = (millisBeforeClose: number) => {
    if (millisBeforeClose >= 0) {
      setTimeout(() => {
        this.closeThePopUp();
      }, millisBeforeClose);
    }
  };

  closeThePopUp = () => {
    if (this.divElement != null && this.divElement.style.display !== 'none') {
      this.divElement.style.display = 'none';
    }
    this.onPopUpClose.emit();
  };

  callButtonFunction = (buttonIndex: number) => {
    if (buttonIndex < this.buttonList.length) {
      this.buttonList[buttonIndex].onClickFunction();
      this.autoCloseAfter(this.buttonList[buttonIndex].millisBeforeClose);
    }
  };
}
