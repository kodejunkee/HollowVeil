import { useGameStore } from '../../stores/gameStore';
import { wsClient } from '../../services/websocket';
import { Button } from '../ui/Button';

export function PlayerList() {
  const { players, phase, voteCounts, myUserId, isAlive, currentNightTargetId } = useGameStore();

  const handlePlayerAction = (targetId: string) => {
    if (!isAlive) return;
    
    if (phase === 'VOTING') {
      wsClient.send('submit_vote', { target_id: targetId });
    } else if (phase === 'NIGHT') {
      wsClient.send('night_action', { target_id: targetId });
    }
  };

  return (
    <div className="flex flex-col space-y-2 h-full overflow-y-auto">
      {players.map((p) => {
        const isMe = p.user_id === myUserId;
        const isTargeted = currentNightTargetId === p.user_id;
        const votes = voteCounts[p.user_id] || 0;

        return (
          <div 
            key={p.user_id} 
            className={`flex items-center justify-between p-3 rounded-lg border transition-colors
              ${!p.is_alive ? 'opacity-50 bg-destructive/10 border-destructive/20' : 'bg-card'}
              ${isTargeted ? 'border-primary ring-1 ring-primary' : ''}
            `}
          >
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${p.is_connected ? 'bg-green-500' : 'bg-gray-500'}`} />
              <span className="font-medium">
                {p.display_name} {isMe && <span className="text-muted-foreground text-xs">(You)</span>}
              </span>
            </div>

            <div className="flex items-center gap-4">
              {phase === 'VOTING' && p.is_alive && (
                <span className="text-sm font-bold w-6 text-center bg-secondary rounded-md py-1">
                  {votes > 0 ? votes : '-'}
                </span>
              )}
              
              {isAlive && p.user_id !== myUserId && p.is_alive && (phase === 'VOTING' || phase === 'NIGHT') && (
                <Button size="sm" variant="outline" onClick={() => handlePlayerAction(p.user_id)}>
                  {phase === 'VOTING' ? 'Vote' : 'Target'}
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
