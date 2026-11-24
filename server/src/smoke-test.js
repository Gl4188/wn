import { Game } from './game.js';
import { BOARD } from './board.js';

let failures = 0;
function check(cond, msg) {
  if (cond) console.log('  ✓ ' + msg);
  else { console.log('  ✗ ' + msg); failures++; }
}

// 1. 棋盘结构
console.log('[棋盘]');
check(BOARD.length === 40, '棋盘共 40 格');
const cities = BOARD.filter((c) => c.type === 'city');
check(cities.length === 25, '共 25 座城市');
check(BOARD[0].corner === 'go', '0 号格是起点');
check(BOARD[10].corner === 'jail', '10 号格是监狱');
check(BOARD[20].corner === 'parking', '20 号格是免费停车');
check(BOARD[30].corner === 'gotojail', '30 号格是进监狱');
check(BOARD.filter((c) => c.type === 'station').length === 4, '4 个交通枢纽');
check(BOARD.filter((c) => c.type === 'utility').length === 2, '2 个公共事业');
const groups = new Set(cities.map((c) => c.group));
check(groups.size === 8, '8 个色组');

// 2. 完整对局模拟（2 人，随机骰子，最多 2000 步）
console.log('[对局模拟]');
const g = new Game('TEST01');
const a = g.addPlayer('Alice');
const b = g.addPlayer('Bob');
g.startGame();
check(g.status === 'playing', '游戏开始');
check(g.phase === 'roll', '首位玩家等待掷骰');

let steps = 0;
while (g.status === 'playing' && steps < 2000) {
  steps++;
  const cur = g.currentPlayer();
  if (!cur || !cur.alive) { g._nextTurn(); continue; }

  if (g.phase === 'roll') g.roll();
  else if (g.phase === 'jail') {
    if (cur.cash >= 500) g.payJailFine();
    else g.rollJailDice();
  } else if (g.phase === 'buy') g.buy(cur.cash >= BOARD[g.pendingBuy].price);
  else if (g.phase === 'build') {
    const buildable = g.buildableCities(cur.id);
    if (buildable.length && cur.cash >= BOARD[buildable[0]].houseCost) g.build(buildable[0]);
    g.endTurn();
  } else g.endTurn();
}

check(steps < 2000, `对局在 ${steps} 步内结束（未死循环）`);
check(g.status === 'ended', '对局正常结束');
check(g.winnerId && g.alivePlayers().length === 1, '产生唯一胜者');
console.log('  胜者:', g.getPlayer(g.winnerId)?.name);

// 3. 租金 / 整组翻倍 / 盖房
console.log('[规则校验]');
const g2 = new Game('TEST02');
g2.addPlayer('P1');
g2.addPlayer('P2');
const g1cells = g2.groupCells('g1').map((c) => c.index);
g2.owners[g1cells[0]] = 'p-owner';
g2.owners[g1cells[1]] = 'p-owner';
const base = g2.rentFor(g1cells[0], 4);
check(base === BOARD[g1cells[0]].rent[0] * 2, `整组无房租金翻倍（¥${base}）`);

const g3 = new Game('TEST03');
const p3 = g3.addPlayer('P3');
g3.addPlayer('P4');
const g8cells = g3.groupCells('g8').map((c) => c.index);
g8cells.forEach((i) => { g3.owners[i] = p3.id; p3.properties.push(i); });
check(g3.ownsFullGroup(p3.id, 'g8'), '集齐一线城市组');
const buildable = g3.buildableCities(p3.id);
check(buildable.length === g8cells.length, '整组均可盖房');
g3.currentTurn = 0;
g3.phase = 'build';
const before = p3.cash;
g3.build(buildable[0]);
check(g3.housesAt(buildable[0]) === 1, '盖房成功（1 栋）');
check(p3.cash === before - BOARD[buildable[0]].houseCost, '盖房扣款正确');

console.log(failures === 0 ? '\n✅ 全部通过' : `\n❌ ${failures} 项失败`);
process.exit(failures === 0 ? 0 : 1);
