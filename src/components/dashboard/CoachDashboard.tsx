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

  const ZONE_GLOW_POSITIONS = [
    { left: '10%', color: ZONE_COLORS[1] },
    { left: '30%', color: ZONE_COLORS[2] },
    { left: '50%', color: ZONE_COLORS[3] },
    { left: '70%', color: ZONE_COLORS[4] },
    { left: '90%', color: ZONE_COLORS[5] },
  ];

  return (
    <div
      className="relative h-full flex flex-col px-4 pt-1 pb-0 min-h-0 overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at 50% 40%, #0d0d1a 0%, #050510 50%, #000000 100%)',
      }}
    >
      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
          maskImage: 'radial-gradient(ellipse at 50% 50%, black 30%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse at 50% 50%, black 30%, transparent 80%)',
        }}
      />

      {/* Ambient zone glow blobs */}
      {ZONE_GLOW_POSITIONS.map((g, i) => (
        <div
          key={i}
          className="absolute pointer-events-none"
          style={{
            left: g.left,
            top: '45%',
            transform: 'translate(-50%, -50%)',
            width: '300px',
            height: '400px',
            borderRadius: '50%',
            background: g.color,
            opacity: 0.055,
            filter: 'blur(250px)',
          }}
        />
      ))}

      {/* Content */}
      <div className="relative flex-1 grid grid-cols-5 gap-2 min-h-0 overflow-hidden z-10">
        {[1, 2, 3, 4, 5].map((zone) => (
          <ZoneColumn
            key={zone}
            zone={zone}
            participants={zoneGroups[zone]}
            selectedProfileId={selectedProfileId}
          />
        ))}
      </div>
      <div className="absolute bottom-0 left-0 right-0 grid grid-cols-5 gap-2 px-4 py-1 z-10" style={{ background: 'linear-gradient(to top, #000000 60%, transparent)' }}>
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
