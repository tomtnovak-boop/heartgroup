import { useMemo } from 'react';
import { ZoneColumn } from './ZoneColumn';
import { CustomerList } from '@/components/admin/CustomerList';
import { Heart } from 'lucide-react';
import { LiveHRData } from '@/hooks/useLiveHR';

interface CoachDashboardProps {
  participants: LiveHRData[];
  isLoading: boolean;
  activeTab: string;
  selectedProfileId?: string;
}

export function CoachDashboard({ participants, isLoading, activeTab, selectedProfileId }: CoachDashboardProps) {
  const zoneGroups = useMemo(() => {
    const groups: Record<number, LiveHRData[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    participants.forEach((p) => {
      const z = Math.min(Math.max(p.zone, 1), 5);
      groups[z].push(p);
    });
    return groups;
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

  if (activeTab === 'customers') {
    return (
      <div className="flex-1 px-4 pt-2 min-h-0 overflow-y-auto" style={{ background: '#0a0a0a' }}>
        <CustomerList />
      </div>
    );
  }

  const ZONE_COLORS: Record<number, string> = {
    1: '#4fc3f7', 2: '#66bb6a', 3: '#fdd835', 4: '#ff9800', 5: '#e53935',
  };

  return (
    <div className="relative h-full flex flex-col px-4 pt-1 pb-0 min-h-0 overflow-hidden" style={{ background: '#0a0a0a' }}>
      <div className="flex-1 grid grid-cols-5 gap-2 min-h-0 overflow-hidden">
        {[1, 2, 3, 4, 5].map((zone) => (
          <ZoneColumn
            key={zone}
            zone={zone}
            participants={zoneGroups[zone]}
            selectedProfileId={selectedProfileId}
          />
        ))}
      </div>
      <div className="absolute bottom-0 left-0 right-0 grid grid-cols-5 gap-2 px-4 py-1" style={{ background: '#0a0a0a' }}>
        {[1, 2, 3, 4, 5].map((zone) => (
          <div key={zone} className="flex justify-center">
            <div
              className="text-[10px] font-bold rounded-full px-2 py-0.5"
              style={{
                color: ZONE_COLORS[zone],
                background: `${ZONE_COLORS[zone]}12`,
                border: `1px solid ${ZONE_COLORS[zone]}22`,
              }}
            >
              {zoneGroups[zone].length}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
