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
      <div className="flex-1 px-4 pt-2" style={{ background: '#0a0a0a' }}>
        <CustomerList />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col px-4 pt-1 pb-1" style={{ background: '#0a0a0a' }}>
      <div className="flex-1 grid grid-cols-5 gap-2 min-h-0">
        {[1, 2, 3, 4, 5].map((zone) => (
          <ZoneColumn
            key={zone}
            zone={zone}
            participants={zoneGroups[zone]}
            selectedProfileId={selectedProfileId}
          />
        ))}
      </div>
    </div>
  );
}
