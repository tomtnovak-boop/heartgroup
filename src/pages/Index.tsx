import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, Monitor, Smartphone, Users, Activity, Zap } from 'lucide-react';
import { AppHeader } from '@/components/layout/AppHeader';
import { useViewMode } from '@/hooks/useViewMode';
import { CoachDashboard } from '@/components/dashboard/CoachDashboard';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { useState, useCallback, useEffect } from 'react';
import { useLiveHR } from '@/hooks/useLiveHR';
import { useWorkoutSession } from '@/hooks/useWorkoutSession';
import { supabase } from '@/integrations/supabase/client';

export default function Index() {
  const { viewMode, changeView } = useViewMode('participant');
  const { user, isAuthenticated, isCoach } = useAuthContext();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('live');
  const [myProfileId, setMyProfileId] = useState<string | undefined>();

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    supabase.from('profiles').select('id').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => { if (data) setMyProfileId(data.id); });
  }, [isAuthenticated, user]);

  const { isActive: sessionActive, elapsedSeconds: sessionElapsed, startSession, stopSession, recordHRData } = useWorkoutSession();
  const onNewHRData = useCallback((data: { profile_id: string; bpm: number; zone: number; hr_percentage: number; timestamp: string }) => { recordHRData(data); }, [recordHRData]);
  const { participants, averageBPM, averageZone, isLoading, refresh } = useLiveHR(onNewHRData);

  if (viewMode === 'coach' && isCoach) {
    return (
      <div className="h-dvh bg-background flex flex-col overflow-hidden">
        <AppHeader currentView={viewMode} onViewChange={changeView} showViewSwitcher={isCoach} activeTab={activeTab} onTabChange={setActiveTab} onRefresh={refresh} stats={{ participantCount: participants.length, averageBPM, averageZone }} sessionActive={sessionActive} sessionElapsed={sessionElapsed} onStartSession={() => startSession(participants)} onStopSession={stopSession} />
        <div className="flex-1 min-h-0 overflow-hidden">
          <CoachDashboard participants={participants} isLoading={isLoading} activeTab={activeTab} selectedProfileId={myProfileId} averageBPM={averageBPM} isSessionActive={false} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader currentView={viewMode} onViewChange={changeView} showViewSwitcher={isCoach} />
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-background" />
        <div className="relative container mx-auto px-4 py-16 md:py-24">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/20 mb-6">
              <Heart className="w-10 h-10 text-primary animate-heartbeat" fill="currentColor" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Group Heart Rate Training</h1>
            <p className="text-xl text-muted-foreground mb-8">
              Real-time heart rate monitoring for group training. Connect Bluetooth chest straps and visualize the intensity of all participants on a big screen.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {isAuthenticated ? (
                <Button size="lg" className="w-full sm:w-auto gap-2" onClick={() => navigate('/participant')}><Smartphone className="w-5 h-5" />Go to Training</Button>
              ) : (
                <Link to="/auth"><Button size="lg" className="w-full sm:w-auto gap-2"><Smartphone className="w-5 h-5" />Sign In / Register</Button></Link>
              )}
              {isCoach && (
                <Button size="lg" variant="outline" className="w-full sm:w-auto gap-2" onClick={() => changeView('coach')}><Monitor className="w-5 h-5" />Coach Dashboard</Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-center mb-12">Features</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="glass">
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-zone-2/20 flex items-center justify-center mb-2"><Activity className="w-6 h-6 text-zone-2" /></div>
              <CardTitle>5 Heart Rate Zones</CardTitle>
              <CardDescription>Automatic zone calculation based on age and maximum heart rate</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full zone-1-bg" /><span>Zone 1: Recovery (&lt;60%)</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full zone-2-bg" /><span>Zone 2: Fat Burn (60-70%)</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full zone-3-bg" /><span>Zone 3: Aerobic (70-80%)</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full zone-4-bg" /><span>Zone 4: Cardio (80-90%)</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full zone-5-bg" /><span>Zone 5: Max Effort (&gt;90%)</span></div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-2"><Users className="w-6 h-6 text-primary" /></div>
              <CardTitle>Live Dashboard</CardTitle>
              <CardDescription>Up to 20 participants simultaneously as pulsing bubbles on a big screen</CardDescription>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              <ul className="space-y-2">
                <li>• Real-time heart rate updates</li>
                <li>• Color-coded zones for quick overview</li>
                <li>• Heartbeat animation for visual feedback</li>
                <li>• Larger bubbles for higher zones</li>
                <li>• Team averages in real-time</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-zone-4/20 flex items-center justify-center mb-2"><Zap className="w-6 h-6 text-zone-4" /></div>
              <CardTitle>Web Bluetooth</CardTitle>
              <CardDescription>Direct connection to heart rate chest straps without additional apps</CardDescription>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              <ul className="space-y-2">
                <li>• Compatible with all BLE HR monitors</li>
                <li>• Screen Wake Lock keeps display active</li>
                <li>• Data synced every 2 seconds</li>
                <li>• Works with Chrome, Edge, Opera</li>
                <li>• Mobile-optimized PWA view</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-center mb-12">How It Works</h2>
        <div className="grid md:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center mb-4 text-2xl font-bold text-primary">1</div>
            <h3 className="font-semibold mb-2">Create Profile</h3>
            <p className="text-sm text-muted-foreground">Participants enter name and age</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center mb-4 text-2xl font-bold text-primary">2</div>
            <h3 className="font-semibold mb-2">Connect HR Monitor</h3>
            <p className="text-sm text-muted-foreground">Pair Bluetooth chest strap via Web Bluetooth</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center mb-4 text-2xl font-bold text-primary">3</div>
            <h3 className="font-semibold mb-2">Start Training</h3>
            <p className="text-sm text-muted-foreground">Heart rate is sent live to the server</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center mb-4 text-2xl font-bold text-primary">4</div>
            <h3 className="font-semibold mb-2">Open Dashboard</h3>
            <p className="text-sm text-muted-foreground">Coach sees all participants in real-time</p>
          </div>
        </div>
      </div>

      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Group HR Training • Powered by Web Bluetooth & Realtime Database</p>
        </div>
      </footer>
    </div>
  );
}
