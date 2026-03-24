import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthContext } from './AuthProvider';
import { Loader2, Heart } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requireCoach?: boolean;
}

export function ProtectedRoute({ children, requireCoach = false }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, isCoach } = useAuthContext();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <Heart className="w-12 h-12 text-primary animate-pulse" fill="currentColor" />
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/auth" state={{ from: location }} replace />;
  if (requireCoach && !isCoach) return <Navigate to="/participant" replace />;
  return <>{children}</>;
}
