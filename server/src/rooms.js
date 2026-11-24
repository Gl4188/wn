import { Game } from './game.js';

// 房间注册表：roomCode -> Game
export class RoomManager {
  constructor() {
    this.rooms = new Map();
  }

  createCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code;
    do {
      code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    } while (this.rooms.has(code));
    return code;
  }

  create() {
    const code = this.createCode();
    const game = new Game(code);
    this.rooms.set(code, game);
    return game;
  }

  get(code) {
    return this.rooms.get(code) || null;
  }

  cleanup(code) {
    this.rooms.delete(code);
  }
}
