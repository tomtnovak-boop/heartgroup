import { useEffect, useRef, useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useBluetoothHR } from '@/hooks/useBluetoothHR';
import { useWakeLock } from '@/hooks/useWakeLock';
import { supabase } from '@/integrations/supabase/client';
import { calculateZone, calculateHRPercentage, getZoneInfo, getZoneBgClass, calculateCaloriesPerMinute, getEffectiveMaxHR } from '@/lib/heartRateUtils';
import { enableNoSleep, disableNoSleep, isIOS, isSafari } from '@/lib/noSleep';
import { WorkoutSummary } from './WorkoutSummary';
import { Bluetooth, BluetoothOff, Heart, ArrowLeft, Smartphone, AlertTriangle, RefreshCw, Loader2, Flame, Square } from 'lucide-react';

interface Profile {
  id: string;
  name: string;
  age: number;
  max_hr: number;
  custom_max_hr?: number | null;
  weight?: number | null;
  gender?: string | null;
}

interface HeartRateDisplayProps {
  profile: Profile;
  onBack: () => void;
}

interface HRHistoryPoint {
  time: number;
  bpm: number;
}

interface ZoneTimes {
  [key: number]: number;
}

export function HeartRateDisplay({ profile, onBack }: HeartRateDisplayProps) {
  const { 
    isConnected, isConnecting, isReconnecting, bpm, error, deviceName, 
    reconnectAttempts, connectionLost, connect, disconnect, reconnect 
  } = useBluetoothHR();
  const { isSupported: wakeLockSupported, isActive: wakeLockActive, request: requestWakeLock } = useWakeLock();
  const lastSentRef = useRef<number>(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [showStartButton, setShowStartButton] = useState(true);
  const [browserWarning, setBrowserWarning] = useState<string | null>(null);
  const [lastDeviceName, setLastDeviceName] = useState<string | null>(null);

  const [workoutId, setWorkoutId] = useState<string | null>(null);
  const [workoutStartTime, setWorkoutStartTime] = useState<number | null>(null);
  const [hrHistory, setHrHistory] = useState<HRHistoryPoint[]>([]);
  const [zoneTimes, setZoneTimes] = useState<ZoneTimes>({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
  const [totalCalories, setTotalCalories] = useState(0);
  const lastCalorieUpdateRef = useRef<number>(Date.now());
  const [showSummary, setShowSummary] = useState(false);
  const [workoutSummaryData, setWorkoutSummaryData] = useState<any>(null);

  const effectiveMaxHr = getEffectiveMaxHR(profile.age, profile.custom_max_hr);
  const zone = bpm > 0 ? calculateZone(bpm, effectiveMaxHr) : 0;
  const hrPercentage = bpm > 0 ? calculateHRPercentage(bpm, effectiveMaxHr) : 0;
  const zoneInfo = zone > 0 ? getZoneInfo(zone) : null;

  useEffect(() => { if (deviceName) setLastDeviceName(deviceName); }, [deviceName]);

  useEffect(() => {
    if (isSafari() || isIOS()) {
      if (!('bluetooth' in navigator)) {
        setBrowserWarning(
          'Web Bluetooth is not supported by Safari/iOS. Please use Chrome on Android or the "Bluefy" browser on iOS.'
        );
      }
    }
  }, []);

  useEffect(() => {
    if (!isConnected || bpm <= 0 || !workoutId) return;
    if (!profile.weight || !profile.gender) return;
    if (profile.gender !== 'male' && profile.gender !== 'female') return;
    const now = Date.now();
    const elapsedMinutes = (now - lastCalorieUpdateRef.current) / 60000;
    lastCalorieUpdateRef.current = now;
    const caloriesPerMinute = calculateCaloriesPerMinute(bpm, profile.weight, profile.age, profile.gender);
    setTotalCalories(prev => prev + (caloriesPerMinute * elapsedMinutes));
  }, [bpm, isConnected, profile, workoutId]);

  useEffect(() => {
    if (!isConnected || bpm <= 0 || !workoutId) return;
    const now = Date.now();
    setHrHistory(prev => [...prev, { time: now, bpm }]);
    if (zone > 0) {
      setZoneTimes(prev => ({ ...prev, [zone]: prev[zone] + 2 }));
    }
  }, [bpm, isConnected, zone, workoutId]);

  const sendHeartRateData = useCallback(async () => {
    if (bpm <= 0) return;
    const now = Date.now();
    if (now - lastSentRef.current < 2000) return;
    lastSentRef.current = now;
    try {
      await supabase.from('live_hr').upsert({ profile_id: profile.id, bpm, zone, hr_percentage: hrPercentage, last_seen: new Date().toISOString() }, { onConflict: 'profile_id' });
      if (workoutId) {
        await supabase.from('workout_hr_data').insert({ workout_id: workoutId, bpm, zone, hr_percentage: hrPercentage });
      }
      setLastSyncTime(new Date());
    } catch (error) {
      console.error('Error sending heart rate data:', error);
    }
  }, [bpm, zone, hrPercentage, profile.id, workoutId]);

  useEffect(() => { if (isConnected && bpm > 0) sendHeartRateData(); }, [isConnected, bpm, sendHeartRateData]);

  useEffect(() => {
    if (isConnected) {
      if (wakeLockSupported) requestWakeLock();
      if (isIOS() || !wakeLockSupported) enableNoSleep();
    }
    return () => { disableNoSleep(); };
  }, [isConnected, wakeLockSupported, requestWakeLock]);

  useEffect(() => {
    if (!isConnected) return;
    const interval = setInterval(() => { if (bpm > 0) sendHeartRateData(); }, 2000);
    return () => clearInterval(interval);
  }, [isConnected, bpm, sendHeartRateData]);

  const handleStartTraining = async () => {
    setShowStartButton(false);
    if (isIOS() || !wakeLockSupported) enableNoSleep();
    const { data: workoutData, error: workoutError } = await supabase
      .from('workouts').insert({ profile_id: profile.id, started_at: new Date().toISOString() }).select().single();
    if (workoutError) console.error('Error creating workout:', workoutError);
    else { setWorkoutId(workoutData.id); setWorkoutStartTime(Date.now()); lastCalorieUpdateRef.current = Date.now(); }
    setHrHistory([]); setZoneTimes({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }); setTotalCalories(0);
    await connect();
  };

  const handleStopTraining = async () => {
    disconnect();
    if (!workoutId || !workoutStartTime) { onBack(); return; }
    const now = Date.now();
    const durationSeconds = Math.round((now - workoutStartTime) / 1000);
    const avgBpm = hrHistory.length > 0 ? Math.round(hrHistory.reduce((sum, p) => sum + p.bpm, 0) / hrHistory.length) : 0;
    const maxBpm = hrHistory.length > 0 ? Math.max(...hrHistory.map(p => p.bpm)) : 0;
    await supabase.from('workouts').update({
      ended_at: new Date().toISOString(), duration_seconds: durationSeconds,
      avg_bpm: avgBpm, max_bpm: maxBpm,
      zone_1_seconds: zoneTimes[1], zone_2_seconds: zoneTimes[2], zone_3_seconds: zoneTimes[3],
      zone_4_seconds: zoneTimes[4], zone_5_seconds: zoneTimes[5], total_calories: totalCalories,
    }).eq('id', workoutId);
    setWorkoutSummaryData({
      duration_seconds: durationSeconds, avg_bpm: avgBpm, max_bpm: maxBpm, total_calories: totalCalories,
      zone_1_seconds: zoneTimes[1], zone_2_seconds: zoneTimes[2], zone_3_seconds: zoneTimes[3],
      zone_4_seconds: zoneTimes[4], zone_5_seconds: zoneTimes[5],
    });
    setShowSummary(true);
  };

  const handleSummaryClose = () => {
    setShowSummary(false); setWorkoutId(null); setWorkoutStartTime(null);
    setHrHistory([]); setZoneTimes({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }); setTotalCalories(0);
    onBack();
  };

  if (showSummary && workoutSummaryData) {
    return <WorkoutSummary workout={workoutSummaryData} hrHistory={hrHistory} onClose={handleSummaryClose} />;
  }

  return (
    <div className={`min-h-screen flex flex-col transition-all duration-500 ${zone > 0 ? getZoneBgClass(zone) : 'bg-background'}`}>
      <div className="flex items-center justify-between p-4 bg-background/80 backdrop-blur-sm">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="w-5 h-5" /></Button>
        <div className="text-center">
          <div className="font-semibold">{profile.name}</div>
          <div className="text-xs text-muted-foreground">Max HR: {effectiveMaxHr} bpm</div>
        </div>
        <div className="w-10" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {isConnected && bpm > 0 ? (
          <div className="text-center">
            <div className="relative mb-4">
              <Heart className={`w-32 h-32 mx-auto text-white drop-shadow-2xl ${bpm > 0 ? 'animate-heartbeat' : ''}`} fill="currentColor" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-4xl font-bold text-background">{bpm}</span>
              </div>
            </div>
            <div className="text-6xl font-bold text-white mb-2 neon-text">{bpm} <span className="text-2xl font-normal">bpm</span></div>
            <div className="text-2xl text-white/90 mb-4">{hrPercentage}% HRmax</div>
            {zoneInfo && (
              <div className="inline-block px-6 py-3 rounded-full bg-white/20 backdrop-blur-sm">
                <div className="text-lg font-semibold text-white">Zone {zone}</div>
                <div className="text-sm text-white/80">{zoneInfo.name}</div>
              </div>
            )}
            {profile.weight && profile.gender && totalCalories > 0 && (
              <div className="mt-6 flex items-center justify-center gap-2">
                <Flame className="w-7 h-7 text-orange-400" />
                <span className="text-3xl font-bold text-white neon-text">{Math.round(totalCalories)} <span className="text-lg font-normal">kcal</span></span>
              </div>
            )}
            {(!profile.weight || !profile.gender) && (
              <div className="mt-4 text-sm text-yellow-400/80 text-center flex items-center justify-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Add weight & gender in your profile for calorie tracking
              </div>
            )}
            <div className="mt-8 text-white/60 text-sm">
              <div className="flex items-center justify-center gap-2 mb-1"><Bluetooth className="w-4 h-4" />{deviceName}</div>
              {(wakeLockActive || isIOS()) && (
                <div className="flex items-center justify-center gap-2"><Smartphone className="w-4 h-4" />Display stays active</div>
              )}
            </div>
          </div>
        ) : isReconnecting || connectionLost ? (
          <Card className="p-8 text-center max-w-sm mx-auto glass">
            <div className="space-y-4">
              <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${isReconnecting ? 'bg-yellow-500/20' : 'bg-destructive/20'}`}>
                {isReconnecting ? <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" /> : <BluetoothOff className="w-8 h-8 text-destructive" />}
              </div>
              <h2 className="text-xl font-semibold">{isReconnecting ? 'Reconnecting...' : 'Connection Lost'}</h2>
              <p className="text-muted-foreground text-sm">
                {isReconnecting ? `Reconnecting to ${lastDeviceName || 'device'}... (Attempt ${reconnectAttempts}/3)` : `Connection to ${lastDeviceName || 'your device'} was interrupted.`}
              </p>
              {isReconnecting && (
                <div className="flex justify-center gap-1">
                  {[1, 2, 3].map((dot) => (<div key={dot} className={`w-2 h-2 rounded-full ${dot <= reconnectAttempts ? 'bg-yellow-500' : 'bg-muted'}`} />))}
                </div>
              )}
              {error && !isReconnecting && <p className="text-destructive text-sm">{error}</p>}
              {!isReconnecting && (
                <div className="space-y-2">
                  <Button className="w-full gap-2" onClick={reconnect}><RefreshCw className="w-4 h-4" />Reconnect</Button>
                  <Button variant="outline" className="w-full" onClick={handleStopTraining}>End Training</Button>
                </div>
              )}
            </div>
          </Card>
        ) : (
          <Card className="p-8 text-center max-w-sm mx-auto glass">
            {browserWarning ? (
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-destructive/20 flex items-center justify-center"><AlertTriangle className="w-8 h-8 text-destructive" /></div>
                <h2 className="text-xl font-semibold">Browser Not Supported</h2>
                <p className="text-muted-foreground text-sm">{browserWarning}</p>
                <div className="text-left text-sm space-y-2 pt-4 border-t">
                  <p className="font-medium">Alternatives:</p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>Chrome on Android devices</li>
                    <li>"Bluefy" browser on iOS (App Store)</li>
                    <li>Edge or Chrome on Windows/Mac</li>
                  </ul>
                </div>
              </div>
            ) : isConnecting ? (
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center animate-pulse"><Bluetooth className="w-8 h-8 text-primary" /></div>
                <p className="text-muted-foreground">Connecting to heart rate monitor...</p>
              </div>
            ) : showStartButton ? (
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center"><Heart className="w-8 h-8 text-primary" fill="currentColor" /></div>
                <h2 className="text-xl font-semibold">Ready to train?</h2>
                <p className="text-muted-foreground text-sm">Press the button to connect your heart rate monitor and start training.</p>
                <Button className="w-full gap-2 h-14 text-lg" size="lg" onClick={handleStartTraining}>
                  <Heart className="w-5 h-5" fill="currentColor" />Start Training
                </Button>
                <p className="text-xs text-muted-foreground">Make sure your chest strap is on and Bluetooth is enabled.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center"><Heart className="w-8 h-8 text-primary" /></div>
                <h2 className="text-xl font-semibold">Connect Heart Rate Monitor</h2>
                <p className="text-muted-foreground text-sm">Connect your Bluetooth chest strap to start training.</p>
                {error && <p className="text-destructive text-sm">{error}</p>}
                <Button className="w-full gap-2" onClick={connect}><Bluetooth className="w-4 h-4" />Reconnect</Button>
              </div>
            )}
          </Card>
        )}
      </div>

      {isConnected && (
        <div className="p-4 bg-background/80 backdrop-blur-sm space-y-2">
          <Button variant="destructive" className="w-full gap-2" onClick={handleStopTraining}>
            <Square className="w-4 h-4" fill="currentColor" />Stop Training
          </Button>
          {lastSyncTime && (
            <p className="text-center text-xs text-muted-foreground">Last sync: {lastSyncTime.toLocaleTimeString()}</p>
          )}
        </div>
      )}
    </div>
  );
}
