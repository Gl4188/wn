import Square from './Square.jsx';

function posToGrid(pos) {
  if (pos <= 10) return { col: 11 - pos, row: 11 };
  if (pos <= 20) return { col: 1, row: 21 - pos };
  if (pos <= 30) return { col: pos - 19, row: 1 };
  return { col: 11, row: pos - 29 };
}

export default function Board({ board, owners, houses, players, youId, onTap }) {
  return (
    <div className="board-wrap">
      <div className="board">
        {board.map((cell) => {
          const { col, row } = posToGrid(cell.index);
          const ownerId = owners[cell.index] || null;
          const owner = ownerId ? players.find((p) => p.id === ownerId) : null;
          const tokens = players.filter((p) => p.alive && p.position === cell.index);
          return (
            <div key={cell.index} style={{ gridColumn: col, gridRow: row }}>
              <Square
                cell={cell}
                owner={owner}
                houses={houses[cell.index] || 0}
                tokens={tokens}
                youId={youId}
                onTap={() => onTap(cell.index)}
              />
            </div>
          );
        })}

        <div className="board-center">
          <div className="board-logo">🎲</div>
          <div className="board-title">中国大富翁</div>
        </div>
      </div>
    </div>
  );
}
