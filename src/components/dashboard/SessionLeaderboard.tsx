import { useState, useEffect } from 'react';
import { ArrowLeft, Trophy, Heart, Zap, Clock, Flame } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';

export interface LeaderboardEntry {
  profile_id: string;
  name: string;
  avg_bpm: number;
  max_bpm: number;
  duration_seconds: number;
  total_calories?: number;
}

interface SessionLeaderboardProps {
  entries: LeaderboardEntry[];
  sessionDuration: number;
  sessionDate: Date;
  onClose: () => void;
  highlightProfileId?: string;
  variant: 'coach' | 'participant';
}

const formatDur = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

export function SessionLeaderboard({
  entries, sessionDuration, sessionDate, onClose, highlightProfileId, variant,
}: SessionLeaderboardProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (variant !== 'participant') return;
    const timer = setInterval(() => setElapsed(p => p + 1), 1000);
    const autoClose = setTimeout(onClose, 300000);
    return () => {
      clearInterval(timer);
      clearTimeout(autoClose);
    };
  }, [onClose, variant]);

  if (variant === 'participant') {
    return (
      <ParticipantResult
        entries={entries}
        sessionDuration={sessionDuration}
        sessionDate={sessionDate}
        profileId={highlightProfileId || ''}
        onClose={onClose}
        elapsed={elapsed}
      />
    );
  }

  return (
    <CoachLeaderboard
      entries={entries}
      sessionDuration={sessionDuration}
      onClose={onClose}
    />
  );
}

/* ── COACH: aggregate team result ── */
function CoachLeaderboard({
  entries, sessionDuration, onClose,
}: {
  entries: LeaderboardEntry[];
  sessionDuration: number;
  onClose: () => void;
}) {
  const participantCount = entries.length;
  const totalCalories = Math.round(entries.reduce((sum, entry) => sum + (Number(entry.total_calories) || 0), 0));
  const averageCalories = participantCount > 0 ? Math.round(totalCalories / participantCount) : 0;
  const averageHR = participantCount > 0
    ? Math.round(entries.reduce((sum, entry) => sum + (Number(entry.avg_bpm) || 0), 0) / participantCount)
    : 0;
  const highestHR = participantCount > 0 ? Math.max(...entries.map(entry => Number(entry.max_bpm) || 0)) : 0;
  const lowestHR = participantCount > 0 ? Math.min(...entries.map(entry => Number(entry.avg_bpm) || 0)) : 0;
  const durationMinutes = Math.floor(sessionDuration / 60);
  const durationSeconds = Math.max(0, sessionDuration % 60);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-background/95 p-4 sm:p-8">
      <section className="relative w-full max-w-3xl rounded-lg border border-border bg-card p-5 shadow-2xl sm:p-8" aria-labelledby="coach-session-summary-title">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
        >
          Done
        </Button>

        <header className="pr-16 text-center">
          <h1 id="coach-session-summary-title" className="text-3xl font-black text-foreground sm:text-5xl">
            Great work, team! 🔥
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">Session complete</p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
              {participantCount} participant{participantCount !== 1 ? 's' : ''}
            </span>
            <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
              Duration {durationMinutes}:{String(durationSeconds).padStart(2, '0')}
            </span>
          </div>
        </header>

        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="border-l-4 border-primary bg-secondary p-5 sm:col-span-2">
            <p className="text-xs font-bold uppercase text-muted-foreground">Total calories · all participants</p>
            <p className="mt-3 text-5xl font-black tabular-nums text-foreground sm:text-6xl">
              {totalCalories}<span className="ml-2 text-base font-semibold text-muted-foreground">kcal</span>
            </p>
          </div>
          <div className="border-l-4 border-muted-foreground bg-secondary p-5">
            <p className="text-xs font-bold uppercase text-muted-foreground">Avg per person</p>
            <p className="mt-3 text-3xl font-black tabular-nums text-foreground sm:text-4xl">
              {averageCalories}<span className="ml-2 text-sm font-semibold text-muted-foreground">kcal</span>
            </p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <HeartRateMetric label="Average HR" value={averageHR} colorClass="text-metric-average" />
          <HeartRateMetric label="Highest HR" value={highestHR} colorClass="text-metric-high" />
          <HeartRateMetric label="Lowest HR" value={lowestHR} colorClass="text-metric-low" />
        </div>
      </section>
    </div>
  );
}

