import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { LiveHRData } from '@/hooks/useLiveHR';

interface WorkoutSession {
  isActive: boolean;
  startedAt: Date | null;
  elapsedSeconds: number;
  activeWorkouts: Map<string, string>; // profile_id → workout_id
}

function generateSessionCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export function useWorkoutSession() {
  const [session, setSession] = useState<WorkoutSession>({
    isActive: false,
    startedAt: null,
    elapsedSeconds: 0,
    activeWorkouts: new Map(),
  });
  const [sessionCode, setSessionCode] = useState<string | null>(null);
  const [lobbyCount, setLobbyCount] = useState(0);
  const [lobbyProfileIds, setLobbyProfileIds] = useState<string[]>([]);

  const activeWorkoutsRef = useRef<Map<string, string>>(new Map());
  const isActiveRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<Date | null>(null);
  const sessionCodeRef = useRef<string | null>(null);

  // Sync refs with state
  useEffect(() => {
    activeWorkoutsRef.current = session.activeWorkouts;
    isActiveRef.current = session.isActive;
    startedAtRef.current = session.startedAt;
  }, [session]);

  useEffect(() => {
    sessionCodeRef.current = sessionCode;
  }, [sessionCode]);

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

  // Helper: create a new active_sessions record and set sessionCode
  const ensureSessionCode = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      console.error('ensureSessionCode: No authenticated user');
      return;
    }

    // Check if there's already an active session
    const { data: existing } = await supabase
      .from('active_sessions')
      .select('session_code')
      .is('ended_at', null)
      .eq('created_by', userData.user.id)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      setSessionCode(existing.session_code);
      return existing.session_code;
    }

    const code = generateSessionCode();
    const { error } = await supabase.from('active_sessions').insert({
      session_code: code,
      created_by: userData.user.id,
    });
    if (error) {
      console.error('ensureSessionCode: Insert failed', error);
      return;
    }
    setSessionCode(code);
    return code;
  }, []);

  // Restore session on mount — or auto-create a code if none exists
  useEffect(() => {
    const restoreSession = async () => {
      try {
        // Check for active session code
        const { data: activeSession } = await supabase
          .from('active_sessions')
          .select('session_code')
          .is('ended_at', null)
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (activeSession) {
          setSessionCode(activeSession.session_code);
        } else {
          // No active session — auto-create one
          await ensureSessionCode();
        }

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
  }, [ensureSessionCode]);

  // Subscribe to lobby for current session code
  useEffect(() => {
    if (!sessionCode) {
      setLobbyCount(0);
      setLobbyProfileIds([]);
      return;
    }

    const fetchLobby = async () => {
      const { data } = await supabase
        .from('session_lobby')
        .select('profile_id')
        .eq('session_code', sessionCode);
      const ids = data?.map(d => d.profile_id) || [];
      setLobbyCount(ids.length);
      setLobbyProfileIds(ids);
    };

    fetchLobby();

    const sub = supabase
      .channel('lobby-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'session_lobby',
        filter: `session_code=eq.${sessionCode}`,
      }, fetchLobby)
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, [sessionCode]);

  // createSessionCode is no longer needed — codes are auto-managed
  const createSessionCode = ensureSessionCode;

  const startSession = useCallback(async (participants: LiveHRData[]) => {
    const code = sessionCodeRef.current;
    console.log('startSession called, code:', code, 'participants passed:', participants.length);
    if (!code) {
      console.error('startSession: No session code available');
      return;
    }

    try {
      // Mark session as started in active_sessions — MUST run first
      const { error: sessionStartError, data: sessionUpdateData, count } = await supabase
        .from('active_sessions')
        .update({ started_at: new Date().toISOString() })
        .eq('session_code', code)
        .is('ended_at', null)
        .select();
      console.log('session start update result:', { error: sessionStartError, data: sessionUpdateData, count });

      if (sessionStartError) {
        console.error('startSession: Failed to update active_sessions', sessionStartError);
        throw sessionStartError;
      }

      // Fetch lobby participants
      const { data: lobbyParticipants, error: lobbyError } = await supabase
        .from('session_lobby')
        .select('profile_id')
        .eq('session_code', code);

      console.log('startSession: lobby participants', lobbyParticipants, 'error:', lobbyError);

      const profileIds = lobbyParticipants?.map(p => p.profile_id) || [];
      const now = new Date().toISOString();

      if (profileIds.length === 0) {
        console.log('startSession: No participants in lobby, starting empty session');
        // Start session even without participants — late joiners can still join
        setSession({
          isActive: true,
          startedAt: new Date(now),
          elapsedSeconds: 0,
          activeWorkouts: new Map(),
        });
        return;
      }

      const inserts = profileIds.map(profile_id => ({
        profile_id,
        started_at: now,
      }));

      const { data, error } = await supabase
        .from('workouts')
        .insert(inserts)
        .select('id, profile_id');

      if (error) {
        console.error('startSession: Failed to insert workouts', error);
        throw error;
      }

      console.log('startSession: Created workouts', data);

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

  const addLateJoiner = useCallback(async (profileId: string) => {
    if (!isActiveRef.current) return;

    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('workouts')
        .insert({ profile_id: profileId, started_at: startedAtRef.current?.toISOString() || now })
        .select('id')
        .single();

      if (error) throw error;

      setSession(prev => {
        const newMap = new Map(prev.activeWorkouts);
        newMap.set(profileId, data.id);
        return { ...prev, activeWorkouts: newMap };
      });
    } catch (err) {
      console.error('Error adding late joiner:', err);
    }
  }, []);

  const stopSession = useCallback(async () => {
    const workouts = activeWorkoutsRef.current;
    const code = sessionCodeRef.current;

    // Immediately update UI
    const savedStartedAt = startedAtRef.current;
    setSession({
      isActive: false,
      startedAt: null,
      elapsedSeconds: 0,
      activeWorkouts: new Map(),
    });

    // End the active session record and immediately create a new one
    if (code) {
      await supabase.from('active_sessions')
        .update({ ended_at: new Date().toISOString() })
        .eq('session_code', code)
        .is('ended_at', null);
      // Clean up lobby for old code
      await supabase.from('session_lobby').delete().eq('session_code', code);
      // Auto-create new session code for next session
      await ensureSessionCode();
    }

    if (workouts.size === 0) return;

    // Finalize workouts in background
    const now = new Date().toISOString();
    const entries = Array.from(workouts.entries());

    const workoutStats: { workoutId: string; avgBpm: number; maxBpm: number; updatePayload: Record<string, any> }[] = [];

    await Promise.all(entries.map(async ([profileId, workoutId]) => {
      try {
        const [{ data: hrData, error: hrError }, { data: profile }] = await Promise.all([
          supabase.from('workout_hr_data').select('bpm, zone, hr_percentage').eq('workout_id', workoutId),
          supabase.from('profiles').select('weight, age, gender').eq('id', profileId).single(),
        ]);

        if (hrError) { console.error('Error fetching workout HR data:', hrError); return; }

        const hrs = hrData || [];
        const count = hrs.length;

        if (count === 0) {
          await supabase.from('workouts').update({ ended_at: now, duration_seconds: 0 }).eq('id', workoutId);
          return;
        }

        const avgBpm = Math.round(hrs.reduce((s, e) => s + e.bpm, 0) / count);
        const maxBpm = Math.max(...hrs.map(e => e.bpm));
        const avgZone = Math.round(hrs.reduce((s, e) => s + e.zone, 0) / count);

        const intervalSeconds = 2;
        const zoneCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        hrs.forEach(e => { zoneCounts[Math.min(Math.max(e.zone, 1), 5) as 1|2|3|4|5]++; });

        const durationSeconds = savedStartedAt
          ? Math.floor((new Date(now).getTime() - savedStartedAt.getTime()) / 1000)
          : count * intervalSeconds;

        const weight = profile?.weight || 75;
        const age = profile?.age || 30;
        const totalCalories = Math.round(
          (durationSeconds / 60) * (0.6309 * avgBpm - 55.0969 + 0.1988 * weight + 0.2017 * age) / 4.184
        );

        workoutStats.push({
          workoutId, avgBpm, maxBpm,
          updatePayload: {
            ended_at: now, avg_bpm: avgBpm, max_bpm: maxBpm, avg_zone: avgZone,
            duration_seconds: durationSeconds,
            zone_1_seconds: zoneCounts[1] * intervalSeconds, zone_2_seconds: zoneCounts[2] * intervalSeconds,
            zone_3_seconds: zoneCounts[3] * intervalSeconds, zone_4_seconds: zoneCounts[4] * intervalSeconds,
            zone_5_seconds: zoneCounts[5] * intervalSeconds, total_calories: Math.max(0, totalCalories),
          },
        });
      } catch (err) {
        console.error('Error finalizing workout:', err);
      }
    }));

    const participantCount = workoutStats.length;
    const avgSorted = [...workoutStats].sort((a, b) => b.avgBpm - a.avgBpm);
    const peakSorted = [...workoutStats].sort((a, b) => b.maxBpm - a.maxBpm);

    await Promise.all(workoutStats.map(async (ws) => {
      const rankAvg = avgSorted.findIndex(s => s.workoutId === ws.workoutId) + 1;
      const rankPeak = peakSorted.findIndex(s => s.workoutId === ws.workoutId) + 1;
      await supabase.from('workouts').update({
        ...ws.updatePayload,
        rank_avg_bpm: rankAvg,
        rank_peak_bpm: rankPeak,
        session_participant_count: participantCount,
      }).eq('id', ws.workoutId);
    }));
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
    sessionCode,
    lobbyCount,
    lobbyProfileIds,
    createSessionCode,
    startSession,
    stopSession,
    addLateJoiner,
    recordHRData,
  };
}
