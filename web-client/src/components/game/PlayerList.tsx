import { useGameStore } from '../../stores/gameStore';
import { wsClient } from '../../services/websocket';
import { Button } from '../ui/Button';

export function PlayerList() {
  const { 
    players, phase, voteCounts, myUserId, isAlive, currentNightTargetId,
    myRole, covenMateIds, nonRevivableIds, hasRevived, myArrows, round, 
    lastProtectedTargetId, hasFinalWhisper, myVoteTargetId, actionConfirmedMessage,
    setCurrentNightTargetId, setMyVoteTargetId
  } = useGameStore();

  const handlePlayerAction = (targetId: string) => {
    if (phase === 'VOTING') {
      wsClient.send('vote_cast', { target_id: targetId });
      setMyVoteTargetId(targetId);
      if (!isAlive && myRole === 'NECROMANCER') {
        useGameStore.setState({ hasFinalWhisper: false });
      }
    } else if (phase === 'NIGHT') {
      wsClient.send('action_submit', { action: 'use_ability', target_id: targetId });
      setCurrentNightTargetId(targetId);
      if (myRole === 'NECROMANCER') useGameStore.setState({ hasRevived: true });
      if (myRole === 'HUNTER') useGameStore.setState((state) => ({ myArrows: (state.myArrows || 0) - 1 }));
    }
  };

  const getActionForPlayer = (p: any): { label: string; disabled: boolean; variant?: 'default' | 'outline' | 'ghost' | 'secondary' } | null => {
    if (phase === 'VOTING') {
      if (!isAlive) {
        if (myRole === 'NECROMANCER' && hasFinalWhisper && p.is_alive) {
          const isVoted = myVoteTargetId === p.user_id;
          return { label: isVoted ? 'Whispered ✓' : 'Final Whisper', disabled: isVoted, variant: isVoted ? 'default' : 'outline' };
        }
        return null;
      }
      if (!p.is_alive) return null; // Can't vote for dead
      if (p.user_id === myUserId && myRole !== 'JESTER') return null; // Can't vote for self unless Jester
      
      const isVoted = myVoteTargetId === p.user_id;
      return { 
        label: isVoted ? 'Voted ✓' : 'Vote', 
        disabled: isVoted, 
        variant: isVoted ? 'default' : 'outline' 
      };
    }
    
    if (phase === 'NIGHT') {
      if (!isAlive) return null;
      const isTargeted = currentNightTargetId === p.user_id;
      
      switch (myRole) {
        case 'SEER':
          if (!p.is_alive || p.user_id === myUserId) return null;
          return { label: isTargeted ? 'Scrying ✓' : 'Scry', disabled: false, variant: isTargeted ? 'default' : 'outline' };
          
        case 'VAMPIRE':
          if (!p.is_alive || p.user_id === myUserId) return null;
          if (covenMateIds.includes(p.user_id)) return null; // Can't bite coven
          return { label: isTargeted ? 'Biting ✓' : 'Bite', disabled: false, variant: isTargeted ? 'default' : 'outline' };
          
        case 'WEREWOLF':
          if (!p.is_alive || p.user_id === myUserId) return null;
          return { label: isTargeted ? 'Mauling ✓' : 'Maul', disabled: false, variant: isTargeted ? 'default' : 'outline' };
          
        case 'HUNTER':
          if (!p.is_alive || p.user_id === myUserId) return null;
          if (round <= 1) return null;
          if (myArrows !== null && myArrows <= 0) return null;
          return { label: isTargeted ? 'Shooting ✓' : 'Shoot', disabled: false, variant: isTargeted ? 'default' : 'outline' };
          
        case 'WARDEN':
          if (!p.is_alive) return null;
          if (p.user_id === lastProtectedTargetId) return { label: 'Protect (Cooldown)', disabled: true, variant: 'ghost' };
          return { label: isTargeted ? 'Protecting ✓' : 'Protect', disabled: false, variant: isTargeted ? 'default' : 'outline' };
          
        case 'NECROMANCER':
          if (p.is_alive) return null;
          if (hasRevived) return null;
          if (nonRevivableIds.includes(p.user_id)) return null;
          return { label: isTargeted ? 'Reviving ✓' : 'Revive', disabled: false, variant: isTargeted ? 'default' : 'outline' };
          
        default:
          return null; // Villager, Cursed Villager, Jester
      }
    }
    
    return null;
  };

  const canVote = isAlive || (myRole === 'NECROMANCER' && hasFinalWhisper);
  const skipVotes = voteCounts['skip'] || 0;
  const isSkipVoted = myVoteTargetId === 'skip';

  const getBannerMessage = () => {
    if (phase === 'NIGHT') {
      if (actionConfirmedMessage) return `✨ ${actionConfirmedMessage}`;
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
      if (isSkipVoted) return "✨ You chose to abstain / skip voting.";
      if (myVoteTargetId) return "✨ Your vote has been cast. Waiting for the verdict...";
      if (!isAlive) {
        if (myRole === 'NECROMANCER' && hasFinalWhisper) return "👻 Final Whisper — your last vote from beyond the grave.";
        return "💀 You are deceased and cannot participate in voting.";
      }
      return "Town Judgment: Cast your vote or choose to skip.";
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
        const isVoted = myVoteTargetId === p.user_id;
        const votes = voteCounts[p.user_id] || 0;
        const action = getActionForPlayer(p);

        return (
          <div 
            key={p.user_id} 
            className={`flex items-center justify-between p-3 rounded-lg border transition-colors
              ${!p.is_alive ? 'opacity-50 bg-destructive/10 border-destructive/20' : 'bg-card'}
              ${isTargeted || isVoted ? 'border-primary ring-1 ring-primary bg-primary/5' : ''}
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
                  <span className="text-red-500 text-xs font-semibold">Coven Mate</span>
                )}
                {isTargeted && phase === 'NIGHT' && (
                  <span className="text-primary text-xs font-semibold">Night Target</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              {phase === 'VOTING' && p.is_alive && (
                <span className={`text-sm font-bold min-w-6 px-2 text-center rounded-md py-1 ${votes > 0 ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                  {votes > 0 ? `${votes} vote${votes > 1 ? 's' : ''}` : '-'}
                </span>
              )}
              
              {action && (
                <Button 
                  size="sm" 
                  variant={action.variant || (action.disabled ? "ghost" : "outline")}
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
            variant={isSkipVoted ? "default" : "secondary"} 
            className="w-full"
            disabled={isSkipVoted}
            onClick={() => handlePlayerAction('skip')}
          >
            {isSkipVoted ? 'Skipped ✓' : `Skip Vote ${skipVotes > 0 ? `(${skipVotes})` : ''}`}
          </Button>
        </div>
      )}
    </div>
  );
}
