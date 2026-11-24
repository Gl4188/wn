import { useEffect, useState } from 'react';
import {
  setOnState, setOnError, setOnLeft,
  createRoom, joinRoom, leaveRoom, getPlayerId,
} from './room.js';
import Lobby from './components/Lobby.jsx';
import WaitingRoom from './components/WaitingRoom.jsx';
import GameBoard from './components/GameBoard.jsx';
import EndScreen from './components/EndScreen.jsx';

export default function App() {
  const [state, setState] = useState(null);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState(null);
  const me = getPlayerId();

  useEffect(() => {
    setOnState((s) => {
      setState(s);
      setJoining(false);
    });
    setOnError((m) => {
      setError(m);
      setJoining(false);
      setTimeout(() => setError(null), 4500);
    });
    setOnLeft(() => {
      setState(null);
      setJoining(false);
    });
    return () => leaveRoom();
  }, []);

  const handleCreate = (name) => {
    createRoom(name);
    setJoining(true);
  };
  const handleJoin = (code, name) => {
    joinRoom(code, name);
    setJoining(true);
  };
  const handleLeave = () => {
    leaveRoom();
    setState(null);
    setJoining(false);
  };

  let view;
  if (state && state.status === 'waiting') view = 'waiting';
  else if (state && state.status === 'playing') view = 'game';
  else if (state && state.status === 'ended') view = 'ended';
  else if (joining) view = 'joining';
  else view = 'lobby';

  return (
    <div className="app">
      {error && (
        <div className="toast-error" onClick={() => setError(null)}>{error}</div>
      )}
      {view === 'lobby' && <Lobby onCreate={handleCreate} onJoin={handleJoin} />}
      {view === 'joining' && (
        <div className="screen-center"><div className="spinner" />连接房间中…</div>
      )}
      {view === 'waiting' && <WaitingRoom state={state} me={me} onLeave={handleLeave} />}
      {view === 'game' && <GameBoard state={state} me={me} />}
      {view === 'ended' && <EndScreen state={state} me={me} onLeave={handleLeave} />}
    </div>
  );
}
