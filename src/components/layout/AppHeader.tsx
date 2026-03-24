import { Heart, Users, Activity, RefreshCw, Play, Square, Shield, Home, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

export type ViewMode = 'participant' | 'coach';

interface StatsData {
  participantCount: number;
  averageBPM: number;
  lowestBPM: number;
  highestBPM: number;
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
  sessionCode?: string | null;
  lobbyCount?: number;
  onCreateSessionCode?: () => void;
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
  sessionCode, lobbyCount = 0, onCreateSessionCode,
}: AppHeaderProps) {
  const { isAuthenticated, isAdmin, signOut, user } = useAuthContext();
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

  const initials = user?.email?.slice(0, 2).toUpperCase() || 'U';

  return (
    <header className="flex items-center justify-between px-4 py-1.5 bg-background border-b border-border">
      {/* Left: Logo + Home */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {currentView === 'coach' && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(isAdmin ? '/' : '/participant')} title="Home">
            <Home className="w-3.5 h-3.5" />
          </Button>
        )}
        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
          <Heart className="w-3.5 h-3.5 text-primary" fill="currentColor" />
        </div>
        <span className="text-sm font-bold">HR Training</span>
      </div>

      {/* Center: Tabs (admin only) */}
      {currentView === 'coach' && isAdmin && onTabChange && (
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
        </div>
      )}

      {/* Right: session code, participant count, start/stop, refresh, avatar */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {/* Session code + lobby count */}
        {currentView === 'coach' && activeTab === 'live' && (
          <>
            {sessionCode && !sessionActive && (
              <div className="flex items-center gap-1.5 mr-1 px-2 py-0.5 rounded-full bg-muted">
                <Hash className="w-3 h-3 text-muted-foreground" />
                <span className="text-sm font-mono font-bold tracking-wider">{sessionCode}</span>
                <span className="text-[11px] text-muted-foreground">{lobbyCount} ready</span>
              </div>
            )}
            {sessionCode && sessionActive && (
              <div className="flex items-center gap-1 mr-1 px-2 py-0.5 rounded-full bg-muted/50">
                <Hash className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs font-mono font-bold tracking-wider text-muted-foreground">{sessionCode}</span>
              </div>
            )}
            {!sessionCode && !sessionActive && (
              <button
                onClick={onCreateSessionCode}
                className="flex items-center gap-1 mr-1 px-2 py-1 rounded-full bg-muted hover:bg-muted/80 transition-colors text-xs text-muted-foreground"
                title="Create session code"
              >
                <Hash className="w-3 h-3" />
                <span>New Code</span>
              </button>
            )}
          </>
        )}

        {/* Participant count */}
        {currentView === 'coach' && activeTab === 'live' && stats && (
          <div className="flex items-center gap-1 mr-1">
            <Users className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-sm font-bold">{stats.participantCount}</span>
          </div>
        )}

        {/* Start/Stop session button */}
        {currentView === 'coach' && activeTab === 'live' && (
          sessionActive ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={onStopSession}
                className="w-8 h-8 rounded-full bg-destructive flex items-center justify-center hover:bg-destructive/90 transition-colors"
                title="Stop Session"
              >
                <Square className="w-3.5 h-3.5 text-destructive-foreground" fill="currentColor" />
              </button>
              <span className="text-xs font-mono font-bold text-destructive tabular-nums">{formatElapsed(sessionElapsed)}</span>
            </div>
          ) : (
            <button
              onClick={onStartSession}
              disabled={!sessionCode || lobbyCount === 0}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                sessionCode && lobbyCount > 0
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-muted cursor-not-allowed'
              }`}
              title={!sessionCode ? 'Create a session code first' : lobbyCount === 0 ? 'No participants in lobby' : 'Start Session'}
            >
              <Play className="w-3.5 h-3.5 text-white" fill="currentColor" />
            </button>
          )
        )}

        {/* Refresh */}
        {activeTab === 'live' && onRefresh && (
          <Button variant="ghost" size="icon" onClick={onRefresh} className="h-7 w-7">
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        )}

        {/* Avatar / Sign out */}
        {isAuthenticated && (
          <Button variant="ghost" size="icon" onClick={handleSignOut} title="Sign out" className="h-7 w-7 rounded-full bg-muted text-xs font-bold">
            <span>{initials}</span>
          </Button>
        )}
      </div>
    </header>
  );
}
