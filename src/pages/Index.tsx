import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, Monitor, Smartphone, Users, Activity, Zap, Loader2 } from 'lucide-react';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { useEffect } from 'react';

export default function Index() {
  const { user, isAuthenticated, isCoach, isAdmin, isLoading } = useAuthContext();
  const navigate = useNavigate();

  // Auto-redirect based on role
  useEffect(() => {
    if (isLoading || !isAuthenticated) return;

    // Admins see the choice screen (rendered below)
    if (isAdmin) return;

    // Coaches go straight to dashboard
    if (isCoach) {
      navigate('/dashboard', { replace: true });
      return;
    }

    // Participants go to their dashboard
    navigate('/participant', { replace: true });
  }, [isLoading, isAuthenticated, isCoach, isAdmin, navigate]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Heart className="w-12 h-12 text-primary animate-pulse" fill="currentColor" />
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  // Admin choice screen
  if (isAuthenticated && isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-6">
          <Heart className="w-8 h-8 text-primary" fill="currentColor" />
        </div>
        <h1 className="text-2xl font-bold mb-2">HR Training</h1>
        <p className="text-muted-foreground mb-8">Choose where to go</p>
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-lg">
          <Button
            size="lg"
            className="flex-1 gap-2"
            onClick={() => navigate('/participant')}
          >
            <Smartphone className="w-5 h-5" />
            My Training
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="flex-1 gap-2"
            onClick={() => navigate('/dashboard')}
          >
            <Monitor className="w-5 h-5" />
            Dashboard Fancy
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="flex-1 gap-2"
            onClick={() => navigate('/dashboard-neutral')}
          >
            <Monitor className="w-5 h-5" />
            Dashboard Neutral
          </Button>
        </div>
      </div>
    );
  }

  // Landing page for unauthenticated users
  return (
    <div className="min-h-screen bg-background">
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
            <Link to="/auth">
              <Button size="lg" className="gap-2">
                <Smartphone className="w-5 h-5" />Sign In / Register
              </Button>
            </Link>
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

      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Group HR Training • Powered by Web Bluetooth & Realtime Database</p>
        </div>
      </footer>
    </div>
  );
}
