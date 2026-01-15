import { Heart, Monitor, Users, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

export type ViewMode = 'participant' | 'coach';

interface AppHeaderProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  showViewSwitcher?: boolean;
}

export function AppHeader({ currentView, onViewChange, showViewSwitcher = true }: AppHeaderProps) {
  const { user, isAuthenticated, signOut } = useAuthContext();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: 'Fehler beim Abmelden',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }
    navigate('/');
  };

  return (
    <header className="flex items-center justify-between p-4 bg-background border-b border-border">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
          <Heart className="w-5 h-5 text-primary" fill="currentColor" />
        </div>
        <div>
          <h1 className="text-lg font-bold">HR Training</h1>
          <p className="text-xs text-muted-foreground">
            {currentView === 'coach' ? 'Coach Dashboard' : 'Teilnehmer-Ansicht'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {showViewSwitcher && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                {currentView === 'coach' ? (
                  <>
                    <Monitor className="w-4 h-4" />
                    Coach
                  </>
                ) : (
                  <>
                    <Users className="w-4 h-4" />
                    Teilnehmer
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-background border-border">
              <DropdownMenuItem 
                onClick={() => onViewChange('participant')}
                className={currentView === 'participant' ? 'bg-accent' : ''}
              >
                <Users className="w-4 h-4 mr-2" />
                Teilnehmer-Ansicht
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onViewChange('coach')}
                className={currentView === 'coach' ? 'bg-accent' : ''}
              >
                <Monitor className="w-4 h-4 mr-2" />
                Coach Dashboard
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {isAuthenticated && (
          <Button variant="ghost" size="icon" onClick={handleSignOut} title="Abmelden">
            <LogOut className="w-4 h-4" />
          </Button>
        )}
      </div>
    </header>
  );
}
