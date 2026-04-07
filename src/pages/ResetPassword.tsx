import { useState, useEffect } from 'react';
import { Loader2, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { clearClientSession } from '@/lib/logout';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) setIsValid(true);
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setIsValid(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: 'Fehler', description: 'Passwörter stimmen nicht überein.', variant: 'destructive' });
      return;
    }
    if (password.length < 8) {
      toast({ title: 'Fehler', description: 'Passwort muss mindestens 8 Zeichen lang sein.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsLoading(false);
    if (error) {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
      return;
    }
    await clearClientSession();
    setIsSuccess(true);
  };

  const Logo = () => (
    <h1 style={{ fontWeight: 900, fontSize: '28px', letterSpacing: '0.15em', textTransform: 'uppercase' as const, margin: 0 }}>
      <span style={{ color: '#fff', fontWeight: 'bold' }}>B</span>
      <span style={{ color: '#ff4425', fontWeight: 'bold' }}>heart</span>
    </h1>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: '16px', padding: '40px 36px', width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <Logo />
          {!isSuccess && (
            <p style={{ color: '#666', fontSize: '13px', marginTop: '6px' }}>
              {isValid ? 'Neues Passwort festlegen' : 'Ungültiger oder abgelaufener Link'}
            </p>
          )}
        </div>

        {isSuccess ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <Check style={{ width: 32, height: 32, color: '#22C55E' }} />
            </div>
            <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, margin: '0 0 8px' }}>Passwort geändert</h2>
            <p style={{ color: '#999', fontSize: '14px', lineHeight: '1.5', margin: 0 }}>
              Dein Passwort wurde erfolgreich geändert. Du kannst dich jetzt in der Bheart App anmelden.
            </p>
          </div>
        ) : isValid ? (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <input
              type="password"
              placeholder="Neues Passwort"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              style={{
                background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '10px',
                height: '48px', color: '#fff', padding: '0 16px', fontSize: '15px', outline: 'none',
                width: '100%', boxSizing: 'border-box',
              }}
              onFocus={(e) => e.target.style.borderColor = '#ff4425'}
              onBlur={(e) => e.target.style.borderColor = '#2a2a2a'}
            />
            <input
              type="password"
              placeholder="Passwort bestätigen"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              style={{
                background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '10px',
                height: '48px', color: '#fff', padding: '0 16px', fontSize: '15px', outline: 'none',
                width: '100%', boxSizing: 'border-box',
              }}
              onFocus={(e) => e.target.style.borderColor = '#ff4425'}
              onBlur={(e) => e.target.style.borderColor = '#2a2a2a'}
            />
            <button
              type="submit"
              disabled={isLoading}
              style={{
                background: isLoading ? 'rgba(255,68,37,0.5)' : '#ff4425', color: '#fff',
                border: 'none', borderRadius: '10px', height: '48px', fontWeight: 700, fontSize: '15px',
                cursor: isLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: '8px', width: '100%',
              }}
            >
              {isLoading && <Loader2 style={{ width: 16, height: 16 }} className="animate-spin" />}
              {isLoading ? 'Speichern...' : 'Passwort speichern'}
            </button>
          </form>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#999', fontSize: '14px', marginBottom: '16px' }}>
              Bitte fordere einen neuen Reset-Link an.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}