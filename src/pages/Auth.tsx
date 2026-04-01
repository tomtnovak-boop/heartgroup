import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { LoginForm } from '@/components/auth/LoginForm';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { VerificationSent } from '@/components/auth/VerificationSent';
import { useAuthContext } from '@/components/auth/AuthProvider';

export default function Auth() {
  const [view, setView] = useState<'login' | 'register' | 'forgot' | 'verification'>('login');
  const [verificationEmail, setVerificationEmail] = useState('');
  const { isAuthenticated, isLoading } = useAuthContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/participant');
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleRegistered = (email: string) => {
    setVerificationEmail(email);
    setView('verification');
  };

  return (
    <div className="participant-theme min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-center p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <Heart className="w-5 h-5 text-primary" fill="currentColor" />
          </div>
          <div>
            <h1 className="text-lg font-bold">HR Training</h1>
            <p className="text-xs text-muted-foreground">Group Heart Rate Training</p>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        {view === 'login' && <LoginForm onSwitchToRegister={() => setView('register')} onSwitchToForgotPassword={() => setView('forgot')} />}
        {view === 'register' && <RegisterForm onSwitchToLogin={() => setView('login')} onRegistered={handleRegistered} />}
        {view === 'forgot' && <ForgotPasswordForm onSwitchToLogin={() => setView('login')} />}
        {view === 'verification' && <VerificationSent email={verificationEmail} onBackToLogin={() => setView('login')} />}
      </main>

      <footer className="p-4 text-center text-sm text-muted-foreground border-t border-border">
        Your data is stored securely
      </footer>
    </div>
  );
}
