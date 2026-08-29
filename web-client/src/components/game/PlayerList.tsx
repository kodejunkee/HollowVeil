import { useGameStore } from '../../stores/gameStore';
import { wsClient } from '../../services/websocket';
import { Button } from '../ui/Button';

export function PlayerList() {
  const { 
    players, phase, voteCounts, myUserId, isAlive, currentNightTargetId,
    myRole, covenMateIds, nonRevivableIds, hasRevived, myArrows, round, 
    lastProtectedTargetId, hasFinalWhisper
  } = useGameStore();

  const handlePlayerAction = (targetId: string) => {
    if (phase === 'VOTING') {
      wsClient.send('vote_cast', { target_id: targetId });
      if (!isAlive && myRole === 'NECROMANCER') {
        useGameStore.setState({ hasFinalWhisper: false });
      }
    } else if (phase === 'NIGHT') {
      wsClient.send('action_submit', { action: 'use_ability', target_id: targetId });
      if (myRole === 'NECROMANCER') useGameStore.setState({ hasRevived: true });
      if (myRole === 'HUNTER') useGameStore.setState((state) => ({ myArrows: (state.myArrows || 0) - 1 }));
      if (myRole === 'WARDEN') useGameStore.setState({ currentNightTargetId: targetId });
    }
  };

  const getActionForPlayer = (p: any): { label: string; disabled: boolean } | null => {
    if (phase === 'VOTING') {
      if (!isAlive) {
        if (myRole === 'NECROMANCER' && hasFinalWhisper && p.is_alive) {
          return { label: 'Final Whisper', disabled: false };
        }
        return null;
      }
      if (!p.is_alive) return null; // Can't vote for dead
      if (p.user_id === myUserId && myRole !== 'JESTER') return null; // Can't vote for self unless Jester
      return { label: 'Vote', disabled: false };
    }
    
    if (phase === 'NIGHT') {
      if (!isAlive) return null;
      
      switch (myRole) {
        case 'SEER':
          if (!p.is_alive || p.user_id === myUserId) return null;
          return { label: 'Scry', disabled: false };
          
        case 'VAMPIRE':
          if (!p.is_alive || p.user_id === myUserId) return null;
          if (covenMateIds.includes(p.user_id)) return null; // Can't bite coven
          return { label: 'Bite', disabled: false };
          
        case 'WEREWOLF':
          if (!p.is_alive || p.user_id === myUserId) return null;
          return { label: 'Maul', disabled: false };
          
        case 'HUNTER':
          if (!p.is_alive || p.user_id === myUserId) return null;
          if (round <= 1) return null;
          if (myArrows !== null && myArrows <= 0) return null;
          return { label: 'Shoot', disabled: false };
          
        case 'WARDEN':
          if (!p.is_alive) return null;
          if (p.user_id === lastProtectedTargetId) return { label: 'Protect', disabled: true };
          return { label: 'Protect', disabled: false };
          
        case 'NECROMANCER':
          if (p.is_alive) return null;
          if (hasRevived) return null;
          if (nonRevivableIds.includes(p.user_id)) return null;
          return { label: 'Revive', disabled: false };
          
        default:
          return null; // Villager, Cursed Villager, Jester
      }
    }
    
    return null;
  };

  const canVote = isAlive || (myRole === 'NECROMANCER' && hasFinalWhisper);

  const getBannerMessage = () => {
    if (phase === 'NIGHT') {
      if (!isAlive) return "💀 You are deceased. Watching the shadows from beyond...";
      switch (myRole) {
        case 'VILLAGER':
        case 'CURSED_VILLAGER':
        case 'JESTER':
          return "Rest easy tonight. Waiting for the light of dawn...";
        case 'NECROMANCER':
          if (hasRevived) return "💀 Your power has been spent. The dead rest undisturbed tonight.";
          return "💀 Select a fallen target to revive:";
        case 'HUNTER':
          if (round <= 1) return "🏹 You cannot fire on the first night. Waiting for dawn...";
          if (myArrows !== null && myArrows <= 0) return "🏹 You have spent all your arrows. Waiting for dawn...";
          return `🏹 Select a target to shoot (${myArrows ?? '?'} arrows left):`;
        case 'SEER': return "🔮 Select a target to scry:";
        case 'VAMPIRE': return "🧛 Select a target for the Coven kill:";
        case 'WEREWOLF': return "🐺 Select a target to maul:";
        case 'WARDEN': return "🛡️ Select a target to protect:";
      }
    } else if (phase === 'VOTING') {
      if (!isAlive) {
        if (myRole === 'NECROMANCER' && hasFinalWhisper) return "👻 Final Whisper — your last vote from beyond the grave.";
        return "💀 You are deceased and cannot participate in voting.";
      }
      return "Town Judgment: Cast your vote.";
    }
    return null;
  };

  const bannerMessage = getBannerMessage();

  return (
    <div className="flex flex-col space-y-2 h-full overflow-y-auto pb-4">
      {bannerMessage && (
        <div className="mb-4 p-3 bg-secondary/50 rounded-lg text-sm font-medium text-center text-muted-foreground border">
          {bannerMessage}
        </div>
      )}

      {players.map((p) => {
        const isMe = p.user_id === myUserId;
        const isTargeted = currentNightTargetId === p.user_id;
        const votes = voteCounts[p.user_id] || 0;
        const action = getActionForPlayer(p);

        return (
          <div 
            key={p.user_id} 
            className={`flex items-center justify-between p-3 rounded-lg border transition-colors
              ${!p.is_alive ? 'opacity-50 bg-destructive/10 border-destructive/20' : 'bg-card'}
              ${isTargeted ? 'border-primary ring-1 ring-primary' : ''}
              ${covenMateIds.includes(p.user_id) && myRole === 'VAMPIRE' ? 'border-red-900/50 bg-red-950/10' : ''}
            `}
          >
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${p.is_connected ? 'bg-green-500' : 'bg-gray-500'}`} />
              <div className="flex flex-col">
                <span className="font-medium">
                  {p.display_name} {isMe && <span className="text-muted-foreground text-xs">(You)</span>}
                  {!p.is_alive && <span className="text-destructive text-xs ml-2">(Ghost)</span>}
                </span>
                {covenMateIds.includes(p.user_id) && myRole === 'VAMPIRE' && (
                  <span className="text-red-500 text-xs">Coven Mate</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              {phase === 'VOTING' && p.is_alive && (
                <span className="text-sm font-bold w-6 text-center bg-secondary rounded-md py-1">
                  {votes > 0 ? votes : '-'}
                </span>
              )}
              
              {action && (
                <Button 
                  size="sm" 
                  variant={action.disabled ? "ghost" : "outline"}
                  disabled={action.disabled}
                  onClick={() => handlePlayerAction(p.user_id)}
                >
                  {action.label}
                </Button>
              )}
            </div>
          </div>
        );
      })}

      {phase === 'VOTING' && canVote && (
        <div className="mt-4 pt-4 border-t border-border">
          <Button 
            variant="secondary" 
            className="w-full"
            onClick={() => handlePlayerAction('skip')}
          >
            Skip Vote
          </Button>
        </div>
      )}
    </div>
  );
}
