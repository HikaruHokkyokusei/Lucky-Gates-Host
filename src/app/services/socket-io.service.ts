import {io} from 'socket.io-client';
import {AppComponent} from "../app.component";

export class SocketIOService {
  socket;
  signCode: string = "";

  constructor(private appComponent: AppComponent) {
    this.socket = io(window.location.origin, {
      'reconnectionDelay': 2500,
      "reconnectionAttempts": 100
    });

    this.setActionForEvent("signCode", (signCode) => {
      this.signCode = signCode;
      setTimeout(this.appComponent.bindPlayerAddress, 500);
    });
  }

  setActionForEvent(eventName: string, callback: (...args: any[]) => any) {
    this.socket.on(eventName, callback);
  }

  emitEventToServer(eventName: string, data: any) {
    this.socket.emit(eventName, data);
  }
}
