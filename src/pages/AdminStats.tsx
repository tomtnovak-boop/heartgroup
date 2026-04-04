import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, startOfYear, endOfYear, format, subMonths, addMonths, getISOWeek, eachWeekOfInterval } from 'date-fns';
import { Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Line, ComposedChart } from 'recharts';

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
  const [showTop20, setShowTop20] = useState(false);

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
      const { data: sessions } = await supabase.from('active_sessions').select('*')
        .gte('started_at', periodStart).lte('started_at', periodEnd);
      setAllSessions(sessions || []);

      let filteredCodes: string[] | null = null;
      if (selectedCoachId) {
        filteredCodes = (sessions || []).filter(s => s.created_by === selectedCoachId).map(s => s.session_code);
      } else if (!isAdmin && user) {
        filteredCodes = (sessions || []).filter(s => s.created_by === user.id).map(s => s.session_code);
      }

      const { data: wkData } = await supabase.from('workouts').select('*')
        .gte('started_at', periodStart).lte('started_at', periodEnd)
        .not('ended_at', 'is', null);

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

  // Relevant sessions helper
  const relevantSessions = useMemo(() => {
    return allSessions.filter(s => {
      if (selectedCoachId) return s.created_by === selectedCoachId;
      if (!isAdmin && user) return s.created_by === user.id;
      return true;
    });
  }, [allSessions, selectedCoachId, isAdmin, user]);

  // KPIs
  const kpis = useMemo(() => {
    const sessionCount = relevantSessions.length;
    const uniqueParticipants = new Set(workouts.map(w => w.profile_id)).size;
    const totalSeconds = workouts.reduce((s, w) => s + (w.duration_seconds || 0), 0);
    const avgPerSession = sessionCount > 0 ? (uniqueParticipants / sessionCount).toFixed(1) : '0';
    return { sessionCount, uniqueParticipants, totalSeconds, avgPerSession };
  }, [workouts, relevantSessions]);

  // Chart data
  const chartData = useMemo(() => {
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
  }, [workouts, relevantSessions, mode, currentMonth]);

  // Zone totals
  const zoneTotals = useMemo(() => {
    const z = [0, 0, 0, 0, 0];
    workouts.forEach(w => {
      z[0] += w.zone_1_seconds || 0; z[1] += w.zone_2_seconds || 0; z[2] += w.zone_3_seconds || 0;
      z[3] += w.zone_4_seconds || 0; z[4] += w.zone_5_seconds || 0;
    });
    const total = z.reduce((a, b) => a + b, 0) || 1;
    return z.map((s, i) => ({ label: ZONE_LABELS[i], seconds: s, pct: Math.round((s / total) * 100), color: ZONE_COLORS[i] }));
  }, [workouts]);

  // Participant ranking (for collapsible top 20 + anonymous stats)
  const participantStats = useMemo(() => {
    const map = new Map<string, { sessions: number; totalSeconds: number }>();
    workouts.forEach(w => {
      const existing = map.get(w.profile_id) || { sessions: 0, totalSeconds: 0 };
      existing.sessions += 1;
      existing.totalSeconds += w.duration_seconds || 0;
      map.set(w.profile_id, existing);
    });
    const totalSessions = kpis.sessionCount || 1;
    const entries = Array.from(map.entries())
      .map(([pid, d]) => ({ profileId: pid, ...d, attendance: Math.round((d.sessions / totalSessions) * 100) }))
      .sort((a, b) => b.sessions - a.sessions);

    // Attendance distribution buckets
    const buckets = [
      { label: '10+ Sessions', min: 10, max: Infinity, count: 0 },
      { label: '7–9 Sessions', min: 7, max: 9, count: 0 },
      { label: '4–6 Sessions', min: 4, max: 6, count: 0 },
      { label: '1–3 Sessions', min: 1, max: 3, count: 0 },
    ];
    entries.forEach(e => {
      for (const b of buckets) {
        if (e.sessions >= b.min && e.sessions <= b.max) { b.count++; break; }
      }
    });

    const avgAttendance = entries.length > 0 ? Math.round(entries.reduce((s, e) => s + e.attendance, 0) / entries.length) : 0;
    const avgDuration = entries.length > 0 ? Math.round(entries.reduce((s, e) => s + e.totalSeconds, 0) / entries.length / (kpis.sessionCount || 1)) : 0;

    return { entries: entries.slice(0, 20), buckets, activeCount: entries.length, avgAttendance, avgDuration };
  }, [workouts, kpis.sessionCount]);

  // Profile names for top 20
  const [profileNames, setProfileNames] = useState<Record<string, string>>({});
  useEffect(() => {
    const ids = participantStats.entries.map(p => p.profileId);
    if (ids.length === 0) return;
    supabase.from('profiles').select('id, name, nickname').in('id', ids)
      .then(({ data }) => {
        const map: Record<string, string> = {};
        (data || []).forEach(p => { map[p.id] = p.nickname || p.name; });
        setProfileNames(map);
      });
  }, [participantStats.entries]);

  // Klassen-Durchschnitt & Top Sessions
  const sessionAnalysis = useMemo(() => {
    const sessionDetails = relevantSessions.map(s => {
      const sWorkouts = workouts.filter(w => {
        const wStart = new Date(w.started_at).getTime();
        const sStart = new Date(s.started_at).getTime();
        const sEnd = s.ended_at ? new Date(s.ended_at).getTime() : Date.now();
        return wStart >= sStart - 60000 && wStart <= sEnd + 60000;
      });
      const avgHr = sWorkouts.length > 0 ? Math.round(sWorkouts.reduce((sum, w) => sum + (w.avg_bpm || 0), 0) / sWorkouts.length) : 0;
      const avgDur = sWorkouts.length > 0 ? Math.round(sWorkouts.reduce((sum, w) => sum + (w.duration_seconds || 0), 0) / sWorkouts.length) : 0;
      const avgCal = sWorkouts.length > 0 ? Math.round(sWorkouts.reduce((sum, w) => sum + (Number(w.total_calories) || 0), 0) / sWorkouts.length) : 0;
      const zoneHighSec = sWorkouts.reduce((sum, w) => sum + (w.zone_3_seconds || 0) + (w.zone_4_seconds || 0) + (w.zone_5_seconds || 0), 0);
      const zoneTotalSec = sWorkouts.reduce((sum, w) => sum + (w.zone_1_seconds || 0) + (w.zone_2_seconds || 0) + (w.zone_3_seconds || 0) + (w.zone_4_seconds || 0) + (w.zone_5_seconds || 0), 0);
      const zoneHighPct = zoneTotalSec > 0 ? Math.round((zoneHighSec / zoneTotalSec) * 100) : 0;
      return { date: s.started_at, participants: sWorkouts.length, avgHr, avgDuration: avgDur, avgCal, zoneHighPct };
    }).filter(s => s.participants > 0);

    const count = sessionDetails.length || 1;
    const avgParticipants = (sessionDetails.reduce((s, d) => s + d.participants, 0) / count).toFixed(1);
    const avgHr = Math.round(sessionDetails.reduce((s, d) => s + d.avgHr, 0) / count);
    const avgCal = Math.round(sessionDetails.reduce((s, d) => s + d.avgCal, 0) / count);

    const top5 = [...sessionDetails].sort((a, b) => b.participants - a.participants).slice(0, 5);

    return { avgParticipants, avgHr, avgCal, top5 };
  }, [relevantSessions, workouts]);

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

  const periodLabel = mode === 'month' ? format(currentMonth, 'MMMM yyyy') : `${currentYear}`;

  const navigatePeriod = (dir: -1 | 1) => {
    if (mode === 'month') setCurrentMonth(prev => dir === -1 ? subMonths(prev, 1) : addMonths(prev, 1));
    else setCurrentYear(prev => prev + dir);
  };

  const maxBucket = Math.max(...participantStats.buckets.map(b => b.count), 1);

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

            {/* Teilnehmer-Aktivität (anonymous by default) */}
            <div style={{ marginBottom: '32px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#ff4425', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>Teilnehmer-Aktivität</div>

              {/* Anonymous overview cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
                {[
                  { icon: '👥', value: participantStats.activeCount, label: 'Aktive Teiln.' },
                  { icon: '📈', value: `${participantStats.avgAttendance}%`, label: 'Ø Anwesenheit' },
                  { icon: '⏱️', value: fmtTime(participantStats.avgDuration), label: 'Ø Dauer/Session' },
                ].map((k, i) => (
                  <div key={i} style={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: '14px', padding: '24px' }}>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>{k.icon}</div>
                    <div style={{ fontSize: '32px', fontWeight: 800 }}>{k.value}</div>
                    <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>{k.label}</div>
                  </div>
                ))}
              </div>

              {/* Attendance distribution (anonymous bar chart) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                {participantStats.buckets.map((b, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '12px', color: '#999', width: '100px', flexShrink: 0, textAlign: 'right' }}>{b.label}</span>
                    <div style={{ flex: 1, height: '24px', background: '#1a1a1a', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${(b.count / maxBucket) * 100}%`, height: '100%', background: '#ff4425', opacity: 0.7, borderRadius: '4px', transition: 'width 0.3s', minWidth: b.count > 0 ? '4px' : '0' }} />
                    </div>
                    <span style={{ fontSize: '13px', color: '#999', width: '90px' }}>{b.count} {b.count === 1 ? 'Person' : 'Personen'}</span>
                  </div>
                ))}
              </div>

              {/* Collapsible Top 20 */}
              <button onClick={() => setShowTop20(!showTop20)} style={{
                background: 'none', border: 'none', color: '#ff4425', fontSize: '14px', fontWeight: 600,
                cursor: 'pointer', padding: '12px 0', display: 'flex', alignItems: 'center', gap: '6px',
              }}>
                {showTop20 ? <ChevronUp style={{ width: 16, height: 16 }} /> : <ChevronDown style={{ width: 16, height: 16 }} />}
                {showTop20 ? 'Top 20 Besucher ausblenden' : 'Top 20 Besucher anzeigen'}
              </button>

              {showTop20 && participantStats.entries.length > 0 && (
                <div style={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: '12px', padding: '16px', marginTop: '8px' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #1f1f1f' }}>
                          {['#', 'Name', 'Sessions', 'Anwesenheit', 'Gesamtzeit'].map(h => (
                            <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#666', fontWeight: 600, fontSize: '12px' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {participantStats.entries.map((p, i) => (
                          <tr key={p.profileId} style={{ borderBottom: '1px solid #1a1a1a' }}>
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
                </div>
              )}
            </div>

            <div style={{ borderTop: '1px solid #1a1a1a', margin: '32px 0' }} />

            {/* Top Sessions & Klassen-Durchschnitt */}
            <div style={{ marginBottom: '32px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#ff4425', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>Top Sessions & Klassen-Durchschnitt</div>

              {/* Klassen-Durchschnitt cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
                {[
                  { icon: '👥', value: sessionAnalysis.avgParticipants, label: 'Ø Teiln./Klasse' },
                  { icon: '🫀', value: sessionAnalysis.avgHr > 0 ? `${sessionAnalysis.avgHr} BPM` : '–', label: 'Ø HR/Klasse' },
                  { icon: '🔥', value: sessionAnalysis.avgCal > 0 ? `${sessionAnalysis.avgCal} kcal` : '–', label: 'Ø Kcal/Klasse' },
                ].map((k, i) => (
                  <div key={i} style={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: '14px', padding: '24px' }}>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>{k.icon}</div>
                    <div style={{ fontSize: '32px', fontWeight: 800 }}>{k.value}</div>
                    <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>{k.label}</div>
                  </div>
                ))}
              </div>

              {/* Top 5 Sessions table */}
              {sessionAnalysis.top5.length === 0 ? (
                <p style={{ color: '#666', fontSize: '14px' }}>Keine Sessions im Zeitraum</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #1f1f1f' }}>
                        {['Datum', 'Teilnehmer', 'Ø HR', 'Dauer', 'Z3+Z4+Z5'].map(h => (
                          <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#666', fontWeight: 600, fontSize: '12px' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sessionAnalysis.top5.map((s, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #111' }}>
                          <td style={{ padding: '10px 12px' }}>{format(new Date(s.date), 'dd.MM.yyyy')}</td>
                          <td style={{ padding: '10px 12px' }}>{s.participants}</td>
                          <td style={{ padding: '10px 12px' }}>{s.avgHr > 0 ? `${s.avgHr} BPM` : '–'}</td>
                          <td style={{ padding: '10px 12px' }}>{fmtTime(s.avgDuration)}</td>
                          <td style={{ padding: '10px 12px', color: '#22C55E', fontWeight: 600 }}>{s.zoneHighPct}%</td>
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
