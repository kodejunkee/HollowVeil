import { useGameStore } from '../../stores/gameStore';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { History, X } from 'lucide-react';

interface TimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TimelineModal({ isOpen, onClose }: TimelineModalProps) {
  const { timelineEvents, gameOverData } = useGameStore();

  if (!isOpen) return null;

  // Use final match timeline if available, otherwise live recorded events
  const events = gameOverData?.timeline || timelineEvents || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <Card className="w-full max-w-lg max-h-[85vh] flex flex-col border-border bg-card shadow-2xl relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <CardHeader className="pb-3 border-b shrink-0">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            <CardTitle className="text-xl">Match Timeline & History</CardTitle>
          </div>
        </CardHeader>

        <CardContent className="pt-5 overflow-y-auto flex-1 space-y-3">
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground italic text-center py-8">
              No chronicle events recorded yet.
            </p>
          ) : (
            events.map((evt: any, idx: number) => {
              const phaseTag = evt.phase || evt.day || 'Event';
              return (
                <div key={idx} className="flex items-start gap-3 p-3 bg-secondary/30 rounded-lg border text-sm">
                  <span className="px-2 py-0.5 text-[11px] font-bold uppercase rounded bg-primary/20 text-primary shrink-0">
                    {phaseTag}
                  </span>
                  <p className="text-foreground flex-1 leading-snug">
                    {evt.message || evt.text || JSON.stringify(evt)}
                  </p>
                </div>
              );
            })
          )}
        </CardContent>

        <div className="p-4 border-t shrink-0">
          <Button variant="outline" className="w-full" onClick={onClose}>
            Close Timeline
          </Button>
        </div>
      </Card>
    </div>
  );
}
