import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import {
  Plus, Trash2, Loader2, Shield, Eye, EyeOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface CoachRow {
  id: string;
  name: string;
  user_id: string | null;
  role: string;
}

export function AdminCoachesTab() {
  const { user } = useAuthContext();
  const { toast } = useToast();
  const [coaches, setCoaches] = useState<CoachRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteCoach, setDeleteCoach] = useState<CoachRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => { fetchCoaches(); }, []);

  const fetchCoaches = async () => {
    setIsLoading(true);
    const { data: roles } = await supabase.from('user_roles').select('user_id, role');
    const coachAdminRoles = (roles || []).filter(r => r.role === 'coach' || r.role === 'admin');
    const userIds = coachAdminRoles.map(r => r.user_id);

    if (userIds.length === 0) { setCoaches([]); setIsLoading(false); return; }

    const { data: profiles } = await supabase.from('profiles').select('id, name, user_id').in('user_id', userIds);
    const roleMap = new Map(coachAdminRoles.map(r => [r.user_id, r.role]));

    const list: CoachRow[] = (profiles || []).map(p => ({
      id: p.id, name: p.name, user_id: p.user_id, role: roleMap.get(p.user_id!) || 'coach',
    }));
    list.sort((a, b) => a.name.localeCompare(b.name));
    setCoaches(list);
    setIsLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteCoach) return;
    setIsDeleting(true);
    await supabase.from('profiles').delete().eq('id', deleteCoach.id);
    if (deleteCoach.user_id) {
      await supabase.from('user_roles').delete().eq('user_id', deleteCoach.user_id);
    }
    toast({ title: 'Coach gelöscht', description: `${deleteCoach.name} wurde entfernt.` });
    setDeleteCoach(null);
    setIsDeleting(false);
    fetchCoaches();
  };

  const isSelf = (c: CoachRow) => c.user_id === user?.id;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', margin: 0 }}>
          Coaches <span style={{ color: '#666', fontWeight: 400 }}>({coaches.length})</span>
        </h2>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            background: '#ff4425', color: '#fff', border: 'none', borderRadius: '10px',
            padding: '8px 16px', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}
        >
          <Plus style={{ width: 14, height: 14 }} /> Neuer Coach
        </button>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
          <Loader2 className="animate-spin" style={{ width: 32, height: 32, color: '#ff4425' }} />
        </div>
      ) : coaches.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#666' }}>
          <Shield style={{ width: 48, height: 48, margin: '0 auto 16px', opacity: 0.5 }} />
          <p>Keine Coaches vorhanden.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1a1a1a' }}>
                {['Name', 'Rolle', 'Aktionen'].map(h => (
                  <th key={h} style={{
                    textAlign: 'left', padding: '12px 16px', fontSize: '12px',
                    fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em',
                    background: '#111',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {coaches.map(row => (
                <tr key={row.id} style={{ borderBottom: '1px solid #1a1a1a' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#111')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '14px 16px', fontWeight: 500, color: '#fff' }}>{row.name}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      background: row.role === 'admin' ? 'rgba(255,68,37,0.15)' : '#1a1a1a',
                      color: row.role === 'admin' ? '#ff4425' : '#999',
                      borderRadius: '6px', padding: '3px 10px', fontSize: '12px', fontWeight: 700,
                    }}>
                      {row.role}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    {isSelf(row) ? (
                      <span style={{ fontSize: '12px', color: '#666' }} title="Du kannst dich nicht selbst löschen">–</span>
                    ) : (
                      <button onClick={() => setDeleteCoach(row)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff4425', padding: '4px' }}>
                        <Trash2 style={{ width: 16, height: 16 }} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateCoachModal open={showCreate} onOpenChange={setShowCreate} onCreated={fetchCoaches} />

      <AlertDialog open={!!deleteCoach} onOpenChange={o => !o && setDeleteCoach(null)}>
        <AlertDialogContent style={{ background: '#111', border: '1px solid #2a2a2a' }}>
          <AlertDialogHeader>
            <AlertDialogTitle>{deleteCoach?.name} wirklich löschen?</AlertDialogTitle>
            <AlertDialogDescription>Diese Aktion kann nicht rückgängig gemacht werden.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} style={{ background: '#ff4425', color: '#fff' }}>
              {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CreateCoachModal({ open, onOpenChange, onCreated }: {
  open: boolean; onOpenChange: (o: boolean) => void; onCreated: () => void;
}) {
  const { toast } = useToast();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<'coach' | 'admin'>('coach');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reset = () => {
    setFirstName(''); setLastName(''); setEmail(''); setPassword(''); setRole('coach');
    setIsSubmitting(false); setShowPassword(false);
  };

  const handleCreate = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      toast({ title: 'Pflichtfelder ausfüllen', variant: 'destructive' }); return;
    }
    if (password.length < 8) {
      toast({ title: 'Passwort muss mindestens 8 Zeichen haben', variant: 'destructive' }); return;
    }
    setIsSubmitting(true);

    const fullName = `${firstName.trim()} ${lastName.trim()}`;

    const { data, error } = await supabase.functions.invoke('manage-coach', {
      body: { action: 'create', email: email.trim(), password, name: fullName, role },
    });

    if (error || data?.error) {
      toast({ title: 'Fehler', description: data?.error || error?.message || 'Coach konnte nicht erstellt werden', variant: 'destructive' });
      setIsSubmitting(false); return;
    }

    toast({ title: 'Coach erstellt', description: `${fullName} wurde als ${role} angelegt.` });
    setIsSubmitting(false); reset(); onOpenChange(false); onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: '16px', maxWidth: '480px' }}>
        <DialogHeader><DialogTitle>Neuer Coach</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Vorname *</Label><Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Vorname" /></div>
            <div className="space-y-1.5"><Label>Nachname *</Label><Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Nachname" /></div>
          </div>
          <div className="space-y-1.5"><Label>Email *</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" /></div>
          <div className="space-y-1.5">
            <Label>Passwort *</Label>
            <div className="flex gap-1">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mindestens 8 Zeichen"
              />
              <Button variant="outline" size="icon" className="shrink-0" onClick={() => setShowPassword(!showPassword)} title={showPassword ? 'Verbergen' : 'Anzeigen'}>
                {showPassword ? <EyeOff style={{ width: 14, height: 14 }} /> : <Eye style={{ width: 14, height: 14 }} />}
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Rolle *</Label>
            <div style={{ display: 'flex', gap: '4px' }}>
              {(['coach', 'admin'] as const).map(r => (
                <button key={r} onClick={() => setRole(r)} style={{
                  flex: 1, background: role === r ? '#ff4425' : '#1a1a1a', color: role === r ? '#fff' : '#666',
                  border: role === r ? 'none' : '1px solid #2a2a2a', borderRadius: '8px', padding: '8px',
                  fontWeight: 600, fontSize: '13px', cursor: 'pointer', textTransform: 'capitalize',
                }}>{r}</button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>Abbrechen</Button>
          <Button onClick={handleCreate} disabled={isSubmitting} style={{ background: '#ff4425', color: '#fff' }}>
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Coach erstellen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
