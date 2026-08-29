import { useGameStore } from '../../stores/gameStore';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Info, X, Shield, Sparkles } from 'lucide-react';

interface RoleInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RoleInfoModal({ isOpen, onClose }: RoleInfoModalProps) {
  const { 
    myRoleName, 
    myRoleFaction, 
    myRoleDescription, 
    myRoleAbility, 
    myRolePassive 
  } = useGameStore();

  if (!isOpen) return null;

  const isCoven = myRoleFaction?.toLowerCase().includes('vampire') || myRoleFaction?.toLowerCase().includes('coven');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <Card className="w-full max-w-md border-border bg-card shadow-2xl relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <CardHeader className="pb-3 border-b">
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5 text-primary" />
            <CardTitle className="text-xl">Your Role Identity</CardTitle>
          </div>
        </CardHeader>

        <CardContent className="pt-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold tracking-wide">{myRoleName || 'Unknown Role'}</h3>
              <p className={`text-xs font-semibold uppercase tracking-wider ${isCoven ? 'text-destructive' : 'text-primary'}`}>
                Faction: {myRoleFaction || 'Unknown'}
              </p>
            </div>
          </div>

          <div className="p-3 bg-secondary/40 rounded-lg border text-sm leading-relaxed text-muted-foreground">
            {myRoleDescription || 'No description available for this role.'}
          </div>

          {myRoleAbility && myRoleAbility !== 'None' && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Active Ability</span>
              </div>
              <p className="text-sm bg-primary/10 border border-primary/20 p-2.5 rounded-md text-foreground">
                {myRoleAbility}
              </p>
            </div>
          )}

          {myRolePassive && myRolePassive !== 'None' && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-500">
                <Shield className="w-3.5 h-3.5" />
                <span>Passive Trait</span>
              </div>
              <p className="text-sm bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-md text-foreground">
                {myRolePassive}
              </p>
            </div>
          )}

          <div className="pt-2">
            <Button variant="outline" className="w-full" onClick={onClose}>
              Close Details
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
