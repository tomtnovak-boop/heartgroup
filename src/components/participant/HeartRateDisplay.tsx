import { useEffect, useRef, useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useBluetoothHR } from '@/hooks/useBluetoothHR';
import { useWakeLock } from '@/hooks/useWakeLock';
import { supabase } from '@/integrations/supabase/client';
import { calculateZone, calculateHRPercentage, getZoneInfo, getZoneBgClass } from '@/lib/heartRateUtils';
import { Bluetooth, BluetoothOff, Heart, ArrowLeft, Smartphone } from 'lucide-react';

interface Profile {
  id: string;
  name: string;
  age: number;
  max_hr: number;
}

interface HeartRateDisplayProps {
  profile: Profile;
  onBack: () => void;
}

export function HeartRateDisplay({ profile, onBack }: HeartRateDisplayProps) {
  const { isConnected, isConnecting, bpm, error, deviceName, connect, disconnect } = useBluetoothHR();
  const { isSupported: wakeLockSupported, isActive: wakeLockActive, request: requestWakeLock } = useWakeLock();
  const lastSentRef = useRef<number>(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  const zone = bpm > 0 ? calculateZone(bpm, profile.max_hr) : 0;
  const hrPercentage = bpm > 0 ? calculateHRPercentage(bpm, profile.max_hr) : 0;
  const zoneInfo = zone > 0 ? getZoneInfo(zone) : null;

  const sendHeartRateData = useCallback(async () => {
    if (bpm <= 0) return;

    const now = Date.now();
    if (now - lastSentRef.current < 2000) return; // Send every 2 seconds
    lastSentRef.current = now;

    try {
      await supabase.from('live_hr').insert({
        profile_id: profile.id,
        bpm,
        zone,
        hr_percentage: hrPercentage,
      });
      setLastSyncTime(new Date());
    } catch (error) {
      console.error('Error sending heart rate data:', error);
    }
  }, [bpm, zone, hrPercentage, profile.id]);

  useEffect(() => {
    if (isConnected && bpm > 0) {
      sendHeartRateData();
    }
  }, [isConnected, bpm, sendHeartRateData]);

  useEffect(() => {
    if (isConnected && wakeLockSupported) {
      requestWakeLock();
    }
  }, [isConnected, wakeLockSupported, requestWakeLock]);

  // Send heartbeat every 2 seconds while connected
  useEffect(() => {
    if (!isConnected) return;
    
    const interval = setInterval(() => {
      if (bpm > 0) {
        sendHeartRateData();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isConnected, bpm, sendHeartRateData]);

  return (
    <div className={`min-h-screen flex flex-col transition-all duration-500 ${zone > 0 ? getZoneBgClass(zone) : 'bg-background'}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-background/80 backdrop-blur-sm">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="text-center">
          <div className="font-semibold">{profile.name}</div>
          <div className="text-xs text-muted-foreground">Max HR: {profile.max_hr} bpm</div>
        </div>
        <div className="w-10" />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {isConnected && bpm > 0 ? (
          <div className="text-center">
            {/* BPM Display */}
            <div className="relative mb-4">
              <Heart 
                className={`w-32 h-32 mx-auto text-white drop-shadow-2xl ${bpm > 0 ? 'animate-heartbeat' : ''}`}
                fill="currentColor"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-4xl font-bold text-background">{bpm}</span>
              </div>
            </div>
            
            <div className="text-6xl font-bold text-white mb-2 neon-text">
              {bpm} <span className="text-2xl font-normal">bpm</span>
            </div>
            
            <div className="text-2xl text-white/90 mb-4">
              {hrPercentage}% HRmax
            </div>

            {zoneInfo && (
              <div className="inline-block px-6 py-3 rounded-full bg-white/20 backdrop-blur-sm">
                <div className="text-lg font-semibold text-white">Zone {zone}</div>
                <div className="text-sm text-white/80">{zoneInfo.name}</div>
              </div>
            )}

            {/* Device Info */}
            <div className="mt-8 text-white/60 text-sm">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Bluetooth className="w-4 h-4" />
                {deviceName}
              </div>
              {wakeLockActive && (
                <div className="flex items-center justify-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  Display bleibt aktiv
                </div>
              )}
            </div>
          </div>
        ) : (
          <Card className="p-8 text-center max-w-sm mx-auto glass">
            {isConnecting ? (
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
                  <Bluetooth className="w-8 h-8 text-primary" />
                </div>
                <p className="text-muted-foreground">Verbinde mit Herzfrequenz-Monitor...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
                  <Heart className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-xl font-semibold">Herzfrequenz-Monitor verbinden</h2>
                <p className="text-muted-foreground text-sm">
                  Verbinde deinen Bluetooth Herzfrequenz-Brustgurt um dein Training zu starten.
                </p>
                {error && (
                  <p className="text-destructive text-sm">{error}</p>
                )}
                <Button className="w-full gap-2" onClick={connect}>
                  <Bluetooth className="w-4 h-4" />
                  Verbinden
                </Button>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Footer */}
      {isConnected && (
        <div className="p-4 bg-background/80 backdrop-blur-sm">
          <Button 
            variant="outline" 
            className="w-full gap-2"
            onClick={disconnect}
          >
            <BluetoothOff className="w-4 h-4" />
            Verbindung trennen
          </Button>
          {lastSyncTime && (
            <p className="text-center text-xs text-muted-foreground mt-2">
              Letzte Sync: {lastSyncTime.toLocaleTimeString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
