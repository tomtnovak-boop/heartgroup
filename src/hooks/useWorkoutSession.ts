import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { LiveHRData } from '@/hooks/useLiveHR';

interface WorkoutSession {
  isActive: boolean;
  startedAt: Date | null;
  elapsedSeconds: number;
  activeWorkouts: Map<string, string>; // profile_id → workout_id
}

export function useWorkoutSession() {
  const [session, setSession] = useState<WorkoutSession>({
    isActive: false,
    startedAt: null,
    elapsedSeconds: 0,
    activeWorkouts: new Map(),
  });

  const activeWorkoutsRef = useRef<Map<string, string>>(new Map());
  const isActiveRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<Date | null>(null);

  // Sync refs with state
  useEffect(() => {
    activeWorkoutsRef.current = session.activeWorkouts;
    isActiveRef.current = session.isActive;
    startedAtRef.current = session.startedAt;
  }, [session]);

  // Timer for elapsed time
  useEffect(() => {
    if (session.isActive && session.startedAt) {
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - session.startedAt!.getTime()) / 1000);
        setSession(prev => ({ ...prev, elapsedSeconds: elapsed }));
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [session.isActive, session.startedAt]);

  // Restore session on mount
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const { data: openWorkouts, error } = await supabase
          .from('workouts')
          .select('id, profile_id, started_at')
          .is('ended_at', null);

        if (error || !openWorkouts || openWorkouts.length === 0) return;

        const workoutMap = new Map<string, string>();
        let earliestStart: Date | null = null;

        openWorkouts.forEach(w => {
          workoutMap.set(w.profile_id, w.id);
          const startDate = new Date(w.started_at);
          if (!earliestStart || startDate < earliestStart) {
            earliestStart = startDate;
          }
        });

        const elapsed = earliestStart ? Math.floor((Date.now() - earliestStart.getTime()) / 1000) : 0;

        setSession({
          isActive: true,
          startedAt: earliestStart,
          elapsedSeconds: elapsed,
          activeWorkouts: workoutMap,
        });
      } catch (err) {
        console.error('Error restoring session:', err);
      }
    };

    restoreSession();
  }, []);

  const startSession = useCallback(async (participants: LiveHRData[]) => {
    if (participants.length === 0) return;

    try {
      const now = new Date().toISOString();
      const inserts = participants.map(p => ({
        profile_id: p.profile_id,
        started_at: now,
      }));

      const { data, error } = await supabase
        .from('workouts')
        .insert(inserts)
        .select('id, profile_id');

      if (error) throw error;

      const workoutMap = new Map<string, string>();
      data?.forEach(w => workoutMap.set(w.profile_id, w.id));

      setSession({
        isActive: true,
        startedAt: new Date(now),
        elapsedSeconds: 0,
        activeWorkouts: workoutMap,
      });
    } catch (err) {
      console.error('Error starting session:', err);
    }
  }, []);

  const stopSession = useCallback(async () => {
    const workouts = activeWorkoutsRef.current;
    if (workouts.size === 0) return;

    try {
      const now = new Date().toISOString();

      for (const [profileId, workoutId] of workouts) {
        // Get all HR data for this workout
        const { data: hrData, error: hrError } = await supabase
          .from('workout_hr_data')
          .select('bpm, zone, hr_percentage')
          .eq('workout_id', workoutId);

        if (hrError) {
          console.error('Error fetching workout HR data:', hrError);
          continue;
        }

        // Get profile for calorie calculation
        const { data: profile } = await supabase
          .from('profiles')
          .select('weight, age, gender')
          .eq('id', profileId)
          .single();

        const entries = hrData || [];
        const count = entries.length;

        if (count === 0) {
          // No data recorded, just close the workout
          await supabase
            .from('workouts')
            .update({ ended_at: now, duration_seconds: 0 })
            .eq('id', workoutId);
          continue;
        }

        const avgBpm = Math.round(entries.reduce((s, e) => s + e.bpm, 0) / count);
        const maxBpm = Math.max(...entries.map(e => e.bpm));
        const avgZone = Math.round(entries.reduce((s, e) => s + e.zone, 0) / count);

        // Each entry ≈ 2 seconds (simulation interval)
        const intervalSeconds = 2;
        const zoneCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        entries.forEach(e => {
          const z = Math.min(Math.max(e.zone, 1), 5) as 1 | 2 | 3 | 4 | 5;
          zoneCounts[z]++;
        });

        const startedAt = startedAtRef.current;
        const durationSeconds = startedAt
          ? Math.floor((new Date(now).getTime() - startedAt.getTime()) / 1000)
          : count * intervalSeconds;

        // Keytel calorie formula
        const weight = profile?.weight || 75;
        const age = profile?.age || 30;
        const durationMinutes = durationSeconds / 60;
        const totalCalories = Math.round(
          durationMinutes * (0.6309 * avgBpm - 55.0969 + 0.1988 * weight + 0.2017 * age) / 4.184
        );

        await supabase
          .from('workouts')
          .update({
            ended_at: now,
            avg_bpm: avgBpm,
            max_bpm: maxBpm,
            avg_zone: avgZone,
            duration_seconds: durationSeconds,
            zone_1_seconds: zoneCounts[1] * intervalSeconds,
            zone_2_seconds: zoneCounts[2] * intervalSeconds,
            zone_3_seconds: zoneCounts[3] * intervalSeconds,
            zone_4_seconds: zoneCounts[4] * intervalSeconds,
            zone_5_seconds: zoneCounts[5] * intervalSeconds,
            total_calories: Math.max(0, totalCalories),
          })
          .eq('id', workoutId);
      }

      setSession({
        isActive: false,
        startedAt: null,
        elapsedSeconds: 0,
        activeWorkouts: new Map(),
      });
    } catch (err) {
      console.error('Error stopping session:', err);
    }
  }, []);

  // Called on every new live_hr realtime event
  const recordHRData = useCallback(async (data: { profile_id: string; bpm: number; zone: number; hr_percentage: number; timestamp: string }) => {
    if (!isActiveRef.current) return;

    const workoutId = activeWorkoutsRef.current.get(data.profile_id);
    if (!workoutId) return;

    try {
      await supabase.from('workout_hr_data').insert({
        workout_id: workoutId,
        bpm: data.bpm,
        zone: data.zone,
        hr_percentage: data.hr_percentage,
        recorded_at: data.timestamp,
      });
    } catch (err) {
      console.error('Error recording HR data:', err);
    }
  }, []);

  return {
    isActive: session.isActive,
    startedAt: session.startedAt,
    elapsedSeconds: session.elapsedSeconds,
    activeWorkoutCount: session.activeWorkouts.size,
    activeWorkoutProfileIds: Array.from(session.activeWorkouts.keys()),
    startSession,
    stopSession,
    recordHRData,
  };
}
