import { io } from 'socket.io-client';

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io({ autoConnect: true, reconnection: true, reconnectionDelay: 500 });
  }
  return socket;
}

export function emit(event, ...args) {
  return getSocket().emit(event, ...args);
}
