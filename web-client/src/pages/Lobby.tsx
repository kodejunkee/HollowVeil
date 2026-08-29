import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useGameStore } from '../stores/gameStore';
import { wsClient } from '../services/websocket';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Users, Play, LogOut, Check, X } from 'lucide-react';

import { ChatPanel } from '../components/game/ChatPanel';

export default function Lobby() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { session, user } = useAuthStore();
  const { players, isHost, roomCode, wsStatus, setRoom, lobbyCountdown, setUserId } = useGameStore();

  const handleStartGame = () => {
    wsClient.send('lobby_start');
  };

  const me = players.find(p => p.user_id === user?.id);
  const isReady = me?.is_ready || false;
  const readyCount = players.filter(p => p.is_ready).length;

  const handleToggleReady = () => {
    wsClient.send('lobby_ready', { is_ready: !isReady });
  };

  const handleLeave = () => {
    useGameStore.getState().reset();
    navigate('/');
  };

  return (
    <div className="flex flex-col min-h-screen p-4 max-w-5xl mx-auto w-full">
      {lobbyCountdown !== null && (
        <div className="bg-destructive text-destructive-foreground p-3 rounded-md mb-4 text-center font-bold tracking-widest animate-pulse">
          GAME BEGINNING IN {lobbyCountdown}s...
        </div>
      )}

      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-6 border-b mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gathering Lobby</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            Status: <span className={wsStatus === 'connected' ? 'text-green-500' : 'text-yellow-500'}>{wsStatus}</span>
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-secondary px-4 py-2 rounded-md font-mono text-xl tracking-widest border">
            {roomCode || '...'}
          </div>
          <Button variant="outline" size="icon" onClick={handleLeave} title="Leave Lobby">
            <LogOut className="w-5 h-5 text-destructive" />
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" /> Players ({players.length}/15)</CardTitle>
              <CardDescription>{readyCount} / {players.length} players ready.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="grid grid-cols-1 gap-3">
                {players.map((p) => {
                  const isMe = p.user_id === user?.id;
                  return (
                    <li key={p.user_id} className={`flex items-center justify-between p-3 rounded-md border ${isMe ? 'bg-primary/5 border-primary/20' : 'bg-secondary/50'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full ${p.is_connected ? 'bg-green-500' : 'bg-gray-500'}`} />
                        <span className="font-medium">{p.display_name}</span>
                        {isMe && <span className="text-xs text-muted-foreground">(You)</span>}
                        {p.is_host && <span className="text-xs bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded-full font-bold ml-2">HOST</span>}
                      </div>
                      
                      <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded ${p.is_ready ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'text-muted-foreground'}`}>
                        {p.is_ready ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        {p.is_ready ? 'READY' : 'PREPARING'}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Button 
                size="lg" 
                variant={isReady ? "outline" : "default"}
                onClick={handleToggleReady} 
                className="w-full text-base font-bold"
              >
                {isReady ? 'Cancel Ready' : 'Ready Up'}
              </Button>
              
              {isHost && (
                <Button 
                  size="lg" 
                  variant="secondary"
                  onClick={handleStartGame} 
                  disabled={readyCount < 5}
                  className="w-full mt-4"
                >
                  <Play className="w-4 h-4 mr-2" /> Start Match
                </Button>
              )}
            </CardContent>
          </Card>
          
          <div className="h-[400px]">
            <ChatPanel />
          </div>
        </div>
      </div>
    </div>
  );
}
