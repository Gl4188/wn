import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { RoomManager } from './rooms.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 10000;

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// 托管打包后的前端（生产环境）
const distDir = path.resolve(__dirname, '../../client/dist');
app.use(express.static(distDir));
app.get('/health', (req, res) => res.json({ ok: true }));
app.get('/', (req, res) => res.sendFile(path.join(distDir, 'index.html')));

const rooms = new RoomManager();

function assertTurn(game, p) {
  const cur = game.currentPlayer();
  if (!cur || cur.id !== p.id) throw new Error('还没轮到你');
}

function broadcast(game) {
  const members = io.sockets.adapter.rooms.get(game.roomCode) || new Set();
  for (const sid of members) {
    const s = io.sockets.sockets.get(sid);
    if (s) s.emit('state', game.snapshot(s.data.playerId));
  }
}

function run(socket, fn) {
  const code = socket.data.roomCode;
  const pid = socket.data.playerId;
  const game = code && rooms.get(code);
  if (!game) return;
  const p = game.getPlayer(pid);
  if (!p) return;
  try {
    fn(game, p);
    broadcast(game);
  } catch (e) {
    socket.emit('error', { message: e.message });
    broadcast(game);
  }
}

io.on('connection', (socket) => {
  socket.on('createRoom', (name, ack) => {
    try {
      const game = rooms.create();
      const p = game.addPlayer(name);
      socket.data.playerId = p.id;
      socket.data.roomCode = game.roomCode;
      socket.join(game.roomCode);
      ack({ ok: true, roomCode: game.roomCode, playerId: p.id });
      broadcast(game);
    } catch (e) {
      ack({ ok: false, error: e.message });
    }
  });

  socket.on('joinRoom', (data, ack) => {
    try {
      const code = (data.roomCode || '').trim().toUpperCase();
      const game = rooms.get(code);
      if (!game) return ack({ ok: false, error: '房间不存在' });
      if (game.status !== 'waiting') return ack({ ok: false, error: '游戏已开始，无法加入' });
      const p = game.addPlayer(data.name);
      socket.data.playerId = p.id;
      socket.data.roomCode = code;
      socket.join(code);
      ack({ ok: true, playerId: p.id, roomCode: code });
      broadcast(game);
    } catch (e) {
      ack({ ok: false, error: e.message });
    }
  });

  socket.on('reconnect', (data, ack) => {
    const code = (data.roomCode || '').trim().toUpperCase();
    const game = rooms.get(code);
    if (!game) return ack({ ok: false, error: '房间不存在' });
    const p = game.getPlayer(data.playerId);
    if (!p) return ack({ ok: false, error: '玩家不存在' });
    p.connected = true;
    socket.data.playerId = p.id;
    socket.data.roomCode = code;
    socket.join(code);
    ack({ ok: true, playerId: p.id, roomCode: code });
    broadcast(game);
  });

  socket.on('startGame', () =>
    run(socket, (game, p) => {
      if (game.players[0].id !== p.id) throw new Error('只有房主可以开始游戏');
      game.startGame();
    }));

  socket.on('roll', () => run(socket, (game, p) => { assertTurn(game, p); game.roll(); }));
  socket.on('buy', (decision) => run(socket, (game, p) => { assertTurn(game, p); game.buy(!!decision); }));
  socket.on('build', (index) => run(socket, (game, p) => { assertTurn(game, p); game.build(index); }));
  socket.on('payJailFine', () => run(socket, (game, p) => { assertTurn(game, p); game.payJailFine(); }));
  socket.on('rollJailDice', () => run(socket, (game, p) => { assertTurn(game, p); game.rollJailDice(); }));
  socket.on('endTurn', () => run(socket, (game, p) => { assertTurn(game, p); game.endTurn(); }));

  socket.on('leaveRoom', () => {
    const code = socket.data.roomCode;
    const pid = socket.data.playerId;
    if (code && pid) {
      const game = rooms.get(code);
      if (game) {
        game.removePlayer(pid);
        broadcast(game);
        if (!game.players.length) rooms.cleanup(code);
      }
    }
    socket.data.roomCode = null;
    socket.data.playerId = null;
  });

  socket.on('disconnect', () => {
    const code = socket.data.roomCode;
    const pid = socket.data.playerId;
    if (code && pid) {
      const game = rooms.get(code);
      if (game) {
        const p = game.getPlayer(pid);
        if (p) {
          p.connected = false;
          broadcast(game);
        }
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`🎲 中国大富翁服务已启动：http://localhost:${PORT}`);
});
