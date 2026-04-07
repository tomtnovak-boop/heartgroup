import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export default function Index() {
  const { user, isAuthenticated, isLoading } = useAuthContext();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  // Auto-redirect authenticated users based on role
  useEffect(() => {
    if (isLoading || !isAuthenticated || !user) return;

    const redirectByRole = async () => {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const roles = (data || []).map(r => r.role);
      if (roles.includes('admin') || roles.includes('coach')) {
        navigate('/coach', { replace: true });
      } else {
        navigate('/participant', { replace: true });
      }
    };

    redirectByRole();
  }, [isLoading, isAuthenticated, user, navigate]);

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 style={{ width: 32, height: 32, color: '#ff4425' }} className="animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 style={{ width: 32, height: 32, color: '#ff4425' }} className="animate-spin" />
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError(signInError.message);
      setIsSubmitting(false);
      return;
    }

    // Role-based routing happens via the useEffect above after auth state updates
    setIsSubmitting(false);
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError('Bitte E-Mail-Adresse eingeben.');
      return;
    }
    setError('');
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setForgotSent(true);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
    }}>
      <div style={{
        background: '#111',
        border: '1px solid #1f1f1f',
        borderRadius: '16px',
        padding: '40px 36px',
        width: '100%',
        maxWidth: '420px',
      }}>
        {/* Branding */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{
            fontWeight: 900,
            fontSize: '28px',
            letterSpacing: '0.15em',
            textTransform: 'uppercase' as const,
            margin: 0,
          }}>
            <span style={{ color: '#fff', fontWeight: 'bold' }}>B</span>
            <span style={{ color: '#ff4425', fontWeight: 'bold' }}>heart</span>
          </h1>
          <p style={{ color: '#666', fontSize: '13px', marginTop: '6px' }}>
            Coach & Admin Login
          </p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              background: '#1a1a1a',
              border: '1px solid #2a2a2a',
              borderRadius: '10px',
              height: '48px',
              color: '#fff',
              padding: '0 16px',
              fontSize: '15px',
              outline: 'none',
              width: '100%',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => e.target.style.borderColor = '#ff4425'}
            onBlur={(e) => e.target.style.borderColor = '#2a2a2a'}
          />
          <input
            type="password"
            placeholder="Passwort"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              background: '#1a1a1a',
              border: '1px solid #2a2a2a',
              borderRadius: '10px',
              height: '48px',
              color: '#fff',
              padding: '0 16px',
              fontSize: '15px',
              outline: 'none',
              width: '100%',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => e.target.style.borderColor = '#ff4425'}
            onBlur={(e) => e.target.style.borderColor = '#2a2a2a'}
          />

          {error && (
            <p style={{ color: '#ff4425', fontSize: '13px', margin: 0 }}>{error}</p>
          )}

          {forgotSent && (
            <p style={{ color: '#22C55E', fontSize: '13px', margin: 0 }}>
              Reset-Link wurde gesendet. Prüfe dein Postfach.
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              background: isSubmitting ? 'rgba(255,68,37,0.5)' : '#ff4425',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              height: '48px',
              fontWeight: 700,
              fontSize: '15px',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              width: '100%',
            }}
          >
            {isSubmitting && <Loader2 style={{ width: 16, height: 16 }} className="animate-spin" />}
            {isSubmitting ? 'Einloggen...' : 'Einloggen'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <button
            type="button"
            onClick={handleForgotPassword}
            style={{
              background: 'none',
              border: 'none',
              color: '#666',
              fontSize: '13px',
              cursor: 'pointer',
              textDecoration: 'none',
            }}
          >
            Passwort vergessen?
          </button>
        </div>
      </div>
    </div>
  );
}
