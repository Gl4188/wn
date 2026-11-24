import { useState } from 'react';
import { emit } from '../socket.js';

export default function Lobby({ onJoin }) {
  const [name, setName] = useState(localStorage.getItem('monopoly:name') || '');
  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const ensureName = () => {
    const n = (name.trim() ? name.trim() : '玩家' + Math.floor(Math.random() * 900 + 100)).slice(0, 10);
    localStorage.setItem('monopoly:name', n);
    return n;
  };

  const create = () => {
    if (busy) return;
    setBusy(true);
    setErr(null);
    emit('createRoom', ensureName(), (res) => {
      setBusy(false);
      if (res.ok) onJoin(res.roomCode, res.playerId);
      else setErr(res.error);
    });
  };

  const join = () => {
    if (busy) return;
    if (!joinCode.trim()) { setErr('请输入房间码'); return; }
    setBusy(true);
    setErr(null);
    emit('joinRoom', { roomCode: joinCode.trim(), name: ensureName() }, (res) => {
      setBusy(false);
      if (res.ok) onJoin(res.roomCode, res.playerId);
      else setErr(res.error);
    });
  };

  return (
    <div className="lobby">
      <div className="lobby-card">
        <h1 className="logo"><span className="emoji">🎲</span>中国大富翁</h1>
        <p className="tagline">25 座中国城市 · 2-6 人在线对战 · 手机直接玩</p>

        <label className="field">
          <span>你的昵称</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={10}
            placeholder="玩家"
          />
        </label>

        <button className="btn btn-primary" disabled={busy} onClick={create}>
          {busy ? '创建中…' : '创建房间'}
        </button>

        <div className="divider"><span>或加入朋友房间</span></div>

        <div className="join-row">
          <input
            className="code-input"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            maxLength={6}
            placeholder="房间码"
          />
          <button className="btn btn-secondary" disabled={busy} onClick={join}>加入</button>
        </div>

        {err && <p className="lobby-error">{err}</p>}
      </div>
    </div>
  );
}
