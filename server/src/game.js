import {
  BOARD, GROUPS, START_CASH, GO_SALARY, JAIL_FINE, JAIL_INDEX,
  PLAYER_COLORS,
} from './board.js';
import { buildCardDeck, shuffle } from './cards.js';

let idCounter = 0;

export class Game {
  constructor(roomCode) {
    this.roomCode = roomCode;
    this.status = 'waiting';           // waiting | playing | ended
    this.phase = 'waiting';            // roll | jail | buy | build | ended
    this.players = [];
    this.board = BOARD;
    this.owners = {};                  // index -> playerId
    this.houses = {};                  // index -> count (0..5)
    this.currentTurn = -1;
    this.dice = null;
    this.doublesCount = 0;
    this.pendingCard = null;           // 需要前端展示的卡牌
    this.pendingBuy = null;            // 待购买的地产格
    this.log = [];
    this.message = null;               // 最近一条关键事件（前端 toast）
    this.winnerId = null;

    const deck = shuffle(buildCardDeck());
    this.chanceDeck = deck.filter((c) => c.kind === 'chance');
    this.destinyDeck = deck.filter((c) => c.kind === 'destiny');
  }

  // ---------- 玩家 ----------
  addPlayer(name) {
    if (this.players.length >= 6) throw new Error('房间已满（最多 6 人）');
    const p = {
      id: 'p' + (++idCounter),
      name: (name || '').trim() || '玩家' + (this.players.length + 1),
      color: PLAYER_COLORS[this.players.length],
      cash: START_CASH,
      position: 0,
      inJail: false,
      jailTurns: 0,
      alive: true,
      connected: true,
      properties: [],
    };
    this.players.push(p);
    this._log(`「${p.name}」加入房间`);
    return p;
  }

  removePlayer(id) {
    const p = this.getPlayer(id);
    if (!p) return;
    if (this.status === 'waiting') {
      this.players = this.players.filter((x) => x.id !== id);
    } else {
      p.connected = false;
    }
  }

  getPlayer(id) {
    return this.players.find((p) => p.id === id) || null;
  }

  currentPlayer() {
    return this.players[this.currentTurn] || null;
  }

  alivePlayers() {
    return this.players.filter((p) => p.alive);
  }

  // ---------- 地产归属 ----------
  ownerOf(index) {
    return this.owners[index] || null;
  }

  housesAt(index) {
    return this.houses[index] || 0;
  }

  groupCells(group) {
    return this.board.filter((c) => c.type === 'city' && c.group === group);
  }

  ownsFullGroup(playerId, group) {
    const cells = this.groupCells(group);
    if (!cells.length) return false;
    return cells.every((c) => this.owners[c.index] === playerId);
  }

  countStations(playerId) {
    return this.board.filter(
      (c) => c.type === 'station' && this.owners[c.index] === playerId,
    ).length;
  }

  countUtilities(playerId) {
    return this.board.filter(
      (c) => c.type === 'utility' && this.owners[c.index] === playerId,
    ).length;
  }

  // ---------- 租金 ----------
  rentFor(index, diceSum) {
    const cell = this.board[index];
    const owner = this.ownerOf(index);
    if (!owner) return 0;
    if (cell.type === 'city') {
      const h = this.housesAt(index);
      if (h === 0 && this.ownsFullGroup(owner, cell.group)) return cell.rent[0] * 2;
      return cell.rent[h];
    }
    if (cell.type === 'station') {
      return cell.rent[this.countStations(owner) - 1] || 0;
    }
    if (cell.type === 'utility') {
      const mult = this.countUtilities(owner) === 2 ? 10 : 4;
      return diceSum * mult;
    }
    return 0;
  }

  // ---------- 金钱 ----------
  collect(player, amount) {
    player.cash += amount;
  }