function HeartRateMetric({ label, value, colorClass }: { label: string; value: number; colorClass: string }) {
  return (
    <div className="border-t-2 border-border bg-secondary p-5 text-center">
      <p className="text-xs font-bold uppercase text-muted-foreground">{label}</p>
      <p className={`mt-3 text-4xl font-black tabular-nums ${colorClass}`}>
        {value}<span className="ml-1 text-sm font-semibold text-muted-foreground">bpm</span>
      </p>
    </div>
  );
}

/* ── PARTICIPANT: personal result only ── */
function ParticipantResult({
  entries, sessionDuration, sessionDate, profileId, onClose, elapsed,
}: {
  entries: LeaderboardEntry[];
  sessionDuration: number;
  sessionDate: Date;
  profileId: string;
  onClose: () => void;
  elapsed: number;
}) {
  const avgSorted = [...entries].sort((a, b) => b.avg_bpm - a.avg_bpm);
  const peakSorted = [...entries].sort((a, b) => b.max_bpm - a.max_bpm);
  const avgRank = avgSorted.findIndex(e => e.profile_id === profileId) + 1;
  const peakRank = peakSorted.findIndex(e => e.profile_id === profileId) + 1;
  const myEntry = entries.find(e => e.profile_id === profileId);
  const total = entries.length;

  const myDuration = myEntry?.duration_seconds || 0;
  const myAvg = myEntry?.avg_bpm || 0;
  const myPeak = myEntry?.max_bpm || 0;
  const myCal = myEntry?.total_calories || 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#0d0d14' }} onClick={onClose}>
      <div className="flex-1 flex flex-col items-center justify-center px-6" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <Trophy className="w-8 h-8 text-yellow-400 mb-2" />
        <h1 className="text-[20px] font-bold text-white mb-1">Great work!</h1>
        <p className="text-[11px] text-white mb-6">
          {format(sessionDate, 'MMM d, yyyy')} · {formatDur(sessionDuration)}
        </p>

        {/* Rank cards */}
        <div className="flex gap-3 w-full max-w-xs mb-6">
          {/* Avg BPM rank */}
          <div className="flex-1 rounded-xl p-4 text-center" style={{ background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.2)' }}>
            <div className="text-[10px] font-bold uppercase tracking-wider text-white mb-2">Avg BPM</div>
            <div className="text-[32px] font-black text-white leading-none mb-1">
              #{avgRank || '—'}
            </div>
            <div className="text-[10px] text-white mb-2">of {total} participants</div>
            <div className="text-[13px] font-semibold" style={{ color: '#c084fc' }}>{myAvg} bpm avg</div>
          </div>

          {/* Peak BPM rank */}
          <div className="flex-1 rounded-xl p-4 text-center" style={{ background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.2)' }}>
            <div className="text-[10px] font-bold uppercase tracking-wider text-white mb-2">Peak BPM</div>
            <div className="text-[32px] font-black text-white leading-none mb-1">
              #{peakRank || '—'}
            </div>
            <div className="text-[10px] text-white mb-2">of {total} participants</div>
            <div className="text-[13px] font-semibold" style={{ color: '#f87171' }}>{myPeak} bpm peak</div>
          </div>
        </div>

        {/* Personal stats row */}
        <div className="flex items-center gap-4 text-white text-[11px]">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{formatDur(myDuration)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Heart className="w-3 h-3" fill="currentColor" />
            <span>{myAvg} avg</span>
          </div>
          <div className="flex items-center gap-1">
            <Zap className="w-3 h-3" />
            <span>{myPeak} peak</span>
          </div>
          {myCal > 0 && (
            <div className="flex items-center gap-1">
              <Flame className="w-3 h-3" />
              <span>{myCal} kcal</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom */}
      <div className="flex-shrink-0 px-4 pb-4 pt-2" onClick={e => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium text-white hover:text-white transition-colors"
          style={{ background: 'rgba(255,255,255,0.06)' }}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to my Dashboard
        </button>
        <p className="text-center text-[10px] text-white mt-1.5">
          Automatically closes in {Math.floor(Math.max(0, 300 - elapsed) / 60)}:{String(Math.max(0, 300 - elapsed) % 60).padStart(2, '0')}
        </p>
      </div>
    </div>
  );
}
