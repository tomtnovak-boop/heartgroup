import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { getEffectiveMaxHR, calculateZone, calculateHRPercentage } from '@/lib/heartRateUtils';

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
    nickname?: string | null;
    age: number;
    max_hr: number;
    custom_max_hr?: number | null;
  };
}

export function useLiveHR(onNewData?: (data: { profile_id: string; bpm: number; zone: number; hr_percentage: number; timestamp: string }) => void) {
  const [participants, setParticipants] = useState<Map<string, LiveHRData>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const profileCacheRef = useRef<Map<string, any>>(new Map());

  const loadProfiles = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('*');
    if (data) {
      data.forEach(p => profileCacheRef.current.set(p.id, p));
    }
  }, []);

  const fetchLatestData = useCallback(async () => {
    try {
      // Ensure profile cache is populated
      if (profileCacheRef.current.size === 0) {
        await loadProfiles();
      }

      // Get latest HR data for each profile
      const { data: liveData, error: liveError } = await supabase
        .from('live_hr')
        .select('*')
        .order('timestamp', { ascending: false });

      if (liveError) throw liveError;

      // Create map with latest data per profile
      const latestByProfile = new Map<string, LiveHRData>();
      
      if (liveData) {
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
            const profile = profileCacheRef.current.get(profileId);
            if (profile) {
              const effectiveMaxHR = getEffectiveMaxHR(profile.age, profile.custom_max_hr);
              const recalcZone = calculateZone(entry.bpm, effectiveMaxHR);
              const recalcHRPct = calculateHRPercentage(entry.bpm, effectiveMaxHR);
              latestByProfile.set(profileId, {
                ...entry,
                zone: recalcZone,
                hr_percentage: recalcHRPct,
                profile: {
                  id: profile.id,
                  name: profile.name,
                  nickname: profile.nickname,
                  age: profile.age,
                  max_hr: effectiveMaxHR,
                  custom_max_hr: profile.custom_max_hr,
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
  }, [loadProfiles]);

  useEffect(() => {
    void loadProfiles();
    void fetchLatestData();

    // Set up realtime subscription
    const channel: RealtimeChannel = supabase
      .channel('live_hr_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_hr',
        },
        async (payload) => {
          console.log('[coach] live_hr update received:', payload.eventType, payload.new);
          const newData = payload.new as {
            id: string;
            profile_id: string;
            bpm: number;
            zone: number;
            hr_percentage: string | number;
            timestamp: string;
          };
          
          // Use cached profile instead of DB query
          let profile = profileCacheRef.current.get(newData.profile_id);
          if (!profile) {
            // Not in cache — fetch and cache it
            const { data } = await supabase.from('profiles').select('*').eq('id', newData.profile_id).single();
            if (data) {
              profileCacheRef.current.set(data.id, data);
              profile = data;
            }
          }

          if (profile) {
            const effectiveMaxHR = getEffectiveMaxHR(profile.age, profile.custom_max_hr);
            const recalcZone = calculateZone(newData.bpm, effectiveMaxHR);
            const recalcHRPct = calculateHRPercentage(newData.bpm, effectiveMaxHR);
            setParticipants(prev => {
              const updated = new Map(prev);
              updated.set(newData.profile_id, {
                id: newData.id,
                profile_id: newData.profile_id,
                bpm: newData.bpm,
                zone: recalcZone,
                hr_percentage: recalcHRPct,
                timestamp: newData.timestamp,
                profile: {
                  id: profile.id,
                  name: profile.name,
                  nickname: profile.nickname,
                  age: profile.age,
                  max_hr: effectiveMaxHR,
                  custom_max_hr: profile.custom_max_hr,
                },
              });
              return updated;
            });

            // Notify session recorder
            onNewData?.({
              profile_id: newData.profile_id,
              bpm: newData.bpm,
              zone: recalcZone,
              hr_percentage: recalcHRPct,
              timestamp: newData.timestamp,
            });
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[useLiveHR] Realtime connected');
        }
        if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          console.log('[useLiveHR] Realtime disconnected — refetching data');
          void fetchLatestData();
        }
      });

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
  }, [fetchLatestData, loadProfiles]);

  const participantsList = Array.from(participants.values());
  
  const averageBPM = participantsList.length > 0
    ? Math.round(participantsList.reduce((sum, p) => sum + p.bpm, 0) / participantsList.length)
    : 0;

  const lowestBPM = participantsList.length > 0
    ? Math.min(...participantsList.map(p => p.bpm))
    : 0;

  const highestBPM = participantsList.length > 0
    ? Math.max(...participantsList.map(p => p.bpm))
    : 0;

  const averageZone = participantsList.length > 0
    ? Math.round(participantsList.reduce((sum, p) => sum + p.zone, 0) / participantsList.length)
    : 0;

  return {
    participants: participantsList,
    averageBPM,
    lowestBPM,
    highestBPM,
    averageZone,
    isLoading,
    refresh: fetchLatestData,
  };
}