  // 向玩家收钱；不足则卖房；再不足则破产。creditorId 为收款方（null=银行）
  charge(player, amount, creditorId) {
    if (player.cash >= amount) {
      player.cash -= amount;
      if (creditorId) {
        const c = this.getPlayer(creditorId);
        if (c) c.cash += amount;
      }
      return true;
    }
    this._liquidate(player);
    if (player.cash >= amount) {
      player.cash -= amount;
      if (creditorId) {
        const c = this.getPlayer(creditorId);
        if (c) c.cash += amount;
      }
      return true;
    }
    this._bankrupt(player, creditorId);
    return false;
  }

  _liquidate(player) {
    for (const idx of player.properties) {
      const cell = this.board[idx];
      if (cell.type === 'city') {
        const h = this.housesAt(idx);
        if (h > 0) {
          player.cash += Math.floor((cell.houseCost * h) / 2);
          this.houses[idx] = 0;
        }
      }
    }
  }

  _bankrupt(player, creditorId) {
    player.alive = false;
    if (creditorId) {
      const c = this.getPlayer(creditorId);
      if (c) {
        c.cash += player.cash;
        this._log(`「${player.name}」破产，${player.cash} 元归「${c.name}」所有`);
      }
    } else {
      this._log(`「${player.name}」破产`);
    }
    player.cash = 0;
    for (const idx of player.properties) {
      delete this.owners[idx];
      delete this.houses[idx];
    }
    player.properties = [];
    this._checkGameOver();
  }

  _checkGameOver() {
    const alive = this.alivePlayers();
    if (alive.length <= 1) {
      this.status = 'ended';
      this.phase = 'ended';
      this.winnerId = alive[0] ? alive[0].id : null;
      this._log(`游戏结束，「${alive[0].name}」获胜！`);
    }
  }

  // ---------- 开始 ----------
  startGame() {
    if (this.players.length < 2) throw new Error('至少需要 2 名玩家');
    if (this.status !== 'waiting') throw new Error('游戏已经开始');
    this.status = 'playing';
    this.currentTurn = 0;
    this._startTurn();
  }

  _startTurn() {
    const p = this.currentPlayer();
    if (!p) return;
    this.doublesCount = 0;
    this.dice = null;
    this.pendingCard = null;
    this.pendingBuy = null;
    this.phase = p.inJail ? 'jail' : 'roll';
    this._log(`轮到「${p.name}」`);
  }

  _nextTurn() {
    if (this.status === 'ended') return;
    const n = this.players.length;
    let next = this.currentTurn;
    for (let i = 0; i < n; i++) {
      next = (next + 1) % n;
      if (this.players[next].alive) break;
    }
    this.currentTurn = next;
    this._startTurn();
  }

  // ---------- 掷骰 ----------
  roll() {
    const p = this.currentPlayer();
    if (!p || this.phase !== 'roll' || p.inJail) throw new Error('现在不能掷骰');
    const d1 = 1 + Math.floor(Math.random() * 6);
    const d2 = 1 + Math.floor(Math.random() * 6);
    this.dice = { d1, d2 };
    const isDouble = d1 === d2;

    if (isDouble) {
      this.doublesCount++;
      if (this.doublesCount >= 3) {
        this._sendToJail(p);
        this._log(`「${p.name}」连掷三次双骰，进入监狱`);
        this.phase = 'build';
        return;
      }
    }

    this._move(p, d1 + d2, isDouble);
  }

  _move(p, steps, isDouble) {
    const from = p.position;
    let to = (from + steps) % 40;
    if (to < from) this.collect(p, GO_SALARY);
    p.position = to;
    this._log(`「${p.name}」掷出 ${this.dice.d1}+${this.dice.d2}，移动到「${this.board[to].name}」`);
    this._resolveLanding(p, this.dice ? this.dice.d1 + this.dice.d2 : steps, isDouble);
  }

