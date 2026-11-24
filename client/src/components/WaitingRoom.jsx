import { useState } from 'react';
import { emit } from '../socket.js';

export default function WaitingRoom({ state, onLeave }) {
  const me = state.youId;
  const isHost = state.players[0]?.id === me;
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(state.roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <div className="waiting">
      <div className="waiting-card">
        <h2>等待玩家加入</h2>

        <div className="room-code" onClick={copy}>
          房间码
          <b>{state.roomCode}</b>
          <span className="hint">{copied ? '✓ 已复制，发给朋友吧！' : '点击复制，分享给朋友'}</span>
        </div>

        <ul className="player-list">
          {state.players.map((p, i) => (
            <li key={p.id} style={{ '--pc': p.color }}>
              <span className="dot" />
              <span className="pname">{p.name}</span>
              <span className="tag">
                {i === 0 ? '房主' : ''}{p.id === me ? (i === 0 ? ' · 你' : '你') : ''}
              </span>
            </li>
          ))}
        </ul>

        <button
          className="btn btn-primary"
          disabled={!isHost || state.players.length < 2}
          onClick={() => emit('startGame')}
        >
          {state.players.length < 2
            ? '至少需要 2 名玩家'
            : isHost
              ? '开始游戏'
              : '等待房主开始…'}
        </button>

        <button className="btn btn-ghost" onClick={onLeave}>离开房间</button>
      </div>
    </div>
  );
}
