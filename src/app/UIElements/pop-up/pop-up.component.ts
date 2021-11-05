import { Component, OnInit } from '@angular/core';
import * as uuid from 'uuid';

@Component({
  selector: 'app-pop-up',
  templateUrl: './pop-up.component.html',
  styleUrls: ['./pop-up.component.css']
})
export class PopUpComponent implements OnInit {

  id: string = uuid.v4();

  constructor() { }

  ngOnInit(): void {
  }

  setPopUpVisibilityTo = (shouldShow: boolean) => {
    let divElement = document.getElementById(this.id);
    if (shouldShow) {
      if (divElement != null && divElement.style.display !== 'flex') {
        divElement.style.display = 'flex';
      }
    } else {
      if (divElement != null && divElement.style.display !== 'none') {
        divElement.style.display = 'none';
      }
    }
  };

}
