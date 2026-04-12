import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, LogOut, Play, Square, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  getEffectiveAge,
  getEffectiveMaxHR,
  calculateZone,
  calculateHRPercentage,
} from '@/lib/heartRateUtils';

const ZONE_COLORS = ['', '#9CA3AF', '#00BFFF', '#22C55E', '#F59E0B', '#EF4444'];

function genCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

interface SessionRow {
  id: string;
  session_code: string;
  created_by: string;
  started_at: string;
  ended_at: string | null;
}

interface LiveParticipant {
  profile_id: string;
  bpm: number;
  zone: number;
  hr_percentage: number;
  name: string;
  birth_date: string | null;
  custom_max_hr: number | null;
  age: number;
}

export default function CoachDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [coachName, setCoachName] = useState('');
  const [session, setSession] = useState<SessionRow | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [displayMode, setDisplayMode] = useState<'fancy' | 'neutral'>('fancy');

  // stats
  const [lobbyCount, setLobbyCount] = useState(0);
  const [lobbyProfileIds, setLobbyProfileIds] = useState<string[]>([]);
  const [participants, setParticipants] = useState<LiveParticipant[]>([]);

  // timer
  const [durMin, setDurMin] = useState(0);
  const [remainSec, setRemainSec] = useState(-1); // -1 = no timer
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const avgBpm = useMemo(() => {
    if (!isRunning || participants.length === 0) return null;
    return Math.round(participants.reduce((s, p) => s + p.bpm, 0) / participants.length);
  }, [participants, isRunning]);

  // ── fetch coach name & current session on mount ──
  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('name').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => { if (data?.name) setCoachName(data.name); });

    supabase.from('active_sessions').select('*')
      .is('ended_at', null)
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
      .then(({ data }) => {
        if (data) {
          if (/^\d{4}$/.test(data.session_code)) {
            setSession(data as SessionRow);
            const diff = new Date(data.started_at).getTime() - new Date(data.created_at).getTime();
            if (diff > 2000) setIsRunning(true);
            // Restore timer from auto_end_at
            const autoEnd = (data as any).auto_end_at;
            if (autoEnd && diff > 2000) {
              const remaining = Math.max(0, Math.round((new Date(autoEnd).getTime() - Date.now()) / 1000));
              if (remaining > 0) {
                setRemainSec(remaining);
              } else {
                // Timer already expired — auto-stop
                setRemainSec(-1);
              }
            }
          }
        }
      });
  }, [user]);

  // ── realtime sync of active_sessions (FIX 3) ──
  useEffect(() => {
    if (!user) return;

    const chan = supabase.channel('cd-session-sync')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'active_sessions',
      }, (payload: any) => {
        const row = payload.new;
        if (!row) return;
        if (!row.ended_at) {
          console.log('[CoachDashboard] realtime session update:', row.session_code);
          setSession(row as SessionRow);
          const diff = new Date(row.started_at).getTime() - new Date(row.created_at).getTime();
          setIsRunning(diff > 2000);
          // Sync timer from auto_end_at
          const autoEnd = (row as any).auto_end_at;
          if (autoEnd && diff > 2000) {
            const remaining = Math.max(0, Math.round((new Date(autoEnd).getTime() - Date.now()) / 1000));
            if (remaining > 0) {
              setRemainSec(remaining);
            } else {
              setRemainSec(-1);
            }
          }
        } else {
          console.log('[CoachDashboard] realtime session ended');
          setSession(null);
          setIsRunning(false);
          setRemainSec(-1);
          setParticipants([]);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(chan); };
  }, [user]);

  // ── subscribe to session_lobby count ──
  useEffect(() => {
    if (!session) { setLobbyCount(0); setLobbyProfileIds([]); return; }
    const code = session.session_code;

    const fetchLobby = async () => {
      const { data } = await supabase.from('session_lobby').select('profile_id').eq('session_code', code);
      const ids = (data || []).map(r => r.profile_id);
      setLobbyProfileIds(ids);
      setLobbyCount(ids.length);
    };
    fetchLobby();

    const chan = supabase.channel('cd-lobby-' + code)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'session_lobby' }, () => fetchLobby())
      .subscribe();

    return () => { supabase.removeChannel(chan); };
  }, [session?.session_code]);

  // ── subscribe to live_hr for participant list ──
  useEffect(() => {
    if (!isRunning || lobbyProfileIds.length === 0) { setParticipants([]); return; }

    const fetchLive = async () => {
      const { data: hrRows } = await supabase.from('live_hr').select('profile_id, bpm, zone, hr_percentage')
        .in('profile_id', lobbyProfileIds);
      if (!hrRows || hrRows.length === 0) { setParticipants([]); return; }

      const pids = hrRows.map(r => r.profile_id);
      const { data: profiles } = await supabase.from('profiles').select('id, name, birth_date, custom_max_hr, age')
        .in('id', pids);
      const profMap = new Map((profiles || []).map(p => [p.id, p]));

      const merged: LiveParticipant[] = hrRows.map(hr => {
        const prof = profMap.get(hr.profile_id);
        const age = prof ? getEffectiveAge(prof.birth_date, prof.age) : 30;
        const maxHR = prof ? getEffectiveMaxHR(age, prof.custom_max_hr) : 178;
        const zone = calculateZone(hr.bpm, maxHR);
        const hrPct = calculateHRPercentage(hr.bpm, maxHR);
        return {
          profile_id: hr.profile_id,
          bpm: hr.bpm,
          zone,
          hr_percentage: hrPct,
          name: prof?.name || '…',
          birth_date: prof?.birth_date ?? null,
          custom_max_hr: prof?.custom_max_hr ?? null,
          age,
        };
      });
      setParticipants(merged);
    };
    fetchLive();

    const chan = supabase.channel('cd-live-hr')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_hr' }, () => fetchLive())
      .subscribe();

    return () => { supabase.removeChannel(chan); };
  }, [isRunning, lobbyProfileIds]);

  // ── timer tick ──
  useEffect(() => {
    if (remainSec <= 0) return;
    timerRef.current = setInterval(() => {
      setRemainSec(prev => {
        if (prev <= 1) { stopSession(); return -1; }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [remainSec > 0]);

  // ── cleanup stale participants while running ──
  useEffect(() => {
    if (!isRunning) return;
    const iv = setInterval(() => { supabase.functions.invoke('cleanup-stale-participants'); }, 15000);
    return () => clearInterval(iv);
  }, [isRunning]);

  const startSession = useCallback(async () => {
    if (!session || !user) return;
    const { error } = await supabase.from('active_sessions')
      .update({ started_at: new Date().toISOString() })
      .eq('id', session.id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    // Write auto_end_at if timer is set
    if (durMin > 0) {
      const autoEndAt = new Date(Date.now() + durMin * 60 * 1000).toISOString();
      await supabase.from('active_sessions')
        .update({ auto_end_at: autoEndAt } as any)
        .eq('id', session.id);
      console.log('[CoachDashboard] auto_end_at set to', autoEndAt);
    }
    setIsRunning(true);
    if (durMin > 0) setRemainSec(durMin * 60);
  }, [session, user, durMin, toast]);

  const stopSession = useCallback(async () => {
    if (!session) return;
    await supabase.from('active_sessions')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', session.id);
    setIsRunning(false);
    setRemainSec(-1);
    if (timerRef.current) clearInterval(timerRef.current);
    setParticipants([]);
    // keep session object but mark ended locally
    setSession(prev => prev ? { ...prev, ended_at: new Date().toISOString() } : null);
  }, [session]);

  const createNewSession = useCallback(async () => {
    if (!user) return;
    // Check for any existing active session globally first
    const { data: existing } = await supabase.from('active_sessions').select('*')
      .is('ended_at', null)
      .order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (existing && /^\d{4}$/.test(existing.session_code)) {
      setSession(existing as SessionRow);
      setIsRunning(false);
      setRemainSec(-1);
      setDurMin(0);
      toast({ title: `Reusing session: ${existing.session_code}` });
      return;
    }
    const code = genCode();
    const { data, error } = await supabase.from('active_sessions')
      .insert({ created_by: user.id, session_code: code })
      .select().single();
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    setSession(data as SessionRow);
    setIsRunning(false);
    setRemainSec(-1);
    setDurMin(0);
    toast({ title: `New session: ${code}` });
  }, [user, toast]);

  const handleExit = async () => { await signOut(); navigate('/'); };

  const initials = user?.email?.slice(0, 2).toUpperCase() || 'U';
  const sessionActive = session && !session.ended_at;

  const fmtTimer = (s: number) => {
    if (s < 0) return '—:——';
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const timerDisplay = isRunning && remainSec > 0
    ? remainSec
    : durMin > 0 ? durMin * 60 : -1;

  const sliderVal = Math.min(durMin, 60);
  const sliderPct = (sliderVal / 60) * 100;

  // ── RENDER ──
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', display: 'flex', flexDirection: 'column' }}>
      {/* ─── HEADER ─── */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid #1f1f1f', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(255,68,37,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Heart style={{ width: 13, height: 13, color: '#ff4425', fill: '#ff4425' }} />
          </div>
          <span style={{ fontWeight: 900, letterSpacing: '0.15em', textTransform: 'uppercase', fontSize: 13 }}>
            <span style={{ color: '#fff' }}>B</span><span style={{ color: '#ff4425' }}>heart</span>
          </span>
        </div>

        {/* session code pill */}
        <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 20, padding: '5px 14px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          <span style={{ color: '#aaa' }}>Code:</span>
          <span style={{ color: '#fff', fontWeight: 700 }}>{session?.session_code || '—'}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* coach pill */}
          <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 20, padding: '5px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#ff4425', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff' }}>{initials}</div>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{coachName.split(' ')[0] || ''}</span>
          </div>
          {/* exit */}
          <button onClick={handleExit} style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, padding: '6px 10px', color: '#aaa', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600 }}>
            <LogOut style={{ width: 14, height: 14 }} /> Exit
          </button>
        </div>
      </header>

      {/* ─── CONTENT ─── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', maxWidth: 480, width: '100%', margin: '0 auto' }}>

        {/* 2. DISPLAY MODE TOGGLE */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button onClick={() => setDisplayMode('fancy')} style={{
            flex: 1, padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700,
            background: displayMode === 'fancy' ? '#4f46e5' : '#1a1a2e',
            color: displayMode === 'fancy' ? '#fff' : '#818cf8',
          }}>✦ Fancy</button>
          <button onClick={() => setDisplayMode('neutral')} style={{
            flex: 1, padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700,
            background: displayMode === 'neutral' ? '#374151' : '#1a1a1a',
            color: displayMode === 'neutral' ? '#fff' : '#888',
          }}>◻ Neutral</button>
        </div>

        {/* 3. STAT CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
          <div style={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: 12, padding: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 900 }}>{lobbyCount}</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: sessionActive ? '#22c55e' : '#555' }} />
              <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#666' }}>Logged In</span>
            </div>
          </div>
          <div style={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: 12, padding: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 900 }}>{avgBpm ?? '—'}</div>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#666', marginTop: 4 }}>Avg. BPM</div>
          </div>
        </div>

        {/* 4. SESSION TIMER */}
        <div style={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: 12, padding: 14, marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#666' }}>
                Session Timer <span style={{ color: '#333', fontWeight: 400 }}>— optional</span>
              </div>
              <div style={{
                fontSize: 36, fontWeight: 900, fontVariantNumeric: 'tabular-nums', marginTop: 4,
                color: isRunning && remainSec > 0 ? '#ff4425' : timerDisplay >= 0 ? '#fff' : '#333',
              }}>
                {fmtTimer(timerDisplay)}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#666', marginBottom: 4 }}>Minutes</div>
              <input
                type="number"
                name="session-timer-minutes"
                autoComplete="off"
                inputMode="numeric"
                value={durMin || ''}
                onChange={e => { const v = Math.max(0, parseInt(e.target.value) || 0); setDurMin(v); }}
                disabled={isRunning}
                style={{
                  width: 64, textAlign: 'center', background: '#0a0a0a', border: '1px solid #333', borderRadius: 8,
                  color: '#fff', fontSize: 18, fontWeight: 700, padding: '6px 4px',
                  opacity: isRunning ? 0.3 : 1, pointerEvents: isRunning ? 'none' : 'auto',
                  WebkitAppearance: 'none', MozAppearance: 'textfield',
                } as React.CSSProperties}
              />
            </div>
          </div>

          {/* tick marks */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, marginBottom: 2, padding: '0 2px' }}>
            {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60].map(t => {
              const label = t === 0 ? '—' : String(t);
              const isActive = sliderVal === t || (sliderVal > 60 && t === 60);
              return <span key={t} style={{ fontSize: 9, color: isActive ? '#ff4425' : '#444', fontWeight: isActive ? 700 : 400, minWidth: 16, textAlign: 'center' }}>{label}</span>;
            })}
          </div>

          {/* range slider */}
          <div style={{ opacity: isRunning ? 0.3 : 1, pointerEvents: isRunning ? 'none' : 'auto' }}>
            <input
              type="range" min={0} max={60} step={5}
              value={sliderVal}
              onChange={e => setDurMin(parseInt(e.target.value))}
              style={{
                width: '100%', height: 6, WebkitAppearance: 'none', appearance: 'none',
                borderRadius: 3, outline: 'none', cursor: 'pointer',
                background: `linear-gradient(to right, #ff4425 0%, #ff4425 ${sliderPct}%, #222 ${sliderPct}%, #222 100%)`,
              } as React.CSSProperties}
            />
          </div>

          <div style={{ textAlign: 'center', fontSize: 11, color: '#333', marginTop: 6 }}>
            0 = no timer — session runs until manual stop
          </div>
        </div>

        {/* 5. LIVE PARTICIPANT LIST */}
        {isRunning && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#666', marginBottom: 8 }}>Live — Participants</div>
            {participants.length === 0 && (
              <div style={{ color: '#333', fontSize: 13, padding: '12px 0' }}>Waiting for heart rate data…</div>
            )}
            {participants.map(p => (
              <div key={p.profile_id} style={{ borderBottom: '1px solid #111', padding: '8px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: '#ccc' }}>{p.name}</div>
                  {displayMode === 'fancy' && (
                    <div style={{ display: 'flex', gap: 2, marginTop: 4, height: 6 }}>
                      {[1, 2, 3, 4, 5].map(z => (
                        <div key={z} style={{
                          flex: 1, borderRadius: 2,
                          background: z <= p.zone ? ZONE_COLORS[z] : '#222',
                        }} />
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 12 }}>
                  <span style={{
                    fontSize: 20, fontWeight: 900,
                    color: displayMode === 'fancy' ? ZONE_COLORS[p.zone] : '#fff',
                  }}>{p.bpm}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                    background: `${ZONE_COLORS[p.zone]}21`,
                    color: ZONE_COLORS[p.zone],
                  }}>Z{p.zone}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 6. START / STOP SESSION */}
        {sessionActive && !isRunning && (
          <div style={{ padding: 3, borderRadius: 12, background: 'linear-gradient(135deg, #ff4425, #ff7755, #ff4425)', marginBottom: 12 }}>
            <button onClick={startSession} style={{
              width: '100%', padding: '28px 20px', borderRadius: 10, border: 'none',
              background: '#ff4425', color: '#fff', fontSize: 22, fontWeight: 900, letterSpacing: '0.08em',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            }}>
              <Play style={{ width: 22, height: 22 }} fill="#fff" /> START SESSION
            </button>
          </div>
        )}

        {isRunning && (
          <button onClick={stopSession} style={{
            width: '100%', padding: '28px 20px', borderRadius: 12, border: '2px solid #ff4425',
            background: '#1a1a1a', color: '#ff4425', fontSize: 22, fontWeight: 900, letterSpacing: '0.08em',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            marginBottom: 12,
          }}>
            <Square style={{ width: 20, height: 20 }} fill="#ff4425" /> STOP SESSION
          </button>
        )}

        {/* 7. NEW SESSION BUTTON */}
        <div style={{ borderTop: '1px solid #1a1a1a', paddingTop: 12 }}>
          <button
            onClick={createNewSession}
            disabled={isRunning}
            style={{
              width: '100%', padding: 14, borderRadius: 10, border: '1px solid #333',
              background: '#1a1a1a', color: '#aaa', fontSize: 13, fontWeight: 700,
              cursor: isRunning ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              opacity: isRunning ? 0.4 : 1, pointerEvents: isRunning ? 'none' : 'auto',
            }}>
            <RefreshCw style={{ width: 14, height: 14 }} /> New Session
          </button>
        </div>

      </div>

      {/* slider thumb CSS */}
      <style>{`
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          width: 26px; height: 26px; border-radius: 50%;
          background: #ff4425; cursor: pointer; border: none;
          margin-top: -10px;
        }
        input[type=range]::-moz-range-thumb {
          width: 26px; height: 26px; border-radius: 50%;
          background: #ff4425; cursor: pointer; border: none;
        }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button {
          -webkit-appearance: none; margin: 0;
        }
      `}</style>
    </div>
  );
}