  _resolveLanding(p, diceSum, isDouble) {
    const cell = this.board[p.position];

    if (cell.type === 'corner') {
      if (cell.corner === 'gotojail') {
        this._sendToJail(p);
        this._log(`「${p.name}」被关进监狱`);
        this.phase = 'build';
        return;
      }
      this.phase = isDouble && !p.inJail ? 'roll' : 'build';
      return;
    }

    if (cell.type === 'city' || cell.type === 'station' || cell.type === 'utility') {
      const owner = this.ownerOf(p.position);
      if (!owner) {
        if (p.cash >= cell.price) {
          this.pendingBuy = p.position;
          this.phase = 'buy';
        } else {
          this._log(`「${p.name}」资金不足，无法购买「${cell.name}」`);
          this.phase = isDouble && !p.inJail ? 'roll' : 'build';
        }
        return;
      }
      if (owner === p.id) {
        this.phase = isDouble && !p.inJail ? 'roll' : 'build';
        return;
      }
      const rent = this.rentFor(p.position, diceSum);
      const ow = this.getPlayer(owner);
      this._log(`「${p.name}」支付租金 ${rent} 元给「${ow ? ow.name : '?'}」`);
      this.charge(p, rent, owner);
      if (p.alive) this.phase = isDouble && !p.inJail ? 'roll' : 'build';
      return;
    }

    if (cell.type === 'chance' || cell.type === 'destiny') {
      this._drawCard(p, cell.type, diceSum, isDouble);
      return;
    }

    if (cell.type === 'tax') {
      this._log(`「${p.name}」缴纳所得税 ${cell.amount} 元`);
      this.charge(p, cell.amount, null);
      if (p.alive) this.phase = isDouble && !p.inJail ? 'roll' : 'build';
      return;
    }

    this.phase = isDouble && !p.inJail ? 'roll' : 'build';
  }

  _sendToJail(p) {
    p.position = JAIL_INDEX;
    p.inJail = true;
    p.jailTurns = 0;
  }

  // ---------- 卡牌 ----------
  _drawCard(p, kind, diceSum, isDouble) {
    const deck = kind === 'chance' ? this.chanceDeck : this.destinyDeck;
    if (!deck.length) {
      this.phase = isDouble && !p.inJail ? 'roll' : 'build';
      return;
    }
    const card = deck.shift();
    deck.push(card); // 放回底部循环使用
    this.pendingCard = { kind, text: card.text };
    this._log(`「${p.name}」抽到${kind === 'chance' ? '机会' : '命运'}卡：${card.text}`);
    this._applyCard(p, card.effect, diceSum, isDouble);
  }

  _applyCard(p, effect, diceSum, isDouble) {
    switch (effect.type) {
      case 'advanceToGo':
        p.position = 0;
        this.collect(p, GO_SALARY);
        this._log(`「${p.name}」前进到起点，领取 ${GO_SALARY} 元`);
        this._endCardTurn(p, isDouble);
        break;
      case 'goToJail':
        this._sendToJail(p);
        this._log(`「${p.name}」进入监狱`);
        this._endCardTurn(p, false);
        break;
      case 'advanceToIndex': {
        const to = effect.index;
        if (to < p.position) this.collect(p, GO_SALARY);
        p.position = to;
        this._resolveAfterCardMove(p, diceSum, isDouble, effect);
        break;
      }
      case 'advanceToNearestStation': {
        let to = p.position;
        for (let i = 1; i <= 40; i++) {
          const idx = (p.position + i) % 40;
          if (this.board[idx].type === 'station') { to = idx; break; }
        }
        if (to < p.position) this.collect(p, GO_SALARY);
        p.position = to;
        this._resolveAfterCardMove(p, diceSum, isDouble, { ...effect, stationRent: effect.doubleRent ? 2 : 1 });
        break;
      }
      case 'moveBack': {
        p.position = (p.position - effect.steps + 40) % 40;
        this._log(`「${p.name}」后退 ${effect.steps} 步到「${this.board[p.position].name}」`);
        this._endCardTurn(p, isDouble);
        break;
      }
      case 'collect':
        this.collect(p, effect.amount);
        this._log(`「${p.name}」获得 ${effect.amount} 元`);
        this._endCardTurn(p, isDouble);
        break;
      case 'pay':
        this.charge(p, effect.amount, null);
        this._endCardTurn(p, isDouble);
        break;
      case 'repair': {
        let cost = 0;
        for (const idx of p.properties) {
          const h = this.housesAt(idx);
          if (h === 5) cost += effect.perHotel;
          else cost += h * effect.perHouse;
        }
        if (cost > 0) this.charge(p, cost, null);
        this._log(`「${p.name}」支付维修费 ${cost} 元`);
        this._endCardTurn(p, isDouble);
        break;
      }
      case 'birthday': {
        let total = 0;
        for (const other of this.alivePlayers()) {
          if (other.id === p.id) continue;
          if (other.cash >= effect.amount) {
            other.cash -= effect.amount;
            total += effect.amount;
          }
        }
        p.cash += total;
        this._log(`「${p.name}」收到生日红包共 ${total} 元`);
        this._endCardTurn(p, isDouble);
        break;
      }
      default:
        this._endCardTurn(p, isDouble);
    }
  }

