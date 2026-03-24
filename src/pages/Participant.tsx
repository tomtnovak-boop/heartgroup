import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { HeartRateDisplay } from '@/components/participant/HeartRateDisplay';
import { ProfileEditDialog } from '@/components/profile/ProfileEditDialog';
import { WorkoutHistory } from '@/components/participant/WorkoutHistory';
import { SessionLeaderboard } from '@/components/dashboard/SessionLeaderboard';
import { useBluetoothHR } from '@/hooks/useBluetoothHR';
import { useWakeLock } from '@/hooks/useWakeLock';
import { enableNoSleep, isIOS } from '@/lib/noSleep';
import { calculateZone, calculateHRPercentage } from '@/lib/heartRateUtils';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Heart, Loader2, Bluetooth, BluetoothOff, LogOut, Settings, User,
  TrendingUp, TrendingDown, Flame, Clock, Activity, ChevronRight, Zap,
  BarChart3, Calendar, ArrowDown, ArrowUp, ChevronDown, ArrowLeft,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, getISOWeek, eachWeekOfInterval, subMonths } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';

interface Profile {
  id: string;
  name: string;
  age: number;
  max_hr: number;
  custom_max_hr?: number | null;
  weight?: number | null;
  gender?: string | null;
}

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

export default function Participant() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isTrainingActive, setIsTrainingActive] = useState(false);
  const [monthlyWorkouts, setMonthlyWorkouts] = useState<Workout[]>([]);
  const [prevMonthWorkouts, setPrevMonthWorkouts] = useState<Workout[]>([]);
  const [recentWorkouts, setRecentWorkouts] = useState<Workout[]>([]);
  const [allHistoricalWorkouts, setAllHistoricalWorkouts] = useState<Workout[]>([]);
  const [activeSession, setActiveSession] = useState(false);
  const [expandedMonth, setExpandedMonth] = useState<string>('');
  
  // Session join flow state
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [currentWorkoutId, setCurrentWorkoutId] = useState<string | null>(null);
  const [joinSkipped, setJoinSkipped] = useState(false);
  const [coachSessionActive, setCoachSessionActive] = useState(false);
  const joinDialogShownRef = useRef(false);

  // Leaderboard state
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState<{ profile_id: string; name: string; avg_bpm: number; max_bpm: number; duration_seconds: number }[]>([]);
  const [leaderboardDuration, setLeaderboardDuration] = useState(0);
  const [leaderboardDate, setLeaderboardDate] = useState(new Date());
  const prevCoachSessionActive = useRef(false);
  const navigate = useNavigate();
  const { user, signOut, isCoach } = useAuthContext();
  const { toast } = useToast();

  const {
    isConnected, isConnecting, bpm, connect, disconnect, deviceName,
  } = useBluetoothHR();
  const { isSupported: wakeLockSupported, request: requestWakeLock } = useWakeLock();

  const effectiveMaxHr = profile ? (profile.custom_max_hr || profile.max_hr) : 190;

  // Fetch profile
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (error) { console.error('Error fetching profile:', error); }
      else { setProfile(data); }
      setIsLoading(false);
    };
    fetchProfile();
  }, [user]);

  // Fetch monthly + recent workouts + historical
  useEffect(() => {
    if (!profile) return;
    const now = new Date();
    const monthStart = startOfMonth(now).toISOString();
    const monthEnd = endOfMonth(now).toISOString();

    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevStart = startOfMonth(prevMonth).toISOString();
    const prevEnd = endOfMonth(prevMonth).toISOString();

    // Current month
    supabase.from('workouts').select('*')
      .eq('profile_id', profile.id)
      .not('ended_at', 'is', null)
      .gte('started_at', monthStart)
      .lte('started_at', monthEnd)
      .order('started_at', { ascending: false })
      .then(({ data }) => setMonthlyWorkouts(data || []));

    // Previous month
    supabase.from('workouts').select('*')
      .eq('profile_id', profile.id)
      .not('ended_at', 'is', null)
      .gte('started_at', prevStart)
      .lte('started_at', prevEnd)
      .then(({ data }) => setPrevMonthWorkouts(data || []));

    // Recent 5
    supabase.from('workouts').select('*')
      .eq('profile_id', profile.id)
      .not('ended_at', 'is', null)
      .order('started_at', { ascending: false })
      .limit(5)
      .then(({ data }) => setRecentWorkouts(data || []));

    // Last 6 months of workouts (for Month tab)
    const sixMonthsAgo = startOfMonth(subMonths(now, 5)).toISOString();
    supabase.from('workouts').select('*')
      .eq('profile_id', profile.id)
      .not('ended_at', 'is', null)
      .gte('started_at', sixMonthsAgo)
      .order('started_at', { ascending: false })
      .then(({ data }) => {
        setAllHistoricalWorkouts(data || []);
        // Set current month as expanded by default
        setExpandedMonth(format(now, 'yyyy-MM'));
      });
  }, [profile]);

  // Check for coach-started active session (any open workout within last 3 hours)
  useEffect(() => {
    if (!profile) return;
    
    const checkCoachSession = async () => {
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from('workouts')
        .select('id')
        .is('ended_at', null)
        .gte('started_at', threeHoursAgo)
        .limit(1);
      setCoachSessionActive((data || []).length > 0);
    };

    checkCoachSession();
    // Poll every 15 seconds to detect when coach starts a session
    const interval = setInterval(checkCoachSession, 15000);
    return () => clearInterval(interval);
  }, [profile]);

  // Check if participant already has an active workout
  useEffect(() => {
    if (!profile) return;
    const checkOwnWorkout = async () => {
      const { data } = await supabase
        .from('workouts')
        .select('id')
        .eq('profile_id', profile.id)
        .is('ended_at', null)
        .limit(1);
      if (data && data.length > 0) {
        setCurrentWorkoutId(data[0].id);
        setActiveSession(true);
      }
    };
    checkOwnWorkout();
  }, [profile]);

  // Show join dialog when connected + coach session active + not already joined/skipped
  useEffect(() => {
    if (isConnected && coachSessionActive && !currentWorkoutId && !joinSkipped && !joinDialogShownRef.current) {
      joinDialogShownRef.current = true;
      setShowJoinDialog(true);
    }
  }, [isConnected, coachSessionActive, currentWorkoutId, joinSkipped]);

  // Reset join state when disconnecting
  useEffect(() => {
    if (!isConnected) {
      setJoinSkipped(false);
      joinDialogShownRef.current = false;
    }
  }, [isConnected]);

  // Detect session end → show leaderboard after 5s
  useEffect(() => {
    if (prevCoachSessionActive.current && !coachSessionActive && currentWorkoutId) {
      setCurrentWorkoutId(null);
      setActiveSession(false);
      
      const timer = setTimeout(async () => {
        try {
          const thirtySecsAgo = new Date(Date.now() - 30000).toISOString();
          const { data: workouts } = await supabase
            .from('workouts')
            .select('profile_id, avg_bpm, max_bpm, duration_seconds, total_calories, started_at, ended_at')
            .not('ended_at', 'is', null)
            .gte('ended_at', thirtySecsAgo);

          if (!workouts || workouts.length === 0) { prevCoachSessionActive.current = coachSessionActive; return; }

          const profileIds = [...new Set(workouts.map(w => w.profile_id))];
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, name, nickname')
            .in('id', profileIds);

          const profileMap = new Map(profiles?.map(p => [p.id, p.nickname || p.name]) || []);

          const entries = workouts.map(w => ({
            profile_id: w.profile_id,
            name: profileMap.get(w.profile_id) || 'Unknown',
            avg_bpm: w.avg_bpm || 0,
            max_bpm: w.max_bpm || 0,
            duration_seconds: w.duration_seconds || 0,
            total_calories: Number(w.total_calories) || 0,
          }));

          setLeaderboardData(entries);
          setLeaderboardDuration(Math.max(...entries.map(e => e.duration_seconds), 0));
          setLeaderboardDate(new Date());
          setShowLeaderboard(true);
        } catch (err) {
          console.error('Error fetching leaderboard:', err);
        }
      }, 5000);
      return () => clearTimeout(timer);
    }
    prevCoachSessionActive.current = coachSessionActive;
  }, [coachSessionActive, currentWorkoutId]);

  // Handle joining a session
  const handleJoinSession = useCallback(async () => {
    if (!profile) return;
    try {
      const { data, error } = await supabase
        .from('workouts')
        .insert({ profile_id: profile.id, started_at: new Date().toISOString() })
        .select('id')
        .single();
      if (error) throw error;
      setCurrentWorkoutId(data.id);
      setActiveSession(true);
      setShowJoinDialog(false);
      toast({ title: "You've joined the session!" });
    } catch (err) {
      console.error('Error joining session:', err);
      toast({ title: 'Failed to join session', variant: 'destructive' });
    }
  }, [profile, toast]);

  const handleSkipSession = useCallback(() => {
    setJoinSkipped(true);
    setShowJoinDialog(false);
  }, []);

  // Send HR data to live_hr when connected
  useEffect(() => {
    if (!isConnected || bpm <= 0 || !profile) return;
    const zone = calculateZone(bpm, effectiveMaxHr);
    const hrPct = calculateHRPercentage(bpm, effectiveMaxHr);
    supabase.from('live_hr').insert({
      profile_id: profile.id, bpm, zone, hr_percentage: hrPct,
    }).then(() => {});
  }, [bpm, isConnected, profile, effectiveMaxHr]);

  // Also record HR data to workout_hr_data when in an active workout
  useEffect(() => {
    if (!currentWorkoutId || bpm <= 0) return;
    const zone = calculateZone(bpm, effectiveMaxHr);
    const hrPct = calculateHRPercentage(bpm, effectiveMaxHr);
    supabase.from('workout_hr_data').insert({
      workout_id: currentWorkoutId, bpm, zone, hr_percentage: hrPct,
    }).then(() => {});
  }, [bpm, currentWorkoutId, effectiveMaxHr]);

  // Wake lock
  useEffect(() => {
    if (isConnected) {
      if (wakeLockSupported) requestWakeLock();
      if (isIOS() || !wakeLockSupported) enableNoSleep();
    }
  }, [isConnected, wakeLockSupported, requestWakeLock]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleConnect = async () => {
    if (isIOS() || !wakeLockSupported) enableNoSleep();
    await connect();
  };

  // Monthly stats
  const monthStats = useMemo(() => {
    const w = monthlyWorkouts;
    const pw = prevMonthWorkouts;

    const withBpm = w.filter(x => x.avg_bpm && x.avg_bpm > 0);
    const totalWeightedBpm = withBpm.reduce((s, x) => s + (x.avg_bpm || 0) * (x.duration_seconds || 1), 0);
    const totalWeight = withBpm.reduce((s, x) => s + (x.duration_seconds || 1), 0);
    const avgBpm = totalWeight > 0 ? Math.round(totalWeightedBpm / totalWeight) : 0;
    const lowestSessionBpm = withBpm.length > 0 ? Math.min(...withBpm.map(x => x.avg_bpm!)) : 0;
    const highestSessionBpm = withBpm.length > 0 ? Math.max(...withBpm.map(x => x.avg_bpm!)) : 0;

    const pwWithBpm = pw.filter(x => x.avg_bpm && x.avg_bpm > 0);
    const prevAvgBpm = pwWithBpm.length > 0
      ? Math.round(pwWithBpm.reduce((s, x) => s + (x.avg_bpm || 0), 0) / pwWithBpm.length)
      : 0;

    const maxBpmEntry = w.reduce((max, x) => (x.max_bpm || 0) > (max?.max_bpm || 0) ? x : max, w[0]);
    const maxBpm = maxBpmEntry?.max_bpm || 0;
    const maxBpmDate = maxBpmEntry ? format(new Date(maxBpmEntry.started_at), 'MMM d') : '';

    const totalSeconds = w.reduce((s, x) => s + (x.duration_seconds || 0), 0);
    const prevTotalSeconds = pw.reduce((s, x) => s + (x.duration_seconds || 0), 0);

    const totalCalories = Math.round(w.reduce((s, x) => s + (x.total_calories || 0), 0));
    const maxSessionCal = Math.round(Math.max(...w.map(x => x.total_calories || 0), 0));

    // Zone distribution
    const z1 = w.reduce((s, x) => s + (x.zone_1_seconds || 0), 0);
    const z2 = w.reduce((s, x) => s + (x.zone_2_seconds || 0), 0);
    const z3 = w.reduce((s, x) => s + (x.zone_3_seconds || 0), 0);
    const z4 = w.reduce((s, x) => s + (x.zone_4_seconds || 0), 0);
    const z5 = w.reduce((s, x) => s + (x.zone_5_seconds || 0), 0);
    const zTotal = z1 + z2 + z3 + z4 + z5 || 1;

    // Weekly sessions — always show all weeks of the month
    const weekMap = new Map<number, number>();
    w.forEach(x => {
      const wk = getISOWeek(new Date(x.started_at));
      weekMap.set(wk, (weekMap.get(wk) || 0) + 1);
    });
    const now = new Date();
    const allWeekStarts = eachWeekOfInterval(
      { start: startOfMonth(now), end: endOfMonth(now) },
      { weekStartsOn: 1 }
    );
    const weekData = allWeekStarts.map(ws => {
      const wk = getISOWeek(ws);
      return { week: `W${wk}`, count: weekMap.get(wk) || 0 };
    });

    // Streaks
    const weeklyStreak = (() => {
      if (weekData.length === 0) return 0;
      let streak = 1;
      const weeks = Array.from(weekMap.keys()).sort((a, b) => b - a);
      for (let i = 0; i < weeks.length - 1; i++) {
        if (weeks[i] - weeks[i + 1] === 1) streak++;
        else break;
      }
      return streak;
    })();

    const z3PlusShare = zTotal > 0 ? Math.round(((z3 + z4 + z5) / zTotal) * 100) : 0;

    return {
      avgBpm, prevAvgBpm, lowestSessionBpm, highestSessionBpm, maxBpm, maxBpmDate,
      totalSeconds, prevTotalSeconds,
      totalCalories, maxSessionCal,
      zonePercents: {
        z1: Math.round((z1 / zTotal) * 100),
        z2: Math.round((z2 / zTotal) * 100),
        z3: Math.round((z3 / zTotal) * 100),
        z4: Math.round((z4 / zTotal) * 100),
        z5: Math.round((z5 / zTotal) * 100),
      },
      zoneMinutes: {
        z1: Math.round(z1 / 60),
        z2: Math.round(z2 / 60),
        z3: Math.round(z3 / 60),
        z4: Math.round(z4 / 60),
        z5: Math.round(z5 / 60),
      },
      totalTrainingMinutes: Math.round(zTotal / 60),
      weekData,
      sessionCount: w.length,
      weeklyStreak,
      z3PlusShare,
    };
  }, [monthlyWorkouts, prevMonthWorkouts]);

  // Group workouts by month for the Month tab
  const monthGroups = useMemo(() => {
    const groups = new Map<string, Workout[]>();
    allHistoricalWorkouts.forEach(w => {
      const key = format(new Date(w.started_at), 'yyyy-MM');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(w);
    });
    // Sort by month descending
    return Array.from(groups.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, workouts]) => {
        const totalSecs = workouts.reduce((s, w) => s + (w.duration_seconds || 0), 0);
        const totalCal = Math.round(workouts.reduce((s, w) => s + (w.total_calories || 0), 0));
        return {
          key,
          label: format(new Date(key + '-01'), 'MMMM yyyy'),
          workouts,
          sessionCount: workouts.length,
          totalSeconds: totalSecs,
          totalCalories: totalCal,
        };
      });
  }, [allHistoricalWorkouts]);

  const formatDuration = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  // If in training mode, show HeartRateDisplay
  if (isTrainingActive && profile) {
    return <HeartRateDisplay profile={profile} onBack={() => setIsTrainingActive(false)} />;
  }

  if (showHistory && profile) {
    return <WorkoutHistory profileId={profile.id} onClose={() => setShowHistory(false)} />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Heart className="w-12 h-12 text-primary animate-pulse" fill="currentColor" />
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading profile...</span>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Heart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">No Profile Found</h2>
        <p className="text-muted-foreground text-center">
          Please contact your coach to create your profile.
        </p>
      </div>
    );
  }

  // Connection status — 4 states + "not recording" substate
  const connectionState = isConnecting ? 'connecting'
    : isConnected && currentWorkoutId ? 'live'
    : isConnected && joinSkipped ? 'not-recording'
    : isConnected && coachSessionActive ? 'waiting' // dialog will show
    : isConnected ? 'waiting'
    : 'disconnected';

  const zone = bpm > 0 ? calculateZone(bpm, effectiveMaxHr) : 0;

  const zoneColors: Record<string, string> = {
    z1: '#00bcd4', z2: '#4caf50', z3: '#ffc107', z4: '#ff9800', z5: '#f44336',
  };

  const dominantZone = (w: Workout) => {
    const zones = [w.zone_1_seconds || 0, w.zone_2_seconds || 0, w.zone_3_seconds || 0, w.zone_4_seconds || 0, w.zone_5_seconds || 0];
    const maxIdx = zones.indexOf(Math.max(...zones));
    return maxIdx + 1;
  };

  const zoneLabels = ['', 'Recovery', 'Fat Burn', 'Aerobic', 'Cardio', 'Max Effort'];
  const zoneColorArr = ['', '#00bcd4', '#4caf50', '#ffc107', '#ff9800', '#f44336'];

  const initials = profile.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const now = new Date();
  const monthLabel = format(now, 'MMMM yyyy');
  const prevMonthName = format(new Date(now.getFullYear(), now.getMonth() - 1, 1), 'MMMM');

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          {isCoach && (
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="h-8 w-8 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <Heart className="w-4 h-4 text-primary" fill="currentColor" />
          </div>
          <span className="text-sm font-bold">HR Training</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
            {initials}
          </div>
          <Button variant="ghost" size="icon" onClick={handleSignOut} className="h-8 w-8">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Connection Status */}
      <div className="px-4 pt-4">
        {connectionState === 'disconnected' && (
          <button
            onClick={handleConnect}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-full bg-muted text-muted-foreground font-medium text-sm transition-colors hover:bg-muted/80"
          >
            <Bluetooth className="w-4 h-4" />
            Connect Device
          </button>
        )}
        {connectionState === 'connecting' && (
          <div className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-full bg-blue-500/15 text-blue-400 font-medium text-sm animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin" />
            Connecting...
          </div>
        )}
        {connectionState === 'waiting' && (
          <div className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-full bg-emerald-500/15 text-emerald-400 font-medium text-sm">
            <Bluetooth className="w-4 h-4" />
            Connected ✓ — Waiting for coach
          </div>
        )}
        {connectionState === 'not-recording' && (
          <div className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-full bg-emerald-500/15 text-emerald-400 font-medium text-sm">
            <Bluetooth className="w-4 h-4" />
            Connected ✓ — Not recording
          </div>
        )}
        {connectionState === 'live' && (
          <div className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-full bg-destructive/15 text-destructive font-medium text-sm animate-pulse">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive" />
            </span>
            Live • {bpm > 0 ? `${bpm} bpm` : 'Session running'}
          </div>
        )}
      </div>

      {/* Session Join Dialog */}
      <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Session in progress</DialogTitle>
            <DialogDescription>
              Your coach has started a training session. Would you like to join and have your workout recorded?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2 sm:gap-2">
            <Button variant="outline" onClick={handleSkipSession} className="flex-1">
              Skip
            </Button>
            <Button onClick={handleJoinSession} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">
              Join Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="flex-1 flex flex-col px-4 pt-3">
        <TabsList className="w-full grid grid-cols-4 h-9">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="month" className="text-xs">Month</TabsTrigger>
          <TabsTrigger value="history" className="text-xs">History</TabsTrigger>
          <TabsTrigger value="profile" className="text-xs">Profile</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="flex-1 overflow-y-auto pb-4 space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground pt-2">
            {monthLabel} — Monthly Report
          </h2>

          {/* Heart Rate card - full width */}
          <Card className="p-4 border-pink-500/30">
            <div className="flex items-center gap-1.5 mb-3">
              <Heart className="w-3.5 h-3.5 text-pink-400" />
              <span className="text-[10px] text-muted-foreground">Heart Rate — This Month</span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <ArrowDown className="w-4 h-4 mx-auto mb-1 text-cyan-400" />
                <div className="text-xl font-bold text-cyan-400">{monthStats.lowestSessionBpm || '--'}</div>
                <div className="text-[10px] text-muted-foreground">Lowest</div>
              </div>
              <div>
                <Heart className="w-4 h-4 mx-auto mb-1 text-purple-400" fill="currentColor" />
                <div className="text-2xl font-bold text-purple-400">{monthStats.avgBpm || '--'}</div>
                <div className="text-[10px] text-muted-foreground">Average</div>
              </div>
              <div>
                <ArrowUp className="w-4 h-4 mx-auto mb-1 text-orange-400" />
                <div className="text-xl font-bold text-orange-400">{monthStats.highestSessionBpm || '--'}</div>
                <div className="text-[10px] text-muted-foreground">Highest avg</div>
              </div>
              <div>
                <Zap className="w-4 h-4 mx-auto mb-1 text-red-500" />
                <div className="text-xl font-bold text-red-500">{monthStats.maxBpm || '--'}</div>
                <div className="text-[10px] text-muted-foreground">Max</div>
                {monthStats.maxBpmDate && (
                  <div className="text-[9px] text-muted-foreground">{monthStats.maxBpmDate}</div>
                )}
              </div>
            </div>
            <div className="text-[9px] text-muted-foreground text-center mt-2">Based on session averages · Max is peak BPM</div>
          </Card>

          {/* Remaining metric cards */}
          <div className="grid grid-cols-2 gap-2">
            <Card className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Time</span>
              </div>
              <div className="text-xl font-bold">{formatDuration(monthStats.totalSeconds)}</div>
            </Card>

            <Card className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Flame className="w-4 h-4 text-orange-400" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Calories</span>
              </div>
              <div className="text-xl font-bold">{monthStats.totalCalories || '--'} <span className="text-xs font-normal text-muted-foreground">kcal</span></div>
              {monthStats.maxSessionCal > 0 && (
                <div className="text-[10px] text-muted-foreground mt-0.5">Best: {monthStats.maxSessionCal} kcal</div>
              )}
            </Card>
          </div>

          {/* Zone distribution */}
          {monthStats.sessionCount > 0 && (
            <Card className="p-3">
              <h3 className="text-xs font-semibold mb-2">Zone Distribution</h3>
              <div className="space-y-1.5">
                {([
                  { label: 'Z1', key: 'z1' as const },
                  { label: 'Z2', key: 'z2' as const },
                  { label: 'Z3', key: 'z3' as const },
                  { label: 'Z4', key: 'z4' as const },
                  { label: 'Z5', key: 'z5' as const },
                ] as const).map(z => {
                  const pct = monthStats.zonePercents[z.key];
                  const mins = monthStats.zoneMinutes[z.key];
                  return (
                    <div key={z.label} className="flex items-center gap-2">
                      <span className="text-[10px] font-bold w-5 text-muted-foreground">{z.label}</span>
                      <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: zoneColors[z.key] }} />
                      </div>
                      <span className="text-[10px] font-medium w-20 text-right text-muted-foreground">
                        {mins > 0 ? `${mins} min` : '—'} · {pct}%
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 text-[10px] text-muted-foreground text-right">
                Total: {Math.floor(monthStats.totalTrainingMinutes / 60) > 0 ? `${Math.floor(monthStats.totalTrainingMinutes / 60)} h ` : ''}{monthStats.totalTrainingMinutes % 60} min this month
              </div>
            </Card>
          )}

          {/* Weekly sessions chart */}
          <Card className="p-3">
            <h3 className="text-xs font-semibold mb-2">Weekly Sessions</h3>
            <div className="h-24">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthStats.weekData} barCategoryGap="20%">
                  <XAxis dataKey="week" tick={{ fill: 'hsl(215 20% 55%)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis hide domain={[0, 5]} allowDecimals={false} />
                  <Bar
                    dataKey="count"
                    radius={[4, 4, 0, 0]}
                    minPointSize={3}
                    label={({ x, y, width, value }: any) =>
                      value > 0 ? (
                        <text x={x + width / 2} y={y - 4} textAnchor="middle" fill="hsl(215 20% 65%)" fontSize={10}>
                          {value}
                        </text>
                      ) : null
                    }
                  >
                    {monthStats.weekData.map((entry, i) => (
                      <Cell key={i} fill={entry.count > 0 ? 'hsl(280 100% 65%)' : 'hsl(215 20% 20%)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Streak cards */}
          <div className="grid grid-cols-4 gap-2">
            <Card className="p-3 text-center">
              <div className="text-xl font-bold">{monthStats.sessionCount}</div>
              <div className="text-[10px] text-muted-foreground">Sessions</div>
            </Card>
            <Card className="p-3 text-center">
              <div className="text-xl font-bold">{monthStats.weeklyStreak}</div>
              <div className="text-[10px] text-muted-foreground">Week Streak</div>
            </Card>
            <Card className="p-3 text-center">
              <div className="text-xl font-bold">{monthStats.z3PlusShare}%</div>
              <div className="text-[10px] text-muted-foreground">Z3+ Share</div>
            </Card>
            <Card className="p-3 text-center">
              <div className="text-xl font-bold text-purple-400">
                {(() => {
                  const ranked = monthlyWorkouts.filter(w => w.rank_avg_bpm != null);
                  if (ranked.length === 0) return '--';
                  return `#${Math.min(...ranked.map(w => w.rank_avg_bpm!))}`;
                })()}
              </div>
              <div className="text-[10px] text-muted-foreground">Best Rank</div>
            </Card>
          </div>

          {/* Recent sessions */}
          {recentWorkouts.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold mb-2">Recent Sessions</h3>
              <div className="space-y-1.5">
                {recentWorkouts.map(w => {
                  const dz = dominantZone(w);
                  return (
                    <Card key={w.id} className="p-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: zoneColorArr[dz] }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{format(new Date(w.started_at), 'EEE, MMM d')}</div>
                          <div className="text-[10px] text-muted-foreground flex items-center gap-2">
                            <span>{formatDuration(w.duration_seconds || 0)}</span>
                            <span>{Math.round(w.total_calories || 0)} kcal</span>
                            <span>⌀ {w.avg_bpm || '--'} bpm</span>
                            <span>{zoneLabels[dz]}</span>
                          </div>
                          {w.rank_avg_bpm != null && w.session_participant_count != null && (
                            <div className="text-[11px] mt-0.5 flex items-center gap-2">
                              <span className="text-purple-400">Avg #{w.rank_avg_bpm}/{w.session_participant_count}</span>
                              <span className="text-muted-foreground">·</span>
                              <span className="text-red-400">Peak #{w.rank_peak_bpm}/{w.session_participant_count}</span>
                            </div>
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {monthStats.sessionCount === 0 && recentWorkouts.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No workouts recorded yet this month.</p>
              <p className="text-xs mt-1">Connect your device and wait for your coach to start a session.</p>
            </div>
          )}
        </TabsContent>

        {/* MONTH TAB */}
        <TabsContent value="month" className="flex-1 overflow-y-auto pb-4 space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground pt-2">Monthly History</h2>

          {monthGroups.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No workouts recorded yet.</p>
            </div>
          ) : (
            monthGroups.map(group => {
              const isExpanded = expandedMonth === group.key;
              return (
                <div key={group.key} className="border border-border rounded-lg overflow-hidden">
                  {/* Collapsible header */}
                  <button
                    className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-muted/50 transition-colors"
                    onClick={() => setExpandedMonth(isExpanded ? '' : group.key)}
                  >
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold">{group.label}</span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground">{group.sessionCount} sessions</span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground">{formatDuration(group.totalSeconds)}</span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground">{group.totalCalories.toLocaleString()} kcal</span>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="px-3 pb-3 space-y-3 border-t border-border">
                      {/* Metrics */}
                      {(() => {
                        const w = group.workouts;
                        const withBpm = w.filter(x => x.avg_bpm && x.avg_bpm > 0);
                        const totalWeighted = withBpm.reduce((s, x) => s + (x.avg_bpm || 0) * (x.duration_seconds || 1), 0);
                        const totalW = withBpm.reduce((s, x) => s + (x.duration_seconds || 1), 0);
                        const avg = totalW > 0 ? Math.round(totalWeighted / totalW) : 0;
                        const low = withBpm.length > 0 ? Math.min(...withBpm.map(x => x.avg_bpm!)) : 0;
                        const high = withBpm.length > 0 ? Math.max(...withBpm.map(x => x.avg_bpm!)) : 0;
                        const peakBpm = w.reduce((max, x) => Math.max(max, x.max_bpm || 0), 0);
                        const peakEntry = w.find(x => x.max_bpm === peakBpm);
                        const peakDate = peakEntry ? format(new Date(peakEntry.started_at), 'MMM d') : '';
                        const bestCal = Math.round(Math.max(...w.map(x => x.total_calories || 0), 0));

                        return (
                          <>
                            {/* HR card */}
                            <Card className="p-3 border-pink-500/30 mt-3">
                              <div className="grid grid-cols-4 gap-2 text-center">
                                <div>
                                  <ArrowDown className="w-3.5 h-3.5 mx-auto mb-0.5 text-cyan-400" />
                                  <div className="text-lg font-bold text-cyan-400">{low || '--'}</div>
                                  <div className="text-[9px] text-muted-foreground">Lowest</div>
                                </div>
                                <div>
                                  <Heart className="w-3.5 h-3.5 mx-auto mb-0.5 text-purple-400" fill="currentColor" />
                                  <div className="text-xl font-bold text-purple-400">{avg || '--'}</div>
                                  <div className="text-[9px] text-muted-foreground">Average</div>
                                </div>
                                <div>
                                  <ArrowUp className="w-3.5 h-3.5 mx-auto mb-0.5 text-orange-400" />
                                  <div className="text-lg font-bold text-orange-400">{high || '--'}</div>
                                  <div className="text-[9px] text-muted-foreground">Highest avg</div>
                                </div>
                                <div>
                                  <Zap className="w-3.5 h-3.5 mx-auto mb-0.5 text-red-500" />
                                  <div className="text-lg font-bold text-red-500">{peakBpm || '--'}</div>
                                  <div className="text-[9px] text-muted-foreground">Max</div>
                                  {peakDate && <div className="text-[8px] text-muted-foreground">{peakDate}</div>}
                                </div>
                              </div>
                            </Card>

                            {/* Zone breakdown */}
                            <Card className="p-3">
                              <h3 className="text-xs font-semibold mb-2">Time in Zones</h3>
                              <div className="space-y-1.5">
                                {[
                                  { label: 'Z1 Recovery', secs: w.reduce((s, x) => s + (x.zone_1_seconds || 0), 0), color: zoneColors.z1 },
                                  { label: 'Z2 Fat Burn', secs: w.reduce((s, x) => s + (x.zone_2_seconds || 0), 0), color: zoneColors.z2 },
                                  { label: 'Z3 Aerobic', secs: w.reduce((s, x) => s + (x.zone_3_seconds || 0), 0), color: zoneColors.z3 },
                                  { label: 'Z4 Cardio', secs: w.reduce((s, x) => s + (x.zone_4_seconds || 0), 0), color: zoneColors.z4 },
                                  { label: 'Z5 Max Effort', secs: w.reduce((s, x) => s + (x.zone_5_seconds || 0), 0), color: zoneColors.z5 },
                                ].map(z => (
                                  <div key={z.label} className="flex items-center justify-between">
                                    <span className="text-xs font-medium" style={{ color: z.color }}>{z.label}</span>
                                    <span className="text-xs text-muted-foreground">{formatDuration(z.secs)}</span>
                                  </div>
                                ))}
                              </div>
                            </Card>

                            {/* Sessions list */}
                            <Card className="p-3">
                              <h3 className="text-xs font-semibold mb-2">All Sessions ({w.length})</h3>
                              <div className="space-y-1">
                                {w.map(s => (
                                  <div key={s.id} className="flex items-center justify-between text-xs py-1.5 border-b border-border last:border-0">
                                    <div className="flex flex-col">
                                      <span className="font-medium">{format(new Date(s.started_at), 'MMM d, HH:mm')}</span>
                                      {s.rank_avg_bpm != null && s.session_participant_count != null && (
                                        <span className="text-[11px] mt-0.5">
                                          <span className="text-purple-400">Avg #{s.rank_avg_bpm}/{s.session_participant_count}</span>
                                          <span className="text-muted-foreground"> · </span>
                                          <span className="text-red-400">Peak #{s.rank_peak_bpm}/{s.session_participant_count}</span>
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-3 text-muted-foreground">
                                      <span>{formatDuration(s.duration_seconds || 0)}</span>
                                      <span>{Math.round(s.total_calories || 0)} kcal</span>
                                      <span>⌀ {s.avg_bpm || '--'}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </Card>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </TabsContent>

        {/* HISTORY TAB */}
        <TabsContent value="history" className="flex-1 overflow-y-auto pb-4">
          <div className="pt-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowHistory(true)}
            >
              <Clock className="w-4 h-4 mr-2" />
              View Full Workout History
            </Button>
          </div>
        </TabsContent>

        {/* PROFILE TAB */}
        <TabsContent value="profile" className="flex-1 overflow-y-auto pb-4 space-y-4">
          <Card className="p-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center text-lg font-bold text-primary">
                {initials}
              </div>
              <div>
                <h2 className="text-lg font-bold">{profile.name}</h2>
                <p className="text-sm text-muted-foreground">Max HR: {effectiveMaxHr} bpm</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
              <div>
                <span className="text-muted-foreground">Age</span>
                <p className="font-medium">{profile.age} years</p>
              </div>
              <div>
                <span className="text-muted-foreground">Weight</span>
                <p className="font-medium">{profile.weight ? `${profile.weight} kg` : '–'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Gender</span>
                <p className="font-medium">{profile.gender === 'male' ? 'Male' : profile.gender === 'female' ? 'Female' : '–'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Max HR</span>
                <p className="font-medium">{effectiveMaxHr} bpm {profile.custom_max_hr ? '(custom)' : '(Tanaka)'}</p>
              </div>
            </div>

            <Button className="w-full" onClick={() => setIsEditDialogOpen(true)}>
              <Settings className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          </Card>

          {isConnected && (
            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-2">Connected Device</h3>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <Bluetooth className="w-4 h-4 text-blue-400" />
                  <span>{deviceName || 'HR Monitor'}</span>
                </div>
                <Button variant="outline" size="sm" onClick={disconnect}>
                  Disconnect
                </Button>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Profile Edit Dialog */}
      {profile && (
        <ProfileEditDialog
          profile={profile}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onProfileUpdated={(p) => setProfile(p)}
        />
      )}

      {showLeaderboard && leaderboardData.length > 0 && (
        <SessionLeaderboard
          entries={leaderboardData}
          sessionDuration={leaderboardDuration}
          sessionDate={leaderboardDate}
          onClose={() => setShowLeaderboard(false)}
          highlightProfileId={profile?.id}
          variant="participant"
        />
      )}
    </div>
  );
}
