import {Injectable} from '@angular/core';
import {ButtonData, PopUpComponent} from "../UIElements/pop-up/pop-up.component";
import * as uuid from "uuid";

interface PopUpData {
  [id: string]: {
    popUpComponent?: PopUpComponent, text: string, autoCloseAfterMillis: number, isClosable: boolean, buttonList: ButtonData[]
  }
}

@Injectable({
  providedIn: 'root'
})
export class PopUpManagerService {

  activePopUps: PopUpData = {};
  activePopUpKeys: string[] = [];

  constructor() {
  }

  popNewPopUp = (text: string, autoCloseAfterMillis: number = -1, isClosable: boolean = true, buttonList: ButtonData[] = []) => {
    let id: string = uuid.v4();
    this.activePopUps[id] = {
      text,
      autoCloseAfterMillis,
      isClosable,
      buttonList
    };
    this.activePopUpKeys = Object.keys(this.activePopUps);

    return id;
  };

  setPopUpWindowClass = (id: string, popUpComponent: PopUpComponent) => {
    if (this.activePopUps[id] != null) {
      this.activePopUps[id].popUpComponent = popUpComponent;
    }
  };

  closePopUpWithId = (id: string) => {
    if (this.activePopUps[id] != null) {
      this.activePopUps[id].popUpComponent?.closeThePopUp();
    }
  };

  popUpClosed = (id: string) => {
    delete this.activePopUps[id];
    this.activePopUpKeys = Object.keys(this.activePopUps);
  };
}
