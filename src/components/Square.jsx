const SPECIAL_COLOR = {
  corner: '#d9a441',
  chance: '#3b82f6',
  destiny: '#8b5cf6',
  station: '#475569',
  utility: '#0ea5e9',
  tax: '#94a3b8',
};

export default function Square({ cell, owner, houses, tokens, youId, onTap }) {
  const isCorner = cell.type === 'corner';
  const color = cell.color || SPECIAL_COLOR[cell.type] || '#64748b';

  return (
    <div
      className={`square ${cell.type}${cell.corner ? ' ' + cell.corner : ''}`}
      style={{ '--c': color }}
      onClick={onTap}
    >
      {cell.type === 'city' && <div className="color-bar" style={{ background: color }} />}

      <div className="sq-name">{cell.name}</div>
      {cell.price ? <div className="sq-price">¥{cell.price}</div> : null}

      {cell.type === 'city' && houses > 0 && (
        <div className="sq-houses">{houses === 5 ? '🏨' : '🏠'.repeat(houses)}</div>
      )}

      {owner && <div className="sq-owner" style={{ background: owner.color }} />}

      {tokens.length > 0 && (
        <div className="tokens">
          {tokens.map((t) => (
            <span
              key={t.id}
              className="token"
              style={{
                background: t.color,
                boxShadow: t.id === youId ? '0 0 0 2px #fff' : 'none',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
