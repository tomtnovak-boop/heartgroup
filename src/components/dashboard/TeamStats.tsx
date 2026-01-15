import { Heart, Users, Activity } from 'lucide-react';
import { getZoneInfo } from '@/lib/heartRateUtils';

interface TeamStatsProps {
  participantCount: number;
  averageBPM: number;
  averageZone: number;
}

export function TeamStats({ participantCount, averageBPM, averageZone }: TeamStatsProps) {
  const zoneInfo = averageZone > 0 ? getZoneInfo(averageZone) : null;

  return (
    <div className="w-full glass rounded-2xl px-6 py-4">
      <div className="flex items-center justify-between gap-8">
        {/* Participants */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <div>
            <div className="text-2xl font-bold">{participantCount}</div>
            <div className="text-sm text-muted-foreground">Teilnehmer</div>
          </div>
        </div>

        {/* Average BPM */}
        <div className="flex items-center gap-3 flex-1 justify-center">
          <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center animate-pulse-glow">
            <Heart className="w-8 h-8 text-destructive" fill="currentColor" />
          </div>
          <div>
            <div className="text-4xl font-bold">
              {averageBPM > 0 ? averageBPM : '--'}
              <span className="text-lg font-normal text-muted-foreground ml-2">bpm</span>
            </div>
            <div className="text-sm text-muted-foreground">Ø Herzfrequenz</div>
          </div>
        </div>

        {/* Average Zone */}
        <div className="flex items-center gap-3">
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ backgroundColor: zoneInfo?.color || 'hsl(var(--muted))' }}
          >
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="text-2xl font-bold">
              {averageZone > 0 ? `Zone ${averageZone}` : '--'}
            </div>
            <div className="text-sm text-muted-foreground">
              {zoneInfo?.name || 'Ø Zone'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
