import { useState } from 'react';
import { useGameStore } from '../stores/gameStore';
import { ChatPanel } from '../components/game/ChatPanel';
import { PlayerList } from '../components/game/PlayerList';
import { PhaseAnnouncement } from '../components/game/PhaseAnnouncement';
import { RoleInfoModal } from '../components/game/RoleInfoModal';
import { TimelineModal } from '../components/game/TimelineModal';
import { Button } from '../components/ui/Button';
import { Info, History, ShieldAlert } from 'lucide-react';

export default function Game() {
  const { phase, round, timeRemaining, isAlive, myRoleName, myRoleFaction } = useGameStore();
  const [isRoleInfoOpen, setIsRoleInfoOpen] = useState(false);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);

  const isLowTime = timeRemaining <= 10 && timeRemaining > 0;
  const isCoven = myRoleFaction?.toLowerCase().includes('vampire') || myRoleFaction?.toLowerCase().includes('coven');

  return (
    <div className="flex flex-col h-screen w-full bg-background overflow-hidden">
      {/* Header Bar */}
      <header className="flex items-center justify-between p-3.5 md:p-4 border-b bg-card z-10 shrink-0 gap-3">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base md:text-lg font-bold tracking-tight">
                Round {round} &middot; {phase.replace('_', ' ')}
              </h2>
            </div>
            <p className={`text-xs md:text-sm font-semibold ${isLowTime ? 'text-destructive animate-pulse' : 'text-muted-foreground'}`}>
              {timeRemaining}s remaining
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Action Modals Triggers */}
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => setIsRoleInfoOpen(true)}
            className="h-8 md:h-9 gap-1.5 text-xs font-semibold"
          >
            <Info className="w-4 h-4 text-primary" />
            <span className="hidden sm:inline">Role Info</span>
          </Button>

          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => setIsTimelineOpen(true)}
            className="h-8 md:h-9 gap-1.5 text-xs font-semibold"
          >
            <History className="w-4 h-4 text-muted-foreground" />
            <span className="hidden sm:inline">Timeline</span>
          </Button>

          <div className="text-right border-l pl-3 ml-1">
            <div className="flex items-center gap-1.5 justify-end">
              {isCoven && <ShieldAlert className="w-3.5 h-3.5 text-destructive" />}
              <p className="font-bold text-xs md:text-sm">{myRoleName || 'Assigning...'}</p>
            </div>
            <p className={`text-[11px] md:text-xs font-bold uppercase tracking-wider ${isAlive ? 'text-green-500' : 'text-destructive'}`}>
              {isAlive ? 'Alive' : 'Deceased (Ghost)'}
            </p>
          </div>
        </div>
      </header>

      {/* Main Game Arena */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Left Column: Phase Announcements & Players */}
        <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto border-b lg:border-b-0 lg:border-r">
          <PhaseAnnouncement 
            onOpenRoleInfo={() => setIsRoleInfoOpen(true)} 
            onOpenTimeline={() => setIsTimelineOpen(true)} 
          />

          {phase !== 'VICTORY' && (
            <div className="p-4 rounded-lg border bg-card/50 flex-1 flex flex-col min-h-[300px]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-base md:text-lg">Village Participants</h3>
                <span className="text-xs text-muted-foreground">Select targets for night actions or voting</span>
              </div>
              <PlayerList />
            </div>
          )}
        </div>

        {/* Right Column: Real-Time Chat System */}
        <div className="w-full lg:w-[420px] flex flex-col shrink-0 h-[45%] lg:h-full p-4 bg-card/20">
          <h3 className="font-semibold mb-2 text-sm tracking-wide uppercase text-muted-foreground">
            Communications
          </h3>
          <div className="flex-1 min-h-0">
            <ChatPanel />
          </div>
        </div>
      </main>

      {/* Modals */}
      <RoleInfoModal isOpen={isRoleInfoOpen} onClose={() => setIsRoleInfoOpen(false)} />
      <TimelineModal isOpen={isTimelineOpen} onClose={() => setIsTimelineOpen(false)} />
    </div>
  );
}
