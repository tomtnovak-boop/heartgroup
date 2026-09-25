import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { AdminClassesTab } from '@/components/admin/AdminClassesTab';

export default function AdminClasses() {
  const navigate = useNavigate();
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid #1f1f1f' }}>
        <button onClick={() => navigate('/coach')} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '4px' }}
          onMouseEnter={e => e.currentTarget.style.color = '#ff4425'} onMouseLeave={e => e.currentTarget.style.color = '#666'}>
          <ArrowLeft style={{ width: 16, height: 16 }} /> Hub
        </button>
        <span style={{ fontWeight: 700, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Classes</span>
        <div style={{ width: 48 }} />
      </header>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px' }}>
        <AdminClassesTab />
      </div>
    </div>
  );
}
