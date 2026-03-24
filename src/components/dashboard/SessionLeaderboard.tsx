import { useState, useEffect } from 'react';
import { ArrowLeft, Trophy, Heart, Zap, Clock, Flame } from 'lucide-react';
import { format } from 'date-fns';

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
    const timer = setInterval(() => setElapsed(p => p + 1), 1000);
    const autoClose = setTimeout(onClose, 300000);
    return () => { clearInterval(timer); clearTimeout(autoClose); };
  }, [onClose]);

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
      sessionDate={sessionDate}
      onClose={onClose}
      elapsed={elapsed}
    />
  );
}

/* ── COACH: full rankings ── */
function CoachLeaderboard({
  entries, sessionDuration, sessionDate, onClose, elapsed,
}: {
  entries: LeaderboardEntry[];
  sessionDuration: number;
  sessionDate: Date;
  onClose: () => void;
  elapsed: number;
}) {
  const avgSorted = [...entries].sort((a, b) => b.avg_bpm - a.avg_bpm);
  const peakSorted = [...entries].sort((a, b) => b.max_bpm - a.max_bpm);
  const maxAvg = avgSorted[0]?.avg_bpm || 1;
  const maxPeak = peakSorted[0]?.max_bpm || 1;

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#0d0d14' }}>
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-4 pb-2 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Trophy className="w-4 h-4 text-yellow-400" />
          <h1 className="text-[17px] font-bold text-white">Session Complete</h1>
        </div>
        <p className="text-[11px] text-white">
          {format(sessionDate, 'MMM d, yyyy')} · {formatDur(sessionDuration)} · {entries.length} participant{entries.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Two columns */}
      <div className="flex-1 min-h-0 flex gap-2 px-3 pb-1">
        <RankingColumn title="Avg BPM" entries={avgSorted} maxValue={maxAvg} valueKey="avg_bpm" gradientFrom="#a855f7" gradientTo="#6b21a8" />
        <RankingColumn title="Peak BPM" entries={peakSorted} maxValue={maxPeak} valueKey="max_bpm" gradientFrom="#f87171" gradientTo="#991b1b" />
      </div>

      {/* Bottom */}
      <div className="flex-shrink-0 px-4 pb-4 pt-2">
        <button
          onClick={onClose}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium text-white hover:text-white transition-colors"
          style={{ background: 'rgba(255,255,255,0.06)' }}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Dashboard
        </button>
        <p className="text-center text-[10px] text-white/60 mt-1.5">
          Automatically closes in {Math.floor(Math.max(0, 300 - elapsed) / 60)}:{String(Math.max(0, 300 - elapsed) % 60).padStart(2, '0')}
        </p>
      </div>
    </div>
  );
}

function RankingColumn({ title, entries, maxValue, valueKey, gradientFrom, gradientTo }: {
  title: string; entries: LeaderboardEntry[]; maxValue: number;
  valueKey: 'avg_bpm' | 'max_bpm'; gradientFrom: string; gradientTo: string;
}) {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="text-[10px] font-bold uppercase tracking-wider text-white px-1 pb-1.5">{title}</div>
      <div className="flex-1 min-h-0 flex flex-col justify-between">
        {entries.map((entry, idx) => {
          const rank = idx + 1;
          const value = entry[valueKey];
          const barWidth = maxValue > 0 ? (value / maxValue) * 100 : 0;
          const isTop3 = rank <= 3;
          const opacity = isTop3 ? 1 : Math.max(0.4, 1 - (rank - 3) * 0.08);

          return (
            <div key={entry.profile_id} className="flex items-center gap-1.5 rounded px-1.5 py-0.5"
              style={{ background: isTop3 ? 'rgba(255,255,255,0.04)' : 'transparent' }}>
              <span className="text-[10px] font-bold text-white w-4 text-right flex-shrink-0" style={{ opacity }}>{rank}</span>
              <span className="text-[11px] text-white truncate flex-shrink-0" style={{ opacity, minWidth: '40px', maxWidth: '70px' }}>{entry.name}</span>
              <div className="flex-1 h-2.5 rounded-full overflow-hidden mx-1" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${barWidth}%`, background: `linear-gradient(90deg, ${gradientFrom}, ${gradientTo})`, opacity }} />
              </div>
              <span className="text-[12px] font-bold text-white/90 tabular-nums flex-shrink-0 w-8 text-right" style={{ opacity }}>{value}</span>
            </div>
          );
        })}
      </div>
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
        <p className="text-[11px] text-white/50 mb-6">
          {format(sessionDate, 'MMM d, yyyy')} · {formatDur(sessionDuration)}
        </p>

        {/* Rank cards */}
        <div className="flex gap-3 w-full max-w-xs mb-6">
          {/* Avg BPM rank */}
          <div className="flex-1 rounded-xl p-4 text-center" style={{ background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.2)' }}>
            <div className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-2">Avg BPM</div>
            <div className="text-[32px] font-black text-white leading-none mb-1">
              #{avgRank || '—'}
            </div>
            <div className="text-[10px] text-white/40 mb-2">of {total} participants</div>
            <div className="text-[13px] font-semibold" style={{ color: '#c084fc' }}>{myAvg} bpm avg</div>
          </div>

          {/* Peak BPM rank */}
          <div className="flex-1 rounded-xl p-4 text-center" style={{ background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.2)' }}>
            <div className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-2">Peak BPM</div>
            <div className="text-[32px] font-black text-white leading-none mb-1">
              #{peakRank || '—'}
            </div>
            <div className="text-[10px] text-white/40 mb-2">of {total} participants</div>
            <div className="text-[13px] font-semibold" style={{ color: '#f87171' }}>{myPeak} bpm peak</div>
          </div>
        </div>

        {/* Personal stats row */}
        <div className="flex items-center gap-4 text-white/60 text-[11px]">
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
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:text-white transition-colors"
          style={{ background: 'rgba(255,255,255,0.06)' }}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to my Dashboard
        </button>
        <p className="text-center text-[10px] text-white/25 mt-1.5">
          Automatically closes in {Math.floor(Math.max(0, 300 - elapsed) / 60)}:{String(Math.max(0, 300 - elapsed) % 60).padStart(2, '0')}
        </p>
      </div>
    </div>
  );
}
