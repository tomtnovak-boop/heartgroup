import { useState, useMemo } from 'react';
import { useLiveHR } from '@/hooks/useLiveHR';
import { ZoneColumn } from './ZoneColumn';
import { TeamStats } from './TeamStats';
import { CustomerList } from '@/components/admin/CustomerList';
import { Heart, RefreshCw, Users, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Header + stats + footer ≈ 160px
const CHROME_HEIGHT = 160;

export function CoachDashboard() {
  const { participants, averageBPM, averageZone, isLoading, refresh } = useLiveHR();
  const [activeTab, setActiveTab] = useState<string>('live');

  const { zoneGroups, heroProfileId, maxPerZone, tileSize } = useMemo(() => {
    const groups: Record<number, typeof participants> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    let heroId: string | undefined;
    let heroMaxBpm = 0;

    participants.forEach((p) => {
      const z = Math.min(Math.max(p.zone, 1), 5);
      groups[z].push(p);
      if (z === 5 && p.bpm > heroMaxBpm) {
        heroMaxBpm = p.bpm;
        heroId = p.profile_id;
      }
    });

    const maxCount = Math.max(1, ...Object.values(groups).map((g) => g.length));

    // Calculate tile size to fit all in viewport
    const availableHeight = (typeof window !== 'undefined' ? window.innerHeight : 800) - CHROME_HEIGHT;
    // Each tile height = size * 1.15 + gap(2px)
    const calculatedSize = Math.floor((availableHeight - maxCount * 2) / (maxCount * 1.15));
    const size = Math.min(72, Math.max(40, calculatedSize));

    return { zoneGroups: groups, heroProfileId: heroId, maxPerZone: maxCount, tileSize: size };
  }, [participants]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: '#0a0a0a' }}>
        <div className="text-center">
          <Heart className="w-16 h-16 mx-auto text-primary animate-pulse mb-4" />
          <p className="text-muted-foreground">Lade Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col" style={{ background: '#0a0a0a' }}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="flex items-center justify-between px-6 pt-4 pb-2">
          <TabsList>
            <TabsTrigger value="live" className="gap-2">
              <Activity className="w-4 h-4" />
              Live Training
            </TabsTrigger>
            <TabsTrigger value="customers" className="gap-2">
              <Users className="w-4 h-4" />
              Kunden verwalten
            </TabsTrigger>
          </TabsList>
          {activeTab === 'live' && (
            <Button variant="outline" size="icon" onClick={refresh}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          )}
        </div>

        <TabsContent value="live" className="flex-1 flex flex-col mt-0 px-6 pb-2">
          <TeamStats
            participantCount={participants.length}
            averageBPM={averageBPM}
            averageZone={averageZone}
          />

          <div className="flex-1 mt-2 grid grid-cols-5 gap-2 min-h-0">
            {[1, 2, 3, 4, 5].map((zone) => (
              <ZoneColumn
                key={zone}
                zone={zone}
                participants={zoneGroups[zone]}
                heroProfileId={heroProfileId}
                tileSize={tileSize}
              />
            ))}
          </div>

          <div className="text-center text-[10px] text-white/25 mt-1">
            Echtzeit-Aktualisierung • Inaktive Teilnehmer werden nach 30s ausgeblendet
          </div>
        </TabsContent>

        <TabsContent value="customers" className="flex-1 mt-0 px-6">
          <CustomerList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
