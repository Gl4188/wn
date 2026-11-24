import { useEffect, useState } from 'react';
import { getSocket, emit } from './socket.js';
import Lobby from './components/Lobby.jsx';
import WaitingRoom from './components/WaitingRoom.jsx';
import GameBoard from './components/GameBoard.jsx';
import EndScreen from './components/EndScreen.jsx';

const RC_KEY = 'monopoly:roomCode';
const PID_KEY = 'monopoly:playerId';

export default function App() {
  const [state, setState] = useState(null);
  const [playerId, setPlayerId] = useState(null);
  const [joined, setJoined] = useState(false);
  const [connecting, setConnecting] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const socket = getSocket();

    const onState = (s) => {
      setState(s);
      setPlayerId(s.youId);
      setJoined(true);
    };
    const onError = (e) => {
      setError(e.message);
      setTimeout(() => setError(null), 3500);
    };
    const onConnect = () => {
      const rc = localStorage.getItem(RC_KEY);
      const pid = localStorage.getItem(PID_KEY);
      if (rc && pid) {
        socket.emit('reconnect', { roomCode: rc, playerId: pid }, (res) => {
          if (res && res.ok) {
            setJoined(true);
          } else {
            localStorage.removeItem(RC_KEY);
            localStorage.removeItem(PID_KEY);
          }
          setConnecting(false);
        });
      } else {
        setConnecting(false);
      }
    };

    socket.on('state', onState);
    socket.on('error', onError);
    socket.on('connect', onConnect);
    if (socket.connected) onConnect();
    else setTimeout(() => setConnecting(false), 4000);

    return () => {
      socket.off('state', onState);
      socket.off('error', onError);
      socket.off('connect', onConnect);
    };
  }, []);

  const handleJoin = (rc, pid) => {
    localStorage.setItem(RC_KEY, rc);
    localStorage.setItem(PID_KEY, pid);
    setJoined(true);
    setPlayerId(pid);
  };

  const handleLeave = () => {
    emit('leaveRoom');
    localStorage.removeItem(RC_KEY);
    localStorage.removeItem(PID_KEY);
    setState(null);
    setPlayerId(null);
    setJoined(false);
  };

  let view;
  if (connecting) view = 'connecting';
  else if (joined && !state) view = 'connecting';
  else if (!state) view = 'lobby';
  else if (state.status === 'ended') view = 'ended';
  else if (state.status === 'playing') view = 'game';
  else view = 'waiting';

  return (
    <div className="app">
      {error && (
        <div className="toast toast-error" onClick={() => setError(null)}>{error}</div>
      )}
      {view === 'lobby' && <Lobby onJoin={handleJoin} />}
      {view === 'connecting' && (
        <div className="screen-center"><div className="spinner" />连接中…</div>
      )}
      {view === 'waiting' && <WaitingRoom state={state} onLeave={handleLeave} />}
      {view === 'game' && <GameBoard state={state} />}
      {view === 'ended' && <EndScreen state={state} onLeave={handleLeave} />}
    </div>
  );
}
