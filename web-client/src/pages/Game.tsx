import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGameStore } from '../stores/gameStore';
import { ChatPanel } from '../components/game/ChatPanel';
import { PlayerList } from '../components/game/PlayerList';

export default function Game() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { phase, round, timeRemaining, isAlive, myRoleName } = useGameStore();

  return (
    <div className="flex flex-col h-screen w-full bg-background overflow-hidden">
      <header className="flex items-center justify-between p-4 border-b bg-card z-10 shrink-0">
        <div>
          <h2 className="text-lg font-bold">Round {round} - {phase}</h2>
          <p className="text-sm text-muted-foreground">{timeRemaining} seconds remaining</p>
        </div>
        <div className="text-right">
          <p className="font-bold">{myRoleName || 'Unknown Role'}</p>
          <p className={`text-sm font-semibold ${isAlive ? 'text-green-500' : 'text-red-500'}`}>
            {isAlive ? 'Alive' : 'Ghost'}
          </p>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto border-b lg:border-b-0 lg:border-r">
          <div className="p-4 rounded-lg border bg-card/50 flex-1 flex flex-col">
             <h3 className="font-semibold mb-4 text-lg">Players</h3>
             <PlayerList />
          </div>
        </div>

        <div className="w-full lg:w-[400px] flex flex-col shrink-0 h-1/2 lg:h-full p-4 bg-card/30">
          <h3 className="font-semibold mb-2">Chat</h3>
          <div className="flex-1 min-h-0">
             <ChatPanel />
          </div>
        </div>
      </main>
    </div>
  );
}
