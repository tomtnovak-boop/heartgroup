import { useState, useEffect } from 'react';
import { ArrowLeft, Trophy } from 'lucide-react';
import { format } from 'date-fns';

interface LeaderboardEntry {
  profile_id: string;
  name: string;
  avg_bpm: number;
  max_bpm: number;
  duration_seconds: number;
}

interface SessionLeaderboardProps {
  entries: LeaderboardEntry[];
  sessionDuration: number;
  sessionDate: Date;
  onClose: () => void;
  highlightProfileId?: string;
  variant: 'coach' | 'participant';
}

export function SessionLeaderboard({
  entries, sessionDuration, sessionDate, onClose, highlightProfileId, variant,
}: SessionLeaderboardProps) {
  const [elapsed, setElapsed] = useState(0);

  // Auto-close after 60s
  useEffect(() => {
    const timer = setInterval(() => setElapsed(p => p + 1), 1000);
    const autoClose = setTimeout(onClose, 60000);
    return () => { clearInterval(timer); clearTimeout(autoClose); };
  }, [onClose]);

  const avgSorted = [...entries].sort((a, b) => b.avg_bpm - a.avg_bpm);
  const peakSorted = [...entries].sort((a, b) => b.max_bpm - a.max_bpm);
  const maxAvg = avgSorted[0]?.avg_bpm || 1;
  const maxPeak = peakSorted[0]?.max_bpm || 1;

  const formatDur = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  // Find highlighted user's ranks
  const myAvgRank = highlightProfileId ? avgSorted.findIndex(e => e.profile_id === highlightProfileId) + 1 : 0;
  const myPeakRank = highlightProfileId ? peakSorted.findIndex(e => e.profile_id === highlightProfileId) + 1 : 0;

  const handleDismiss = () => {
    if (variant === 'participant') onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: '#0d0d14' }}
      onClick={handleDismiss}
    >
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-4 pb-2 text-center" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-center gap-2 mb-1">
          <Trophy className="w-4 h-4 text-yellow-400" />
          <h1 className="text-[17px] font-bold text-white">Session Complete</h1>
        </div>
        <p className="text-[11px] text-white/50">
          {format(sessionDate, 'MMM d, yyyy')} · {formatDur(sessionDuration)} · {entries.length} participant{entries.length !== 1 ? 's' : ''}
        </p>
        {highlightProfileId && myAvgRank > 0 && (
          <div className="mt-1.5 inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-medium" style={{ background: 'rgba(168,85,247,0.15)', color: '#c084fc' }}>
            Your rank: #{myAvgRank} Avg · #{myPeakRank} Peak
          </div>
        )}
      </div>

      {/* Two columns */}
      <div className="flex-1 min-h-0 flex gap-2 px-3 pb-1" onClick={e => e.stopPropagation()}>
        <RankingColumn
          title="Avg BPM"
          entries={avgSorted}
          maxValue={maxAvg}
          valueKey="avg_bpm"
          gradientFrom="#a855f7"
          gradientTo="#6b21a8"
          highlightProfileId={highlightProfileId}
        />
        <RankingColumn
          title="Peak BPM"
          entries={peakSorted}
          maxValue={maxPeak}
          valueKey="max_bpm"
          gradientFrom="#f87171"
          gradientTo="#991b1b"
          highlightProfileId={highlightProfileId}
        />
      </div>

      {/* Bottom bar */}
      <div className="flex-shrink-0 px-4 pb-4 pt-2" onClick={e => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:text-white transition-colors"
          style={{ background: 'rgba(255,255,255,0.06)' }}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Dashboard
        </button>
        <p className="text-center text-[10px] text-white/25 mt-1.5">
          Automatically closes in {Math.max(0, 60 - elapsed)}s
        </p>
      </div>
    </div>
  );
}

function RankingColumn({
  title, entries, maxValue, valueKey, gradientFrom, gradientTo, highlightProfileId,
}: {
  title: string;
  entries: LeaderboardEntry[];
  maxValue: number;
  valueKey: 'avg_bpm' | 'max_bpm';
  gradientFrom: string;
  gradientTo: string;
  highlightProfileId?: string;
}) {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="text-[10px] font-bold uppercase tracking-wider text-white/40 px-1 pb-1.5">
        {title}
      </div>
      <div className="flex-1 min-h-0 flex flex-col justify-between">
        {entries.map((entry, idx) => {
          const rank = idx + 1;
          const value = entry[valueKey];
          const barWidth = maxValue > 0 ? (value / maxValue) * 100 : 0;
          const isTop3 = rank <= 3;
          const isHighlighted = entry.profile_id === highlightProfileId;
          const opacity = isTop3 ? 1 : Math.max(0.4, 1 - (rank - 3) * 0.08);

          return (
            <div
              key={entry.profile_id}
              className="flex items-center gap-1.5 rounded px-1.5 py-0.5"
              style={{
                background: isTop3 ? 'rgba(255,255,255,0.04)' : 'transparent',
                borderLeft: isHighlighted ? `2px solid ${gradientFrom}` : '2px solid transparent',
              }}
            >
              <span className="text-[10px] font-bold text-white/40 w-4 text-right flex-shrink-0" style={{ opacity }}>
                {rank}
              </span>
              <span className="text-[11px] text-white/80 truncate flex-shrink-0" style={{ opacity, minWidth: '40px', maxWidth: '70px' }}>
                {entry.name}
              </span>
              <div className="flex-1 h-2.5 rounded-full overflow-hidden mx-1" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${barWidth}%`,
                    background: `linear-gradient(90deg, ${gradientFrom}, ${gradientTo})`,
                    opacity,
                  }}
                />
              </div>
              <span className="text-[12px] font-bold text-white/90 tabular-nums flex-shrink-0 w-8 text-right" style={{ opacity }}>
                {value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
