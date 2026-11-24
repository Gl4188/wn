import { createClient } from '@supabase/supabase-js';
import { Game } from './game/game.js';

// Supabase 项目配置（anon / publishable key，公开使用）
const SUPABASE_URL = 'https://ldrsmhetienbfogtqmct.supabase.co';
const SUPABASE_KEY = 'sb_publishable_S8iuSqeeb3SZKCt_01mr6Q_NQItY041';

const PID_KEY = 'monopoly:playerId';
const RC_KEY = 'monopoly:roomCode';
const NAME_KEY = 'monopoly:name';

let client = null;
function supabase() {
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

export function getPlayerId() {
  let id = localStorage.getItem(PID_KEY);
  if (!id) {
    id = crypto.randomUUID
      ? crypto.randomUUID()
      : 'p' + Date.now() + Math.random().toString(36).slice(2);
    localStorage.setItem(PID_KEY, id);
  }
  return id;
}

export function getSavedName() {
  return localStorage.getItem(NAME_KEY) || '';
}

function randomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// ---- 回调 ----
let onState = null;
let onError = null;
let onLeft = null;

export function setOnState(cb) { onState = cb; }
export function setOnError(cb) { onError = cb; }
export function setOnLeft(cb) { onLeft = cb; }

function emitError(msg) { if (onError) onError(msg); }
function emitLeft() { if (onLeft) onLeft(); }

function assertTurn(game, p) {
  const cur = game.currentPlayer();
  if (!cur || cur.id !== p.id) throw new Error('还没轮到你');
}

class Room {
  constructor() {
    this.isHost = false;
    this.roomCode = null;
    this.playerId = getPlayerId();
    this.name = getSavedName();
    this.game = null;      // 仅房主持有
    this.channel = null;
    this.joined = false;
    this.joinTimer = null;
  }

  create(name) {
    this.isHost = true;
    this.name = name;
    this.roomCode = randomCode();
    this.game = new Game(this.roomCode);
    this.game.addPlayer(name, this.playerId);   // 房主 = 玩家 0
    localStorage.setItem(RC_KEY, this.roomCode);
    localStorage.setItem(NAME_KEY, name);
    this._subscribe(true);
    this._publish();
    return this.roomCode;
  }

  join(code, name) {
    this.isHost = false;
    this.roomCode = code;
    this.name = name;
    localStorage.setItem(RC_KEY, code);
    localStorage.setItem(NAME_KEY, name);
    this._subscribe(false);
    clearTimeout(this.joinTimer);
    this.joinTimer = setTimeout(() => {
      if (!this.joined) {
        emitError('未找到该房间，请检查房间码（房主需先在线）');
        this.leave();
        emitLeft();
      }
    }, 7000);
  }

  _subscribe(asHost) {
    const ch = supabase().channel('room:' + this.roomCode, {
      config: {
        broadcast: { self: false },
        presence: { key: this.playerId },
      },
    });

    ch.on('broadcast', { event: 'msg' }, ({ payload }) => this._handle(payload));
    ch.on('presence', { event: 'sync' }, () => {
      if (asHost) this._syncPresence();
      else this._checkHost();
    });

    ch.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await ch.track({
          playerId: this.playerId,
          name: this.name,
          isHost: asHost,
        });
        if (asHost) this._syncPresence();
      }
    });

    this.channel = ch;
  }

  // 房主：根据 presence 同步房间成员
  _syncPresence() {
    const g = this.game;
    if (!g || !this.channel) return;
    const presence = this.channel.presenceState() || {};

    if (g.status === 'waiting') {
      for (const pid in presence) {
        if (pid === this.playerId) continue;
        const meta = (presence[pid] || [{}])[0];
        if (!g.getPlayer(pid)) {
          if (g.players.length < 6) g.addPlayer(meta.name || '玩家', pid);
        } else {
          g.getPlayer(pid).connected = true;
        }
      }
    }
    for (const p of g.players) {
      p.connected = p.id === this.playerId || !!presence[p.id];
    }
    this._publish();
  }

  // 访客：加入成功后检测房主是否还在
  _checkHost() {
    if (!this.joined || !this.channel) return;
    const presence = this.channel.presenceState() || {};
    let hostAlive = false;
    for (const pid in presence) {
      if ((presence[pid] || []).some((m) => m.isHost)) { hostAlive = true; break; }
    }
    if (!hostAlive) {
      emitError('房主已离开，房间关闭');
      this.leave();
      emitLeft();
    }
  }

  _handle(payload) {
    if (this.isHost) {
      if (payload.type === 'action') this._applyAction(payload);
    } else if (payload.type === 'state') {
      this.joined = true;
      clearTimeout(this.joinTimer);
      if (onState) onState(payload.state);
    }
  }

  _applyAction(payload) {
    const g = this.game;
    if (!g) return;
    const p = g.getPlayer(payload.playerId);
    if (!p) return;
    const a = payload.action || {};
    try {
      switch (a.kind) {
        case 'startGame':
          if (g.players[0].id === p.id) g.startGame();
          break;
        case 'roll': assertTurn(g, p); g.roll(); break;
        case 'buy': assertTurn(g, p); g.buy(!!a.data); break;
        case 'build': assertTurn(g, p); g.build(a.data); break;
        case 'payJailFine': assertTurn(g, p); g.payJailFine(); break;
        case 'rollJailDice': assertTurn(g, p); g.rollJailDice(); break;
        case 'endTurn': assertTurn(g, p); g.endTurn(); break;
        default: break;
      }
    } catch (e) {
      /* 非法操作忽略 */
    }
    this._publish();
  }

  _publish() {
    if (!this.game) return;
    const state = this.game.snapshot(null);
    if (onState) onState(state);
    if (this.channel) {
      this.channel.send({
        type: 'broadcast',
        event: 'msg',
        payload: { type: 'state', state },
      });
    }
  }

  act(kind, data) {
    if (this.isHost && this.game) {
      this._applyAction({ playerId: this.playerId, action: { kind, data } });
    } else if (this.channel) {
      this.channel.send({
        type: 'broadcast',
        event: 'msg',
        payload: { type: 'action', playerId: this.playerId, action: { kind, data } },
      });
    }
  }

  leave() {
    clearTimeout(this.joinTimer);
    if (this.channel) {
      supabase().removeChannel(this.channel);
      this.channel = null;
    }
    this.game = null;
    this.isHost = false;
    this.joined = false;
    localStorage.removeItem(RC_KEY);
  }
}

let room = null;

export function createRoom(name) {
  if (room) room.leave();
  room = new Room();
  return room.create(name);
}

export function joinRoom(code, name) {
  if (room) room.leave();
  room = new Room();
  room.join(code, name);
}

export function act(kind, data) {
  if (room) room.act(kind, data);
}

export function leaveRoom() {
  if (room) room.leave();
  room = null;
}
