import {io} from 'socket.io-client';

export class SocketIOService {
  socket;

  constructor(connectUrl: string) {
    this.socket = io(connectUrl, {
      'reconnectionDelay': 2500,
      "reconnectionAttempts": 100
    });
  }

  setActionForEvent(eventName: string, callback: (...args: any[]) => any) {
    this.socket.on(eventName, callback);
  }

  emitEventToServer(eventName: string, data: any) {
    this.socket.emit(eventName, data);
  }
}
