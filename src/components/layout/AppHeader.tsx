import { Heart, Users, Play, Square, Hash } from 'lucide-react';
import { useNavigate } from 'react-router-dom';


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
  children?: React.ReactNode;
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
  children,
}: AppHeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="flex items-center justify-between px-4 py-1.5 bg-background border-b border-border">
      {/* Left: Logo */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
          <Heart className="w-3.5 h-3.5 text-primary" fill="currentColor" />
        </div>
        <span className="text-sm font-bold tracking-wider">
          <span className="text-foreground">B</span>
          <span className="text-primary">heart</span>
        </span>
      </div>

      {/* Right: session code, participant count, start/stop, admin users link, refresh, avatar */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {/* Session code badge */}
        {currentView === 'coach' && (
          <>
            {sessionCode && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '10px',
                padding: '4px 14px',
                minWidth: '80px',
                lineHeight: 1.1,
                marginRight: '4px',
              }}>
                <span style={{
                  fontSize: '9px',
                  fontWeight: 600,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.4)',
                }}>
                  {sessionActive ? 'Session' : 'Next'}
                </span>
                <span style={{
                  fontSize: '22px',
                  fontWeight: 900,
                  color: 'white',
                  letterSpacing: '0.15em',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {sessionCode}
                </span>
                {!sessionActive && (
                  <span style={{
                    fontSize: '9px',
                    fontWeight: 500,
                    color: lobbyCount > 0 ? 'hsl(145 80% 45%)' : 'rgba(255,255,255,0.3)',
                    letterSpacing: '0.05em',
                  }}>
                    {lobbyCount > 0 ? `${lobbyCount} ready` : 'waiting...'}
                  </span>
                )}
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
        {currentView === 'coach' && stats && (
          <div className="flex items-center gap-1 mr-1">
            <Users className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-sm font-bold">{stats.participantCount}</span>
          </div>
        )}

        {/* Start/Stop session button */}
        {currentView === 'coach' && (
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

        {children}

      </div>
    </header>
  );
}
