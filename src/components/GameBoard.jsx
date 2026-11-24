import { useState } from 'react';
import Board from './Board.jsx';
import Dice from './Dice.jsx';
import ActionBar from './ActionBar.jsx';
import PropertyModal from './PropertyModal.jsx';

export default function GameBoard({ state, me }) {
  const cur = state.players[state.currentTurn];
  const myTurn = cur?.id === me;

  const [selected, setSelected] = useState(null);
  const [dismissedCard, setDismissedCard] = useState(null);

  const cell = selected != null ? state.board[selected] : null;
  const ownerId = cell ? state.owners[cell.index] || null : null;
  const owner = ownerId ? state.players.find((p) => p.id === ownerId) : null;

  const cardVisible = state.pendingCard && state.pendingCard.text !== dismissedCard;

  return (
    <div className="game">
      <header className="game-header">
        <div className="turn-badge" style={{ '--pc': cur?.color }}>
          {myTurn ? '轮到你了' : `等待 ${cur?.name}`}
        </div>
        <Dice dice={state.dice} />
      </header>

      <Board
        board={state.board}
        owners={state.owners}
        houses={state.houses}
        players={state.players}
        youId={me}
        onTap={setSelected}
      />

      {state.message && <div className="status-line">{state.message}</div>}

      <ActionBar state={state} myTurn={myTurn} />

      {cardVisible && (
        <div className="card-toast">
          <span className="ico">{state.pendingCard.kind === 'chance' ? '❓' : '✨'}</span>
          <div className="txt">
            <b>{state.pendingCard.kind === 'chance' ? '机会卡' : '命运卡'}</b>
            {state.pendingCard.text}
          </div>
          <button className="x" onClick={() => setDismissedCard(state.pendingCard.text)}>✕</button>
        </div>
      )}

      {cell && (
        <PropertyModal
          cell={cell}
          owner={owner}
          houses={state.houses[cell.index] || 0}
          me={me}
          myTurn={myTurn}
          phase={state.phase}
          buildable={state.buildable}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
