export default function EndScreen({ state, onLeave }) {
  const winner = state.players.find((p) => p.id === state.winnerId);
  const me = state.youId;
  const iWin = winner?.id === me;
  const ranking = [...state.players].sort((a, b) => b.cash - a.cash);

  return (
    <div className="end">
      <div className="end-card">
        <div className="trophy">🏆</div>
        <h2>{iWin ? '🎉 你赢了！' : `${winner?.name} 获胜`}</h2>

        <div className="rank">
          {ranking.map((p, i) => (
            <div key={p.id} className="rank-row">
              <span>{['🥇', '🥈', '🥉', '4', '5', '6'][i] || i + 1} {p.name}{p.id === me ? ' (你)' : ''}</span>
              <span>¥{p.cash}</span>
            </div>
          ))}
        </div>

        <button className="btn btn-primary" onClick={onLeave}>返回大厅</button>
      </div>
    </div>
  );
}
