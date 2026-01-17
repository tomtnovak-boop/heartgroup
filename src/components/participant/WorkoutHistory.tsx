import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';
import { ArrowLeft, Clock, Flame, Heart, Activity, ChevronRight, Loader2 } from 'lucide-react';

interface Workout {
  id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  avg_bpm: number | null;
  max_bpm: number | null;
  total_calories: number | null;
  zone_1_seconds: number | null;
  zone_2_seconds: number | null;
  zone_3_seconds: number | null;
  zone_4_seconds: number | null;
  zone_5_seconds: number | null;
}

interface HRDataPoint {
  id: string;
  bpm: number;
  zone: number;
  hr_percentage: number;
  recorded_at: string;
}

interface WorkoutHistoryProps {
  profileId: string;
  onClose: () => void;
}

export function WorkoutHistory({ profileId, onClose }: WorkoutHistoryProps) {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [hrData, setHrData] = useState<HRDataPoint[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  useEffect(() => {
    const fetchWorkouts = async () => {
      const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .eq('profile_id', profileId)
        .not('ended_at', 'is', null)
        .order('started_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching workouts:', error);
      } else {
        setWorkouts(data || []);
      }
      setIsLoading(false);
    };

    fetchWorkouts();
  }, [profileId]);

  const fetchWorkoutDetails = async (workout: Workout) => {
    setSelectedWorkout(workout);
    setIsLoadingDetails(true);

    const { data, error } = await supabase
      .from('workout_hr_data')
      .select('*')
      .eq('workout_id', workout.id)
      .order('recorded_at', { ascending: true });

    if (error) {
      console.error('Error fetching HR data:', error);
    } else {
      setHrData(data || []);
    }
    setIsLoadingDetails(false);
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const zoneColors = [
    'hsl(220 15% 45%)',
    'hsl(200 100% 50%)',
    'hsl(145 80% 45%)',
    'hsl(45 100% 50%)',
    'hsl(0 100% 55%)',
  ];

  if (selectedWorkout) {
    const zoneData = [
      { zone: 'Z1', seconds: selectedWorkout.zone_1_seconds || 0, color: zoneColors[0] },
      { zone: 'Z2', seconds: selectedWorkout.zone_2_seconds || 0, color: zoneColors[1] },
      { zone: 'Z3', seconds: selectedWorkout.zone_3_seconds || 0, color: zoneColors[2] },
      { zone: 'Z4', seconds: selectedWorkout.zone_4_seconds || 0, color: zoneColors[3] },
      { zone: 'Z5', seconds: selectedWorkout.zone_5_seconds || 0, color: zoneColors[4] },
    ];

    // Sample HR data for chart
    const sampleInterval = Math.max(1, Math.floor(hrData.length / 60));
    const chartData = hrData
      .filter((_, index) => index % sampleInterval === 0)
      .map((point, index) => ({
        time: index,
        bpm: point.bpm,
      }));

    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 bg-card border-b border-border">
          <Button variant="ghost" size="icon" onClick={() => setSelectedWorkout(null)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-bold">
              {format(new Date(selectedWorkout.started_at), "EEEE, d. MMMM", { locale: de })}
            </h1>
            <p className="text-sm text-muted-foreground">
              {format(new Date(selectedWorkout.started_at), "HH:mm", { locale: de })} Uhr
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoadingDetails ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <Card className="p-4 text-center">
                  <Clock className="w-5 h-5 mx-auto mb-1 text-primary" />
                  <div className="text-xl font-bold">{formatDuration(selectedWorkout.duration_seconds)}</div>
                  <div className="text-xs text-muted-foreground">Dauer</div>
                </Card>
                <Card className="p-4 text-center">
                  <Flame className="w-5 h-5 mx-auto mb-1 text-orange-500" />
                  <div className="text-xl font-bold">{Math.round(selectedWorkout.total_calories || 0)}</div>
                  <div className="text-xs text-muted-foreground">kcal</div>
                </Card>
                <Card className="p-4 text-center">
                  <Heart className="w-5 h-5 mx-auto mb-1 text-red-500" />
                  <div className="text-xl font-bold">{selectedWorkout.avg_bpm || '--'}</div>
                  <div className="text-xs text-muted-foreground">Ø BPM</div>
                </Card>
                <Card className="p-4 text-center">
                  <Activity className="w-5 h-5 mx-auto mb-1 text-yellow-500" />
                  <div className="text-xl font-bold">{selectedWorkout.max_bpm || '--'}</div>
                  <div className="text-xs text-muted-foreground">Max BPM</div>
                </Card>
              </div>

              {/* HR Curve */}
              {chartData.length > 1 && (
                <Card className="p-4">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Heart className="w-4 h-4 text-red-500" />
                    Herzfrequenz-Verlauf
                  </h3>
                  <div className="h-32">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <XAxis dataKey="time" hide />
                        <YAxis domain={['dataMin - 10', 'dataMax + 10']} hide />
                        <Line 
                          type="monotone" 
                          dataKey="bpm" 
                          stroke="hsl(0 100% 55%)" 
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              )}

              {/* Zone Distribution */}
              <Card className="p-4">
                <h3 className="text-sm font-semibold mb-3">Zeit in Zonen</h3>
                <div className="h-24 mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={zoneData} layout="vertical">
                      <XAxis type="number" hide />
                      <YAxis 
                        type="category" 
                        dataKey="zone" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'hsl(215 20% 55%)', fontSize: 12 }}
                        width={30}
                      />
                      <Bar dataKey="seconds" radius={[0, 4, 4, 0]}>
                        {zoneData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-5 gap-1 text-center text-xs">
                  {zoneData.map((zone) => (
                    <div key={zone.zone}>
                      <div 
                        className="h-1 rounded-full mb-1" 
                        style={{ backgroundColor: zone.color }}
                      />
                      <div className="font-medium">{formatDuration(zone.seconds)}</div>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 bg-card border-b border-border">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-bold">Meine Trainings</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : workouts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Heart className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Noch keine Trainings aufgezeichnet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {workouts.map((workout) => (
              <Card 
                key={workout.id}
                className="p-4 cursor-pointer hover:bg-accent/10 transition-colors"
                onClick={() => fetchWorkoutDetails(workout)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium">
                      {format(new Date(workout.started_at), "EEEE, d. MMM yyyy", { locale: de })}
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDuration(workout.duration_seconds)}
                      </span>
                      {workout.total_calories && (
                        <span className="flex items-center gap-1">
                          <Flame className="w-3 h-3" />
                          {Math.round(workout.total_calories)} kcal
                        </span>
                      )}
                      {workout.avg_bpm && (
                        <span className="flex items-center gap-1">
                          <Heart className="w-3 h-3" />
                          {workout.avg_bpm} bpm
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
