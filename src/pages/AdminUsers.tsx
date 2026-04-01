import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { formatDateInput, parseDateString, formatDateToInput } from '@/lib/dateUtils';
import { calculateMaxHR, calculateAgeFromBirthDate } from '@/lib/heartRateUtils';
import {
  ArrowLeft, Plus, Edit, Trash2, Loader2, Copy, Users, Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

interface ParticipantRow {
  id: string;
  name: string;
  birth_date: string | null;
  weight: number | null;
  gender: string | null;
  user_id: string | null;
  nickname: string | null;
  custom_max_hr: number | null;
  height: number | null;
}

interface CoachRow {
  id: string;
  name: string;
  user_id: string | null;
  role: string;
}

function generatePassword() {
  return Math.random().toString(36).slice(-8) + 'A1!';
}

export default function AdminUsers() {
  const navigate = useNavigate();
  const { isAdmin } = useAuthContext();
  const { toast } = useToast();
  const [tab, setTab] = useState<'participants' | 'coaches'>('participants');
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [coaches, setCoaches] = useState<CoachRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Create user modal
  const [showCreate, setShowCreate] = useState(false);
  const [createTab, setCreateTab] = useState<'participant' | 'coach'>('participant');

  // Edit modal
  const [editUser, setEditUser] = useState<ParticipantRow | null>(null);

  // Delete dialog
  const [deleteUser, setDeleteUser] = useState<{ id: string; name: string; user_id: string | null } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard', { replace: true });
      return;
    }
    fetchAll();
  }, [isAdmin]);

  const fetchAll = async () => {
    setIsLoading(true);

    // Get all user_roles
    const { data: roles } = await supabase.from('user_roles').select('user_id, role');
    const coachAdminUserIds = new Set(
      (roles || []).filter(r => r.role === 'coach' || r.role === 'admin').map(r => r.user_id)
    );

    // Get all profiles
    const { data: profiles } = await supabase.from('profiles').select('*').order('name');

    const participantList: ParticipantRow[] = [];
    const coachList: CoachRow[] = [];

    (profiles || []).forEach(p => {
      if (p.user_id && coachAdminUserIds.has(p.user_id)) {
        const role = (roles || []).find(r => r.user_id === p.user_id && (r.role === 'admin' || r.role === 'coach'));
        coachList.push({ id: p.id, name: p.name, user_id: p.user_id, role: role?.role || 'coach' });
      } else {
        participantList.push({
          id: p.id, name: p.name, birth_date: p.birth_date, weight: p.weight,
          gender: p.gender, user_id: p.user_id, nickname: p.nickname,
          custom_max_hr: p.custom_max_hr, height: p.height,
        });
      }
    });

    setParticipants(participantList);
    setCoaches(coachList);
    setIsLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    setIsDeleting(true);

    // Delete profiles entry
    await supabase.from('profiles').delete().eq('id', deleteUser.id);

    // Delete user_roles if user_id exists
    if (deleteUser.user_id) {
      await supabase.from('user_roles').delete().eq('user_id', deleteUser.user_id);
    }

    toast({ title: 'User gelöscht', description: `${deleteUser.name} wurde entfernt.` });
    setDeleteUser(null);
    setIsDeleting(false);
    fetchAll();
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff' }}>
      {/* Header */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', borderBottom: '1px solid #1f1f1f',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <span style={{ fontWeight: 900, letterSpacing: '0.15em', textTransform: 'uppercase', fontSize: '16px' }}>
            <span style={{ color: '#fff' }}>BALBOA</span>
            <span style={{ color: '#ff4425' }}>MOVE</span>
          </span>
        </div>
        <Button
          onClick={() => { setShowCreate(true); setCreateTab(tab === 'coaches' ? 'coach' : 'participant'); }}
          style={{ background: '#ff4425', color: '#fff', borderRadius: '10px', fontWeight: 700, height: '40px', border: 'none' }}
          className="gap-1.5"
        >
          <Plus className="w-4 h-4" /> Neuer User
        </Button>
      </header>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', padding: '12px 16px' }}>
        <button
          onClick={() => setTab('participants')}
          style={{
            background: tab === 'participants' ? '#ff4425' : 'transparent',
            color: tab === 'participants' ? '#fff' : '#666',
            border: 'none', borderRadius: '8px', padding: '8px 20px',
            fontWeight: 700, fontSize: '14px', cursor: 'pointer',
          }}
        >
          Teilnehmer
        </button>
        <button
          onClick={() => setTab('coaches')}
          style={{
            background: tab === 'coaches' ? '#ff4425' : 'transparent',
            color: tab === 'coaches' ? '#fff' : '#666',
            border: 'none', borderRadius: '8px', padding: '8px 20px',
            fontWeight: 700, fontSize: '14px', cursor: 'pointer',
          }}
        >
          Coaches
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: '0 16px 24px' }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
            <Loader2 className="animate-spin" style={{ width: 32, height: 32, color: '#ff4425' }} />
          </div>
        ) : tab === 'participants' ? (
          <ParticipantTable
            rows={participants}
            onEdit={(p) => setEditUser(p)}
            onDelete={(p) => setDeleteUser({ id: p.id, name: p.name, user_id: p.user_id })}
          />
        ) : (
          <CoachTable
            rows={coaches}
            onDelete={(c) => setDeleteUser({ id: c.id, name: c.name, user_id: c.user_id })}
          />
        )}
      </div>

      {/* Create User Modal */}
      <CreateUserModal
        open={showCreate}
        onOpenChange={setShowCreate}
        tab={createTab}
        onTabChange={setCreateTab}
        onCreated={fetchAll}
      />

      {/* Edit Modal */}
      {editUser && (
        <EditUserModal
          user={editUser}
          open={!!editUser}
          onOpenChange={(open) => !open && setEditUser(null)}
          onUpdated={fetchAll}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteUser} onOpenChange={(open) => !open && setDeleteUser(null)}>
        <AlertDialogContent style={{ background: '#111', border: '1px solid #2a2a2a' }}>
          <AlertDialogHeader>
            <AlertDialogTitle>User löschen</AlertDialogTitle>
            <AlertDialogDescription>
              User <strong>{deleteUser?.name}</strong> wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              style={{ background: '#ff4425', color: '#fff' }}
            >
              {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ---- Sub-components ----

function ParticipantTable({ rows, onEdit, onDelete }: {
  rows: ParticipantRow[];
  onEdit: (p: ParticipantRow) => void;
  onDelete: (p: ParticipantRow) => void;
}) {
  if (rows.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0', color: '#666' }}>
        <Users style={{ width: 48, height: 48, margin: '0 auto 16px', opacity: 0.5 }} />
        <p>Keine Teilnehmer vorhanden.</p>
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #1a1a1a' }}>
            {['Name', 'Geburtsdatum', 'Gewicht', 'Geschlecht', 'Aktionen'].map(h => (
              <th key={h} style={{
                textAlign: 'left', padding: '12px 16px', fontSize: '12px',
                fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em',
                background: '#111',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.id} style={{ borderBottom: '1px solid #1a1a1a' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#111')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <td style={{ padding: '14px 16px', fontWeight: 500 }}>{row.name}</td>
              <td style={{ padding: '14px 16px', color: '#999' }}>
                {row.birth_date ? format(new Date(row.birth_date), 'dd.MM.yyyy') : '–'}
              </td>
              <td style={{ padding: '14px 16px', color: '#999' }}>
                {row.weight ? `${row.weight} kg` : '–'}
              </td>
              <td style={{ padding: '14px 16px', color: '#999' }}>
                {row.gender === 'male' ? 'Männlich' : row.gender === 'female' ? 'Weiblich' : '–'}
              </td>
              <td style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button onClick={() => onEdit(row)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', padding: '4px' }}>
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => onDelete(row)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff4425', padding: '4px' }}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CoachTable({ rows, onDelete }: {
  rows: CoachRow[];
  onDelete: (c: CoachRow) => void;
}) {
  if (rows.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0', color: '#666' }}>
        <Shield style={{ width: 48, height: 48, margin: '0 auto 16px', opacity: 0.5 }} />
        <p>Keine Coaches vorhanden.</p>
      </div>
    );
  }

  return (
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
          {rows.map(row => (
            <tr key={row.id} style={{ borderBottom: '1px solid #1a1a1a' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#111')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <td style={{ padding: '14px 16px', fontWeight: 500 }}>{row.name}</td>
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
                <button onClick={() => onDelete(row)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff4425', padding: '4px' }}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CreateUserModal({ open, onOpenChange, tab, onTabChange, onCreated }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  tab: 'participant' | 'coach';
  onTabChange: (t: 'participant' | 'coach') => void;
  onCreated: () => void;
}) {
  const { toast } = useToast();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [pw] = useState(generatePassword());
  const [birthDate, setBirthDate] = useState<Date | undefined>();
  const [dateInput, setDateInput] = useState('');
  const [weight, setWeight] = useState('');
  const [gender, setGender] = useState('');
  const [nickname, setNickname] = useState('');
  const [maxHrOverride, setMaxHrOverride] = useState('');
  const [coachRole, setCoachRole] = useState<'coach' | 'admin'>('coach');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pwCopied, setPwCopied] = useState(false);

  const reset = () => {
    setFirstName(''); setLastName(''); setEmail('');
    setBirthDate(undefined); setDateInput(''); setWeight('');
    setGender(''); setNickname(''); setMaxHrOverride('');
    setCoachRole('coach'); setIsSubmitting(false); setPwCopied(false);
  };

  const handleDateInputChange = (value: string) => {
    const formatted = formatDateInput(value);
    setDateInput(formatted);
    if (formatted.length === 10) {
      const parsed = parseDateString(formatted);
      if (parsed) setBirthDate(parsed);
    } else {
      setBirthDate(undefined);
    }
  };

  const handleCreate = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      toast({ title: 'Pflichtfelder ausfüllen', variant: 'destructive' }); return;
    }

    if (tab === 'participant' && (!birthDate || !weight || !gender)) {
      toast({ title: 'Geburtsdatum, Gewicht und Geschlecht sind Pflichtfelder', variant: 'destructive' }); return;
    }

    setIsSubmitting(true);

    // 1. Sign up user
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password: pw,
      options: { emailRedirectTo: window.location.origin },
    });

    if (signUpError || !signUpData.user) {
      toast({ title: 'Fehler', description: signUpError?.message || 'User konnte nicht erstellt werden', variant: 'destructive' });
      setIsSubmitting(false);
      return;
    }

    const userId = signUpData.user.id;
    const fullName = `${firstName.trim()} ${lastName.trim()}`;
    const age = birthDate ? calculateAgeFromBirthDate(birthDate) : 30;
    const maxHr = calculateMaxHR(age);
    const parsedMaxHrOverride = maxHrOverride ? parseInt(maxHrOverride, 10) : null;

    // 2. Upsert profile
    await supabase.from('profiles').upsert({
      user_id: userId,
      name: fullName,
      nickname: nickname.trim() || null,
      birth_date: birthDate ? format(birthDate, 'yyyy-MM-dd') : null,
      age,
      max_hr: maxHr,
      custom_max_hr: parsedMaxHrOverride,
      weight: weight ? parseInt(weight, 10) : null,
      gender: gender || null,
    });

    // 3. Set role for coaches/admins
    if (tab === 'coach') {
      await supabase.from('user_roles').insert({
        user_id: userId,
        role: coachRole,
      });
    }

    toast({ title: 'User erstellt', description: `${fullName} wurde erfolgreich angelegt.` });
    setIsSubmitting(false);
    reset();
    onOpenChange(false);
    onCreated();
  };

  const copyPassword = () => {
    navigator.clipboard.writeText(pw);
    setPwCopied(true);
    setTimeout(() => setPwCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: '16px', maxWidth: '480px' }}>
        <DialogHeader>
          <DialogTitle>Neuer User</DialogTitle>
        </DialogHeader>

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
          <button
            onClick={() => onTabChange('participant')}
            style={{
              background: tab === 'participant' ? '#ff4425' : 'transparent',
              color: tab === 'participant' ? '#fff' : '#666',
              border: 'none', borderRadius: '8px', padding: '6px 16px',
              fontWeight: 700, fontSize: '13px', cursor: 'pointer',
            }}
          >
            Teilnehmer
          </button>
          <button
            onClick={() => onTabChange('coach')}
            style={{
              background: tab === 'coach' ? '#ff4425' : 'transparent',
              color: tab === 'coach' ? '#fff' : '#666',
              border: 'none', borderRadius: '8px', padding: '6px 16px',
              fontWeight: 700, fontSize: '13px', cursor: 'pointer',
            }}
          >
            Coach
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Vorname *</Label>
              <Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Vorname" />
            </div>
            <div className="space-y-1.5">
              <Label>Nachname *</Label>
              <Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Nachname" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Email *</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" />
          </div>

          <div className="space-y-1.5">
            <Label>Passwort (auto-generiert)</Label>
            <div className="flex gap-2">
              <Input value={pw} readOnly className="font-mono" />
              <Button variant="outline" size="icon" onClick={copyPassword} className="shrink-0">
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            {pwCopied && <p className="text-xs" style={{ color: '#22C55E' }}>Kopiert!</p>}
          </div>

          {tab === 'participant' && (
            <>
              <div className="space-y-1.5">
                <Label>Geburtsdatum *</Label>
                <div className="flex gap-2">
                  <Input value={dateInput} onChange={e => handleDateInputChange(e.target.value)} placeholder="DD/MM/YYYY" className="flex-1" maxLength={10} />
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="icon" className="shrink-0">📅</Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        mode="single" selected={birthDate}
                        onSelect={(d) => { setBirthDate(d); setDateInput(d ? formatDateToInput(d) : ''); }}
                        disabled={(d) => d > new Date() || d < new Date("1900-01-01")}
                        initialFocus className={cn("p-3 pointer-events-auto")}
                        captionLayout="dropdown-buttons" fromYear={1920} toYear={new Date().getFullYear()}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Gewicht (kg) *</Label>
                  <Input type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="75" min={30} max={300} />
                </div>
                <div className="space-y-1.5">
                  <Label>Geschlecht *</Label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger><SelectValue placeholder="Wählen" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Männlich</SelectItem>
                      <SelectItem value="female">Weiblich</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Nickname (optional)</Label>
                <Input value={nickname} onChange={e => setNickname(e.target.value)} placeholder="Optional" maxLength={30} />
              </div>

              <div className="space-y-1.5">
                <Label>Max HR Override (optional)</Label>
                <Input type="number" value={maxHrOverride} onChange={e => setMaxHrOverride(e.target.value)} placeholder="Leer = Tanaka-Formel" min={100} max={250} />
              </div>
            </>
          )}

          {tab === 'coach' && (
            <div className="space-y-1.5">
              <Label>Rolle</Label>
              <Select value={coachRole} onValueChange={(v) => setCoachRole(v as 'coach' | 'admin')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="coach">Coach</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>Abbrechen</Button>
          <Button
            onClick={handleCreate}
            disabled={isSubmitting}
            style={{ background: '#ff4425', color: '#fff' }}
          >
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {tab === 'participant' ? 'User erstellen' : 'Coach erstellen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditUserModal({ user, open, onOpenChange, onUpdated }: {
  user: ParticipantRow;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onUpdated: () => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState(user.name);
  const [nickname, setNickname] = useState(user.nickname || '');
  const [birthDate, setBirthDate] = useState<Date | undefined>(user.birth_date ? new Date(user.birth_date) : undefined);
  const [dateInput, setDateInput] = useState(user.birth_date ? formatDateToInput(new Date(user.birth_date)) : '');
  const [weight, setWeight] = useState(user.weight?.toString() || '');
  const [gender, setGender] = useState(user.gender || '');
  const [maxHrOverride, setMaxHrOverride] = useState(user.custom_max_hr?.toString() || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleDateInputChange = (value: string) => {
    const formatted = formatDateInput(value);
    setDateInput(formatted);
    if (formatted.length === 10) {
      const parsed = parseDateString(formatted);
      if (parsed) setBirthDate(parsed);
    } else {
      setBirthDate(undefined);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) { toast({ title: 'Name ist Pflichtfeld', variant: 'destructive' }); return; }
    setIsSaving(true);

    const age = birthDate ? calculateAgeFromBirthDate(birthDate) : 30;
    const maxHr = calculateMaxHR(age);
    const parsedMaxHr = maxHrOverride ? parseInt(maxHrOverride, 10) : null;

    const { error } = await supabase.from('profiles').update({
      name: name.trim(),
      nickname: nickname.trim() || null,
      birth_date: birthDate ? format(birthDate, 'yyyy-MM-dd') : null,
      age,
      max_hr: maxHr,
      custom_max_hr: parsedMaxHr,
      weight: weight ? parseInt(weight, 10) : null,
      gender: gender || null,
    }).eq('id', user.id);

    setIsSaving(false);
    if (error) { toast({ title: 'Fehler', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Profil aktualisiert' });
    onOpenChange(false);
    onUpdated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: '16px', maxWidth: '480px' }}>
        <DialogHeader>
          <DialogTitle>User bearbeiten</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Nickname</Label>
            <Input value={nickname} onChange={e => setNickname(e.target.value)} placeholder="Optional" maxLength={30} />
          </div>
          <div className="space-y-1.5">
            <Label>Geburtsdatum</Label>
            <div className="flex gap-2">
              <Input value={dateInput} onChange={e => handleDateInputChange(e.target.value)} placeholder="DD/MM/YYYY" className="flex-1" maxLength={10} />
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon" className="shrink-0">📅</Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single" selected={birthDate}
                    onSelect={(d) => { setBirthDate(d); setDateInput(d ? formatDateToInput(d) : ''); }}
                    disabled={(d) => d > new Date() || d < new Date("1900-01-01")}
                    initialFocus className={cn("p-3 pointer-events-auto")}
                    captionLayout="dropdown-buttons" fromYear={1920} toYear={new Date().getFullYear()}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Gewicht (kg)</Label>
              <Input type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="75" />
            </div>
            <div className="space-y-1.5">
              <Label>Geschlecht</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger><SelectValue placeholder="Wählen" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Männlich</SelectItem>
                  <SelectItem value="female">Weiblich</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Max HR Override</Label>
            <Input type="number" value={maxHrOverride} onChange={e => setMaxHrOverride(e.target.value)} placeholder="Leer = Tanaka-Formel" min={100} max={250} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
          <Button onClick={handleSave} disabled={isSaving} style={{ background: '#ff4425', color: '#fff' }}>
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
