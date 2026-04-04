import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, startOfYear, endOfYear, format, subMonths, addMonths, getISOWeek, eachWeekOfInterval } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Line, ComposedChart } from 'recharts';

const ZONE_COLORS = ['#9CA3AF', '#00BFFF', '#22C55E', '#F59E0B', '#EF4444'];
const ZONE_LABELS = ['Z1 Recovery', 'Z2 Light', 'Z3 Moderate', 'Z4 Hard', 'Z5 Maximum'];

interface CoachOption { userId: string; name: string; }

export default function AdminStats() {
  const navigate = useNavigate();
  const { isAdmin, user } = useAuthContext();
  const [mode, setMode] = useState<'month' | 'year'>('month');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedCoachId, setSelectedCoachId] = useState<string>('');
  const [coaches, setCoaches] = useState<CoachOption[]>([]);
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [allSessions, setAllSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const periodStart = useMemo(() =>
    mode === 'month' ? startOfMonth(currentMonth).toISOString() : startOfYear(new Date(currentYear, 0, 1)).toISOString(),
    [mode, currentMonth, currentYear]);

  const periodEnd = useMemo(() =>
    mode === 'month' ? endOfMonth(currentMonth).toISOString() : endOfYear(new Date(currentYear, 0, 1)).toISOString(),
    [mode, currentMonth, currentYear]);

  // Load coaches for admin filter
  useEffect(() => {
    if (!isAdmin) return;
    const load = async () => {
      const { data: roles } = await supabase.from('user_roles').select('user_id, role').in('role', ['coach', 'admin']);
      if (!roles) return;
      const userIds = [...new Set(roles.map(r => r.user_id))];
      const { data: profiles } = await supabase.from('profiles').select('user_id, name').in('user_id', userIds);
      setCoaches((profiles || []).map(p => ({ userId: p.user_id!, name: p.name })));
    };
    load();
  }, [isAdmin]);

  // Load data
  useEffect(() => {
    const load = async () => {
      setLoading(true);

      // Load active_sessions for the period
      const { data: sessions } = await supabase.from('active_sessions').select('*')
        .gte('started_at', periodStart).lte('started_at', periodEnd);
      setAllSessions(sessions || []);

      // Determine which session codes to filter by
      let filteredCodes: string[] | null = null;

      if (selectedCoachId) {
        const coachSessions = (sessions || []).filter(s => s.created_by === selectedCoachId);
        filteredCodes = coachSessions.map(s => s.session_code);
      } else if (!isAdmin && user) {
        // Coach sees only their own sessions
        const coachSessions = (sessions || []).filter(s => s.created_by === user.id);
        filteredCodes = coachSessions.map(s => s.session_code);
      }

      // Load workouts
      const { data: wkData } = await supabase.from('workouts').select('*')
        .gte('started_at', periodStart).lte('started_at', periodEnd)
        .not('ended_at', 'is', null);

      // We can't filter workouts by session_code directly (no column), so we filter by time overlap with sessions
      let filtered = wkData || [];
      if (filteredCodes !== null && filteredCodes.length > 0) {
        const coachSessionTimes = (sessions || [])
          .filter(s => filteredCodes!.includes(s.session_code))
          .map(s => ({ start: new Date(s.started_at).getTime(), end: s.ended_at ? new Date(s.ended_at).getTime() : Date.now() }));
        
        filtered = filtered.filter(w => {
          const wStart = new Date(w.started_at).getTime();
          return coachSessionTimes.some(st => wStart >= st.start - 60000 && wStart <= st.end + 60000);
        });
      } else if (filteredCodes !== null && filteredCodes.length === 0) {
        filtered = [];
      }

      setWorkouts(filtered);
      setLoading(false);
    };
    load();
  }, [periodStart, periodEnd, selectedCoachId, isAdmin, user]);

  // KPIs
  const kpis = useMemo(() => {
    const sessionCount = allSessions.filter(s => {
      if (selectedCoachId) return s.created_by === selectedCoachId;
      if (!isAdmin && user) return s.created_by === user.id;
      return true;
    }).length;
    const uniqueParticipants = new Set(workouts.map(w => w.profile_id)).size;
    const totalSeconds = workouts.reduce((s, w) => s + (w.duration_seconds || 0), 0);
    const avgPerSession = sessionCount > 0 ? (uniqueParticipants / sessionCount).toFixed(1) : '0';
    return { sessionCount, uniqueParticipants, totalSeconds, avgPerSession };
  }, [workouts, allSessions, selectedCoachId, isAdmin, user]);

  // Chart data
  const chartData = useMemo(() => {
    const relevantSessions = allSessions.filter(s => {
      if (selectedCoachId) return s.created_by === selectedCoachId;
      if (!isAdmin && user) return s.created_by === user.id;
      return true;
    });

    if (mode === 'year') {
      const months = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
      return months.map((label, i) => {
        const mSessions = relevantSessions.filter(s => new Date(s.started_at).getMonth() === i);
        const mWorkouts = workouts.filter(w => new Date(w.started_at).getMonth() === i);
        return { label, sessions: mSessions.length, participants: new Set(mWorkouts.map(w => w.profile_id)).size };
      });
    } else {
      const weeks = eachWeekOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) }, { weekStartsOn: 1 });
      return weeks.map(ws => {
        const wk = getISOWeek(ws);
        const wkStart = ws.getTime();
        const wkEnd = wkStart + 7 * 86400000;
        const wSessions = relevantSessions.filter(s => { const t = new Date(s.started_at).getTime(); return t >= wkStart && t < wkEnd; });
        const wWorkouts = workouts.filter(w => { const t = new Date(w.started_at).getTime(); return t >= wkStart && t < wkEnd; });
        return { label: `KW${wk}`, sessions: wSessions.length, participants: new Set(wWorkouts.map(w => w.profile_id)).size };
      });
    }
  }, [workouts, allSessions, mode, currentMonth, selectedCoachId, isAdmin, user]);

  // Zone totals
  const zoneTotals = useMemo(() => {
    const z = [0, 0, 0, 0, 0];
    workouts.forEach(w => {
      z[0] += w.zone_1_seconds || 0;
      z[1] += w.zone_2_seconds || 0;
      z[2] += w.zone_3_seconds || 0;
      z[3] += w.zone_4_seconds || 0;
      z[4] += w.zone_5_seconds || 0;
    });
    const total = z.reduce((a, b) => a + b, 0) || 1;
    return z.map((s, i) => ({ label: ZONE_LABELS[i], seconds: s, pct: Math.round((s / total) * 100), color: ZONE_COLORS[i] }));
  }, [workouts]);

  // Participant ranking
  const participantRanking = useMemo(() => {
    const map = new Map<string, { name: string; sessions: number; totalSeconds: number }>();
    workouts.forEach(w => {
      const existing = map.get(w.profile_id) || { name: '', sessions: 0, totalSeconds: 0 };
      existing.sessions += 1;
      existing.totalSeconds += w.duration_seconds || 0;
      map.set(w.profile_id, existing);
    });

    const totalSessions = kpis.sessionCount || 1;
    return Array.from(map.entries())
      .map(([pid, d]) => ({ profileId: pid, ...d, attendance: Math.round((d.sessions / totalSessions) * 100) }))
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 10);
  }, [workouts, kpis.sessionCount]);

  // Load names for ranking
  const [profileNames, setProfileNames] = useState<Record<string, string>>({});
  useEffect(() => {
    const ids = participantRanking.map(p => p.profileId);
    if (ids.length === 0) return;
    supabase.from('profiles').select('id, name, nickname').in('id', ids)
      .then(({ data }) => {
        const map: Record<string, string> = {};
        (data || []).forEach(p => { map[p.id] = p.nickname || p.name; });
        setProfileNames(map);
      });
  }, [participantRanking]);

  // Top sessions
  const topSessions = useMemo(() => {
    const relevantSessions = allSessions.filter(s => {
      if (selectedCoachId) return s.created_by === selectedCoachId;
      if (!isAdmin && user) return s.created_by === user.id;
      return true;
    });

    return relevantSessions
      .map(s => {
        const sessionWorkouts = workouts.filter(w => {
          const wStart = new Date(w.started_at).getTime();
          const sStart = new Date(s.started_at).getTime();
          const sEnd = s.ended_at ? new Date(s.ended_at).getTime() : Date.now();
          return wStart >= sStart - 60000 && wStart <= sEnd + 60000;
        });
        const avgHr = sessionWorkouts.length > 0
          ? Math.round(sessionWorkouts.reduce((sum, w) => sum + (w.avg_bpm || 0), 0) / sessionWorkouts.length)
          : 0;
        const avgDuration = sessionWorkouts.length > 0
          ? Math.round(sessionWorkouts.reduce((sum, w) => sum + (w.duration_seconds || 0), 0) / sessionWorkouts.length)
          : 0;
        return { date: s.started_at, code: s.session_code, participants: sessionWorkouts.length, avgHr, avgDuration };
      })
      .sort((a, b) => b.participants - a.participants)
      .slice(0, 5);
  }, [allSessions, workouts, selectedCoachId, isAdmin, user]);

  // Coach breakdown (admin only)
  const coachBreakdown = useMemo(() => {
    if (!isAdmin || selectedCoachId) return [];
    return coaches.map(coach => {
      const coachSessions = allSessions.filter(s => s.created_by === coach.userId);
      const coachSessionTimes = coachSessions.map(s => ({
        start: new Date(s.started_at).getTime(),
        end: s.ended_at ? new Date(s.ended_at).getTime() : Date.now()
      }));
      const coachWorkouts = workouts.filter(w => {
        const wStart = new Date(w.started_at).getTime();
        return coachSessionTimes.some(st => wStart >= st.start - 60000 && wStart <= st.end + 60000);
      });
      const uniqueP = new Set(coachWorkouts.map(w => w.profile_id)).size;
      const totalSec = coachWorkouts.reduce((s, w) => s + (w.duration_seconds || 0), 0);
      const z = [0, 0, 0, 0, 0];
      coachWorkouts.forEach(w => {
        z[0] += w.zone_1_seconds || 0; z[1] += w.zone_2_seconds || 0; z[2] += w.zone_3_seconds || 0;
        z[3] += w.zone_4_seconds || 0; z[4] += w.zone_5_seconds || 0;
      });
      const zTotal = z.reduce((a, b) => a + b, 0) || 1;
      return {
        userId: coach.userId, name: coach.name,
        sessions: coachSessions.length, participants: uniqueP,
        avgParticipants: coachSessions.length > 0 ? (uniqueP / coachSessions.length).toFixed(1) : '0',
        totalSeconds: totalSec,
        zones: z.map(s => Math.round((s / zTotal) * 100)),
      };
    }).filter(c => c.sessions > 0).sort((a, b) => b.sessions - a.sessions);
  }, [isAdmin, selectedCoachId, coaches, allSessions, workouts]);

  const fmtTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.round((s % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const periodLabel = mode === 'month'
    ? format(currentMonth, 'MMMM yyyy')
    : `${currentYear}`;

  const navigatePeriod = (dir: -1 | 1) => {
    if (mode === 'month') setCurrentMonth(prev => dir === -1 ? subMonths(prev, 1) : addMonths(prev, 1));
    else setCurrentYear(prev => prev + dir);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff' }}>
      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid #1f1f1f' }}>
        <button onClick={() => navigate('/coach')} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '4px' }}
          onMouseEnter={e => e.currentTarget.style.color = '#ff4425'} onMouseLeave={e => e.currentTarget.style.color = '#666'}>
          <ArrowLeft style={{ width: 16, height: 16 }} /> Hub
        </button>
        <span style={{ fontWeight: 700, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Statistiken</span>
        <div style={{ display: 'flex', background: '#1a1a1a', borderRadius: '8px', overflow: 'hidden' }}>
          {(['month', 'year'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              padding: '6px 14px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: mode === m ? 700 : 400,
              background: mode === m ? '#ff4425' : 'transparent', color: mode === m ? '#fff' : '#666',
            }}>{m === 'month' ? 'Monat' : 'Jahr'}</button>
          ))}
        </div>
      </header>

      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '20px' }}>
        {/* Period nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '20px' }}>
          <button onClick={() => navigatePeriod(-1)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}>
            <ChevronLeft style={{ width: 20, height: 20 }} />
          </button>
          <span style={{ fontSize: '16px', fontWeight: 600, minWidth: '140px', textAlign: 'center' }}>{periodLabel}</span>
          <button onClick={() => navigatePeriod(1)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}>
            <ChevronRight style={{ width: 20, height: 20 }} />
          </button>
        </div>

        {/* Coach filter (admin only) */}
        {isAdmin && (
          <div style={{ marginBottom: '24px' }}>
            <select value={selectedCoachId} onChange={e => setSelectedCoachId(e.target.value)}
              style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px', color: '#fff', padding: '8px 12px', fontSize: '14px', width: '100%', maxWidth: '280px' }}>
              <option value="">Alle Coaches</option>
              {coaches.map(c => <option key={c.userId} value={c.userId}>{c.name}</option>)}
            </select>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#666' }}>Laden...</div>
        ) : (
          <>
            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '32px' }}>
              {[
                { icon: '🏋️', value: kpis.sessionCount, label: 'Sessions' },
                { icon: '👥', value: kpis.uniqueParticipants, label: 'Teilnehmer' },
                { icon: '⏱️', value: fmtTime(kpis.totalSeconds), label: 'Gesamtzeit' },
                { icon: '📊', value: kpis.avgPerSession, label: 'Ø pro Sess.' },
              ].map((k, i) => (
                <div key={i} style={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: '14px', padding: '24px' }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>{k.icon}</div>
                  <div style={{ fontSize: '32px', fontWeight: 800 }}>{k.value}</div>
                  <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>{k.label}</div>
                </div>
              ))}
            </div>

            {/* Chart */}
            <div style={{ marginBottom: '32px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#ff4425', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>Sessions & Teilnehmer</div>
              <div style={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData}>
                    <XAxis dataKey="label" tick={{ fill: '#666', fontSize: 12 }} axisLine={{ stroke: '#1a1a1a' }} tickLine={false} />
                    <YAxis yAxisId="left" tick={{ fill: '#666', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fill: '#666', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: '8px', color: '#fff' }} />
                    <Bar yAxisId="left" dataKey="sessions" fill="#ff4425" opacity={0.8} radius={[4, 4, 0, 0]} name="Sessions" />
                    <Line yAxisId="right" type="monotone" dataKey="participants" stroke="#00BFFF" strokeWidth={2} dot={false} name="Teilnehmer" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #1a1a1a', margin: '32px 0' }} />

            {/* Zone breakdown */}
            <div style={{ marginBottom: '32px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#ff4425', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>Zeit in Zonen</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {zoneTotals.map((z, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: z.color, width: '90px', flexShrink: 0 }}>{z.label}</span>
                    <div style={{ flex: 1, height: '20px', background: '#1a1a1a', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${z.pct}%`, height: '100%', background: z.color, borderRadius: '4px', transition: 'width 0.3s' }} />
                    </div>
                    <span style={{ fontSize: '13px', color: '#999', width: '40px', textAlign: 'right' }}>{z.pct}%</span>
                    <span style={{ fontSize: '12px', color: '#666', width: '60px', textAlign: 'right' }}>{fmtTime(z.seconds)}</span>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: '11px', color: '#555', marginTop: '12px' }}>Ø über alle Teilnehmer im Zeitraum</p>
            </div>

            <div style={{ borderTop: '1px solid #1a1a1a', margin: '32px 0' }} />

            {/* Participant Ranking */}
            <div style={{ marginBottom: '32px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#ff4425', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>Teilnehmer-Aktivität</div>
              {participantRanking.length === 0 ? (
                <p style={{ color: '#666', fontSize: '14px' }}>Keine Daten im Zeitraum</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #1f1f1f' }}>
                        {['#', 'Name', 'Sessions', 'Ø Anwesenheit', 'Gesamtzeit'].map(h => (
                          <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#666', fontWeight: 600, fontSize: '12px' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {participantRanking.map((p, i) => (
                        <tr key={p.profileId} style={{ borderBottom: '1px solid #111' }}>
                          <td style={{ padding: '10px 12px', color: '#666' }}>{i + 1}</td>
                          <td style={{ padding: '10px 12px', fontWeight: 600 }}>{profileNames[p.profileId] || '...'}</td>
                          <td style={{ padding: '10px 12px' }}>{p.sessions}</td>
                          <td style={{ padding: '10px 12px' }}>{p.attendance}%</td>
                          <td style={{ padding: '10px 12px' }}>{fmtTime(p.totalSeconds)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div style={{ borderTop: '1px solid #1a1a1a', margin: '32px 0' }} />

            {/* Top Sessions */}
            <div style={{ marginBottom: '32px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#ff4425', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>Top Sessions</div>
              {topSessions.length === 0 ? (
                <p style={{ color: '#666', fontSize: '14px' }}>Keine Sessions im Zeitraum</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #1f1f1f' }}>
                        {['Datum', 'Code', 'Teilnehmer', 'Ø HR', 'Dauer'].map(h => (
                          <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#666', fontWeight: 600, fontSize: '12px' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {topSessions.map((s, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #111' }}>
                          <td style={{ padding: '10px 12px' }}>{format(new Date(s.date), 'dd.MM.yyyy')}</td>
                          <td style={{ padding: '10px 12px', fontFamily: 'monospace' }}>{s.code}</td>
                          <td style={{ padding: '10px 12px' }}>{s.participants}</td>
                          <td style={{ padding: '10px 12px' }}>{s.avgHr > 0 ? `${s.avgHr} BPM` : '–'}</td>
                          <td style={{ padding: '10px 12px' }}>{fmtTime(s.avgDuration)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Coach Breakdown (admin only) */}
            {isAdmin && !selectedCoachId && coachBreakdown.length > 0 && (
              <>
                <div style={{ borderTop: '1px solid #1a1a1a', margin: '32px 0' }} />
                <div style={{ marginBottom: '32px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#ff4425', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>Aufschlüsselung nach Coach</div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #1f1f1f' }}>
                          {['Coach', 'Sessions', 'Teiln.', 'Ø Teiln.', 'Zeit', 'Z1', 'Z2', 'Z3', 'Z4', 'Z5'].map(h => (
                            <th key={h} style={{ padding: '8px 8px', textAlign: 'left', color: '#666', fontWeight: 600, fontSize: '11px' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {coachBreakdown.map(c => (
                          <tr key={c.userId} onClick={() => setSelectedCoachId(c.userId)} style={{ borderBottom: '1px solid #111', cursor: 'pointer' }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#1a1a1a')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                            <td style={{ padding: '10px 8px', fontWeight: 600 }}>{c.name}</td>
                            <td style={{ padding: '10px 8px' }}>{c.sessions}</td>
                            <td style={{ padding: '10px 8px' }}>{c.participants}</td>
                            <td style={{ padding: '10px 8px' }}>{c.avgParticipants}</td>
                            <td style={{ padding: '10px 8px' }}>{fmtTime(c.totalSeconds)}</td>
                            {c.zones.map((pct, zi) => (
                              <td key={zi} style={{ padding: '10px 8px', color: ZONE_COLORS[zi], fontWeight: 600, fontSize: '13px' }}>{pct}%</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
