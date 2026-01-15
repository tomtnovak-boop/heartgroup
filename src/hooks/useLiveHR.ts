import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface LiveHRData {
  id: string;
  profile_id: string;
  bpm: number;
  zone: number;
  hr_percentage: number;
  timestamp: string;
  profile?: {
    id: string;
    name: string;
    age: number;
    max_hr: number;
  };
}

export function useLiveHR() {
  const [participants, setParticipants] = useState<Map<string, LiveHRData>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  const fetchLatestData = useCallback(async () => {
    try {
      // Get profiles with their latest heart rate data
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (profilesError) throw profilesError;

      // Get latest HR data for each profile
      const { data: liveData, error: liveError } = await supabase
        .from('live_hr')
        .select('*')
        .order('timestamp', { ascending: false });

      if (liveError) throw liveError;

      // Create map with latest data per profile
      const latestByProfile = new Map<string, LiveHRData>();
      
      if (liveData && profiles) {
        // Get latest entry per profile
        const latestEntries = new Map<string, typeof liveData[0]>();
        liveData.forEach(entry => {
          if (!latestEntries.has(entry.profile_id) || 
              new Date(entry.timestamp) > new Date(latestEntries.get(entry.profile_id)!.timestamp)) {
            latestEntries.set(entry.profile_id, entry);
          }
        });

        // Only include entries from the last 30 seconds (active participants)
        const thirtySecondsAgo = new Date(Date.now() - 30000);
        
        latestEntries.forEach((entry, profileId) => {
          if (new Date(entry.timestamp) > thirtySecondsAgo) {
            const profile = profiles.find(p => p.id === profileId);
            if (profile) {
              latestByProfile.set(profileId, {
                ...entry,
                hr_percentage: Number(entry.hr_percentage),
                profile: {
                  id: profile.id,
                  name: profile.name,
                  age: profile.age,
                  max_hr: profile.max_hr,
                },
              });
            }
          }
        });
      }

      setParticipants(latestByProfile);
    } catch (error) {
      console.error('Error fetching live HR data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLatestData();

    // Set up realtime subscription
    const channel: RealtimeChannel = supabase
      .channel('live_hr_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_hr',
        },
        async (payload) => {
          const newData = payload.new as {
            id: string;
            profile_id: string;
            bpm: number;
            zone: number;
            hr_percentage: string | number;
            timestamp: string;
          };
          
          // Fetch profile data for this entry
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', newData.profile_id)
            .single();

          if (profile) {
            setParticipants(prev => {
              const updated = new Map(prev);
              updated.set(newData.profile_id, {
                id: newData.id,
                profile_id: newData.profile_id,
                bpm: newData.bpm,
                zone: newData.zone,
                hr_percentage: Number(newData.hr_percentage),
                timestamp: newData.timestamp,
                profile: {
                  id: profile.id,
                  name: profile.name,
                  age: profile.age,
                  max_hr: profile.max_hr,
                },
              });
              return updated;
            });
          }
        }
      )
      .subscribe();

    // Cleanup stale participants every 10 seconds
    const cleanupInterval = setInterval(() => {
      const thirtySecondsAgo = new Date(Date.now() - 30000);
      setParticipants(prev => {
        const updated = new Map(prev);
        updated.forEach((value, key) => {
          if (new Date(value.timestamp) < thirtySecondsAgo) {
            updated.delete(key);
          }
        });
        return updated;
      });
    }, 10000);

    return () => {
      channel.unsubscribe();
      clearInterval(cleanupInterval);
    };
  }, [fetchLatestData]);

  const participantsList = Array.from(participants.values());
  
  const averageBPM = participantsList.length > 0
    ? Math.round(participantsList.reduce((sum, p) => sum + p.bpm, 0) / participantsList.length)
    : 0;

  const averageZone = participantsList.length > 0
    ? Math.round(participantsList.reduce((sum, p) => sum + p.zone, 0) / participantsList.length)
    : 0;

  return {
    participants: participantsList,
    averageBPM,
    averageZone,
    isLoading,
    refresh: fetchLatestData,
  };
}
