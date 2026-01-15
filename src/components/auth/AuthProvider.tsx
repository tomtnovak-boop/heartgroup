import { createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  roles: string[];
  isCoach: boolean;
  isAdmin: boolean;
  signUp: (email: string, password: string) => Promise<{ data: any; error: any }>;
  signIn: (email: string, password: string) => Promise<{ data: any; error: any }>;
  signOut: () => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const { roles, isCoach, isAdmin, isLoading: rolesLoading } = useUserRole();

  const value: AuthContextType = {
    user: auth.user,
    session: auth.session,
    isLoading: auth.isLoading || rolesLoading,
    isAuthenticated: auth.isAuthenticated,
    roles,
    isCoach,
    isAdmin,
    signUp: auth.signUp,
    signIn: auth.signIn,
    signOut: auth.signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
