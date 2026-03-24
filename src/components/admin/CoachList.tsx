import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash2, Shield } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface Coach {
  user_id: string;
  email: string;
  created_at: string;
}

export function CoachList() {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Coach2024!');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchCoaches = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.functions.invoke('manage-coach', {
      body: { action: 'listCoaches' },
    });

    if (error || data?.error) {
      console.error('Error fetching coaches:', error || data?.error);
      setIsLoading(false);
      return;
    }

    setCoaches(data.coaches || []);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchCoaches();
  }, []);

  const handleCreate = async () => {
    if (!email.trim() || !password.trim()) {
      toast({ title: 'E-Mail und Passwort sind erforderlich', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);

    const { data, error } = await supabase.functions.invoke('manage-coach', {
      body: { action: 'create', email: email.trim(), password },
    });

    setIsSubmitting(false);

    if (error || data?.error) {
      toast({ title: 'Fehler', description: data?.error || error?.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Coach erstellt', description: `${email} wurde als Coach eingeladen.` });
    setEmail('');
    setPassword('Coach2024!');
    setIsInviteOpen(false);
    fetchCoaches();
  };

  const handleRemove = async (coach: Coach) => {
    const { data, error } = await supabase.functions.invoke('manage-coach', {
      body: { action: 'delete', user_id: coach.user_id },
    });

    if (error || data?.error) {
      toast({ title: 'Fehler', description: data?.error || error?.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Coach-Rolle entfernt', description: `${coach.email} ist kein Coach mehr.` });
    fetchCoaches();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium text-muted-foreground">{coaches.length} Coach(es)</h3>
        <Button size="sm" onClick={() => setIsInviteOpen(true)} className="gap-1.5">
          <Plus className="w-4 h-4" />
          Coach einladen
        </Button>
      </div>

      {coaches.length === 0 ? (
        <div className="text-center py-12">
          <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Keine Coaches</h3>
          <p className="text-muted-foreground">Lade einen Coach ein, um loszulegen.</p>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>E-Mail</TableHead>
                <TableHead>Erstellt am</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coaches.map((coach) => (
                <TableRow key={coach.user_id}>
                  <TableCell className="font-medium">{coach.email}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(coach.created_at), 'dd. MMM yyyy', { locale: de })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleRemove(coach)}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Entfernen
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Invite Dialog */}
      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Coach einladen</DialogTitle>
            <DialogDescription>
              Erstelle einen neuen Coach-Account mit E-Mail und Passwort.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="coach-email">E-Mail</Label>
              <Input
                id="coach-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="coach@example.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="coach-password">Temporäres Passwort</Label>
              <Input
                id="coach-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInviteOpen(false)}>Abbrechen</Button>
            <Button onClick={handleCreate} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Erstellen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
