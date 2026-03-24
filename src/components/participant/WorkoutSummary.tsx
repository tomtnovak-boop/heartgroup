import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { HEART_RATE_ZONES } from '@/lib/heartRateUtils';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';
import { Trophy, Clock, Flame, Heart, Activity, X } from 'lucide-react';

interface WorkoutSummaryProps {
  workout: {
    duration_seconds: number;
    avg_bpm: number;
    max_bpm: number;
    total_calories: number;
    zone_1_seconds: number;
    zone_2_seconds: number;
    zone_3_seconds: number;
    zone_4_seconds: number;
    zone_5_seconds: number;
  };
  hrHistory: { time: number; bpm: number }[];
  onClose: () => void;
}

export function WorkoutSummary({ workout, hrHistory, onClose }: WorkoutSummaryProps) {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const zoneData = [
    { zone: 'Z1', seconds: workout.zone_1_seconds, color: 'hsl(220 15% 45%)' },
    { zone: 'Z2', seconds: workout.zone_2_seconds, color: 'hsl(200 100% 50%)' },
    { zone: 'Z3', seconds: workout.zone_3_seconds, color: 'hsl(145 80% 45%)' },
    { zone: 'Z4', seconds: workout.zone_4_seconds, color: 'hsl(45 100% 50%)' },
    { zone: 'Z5', seconds: workout.zone_5_seconds, color: 'hsl(0 100% 55%)' },
  ];

  const sampleInterval = Math.max(1, Math.floor(hrHistory.length / 60));
  const chartData = hrHistory.filter((_, index) => index % sampleInterval === 0).map((point, index) => ({ time: index, bpm: point.bpm }));

  const totalZoneTime = zoneData.reduce((sum, z) => sum + z.seconds, 0);
  const dominantZone = zoneData.reduce((max, z) => z.seconds > max.seconds ? z : max, zoneData[0]);
  const dominantZoneInfo = HEART_RATE_ZONES.find(z => `Z${z.zone}` === dominantZone.zone);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex items-center justify-between p-4 bg-card border-b border-border">
        <div className="flex items-center gap-2">
          <Trophy className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold">Training Complete!</h1>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}><X className="w-5 h-5" /></Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4 text-center"><Clock className="w-6 h-6 mx-auto mb-2 text-primary" /><div className="text-2xl font-bold">{formatDuration(workout.duration_seconds)}</div><div className="text-xs text-muted-foreground">Duration</div></Card>
          <Card className="p-4 text-center"><Flame className="w-6 h-6 mx-auto mb-2 text-orange-500" /><div className="text-2xl font-bold">{Math.round(workout.total_calories)}</div><div className="text-xs text-muted-foreground">Calories</div></Card>
          <Card className="p-4 text-center"><Heart className="w-6 h-6 mx-auto mb-2 text-red-500" /><div className="text-2xl font-bold">{workout.avg_bpm}</div><div className="text-xs text-muted-foreground">⌀ BPM</div></Card>
          <Card className="p-4 text-center"><Activity className="w-6 h-6 mx-auto mb-2 text-yellow-500" /><div className="text-2xl font-bold">{workout.max_bpm}</div><div className="text-xs text-muted-foreground">Max BPM</div></Card>
        </div>

        {chartData.length > 1 && (
          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Heart className="w-4 h-4 text-red-500" />Heart Rate Curve</h3>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}><XAxis dataKey="time" hide /><YAxis domain={['dataMin - 10', 'dataMax + 10']} hide /><Line type="monotone" dataKey="bpm" stroke="hsl(0 100% 55%)" strokeWidth={2} dot={false} /></LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3">Time in Zones</h3>
          <div className="h-24 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={zoneData} layout="vertical"><XAxis type="number" hide /><YAxis type="category" dataKey="zone" axisLine={false} tickLine={false} tick={{ fill: 'hsl(215 20% 55%)', fontSize: 12 }} width={30} /><Bar dataKey="seconds" radius={[0, 4, 4, 0]}>{zoneData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}</Bar></BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-5 gap-1 text-center text-xs">
            {zoneData.map((zone) => (<div key={zone.zone}><div className="h-1 rounded-full mb-1" style={{ backgroundColor: zone.color }} /><div className="font-medium">{formatDuration(zone.seconds)}</div></div>))}
          </div>
        </Card>

        {dominantZoneInfo && totalZoneTime > 0 && (
          <Card className="p-4" style={{ borderColor: dominantZone.color }}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: dominantZone.color }}>{dominantZone.zone}</div>
              <div>
                <div className="font-semibold">Mostly in Zone {dominantZoneInfo.zone}</div>
                <div className="text-sm text-muted-foreground">{dominantZoneInfo.name} • {Math.round((dominantZone.seconds / totalZoneTime) * 100)}% of time</div>
              </div>
            </div>
          </Card>
        )}
      </div>

      <div className="p-4 bg-card border-t border-border">
        <Button className="w-full" size="lg" onClick={onClose}>Done</Button>
      </div>
    </div>
  );
}
