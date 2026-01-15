import { useState } from 'react';
import { useLiveHR } from '@/hooks/useLiveHR';
import { ParticipantBubble } from './ParticipantBubble';
import { TeamStats } from './TeamStats';
import { CustomerList } from '@/components/admin/CustomerList';
import { Heart, RefreshCw, Users, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function CoachDashboard() {
  const { participants, averageBPM, averageZone, isLoading, refresh } = useLiveHR();
  const [activeTab, setActiveTab] = useState<string>('live');

  if (isLoading) {
    return (
      <div className="flex-1 bg-background flex items-center justify-center">
        <div className="text-center">
          <Heart className="w-16 h-16 mx-auto text-primary animate-pulse mb-4" />
          <p className="text-muted-foreground">Lade Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-background flex flex-col p-6">
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-6">
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

        {/* Live Training Tab */}
        <TabsContent value="live" className="flex-1 flex flex-col mt-0">
          {/* Team Stats Bar */}
          <TeamStats
            participantCount={participants.length}
            averageBPM={averageBPM}
            averageZone={averageZone}
          />

          {/* Participants Grid */}
          <div className="flex-1 mt-6 relative">
            {participants.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="w-24 h-24 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
                    <Heart className="w-12 h-12 text-muted-foreground" />
                  </div>
                  <h2 className="text-xl font-semibold mb-2">Keine aktiven Teilnehmer</h2>
                  <p className="text-muted-foreground max-w-md">
                    Sobald sich Teilnehmer mit ihrem Herzfrequenz-Monitor verbinden, 
                    erscheinen sie hier als Live-Bubbles.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-6 justify-center items-center content-center min-h-[400px]">
                {participants.map((participant, index) => (
                  <ParticipantBubble
                    key={participant.profile_id}
                    data={participant}
                    index={index}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="text-center text-sm text-muted-foreground mt-4">
            Daten werden in Echtzeit aktualisiert • Inaktive Teilnehmer werden nach 30 Sekunden ausgeblendet
          </div>
        </TabsContent>

        {/* Customers Tab */}
        <TabsContent value="customers" className="flex-1 mt-0">
          <CustomerList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
