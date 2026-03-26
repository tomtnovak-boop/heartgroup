import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';
import { ArrowLeft, Clock, Flame, Heart, Activity, ChevronRight, Loader2, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
  rank_avg_bpm: number | null;
  rank_peak_bpm: number | null;
  session_participant_count: number | null;
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
  embedded?: boolean;
}

function isIncomplete(w: Workout): boolean {
  return w.ended_at === null || (w.duration_seconds === 0 && w.avg_bpm === 0);
}

export function WorkoutHistory({ profileId, onClose, embedded = false }: WorkoutHistoryProps) {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [hrData, setHrData] = useState<HRDataPoint[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Workout | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCleanupDialog, setShowCleanupDialog] = useState(false);
  const { toast } = useToast();

  const fetchWorkouts = useCallback(async () => {
    const { data, error } = await supabase.from('workouts').select('*').eq('profile_id', profileId).order('started_at', { ascending: false }).limit(50);
    if (error) console.error('Error fetching workouts:', error);
    else setWorkouts(data || []);
    setIsLoading(false);
  }, [profileId]);

  useEffect(() => { fetchWorkouts(); }, [fetchWorkouts]);

  const deleteWorkoutById = async (workoutId: string) => {
    const { error: hrError } = await supabase.from('workout_hr_data').delete().eq('workout_id', workoutId);
    if (hrError) throw hrError;
    const { error: wError } = await supabase.from('workouts').delete().eq('id', workoutId);
    if (wError) throw wError;
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteWorkoutById(deleteTarget.id);
      toast({ title: 'Workout deleted' });
      setDeleteTarget(null);
      fetchWorkouts();
    } catch (err: any) {
      toast({ title: 'Error deleting', description: err.message, variant: 'destructive' });
    } finally { setIsDeleting(false); }
  };

  const handleCleanupConfirm = async () => {
    setIsDeleting(true);
    try {
      const incomplete = workouts.filter(isIncomplete);
      for (const w of incomplete) await deleteWorkoutById(w.id);
      toast({ title: `${incomplete.length} incomplete entries deleted` });
      setShowCleanupDialog(false);
      fetchWorkouts();
    } catch (err: any) {
      toast({ title: 'Cleanup error', description: err.message, variant: 'destructive' });
    } finally { setIsDeleting(false); }
  };

  const fetchWorkoutDetails = async (workout: Workout) => {
    setSelectedWorkout(workout);
    setIsLoadingDetails(true);
    const { data, error } = await supabase.from('workout_hr_data').select('*').eq('workout_id', workout.id).order('recorded_at', { ascending: true });
    if (error) console.error('Error fetching HR data:', error);
    else setHrData(data || []);
    setIsLoadingDetails(false);
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const zoneColors = ['#9CA3AF', '#00BFFF', '#22C55E', '#F59E0B', '#EF4444'];
  const incompleteCount = workouts.filter(isIncomplete).length;

  if (selectedWorkout) {
    const zoneData = [
      { zone: 'Z1', seconds: selectedWorkout.zone_1_seconds || 0, color: zoneColors[0] },
      { zone: 'Z2', seconds: selectedWorkout.zone_2_seconds || 0, color: zoneColors[1] },
      { zone: 'Z3', seconds: selectedWorkout.zone_3_seconds || 0, color: zoneColors[2] },
      { zone: 'Z4', seconds: selectedWorkout.zone_4_seconds || 0, color: zoneColors[3] },
      { zone: 'Z5', seconds: selectedWorkout.zone_5_seconds || 0, color: zoneColors[4] },
    ];
    const sampleInterval = Math.max(1, Math.floor(hrData.length / 60));
    const chartData = hrData.filter((_, index) => index % sampleInterval === 0).map((point, index) => ({ time: index, bpm: point.bpm }));

    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex items-center gap-3 p-4 bg-card border-b border-border">
          <Button variant="ghost" size="icon" onClick={() => setSelectedWorkout(null)}><ArrowLeft className="w-5 h-5" /></Button>
          <div>
            <h1 className="font-bold">{format(new Date(selectedWorkout.started_at), "EEEE, MMMM d")}</h1>
            <p className="text-sm text-muted-foreground">{format(new Date(selectedWorkout.started_at), "HH:mm")}</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoadingDetails ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Card className="p-4 text-center"><Clock className="w-5 h-5 mx-auto mb-1 text-primary" /><div className="text-xl font-bold">{formatDuration(selectedWorkout.duration_seconds)}</div><div className="text-xs text-muted-foreground">Duration</div></Card>
                <Card className="p-4 text-center"><Flame className="w-5 h-5 mx-auto mb-1 text-orange-500" /><div className="text-xl font-bold">{Math.round(selectedWorkout.total_calories || 0)}</div><div className="text-xs text-muted-foreground">kcal</div></Card>
                <Card className="p-4 text-center"><Heart className="w-5 h-5 mx-auto mb-1 text-red-500" /><div className="text-xl font-bold">{selectedWorkout.avg_bpm || '--'}</div><div className="text-xs text-muted-foreground">⌀ BPM</div></Card>
                <Card className="p-4 text-center"><Activity className="w-5 h-5 mx-auto mb-1 text-yellow-500" /><div className="text-xl font-bold">{selectedWorkout.max_bpm || '--'}</div><div className="text-xs text-muted-foreground">Max BPM</div></Card>
              </div>
              {selectedWorkout.rank_avg_bpm != null && selectedWorkout.session_participant_count != null && (
                <Card className="p-4">
                  <h3 className="text-sm font-semibold mb-3">Your Ranking in This Session</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-3 rounded-lg bg-primary/10 border border-primary/20">
                      <div className="text-2xl font-bold text-primary">#{selectedWorkout.rank_avg_bpm}</div>
                      <div className="text-xs text-muted-foreground">of {selectedWorkout.session_participant_count}</div>
                      <div className="text-[11px] text-primary mt-1">Avg BPM Rank</div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                      <div className="text-2xl font-bold text-red-400">#{selectedWorkout.rank_peak_bpm}</div>
                      <div className="text-xs text-muted-foreground">of {selectedWorkout.session_participant_count}</div>
                      <div className="text-[11px] text-red-400 mt-1">Peak BPM Rank</div>
                    </div>
                  </div>
                </Card>
              )}
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
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex items-center gap-3 p-4 bg-card border-b border-border">
        <Button variant="ghost" size="icon" onClick={onClose}><ArrowLeft className="w-5 h-5" /></Button>
        <h1 className="text-xl font-bold">My Workouts</h1>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : workouts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Heart className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No workouts recorded yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {incompleteCount > 0 && (
              <Button variant="outline" size="sm" className="w-full mb-2 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setShowCleanupDialog(true)}>
                <Trash2 className="w-3.5 h-3.5 mr-2" />{incompleteCount} incomplete entries — clean up
              </Button>
            )}
            {workouts.map((workout) => (
              <Card key={workout.id} className="p-4 cursor-pointer hover:bg-accent/10 transition-colors" onClick={() => fetchWorkoutDetails(workout)}>
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium flex items-center gap-2">
                      {format(new Date(workout.started_at), "EEE, MMM d yyyy")}
                      {isIncomplete(workout) && (<span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">incomplete</span>)}
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDuration(workout.duration_seconds)}</span>
                      {workout.total_calories ? <span className="flex items-center gap-1"><Flame className="w-3 h-3" />{Math.round(workout.total_calories)} kcal</span> : null}
                      {workout.avg_bpm ? <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{workout.avg_bpm} bpm</span> : null}
                    </div>
                    {workout.rank_avg_bpm != null && workout.session_participant_count != null && (
                      <div className="text-[11px] mt-0.5">
                        <span className="text-primary">Avg #{workout.rank_avg_bpm}/{workout.session_participant_count}</span>
                        <span className="text-muted-foreground"> · </span>
                        <span className="text-red-400">Peak #{workout.rank_peak_bpm}/{workout.session_participant_count}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); setDeleteTarget(workout); }}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workout?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && `Delete workout from ${format(new Date(deleteTarget.started_at), "MMMM d, yyyy 'at' HH:mm")}? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showCleanupDialog} onOpenChange={setShowCleanupDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Incomplete Entries?</AlertDialogTitle>
            <AlertDialogDescription>{incompleteCount} incomplete workout entries will be deleted. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCleanupConfirm} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