  // 卡牌移动后再解析落点（可再次买地/收租）
  _resolveAfterCardMove(p, diceSum, isDouble, effect) {
    const cell = this.board[p.position];
    if (effect.stationRent && cell.type === 'station' && this.ownerOf(p.position) && this.ownerOf(p.position) !== p.id) {
      const rent = this.rentFor(p.position, diceSum) * effect.stationRent;
      this.charge(p, rent, this.ownerOf(p.position));
    } else if (cell.type === 'city' && !this.ownerOf(p.position) && p.cash >= cell.price) {
      this.pendingBuy = p.position;
      this.phase = 'buy';
      return;
    } else if ((cell.type === 'city' || cell.type === 'station' || cell.type === 'utility') && this.ownerOf(p.position) && this.ownerOf(p.position) !== p.id) {
      this.charge(p, this.rentFor(p.position, diceSum), this.ownerOf(p.position));
    }
    if (p.alive) this._endCardTurn(p, isDouble);
  }

  _endCardTurn(p, isDouble) {
    if (p.alive && isDouble && !p.inJail) {
      this.phase = 'roll';
    } else if (p.alive) {
      this.phase = 'build';
    }
  }

  // ---------- 购买 / 放弃 ----------
  buy(decision) {
    const p = this.currentPlayer();
    if (!p || this.phase !== 'buy' || this.pendingBuy == null) throw new Error('现在不能购买');
    const idx = this.pendingBuy;
    const cell = this.board[idx];
    this.pendingBuy = null;

    if (decision) {
      if (p.cash < cell.price) throw new Error('资金不足');
      p.cash -= cell.price;
      this.owners[idx] = p.id;
      p.properties.push(idx);
      this._log(`「${p.name}」花费 ${cell.price} 元买下「${cell.name}」`);
    } else {
      this._log(`「${p.name}」放弃购买「${cell.name}」`);
    }

    const isDouble = this.dice && this.dice.d1 === this.dice.d2;
    this.phase = isDouble && !p.inJail ? 'roll' : 'build';
  }

  // ---------- 盖房 ----------
  buildableCities(playerId) {
    const res = [];
    const groups = Object.keys(GROUPS);
    for (const g of groups) {
      if (!this.ownsFullGroup(playerId, g)) continue;
      const cells = this.groupCells(g);
      // 均衡建设：只允许在房子数最少的城市上盖
      const minH = Math.min(...cells.map((c) => this.housesAt(c.index)));
      for (const c of cells) {
        const h = this.housesAt(c.index);
        if (h < 5 && h === minH) res.push(c.index);
      }
    }
    return res;
  }

