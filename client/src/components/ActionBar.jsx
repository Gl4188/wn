import { emit } from '../socket.js';

export default function ActionBar({ state, myTurn }) {
  const cur = state.players[state.currentTurn];
  const phase = state.phase;

  if (!myTurn) {
    return (
      <div className="actionbar">
        <span className="wait-hint">⏳ 等待「{cur?.name}」操作…</span>
      </div>
    );
  }

  if (phase === 'roll') {
    return (
      <div className="actionbar">
        <button className="btn btn-primary big" onClick={() => emit('roll')}>🎲 掷骰子</button>
      </div>
    );
  }

  if (phase === 'jail') {
    return (
      <div className="actionbar">
        <button className="btn btn-primary" onClick={() => emit('payJailFine')}>付 ¥500 出狱</button>
        <button className="btn btn-secondary" onClick={() => emit('rollJailDice')}>掷骰（出双即出狱）</button>
      </div>
    );
  }

  if (phase === 'buy') {
    const cell = state.board[state.pendingBuy];
    return (
      <div className="actionbar">
        <span className="buy-hint">「{cell?.name}」¥{cell?.price} — 买下吗？</span>
        <button className="btn btn-primary" onClick={() => emit('buy', true)}>买下</button>
        <button className="btn btn-secondary" onClick={() => emit('buy', false)}>放弃</button>
      </div>
    );
  }

  if (phase === 'build') {
    return (
      <div className="actionbar">
        <span className="wait-hint">可点击自己的城市盖房</span>
        <button className="btn btn-primary" onClick={() => emit('endTurn')}>结束回合 →</button>
      </div>
    );
  }

  return null;
}
