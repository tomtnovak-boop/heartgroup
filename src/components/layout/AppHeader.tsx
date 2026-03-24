import { Heart, Monitor, Users, LogOut, Activity, RefreshCw, Play, Square, Shield, ArrowDown, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { getZoneInfo } from '@/lib/heartRateUtils';

export type ViewMode = 'participant' | 'coach';

interface StatsData {
  participantCount: number;
  averageBPM: number;
  averageZone: number;
}

interface AppHeaderProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  showViewSwitcher?: boolean;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onRefresh?: () => void;
  stats?: StatsData;
  sessionActive?: boolean;
  sessionElapsed?: number;
  onStartSession?: () => void;
  onStopSession?: () => void;
}

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  if (h > 0) return `${String(h).padStart(2, '0')}:${mm}:${ss}`;
  return `${mm}:${ss}`;
}

export function AppHeader({
  currentView, onViewChange, showViewSwitcher = true,
  activeTab = 'live', onTabChange, onRefresh, stats,
  sessionActive = false, sessionElapsed = 0,
  onStartSession, onStopSession,
}: AppHeaderProps) {
  const { isAuthenticated, signOut } = useAuthContext();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({ title: 'Sign out failed', description: error.message, variant: 'destructive' });
      return;
    }
    navigate('/');
  };

  const zoneInfo = stats && stats.averageZone > 0 ? getZoneInfo(stats.averageZone) : null;

  return (
    <header className="flex items-center justify-between px-4 py-1.5 bg-background border-b border-border">
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
          <Heart className="w-3.5 h-3.5 text-primary" fill="currentColor" />
        </div>
        <span className="text-sm font-bold">HR Training</span>
      </div>

      {currentView === 'coach' && onTabChange && (
        <div className="flex items-center gap-3">
          <div className="flex rounded-full bg-muted p-0.5 gap-0.5">
            <button onClick={() => onTabChange('live')} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${activeTab === 'live' ? 'bg-foreground/10 text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              <span className="flex items-center gap-1.5"><Activity className="w-3 h-3" />Live</span>
            </button>
            <button onClick={() => onTabChange('customers')} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${activeTab === 'customers' ? 'bg-foreground/10 text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              <span className="flex items-center gap-1.5"><Users className="w-3 h-3" />Customers</span>
            </button>
            <button onClick={() => onTabChange('coaches')} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${activeTab === 'coaches' ? 'bg-foreground/10 text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              <span className="flex items-center gap-1.5"><Shield className="w-3 h-3" />Coaches</span>
            </button>
          </div>

          {activeTab === 'live' && stats && (
            <div className="flex items-center gap-3 text-foreground">
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3 text-muted-foreground" />
                <span className="text-sm font-bold">{stats.participantCount}</span>
              </div>
              <div className="flex items-center gap-1">
                <Heart className="w-3 h-3 text-destructive" fill="currentColor" />
                <span className="text-sm font-bold">{stats.averageBPM > 0 ? stats.averageBPM : '--'}</span>
                <span className="text-[10px] text-muted-foreground">BPM</span>
              </div>
              <div className="flex items-center gap-1">
                <Activity className="w-3 h-3" style={{ color: zoneInfo?.color || 'hsl(var(--muted-foreground))' }} />
                <span className="text-sm font-bold">{stats.averageZone > 0 ? `Z${stats.averageZone}` : '--'}</span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-1.5 flex-shrink-0">
        {currentView === 'coach' && activeTab === 'live' && (
          <>
            {sessionActive ? (
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive" />
                </span>
                <span className="text-xs font-mono font-bold text-destructive tabular-nums">{formatElapsed(sessionElapsed)}</span>
                <Button variant="destructive" size="sm" className="h-7 px-2.5 text-xs gap-1" onClick={onStopSession}>
                  <Square className="w-3 h-3" fill="currentColor" />Stop
                </Button>
              </div>
            ) : (
              <Button size="sm" className="h-7 px-2.5 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={onStartSession}>
                <Play className="w-3 h-3" fill="currentColor" />Start Session
              </Button>
            )}
          </>
        )}

        {activeTab === 'live' && onRefresh && (
          <Button variant="ghost" size="icon" onClick={onRefresh} className="h-7 w-7">
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        )}

        {showViewSwitcher && (
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" onClick={() => onViewChange(currentView === 'coach' ? 'participant' : 'coach')}>
            <Monitor className="w-3.5 h-3.5" />Coach
          </Button>
        )}

        {isAuthenticated && (
          <Button variant="ghost" size="icon" onClick={handleSignOut} title="Sign out" className="h-7 w-7">
            <LogOut className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </header>
  );
}
