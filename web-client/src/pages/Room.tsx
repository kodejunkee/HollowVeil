import { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useGameStore } from '../stores/gameStore';
import { wsClient } from '../services/websocket';
import Lobby from './Lobby';
import Game from './Game';

export default function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { session, user } = useAuthStore();
  const { phase, setRoom, setUserId } = useGameStore();

  const connectedRef = useRef(false);

  useEffect(() => {
    if (!roomId || !session?.access_token || !user?.id) return;
    if (connectedRef.current) return;
    
    connectedRef.current = true;
    setUserId(user.id);
    const serverUrl = import.meta.env.VITE_API_URL || 'https://hollowveil-api.onrender.com';
    setRoom(roomId, null);
    
    wsClient.connect(serverUrl, roomId, session.access_token);

    wsClient.onMessage = (data) => {
      useGameStore.getState().updateState(data);
    };

    return () => {
      connectedRef.current = false;
      wsClient.disconnect();
    };
  }, [roomId]);

  if (phase === 'LOBBY') {
    return <Lobby />;
  }

  return <Game />;
}
