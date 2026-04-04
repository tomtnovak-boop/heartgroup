import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, LogOut, BarChart3, LayoutGrid, Users, Shield, TrendingUp } from 'lucide-react';
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
    navigate('/');
  };

  const initials = user?.email?.slice(0, 2).toUpperCase() || 'U';

  const cards = [
    { key: 'fancy', icon: LayoutGrid, title: 'Dashboard Fancy', sub: 'Live HR · Zonen', route: '/coach/fancy' },
    { key: 'neutral', icon: BarChart3, title: 'Dashboard Neutral', sub: 'Live HR · Zonen', route: '/coach/neutral' },
    { key: 'training', icon: Heart, title: 'Mein Training', sub: 'Übersicht · Stats', route: '/participant' },
    { key: 'stats', icon: TrendingUp, title: 'Statistiken', sub: 'Sessions · Zonen', route: '/admin/stats' },
    ...(isAdmin ? [
      { key: 'teilnehmer', icon: Users, title: 'Teilnehmer', sub: 'Verwalten', route: '/admin/teilnehmer' },
      { key: 'coaches', icon: Shield, title: 'Coaches', sub: 'Verwalten', route: '/admin/coaches' },
    ] : []),
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
            <span style={{ color: '#fff' }}>BALBOA</span>
            <span style={{ color: '#ff4425' }}>MOVE</span>
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
        <div style={{ width: '100%', maxWidth: '640px' }}>
          <div style={{ marginBottom: '32px', textAlign: 'center' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>
              Willkommen{firstName ? `, ${firstName}` : ''}.
            </h1>
            <p style={{ color: '#666', fontSize: '15px', marginTop: '6px' }}>Wähle eine Ansicht.</p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: cards.length <= 2 ? '1fr 1fr' : 'repeat(2, 1fr)',
            gap: '16px',
          }}>
            {cards.map(card => (
              <button
                key={card.key}
                onClick={() => navigate(card.route)}
                style={{
                  background: '#111', border: '1px solid #1f1f1f', borderRadius: '16px',
                  padding: '32px', cursor: 'pointer', textAlign: 'left',
                  transition: 'border-color 0.15s, transform 0.15s',
                  color: '#fff', display: 'flex', flexDirection: 'column', gap: '12px',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#ff4425'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#1f1f1f'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <card.icon style={{ width: 32, height: 32, color: '#ff4425' }} />
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 700 }}>{card.title}</div>
                  <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>{card.sub}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
