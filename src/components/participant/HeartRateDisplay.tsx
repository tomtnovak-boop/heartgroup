import { useEffect, useRef, useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useBluetoothHR } from '@/hooks/useBluetoothHR';
import { useWakeLock } from '@/hooks/useWakeLock';
import { supabase } from '@/integrations/supabase/client';
import { calculateZone, calculateHRPercentage, getZoneInfo, getZoneBgClass } from '@/lib/heartRateUtils';
import { enableNoSleep, disableNoSleep, isIOS, isSafari } from '@/lib/noSleep';
import { Bluetooth, BluetoothOff, Heart, ArrowLeft, Smartphone, AlertTriangle } from 'lucide-react';

interface Profile {
  id: string;
  name: string;
  age: number;
  max_hr: number;
  custom_max_hr?: number | null;
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
  const [showStartButton, setShowStartButton] = useState(true);
  const [browserWarning, setBrowserWarning] = useState<string | null>(null);

  // Use custom max HR if set, otherwise calculated
  const effectiveMaxHr = profile.custom_max_hr || profile.max_hr;
  const zone = bpm > 0 ? calculateZone(bpm, effectiveMaxHr) : 0;
  const hrPercentage = bpm > 0 ? calculateHRPercentage(bpm, effectiveMaxHr) : 0;
  const zoneInfo = zone > 0 ? getZoneInfo(zone) : null;

  // Check browser compatibility on mount
  useEffect(() => {
    if (isSafari() || isIOS()) {
      if (!('bluetooth' in navigator)) {
        setBrowserWarning(
          'Web Bluetooth wird von Safari/iOS nicht unterstützt. ' +
          'Bitte nutze Chrome auf Android oder den "Bluefy" Browser auf iOS.'
        );
      }
    }
  }, []);

  const sendHeartRateData = useCallback(async () => {
    if (bpm <= 0) return;

    const now = Date.now();
    if (now - lastSentRef.current < 2000) return;
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

  // Request wake lock when connected
  useEffect(() => {
    if (isConnected) {
      // Try native Wake Lock API first
      if (wakeLockSupported) {
        requestWakeLock();
      }
      // Use NoSleep.js as fallback for iOS
      if (isIOS() || !wakeLockSupported) {
        enableNoSleep();
      }
    }

    return () => {
      disableNoSleep();
    };
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

  const handleStartTraining = async () => {
    setShowStartButton(false);
    // Enable NoSleep before Bluetooth (requires user interaction)
    if (isIOS() || !wakeLockSupported) {
      enableNoSleep();
    }
    await connect();
  };

  return (
    <div className={`min-h-screen flex flex-col transition-all duration-500 ${zone > 0 ? getZoneBgClass(zone) : 'bg-background'}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-background/80 backdrop-blur-sm">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="text-center">
          <div className="font-semibold">{profile.name}</div>
          <div className="text-xs text-muted-foreground">Max HR: {effectiveMaxHr} bpm</div>
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
              {(wakeLockActive || isIOS()) && (
                <div className="flex items-center justify-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  Display bleibt aktiv
                </div>
              )}
            </div>
          </div>
        ) : (
          <Card className="p-8 text-center max-w-sm mx-auto glass">
            {browserWarning ? (
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-destructive/20 flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-destructive" />
                </div>
                <h2 className="text-xl font-semibold">Browser nicht unterstützt</h2>
                <p className="text-muted-foreground text-sm">{browserWarning}</p>
                <div className="text-left text-sm space-y-2 pt-4 border-t">
                  <p className="font-medium">Alternativen:</p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>Chrome auf Android-Geräten</li>
                    <li>"Bluefy" Browser auf iOS (App Store)</li>
                    <li>Edge oder Chrome auf Windows/Mac</li>
                  </ul>
                </div>
              </div>
            ) : isConnecting ? (
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
                  <Bluetooth className="w-8 h-8 text-primary" />
                </div>
                <p className="text-muted-foreground">Verbinde mit Herzfrequenz-Monitor...</p>
              </div>
            ) : showStartButton ? (
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
                  <Heart className="w-8 h-8 text-primary" fill="currentColor" />
                </div>
                <h2 className="text-xl font-semibold">Bereit für dein Training?</h2>
                <p className="text-muted-foreground text-sm">
                  Drücke den Button um deinen Herzfrequenz-Monitor zu verbinden und das Training zu starten.
                </p>
                <Button 
                  className="w-full gap-2 h-14 text-lg" 
                  size="lg"
                  onClick={handleStartTraining}
                >
                  <Heart className="w-5 h-5" fill="currentColor" />
                  Training starten
                </Button>
                <p className="text-xs text-muted-foreground">
                  Stelle sicher, dass dein Brustgurt angelegt und Bluetooth aktiviert ist.
                </p>
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
                  Erneut verbinden
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
