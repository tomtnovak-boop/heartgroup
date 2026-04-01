import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart } from 'lucide-react';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { AdminParticipantsTab } from '@/components/admin/AdminParticipantsTab';

export default function AdminTeilnehmer() {
  const { isAdmin, isLoading } = useAuthContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAdmin) navigate('/coach', { replace: true });
  }, [isLoading, isAdmin, navigate]);

  if (isLoading || !isAdmin) return null;

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff' }}>
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 20px', borderBottom: '1px solid #1f1f1f',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => navigate('/coach')}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '14px' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#ff4425')}
            onMouseLeave={e => (e.currentTarget.style.color = '#666')}
          >
            <ArrowLeft style={{ width: 16, height: 16 }} /> Hub
          </button>
        </div>
        <span style={{ fontWeight: 900, letterSpacing: '0.15em', textTransform: 'uppercase', fontSize: '14px' }}>
          <span style={{ color: '#fff' }}>BALBOA</span>
          <span style={{ color: '#ff4425' }}>MOVE</span>
        </span>
      </header>
      <div style={{ padding: '20px' }}>
        <AdminParticipantsTab />
      </div>
    </div>
  );
}