  build(index) {
    const p = this.currentPlayer();
    if (!p) throw new Error('不是你的回合');
    if (this.phase === 'buy') throw new Error('请先处理购买');
    const cell = this.board[index];
    if (!cell || cell.type !== 'city') throw new Error('只能给城市盖房');
    if (!this.buildableCities(p.id).includes(index)) throw new Error('暂不能在此盖房（需集齐同组并均衡建设）');
    if (p.cash < cell.houseCost) throw new Error('资金不足');
    p.cash -= cell.houseCost;
    this.houses[index] = this.housesAt(index) + 1;
    const level = this.houses[index] === 5 ? '旅馆' : `${this.houses[index]} 栋房`;
    this._log(`「${p.name}」花费 ${cell.houseCost} 元在「${cell.name}」盖至 ${level}`);
  }

  // ---------- 监狱 ----------
  payJailFine() {
    const p = this.currentPlayer();
    if (!p || this.phase !== 'jail' || !p.inJail) throw new Error('现在不能出狱');
    this.charge(p, JAIL_FINE, null);
    if (!p.alive) return;
    p.inJail = false;
    p.jailTurns = 0;
    this.phase = 'roll';
    this._log(`「${p.name}」支付 ${JAIL_FINE} 元出狱`);
  }

  rollJailDice() {
    const p = this.currentPlayer();
    if (!p || this.phase !== 'jail' || !p.inJail) throw new Error('现在不能掷狱中骰');
    const d1 = 1 + Math.floor(Math.random() * 6);
    const d2 = 1 + Math.floor(Math.random() * 6);
    this.dice = { d1, d2 };
    const isDouble = d1 === d2;
    p.jailTurns++;

    if (isDouble) {
      p.inJail = false;
      p.jailTurns = 0;
      this._log(`「${p.name}」掷出双骰，出狱`);
      this._move(p, d1 + d2, false);
      return;
    }

    if (p.jailTurns >= 3) {
      this._log(`「${p.name}」坐满三回合，强制支付 ${JAIL_FINE} 元出狱`);
      this.charge(p, JAIL_FINE, null);
      if (!p.alive) return;
      p.inJail = false;
      p.jailTurns = 0;
      this._move(p, d1 + d2, false);
      return;
    }

    this._log(`「${p.name}」掷狱中骰未出双，继续坐牢`);
    this.phase = 'build';
  }

  // ---------- 结束回合 ----------
  endTurn() {
    const p = this.currentPlayer();
    if (!p || (this.phase !== 'build' && this.phase !== 'roll')) throw new Error('请先完成当前操作');
    this._nextTurn();
  }

  _log(text) {
    this.log.push(text);
    this.message = text;
    if (this.log.length > 200) this.log = this.log.slice(-200);
  }

  // ---------- 序列化（发给前端） ----------
  snapshot(youId) {
    return {
      roomCode: this.roomCode,
      status: this.status,
      phase: this.phase,
      currentTurn: this.currentTurn,
      dice: this.dice,
      doublesCount: this.doublesCount,
      pendingCard: this.pendingCard,
      pendingBuy: this.pendingBuy,
      winnerId: this.winnerId,
      message: this.message,
      log: this.log.slice(-40),
      youId,
      board: this.board.map((c) => ({
        index: c.index,
        type: c.type,
        name: c.name,
        group: c.group || null,
        color: c.group ? GROUPS[c.group].color : null,
        price: c.price || null,
        rent: c.rent || null,
        houseCost: c.houseCost || null,
        corner: c.corner || null,
        amount: c.amount || null,
      })),
      owners: this.owners,
      houses: this.houses,
      buildable: this.currentPlayer() ? this.buildableCities(this.currentPlayer().id) : [],
      players: this.players.map((p) => ({
        id: p.id,
        name: p.name,
        color: p.color,
        cash: p.cash,
        position: p.position,
        inJail: p.inJail,
        jailTurns: p.jailTurns,
        alive: p.alive,
        connected: p.connected,
        properties: p.properties.slice(),
      })),
    };
  }
}
