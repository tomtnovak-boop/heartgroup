import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, LogOut, BarChart3, LayoutGrid, Users, Shield, TrendingUp, Radio, Layers, Bell, Target } from 'lucide-react';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';

export default function CoachHub() {
  const { isAdmin, user, signOut } = useAuthContext();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('name').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => {
        if (data?.name) setFirstName(data.name.split(' ')[0]);
      });
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
  };

  const initials = user?.email?.slice(0, 2).toUpperCase() || 'U';

  const cards = [
    // Row 1 — Data & management
    { key: 'training', icon: Heart, title: 'My Training', sub: 'Overview · Stats', route: '/participant' },
    { key: 'stats', icon: TrendingUp, title: 'Statistics', sub: 'Sessions · Zones', route: '/admin/stats' },
    ...(isAdmin ? [
      { key: 'teilnehmer', icon: Users, title: 'Participants', sub: 'Manage', route: '/admin/teilnehmer' },
      { key: 'coaches', icon: Shield, title: 'Coaches', sub: 'Manage', route: '/admin/coaches' },
      { key: 'classes', icon: Layers, title: 'Classes', sub: 'Manage', route: '/admin/classes' },
    ] : []),
    // Row 2 — Live views
    { key: 'namegrid', icon: LayoutGrid, title: 'Overview', sub: 'Live · Name + Zone', route: '/coach/namegrid' },
    { key: 'target', icon: Target, title: 'Target Focus', sub: 'Live · Target Zone', route: '/coach/target' },
    // Row 3 — Session control
    { key: 'cdash', icon: Radio, title: 'Coach Dashboard', sub: 'Session · Control', route: '/coach-dashboard' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 20px', borderBottom: '1px solid #1f1f1f', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,68,37,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Heart style={{ width: 14, height: 14, color: '#ff4425', fill: '#ff4425' }} />
          </div>
          <span style={{ fontWeight: 900, letterSpacing: '0.15em', textTransform: 'uppercase', fontSize: '14px' }}>
            <span style={{ color: '#fff', fontWeight: 'bold' }}>B</span>
            <span style={{ color: '#ff4425', fontWeight: 'bold' }}>heart</span>
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%', background: '#ff4425',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '12px', fontWeight: 700, color: '#fff',
          }}>{initials}</div>
          <button onClick={handleSignOut} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }} title="Logout">
            <LogOut style={{ width: 18, height: 18 }} />
          </button>
        </div>
      </header>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 20px' }}>
        <div style={{ width: '100%', maxWidth: '720px' }}>
          <div style={{ marginBottom: '32px', textAlign: 'center' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>
              Welcome{firstName ? `, ${firstName}` : ''}.
            </h1>
            <p style={{ color: '#666', fontSize: '15px', marginTop: '6px' }}>Choose a view.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            {/* Section: Data & Management */}
            <div style={{ gridColumn: 'span 4', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#666', marginBottom: '2px' }}>
              Data &amp; Management
            </div>
            {cards.filter(c => ['training', 'stats', 'teilnehmer', 'coaches', 'classes'].includes(c.key)).map(card => (
              <button
                key={card.key}
                onClick={() => navigate(card.route)}
                style={{
                  background: '#111', border: '1px solid #1f1f1f', borderRadius: '12px',
                  padding: '12px', cursor: 'pointer', textAlign: 'left',
                  transition: 'border-color 0.15s, transform 0.15s',
                  color: '#fff', display: 'flex', flexDirection: 'column', gap: '6px', width: '100%',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#ff4425'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#1f1f1f'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <card.icon style={{ width: 20, height: 20, color: '#ff4425' }} />
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700 }}>{card.title}</div>
                  <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>{card.sub}</div>
                </div>
              </button>
            ))}

            {/* Section: Live Views */}
            <div style={{ gridColumn: 'span 4', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#666', marginTop: '8px', marginBottom: '2px' }}>
              Live Views
            </div>
            {cards.filter(c => ['namegrid', 'target'].includes(c.key)).map(card => (
              <button
                key={card.key}
                onClick={() => navigate(card.route)}
                style={{
                  background: '#111', border: '1px solid #1f1f1f', borderRadius: '12px',
                  padding: '12px', cursor: 'pointer', textAlign: 'left',
                  transition: 'border-color 0.15s, transform 0.15s',
                  color: '#fff', display: 'flex', flexDirection: 'column', gap: '6px', width: '100%',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#ff4425'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#1f1f1f'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <card.icon style={{ width: 20, height: 20, color: '#ff4425' }} />
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700 }}>{card.title}</div>
                  <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>{card.sub}</div>
                </div>
              </button>
            ))}

            {/* Section: Session */}
            <div style={{ gridColumn: 'span 4', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#666', marginTop: '8px', marginBottom: '2px' }}>
              Session
            </div>
            {cards.filter(c => c.key === 'cdash').map(card => (
              <button
                key={card.key}
                onClick={() => navigate(card.route)}
                style={{
                  gridColumn: 'span 4',
                  background: '#111', border: '1px solid #1f1f1f', borderRadius: '12px',
                  padding: '16px', cursor: 'pointer', textAlign: 'left',
                  transition: 'border-color 0.15s, transform 0.15s',
                  color: '#fff', display: 'flex', flexDirection: 'column', gap: '6px', width: '100%',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#ff4425'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#1f1f1f'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <card.icon style={{ width: 20, height: 20, color: '#ff4425' }} />
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700 }}>{card.title}</div>
                  <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>{card.sub}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
