import { useGameStore } from '../../stores/gameStore';
import { wsClient } from '../../services/websocket';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Sun, Scale, Trophy, MessageSquare, Sparkles, Skull, Shield, History, Info } from 'lucide-react';

interface PhaseAnnouncementProps {
  onOpenRoleInfo: () => void;
  onOpenTimeline: () => void;
}

export function PhaseAnnouncement({ onOpenRoleInfo, onOpenTimeline }: PhaseAnnouncementProps) {
  const { 
    phase, 
    timeRemaining, 
    myRoleName, 
    myRoleFaction, 
    myRoleDescription, 
    dawnEvents, 
    executionData, 
    gameOverData,
    reset 
  } = useGameStore();

  const handleReturnHome = () => {
    wsClient.disconnect();
    window.location.href = '/';
    setTimeout(() => reset(), 100);
  };

  switch (phase) {
    case 'ROLE_ASSIGNMENT':
      return (
        <Card className="border-primary/40 bg-gradient-to-br from-card via-card to-primary/10 shadow-lg animate-in fade-in slide-in-from-top-2 duration-300">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary font-bold text-sm tracking-wider uppercase">
                <Sparkles className="w-4 h-4" />
                <span>Your Destiny Has Been Chosen</span>
              </div>
              <Button size="sm" variant="ghost" onClick={onOpenRoleInfo} className="h-8 gap-1 text-xs">
                <Info className="w-3.5 h-3.5" />
                <span>Full Details</span>
              </Button>
            </div>
            <CardTitle className="text-2xl font-extrabold text-foreground pt-1">
              {myRoleName || 'Assigning Role...'}
            </CardTitle>
            <p className="text-xs font-semibold text-primary uppercase tracking-wider">
              Faction: {myRoleFaction || 'Unknown'}
            </p>
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {myRoleDescription || 'Keep your role secret. Night falls across the village in moments...'}
            </p>
            <div className="p-2.5 bg-background/60 rounded-md border border-border/80 text-xs font-medium text-muted-foreground flex items-center justify-between">
              <span>🌙 The veil descends soon. Prepare your strategy.</span>
              <span className="font-bold text-foreground">{timeRemaining}s</span>
            </div>
          </CardContent>
        </Card>
      );

    case 'DAWN':
      return (
        <Card className="border-amber-500/40 bg-gradient-to-br from-card via-card to-amber-500/10 shadow-lg animate-in fade-in slide-in-from-top-2 duration-300">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-500 font-bold text-sm tracking-wider uppercase">
                <Sun className="w-4 h-4" />
                <span>Dawn Announcements</span>
              </div>
              <span className="text-xs font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">
                {timeRemaining}s
              </span>
            </div>
            <CardTitle className="text-xl font-bold">The Town Awakens</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 pt-2">
            {dawnEvents.length === 0 ? (
              <div className="p-3 bg-secondary/40 rounded-lg border text-sm text-muted-foreground italic text-center">
                🕊️ The village awakens to peaceful streets. No casualties were reported last night.
              </div>
            ) : (
              dawnEvents.map((evt: any, idx: number) => {
                const isDeath = evt.event === 'death';
                const isRevive = evt.event === 'necromancer_revive';
                const isSeer = evt.event === 'seer_result';
                const isWarden = evt.event === 'warden_protect';

                return (
                  <div 
                    key={idx} 
                    className={`flex items-center gap-3 p-3 rounded-lg border text-sm font-medium transition-all ${
                      isDeath 
                        ? 'bg-destructive/15 border-destructive/40 text-destructive-foreground' 
                        : isRevive
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                        : isSeer
                        ? 'bg-purple-500/15 border-purple-500/40 text-purple-300'
                        : isWarden
                        ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                        : 'bg-secondary/40 border-border text-foreground'
                    }`}
                  >
                    {isDeath && <Skull className="w-4 h-4 text-destructive shrink-0" />}
                    {isRevive && <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />}
                    {isSeer && <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />}
                    {isWarden && <Shield className="w-4 h-4 text-cyan-400 shrink-0" />}
                    <span>{evt.message || 'Event occurred.'}</span>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      );

    case 'DISCUSSION':
      return (
        <Card className="border-blue-500/30 bg-gradient-to-br from-card via-card to-blue-500/5 shadow-md animate-in fade-in duration-300">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-400 font-bold text-sm tracking-wider uppercase">
                <MessageSquare className="w-4 h-4" />
                <span>Town Discussion Phase</span>
              </div>
              <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
                {timeRemaining}s remaining
              </span>
            </div>
            <CardTitle className="text-lg font-bold">Uncover the Truth</CardTitle>
          </CardHeader>
          <CardContent className="pt-1">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Share intelligence, cross-examine claims, and vote on who to eliminate before the sun sets.
            </p>
          </CardContent>
        </Card>
      );

    case 'EXECUTION':
      const isExecution = executionData?.event === 'execution' || executionData?.outcome === 'execution';
      return (
        <Card className={`border shadow-lg animate-in fade-in slide-in-from-top-2 duration-300 ${
          isExecution ? 'border-destructive/50 bg-gradient-to-br from-card via-card to-destructive/10' : 'border-border bg-card'
        }`}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm tracking-wider uppercase text-amber-500">
                <Scale className="w-4 h-4" />
                <span>Town Judgment Verdict</span>
              </div>
              <span className="text-xs font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">
                {timeRemaining}s
              </span>
            </div>
            <CardTitle className="text-xl font-bold">
              {isExecution ? 'The Gallows Claim a Soul' : 'No Execution'}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 space-y-2">
            <div className={`p-3.5 rounded-lg border text-sm font-semibold leading-relaxed ${
              isExecution ? 'bg-destructive/15 border-destructive/40 text-foreground' : 'bg-secondary/40 border-border text-muted-foreground'
            }`}>
              {executionData?.message || 'The village has concluded its deliberation.'}
            </div>
          </CardContent>
        </Card>
      );

    case 'VICTORY':
      const winner = gameOverData?.winner || 'Unknown';
      const isCovenWin = winner.toLowerCase().includes('vampire') || winner.toLowerCase().includes('coven');
      const isVillageWin = winner.toLowerCase().includes('villag');

      return (
        <Card className="border-primary bg-gradient-to-br from-card via-card to-primary/15 shadow-2xl p-2 animate-in zoom-in-95 duration-500">
          <CardHeader className="text-center pb-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary mb-2">
              <Trophy className="w-6 h-6" />
            </div>
            <p className="text-xs font-extrabold uppercase tracking-widest text-primary">
              Game Over
            </p>
            <CardTitle className={`text-3xl font-extrabold tracking-tight ${
              isCovenWin ? 'text-destructive' : isVillageWin ? 'text-emerald-400' : 'text-primary'
            }`}>
              {winner.toUpperCase()} VICTORIOUS
            </CardTitle>
            <p className="text-sm text-muted-foreground pt-1">
              {gameOverData?.message || 'The battle for the village has concluded.'}
            </p>
          </CardHeader>

          <CardContent className="space-y-5">
            {gameOverData?.all_roles && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
                  True Roles Revealed
                </h4>
                <div className="divide-y divide-border/60 border rounded-lg overflow-hidden bg-background/50">
                  {Object.entries(gameOverData.all_roles).map(([uid, p]: [string, any]) => (
                    <div key={uid} className="flex items-center justify-between p-2.5 text-sm">
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${p.is_alive ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className="font-medium">{p.display_name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                          {p.role}
                        </span>
                        <span className={`text-xs font-semibold ${p.is_alive ? 'text-green-400' : 'text-muted-foreground line-through'}`}>
                          {p.is_alive ? 'Survived' : 'Fallen'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <Button 
                variant="outline" 
                className="flex-1 gap-2 cursor-pointer"
                onClick={onOpenTimeline}
              >
                <History className="w-4 h-4" />
                <span>View Match Timeline</span>
              </Button>
              <Button 
                variant="default" 
                className="flex-1 cursor-pointer"
                onClick={handleReturnHome}
              >
                Return to Main Menu
              </Button>
            </div>
          </CardContent>
        </Card>
      );

    default:
      return null;
  }
}
