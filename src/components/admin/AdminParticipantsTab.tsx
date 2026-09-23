import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { formatDateInput, parseDateString, formatDateToInput } from '@/lib/dateUtils';
import { calculateMaxHR, calculateAgeFromBirthDate } from '@/lib/heartRateUtils';
import {
  Plus, Edit, Trash2, Loader2, Copy, Users, Search, RefreshCw,
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
}

function generatePassword(): string {
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let pw = '';
  for (let i = 0; i < 10; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  return pw + '!1';
}

export function AdminParticipantsTab() {
  const { toast } = useToast();
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<ParticipantRow | null>(null);
  const [deleteUser, setDeleteUser] = useState<ParticipantRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => { fetchParticipants(); }, []);

  const fetchParticipants = async () => {
    setIsLoading(true);
    const { data: roles } = await supabase.from('user_roles').select('user_id, role');
    const coachAdminUserIds = new Set(
      (roles || []).filter(r => r.role === 'coach' || r.role === 'admin').map(r => r.user_id)
    );
    const { data: profiles } = await supabase.from('profiles').select('*').order('name');
    const list: ParticipantRow[] = [];
    (profiles || []).forEach(p => {
      if (!p.user_id || !coachAdminUserIds.has(p.user_id)) {
        list.push({
          id: p.id, name: p.name, birth_date: p.birth_date, weight: p.weight,
          gender: p.gender, user_id: p.user_id, nickname: p.nickname, custom_max_hr: p.custom_max_hr,
        });
      }
    });
    setParticipants(list);
    setIsLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    setIsDeleting(true);
    const { data, error } = await supabase.functions.invoke('manage-coach', {
      body: { action: 'deleteParticipant', profile_id: deleteUser.id, user_id: deleteUser.user_id || null },
    });
    if (error || data?.error) {
      toast({ title: 'Deletion failed', description: data?.error || error?.message, variant: 'destructive' });
      setIsDeleting(false);
      return;
    }
    toast({ title: 'Participant deleted', description: `${deleteUser.name} was removed.` });
    setDeleteUser(null);
    setIsDeleting(false);
    fetchParticipants();
  };

  const filtered = participants.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', margin: 0 }}>
          Participants <span style={{ color: '#666', fontWeight: 400 }}>({participants.length})</span>
        </h2>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            background: '#ff4425', color: '#fff', border: 'none', borderRadius: '10px',
            padding: '8px 16px', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}
        >
          <Plus style={{ width: 14, height: 14 }} /> New Participant
        </button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '16px' }}>
        <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: '#666' }} />
        <input
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Name oder Email suchen..."
          style={{
            width: '100%', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '10px',
            height: '40px', color: '#fff', paddingLeft: '36px', paddingRight: '12px', fontSize: '14px',
            outline: 'none', boxSizing: 'border-box',
          }}
          onFocus={e => e.target.style.borderColor = '#ff4425'}
          onBlur={e => e.target.style.borderColor = '#2a2a2a'}
        />
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
          <Loader2 className="animate-spin" style={{ width: 32, height: 32, color: '#ff4425' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#666' }}>
          <Users style={{ width: 48, height: 48, margin: '0 auto 16px', opacity: 0.5 }} />
          <p>{searchTerm ? 'No matches.' : 'No participants available.'}</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1a1a1a' }}>
                {['Name', 'Birth Date', 'Weight', 'Gender', 'Actions'].map(h => (
                  <th key={h} style={{
                    textAlign: 'left', padding: '12px 16px', fontSize: '12px',
                    fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em',
                    background: '#111',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(row => (
                <tr key={row.id} style={{ borderBottom: '1px solid #1a1a1a' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#111')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '14px 16px', fontWeight: 500, color: '#fff' }}>{row.name}</td>
                  <td style={{ padding: '14px 16px', color: '#999' }}>
                    {row.birth_date ? format(new Date(row.birth_date), 'dd.MM.yyyy') : '–'}
                  </td>
                  <td style={{ padding: '14px 16px', color: '#999' }}>
                    {row.weight ? `${row.weight} kg` : '–'}
                  </td>
                  <td style={{ padding: '14px 16px', color: '#999' }}>
                    {row.gender === 'male' ? 'Male' : row.gender === 'female' ? 'Female' : '–'}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button onClick={() => setEditUser(row)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', padding: '4px' }}>
                        <Edit style={{ width: 16, height: 16 }} />
                      </button>
                      <button onClick={() => setDeleteUser(row)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff4425', padding: '4px' }}>
                        <Trash2 style={{ width: 16, height: 16 }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      <CreateParticipantModal open={showCreate} onOpenChange={setShowCreate} onCreated={fetchParticipants} />

      {/* Edit Modal */}
      {editUser && (
        <EditParticipantModal user={editUser} open={!!editUser} onOpenChange={o => !o && setEditUser(null)} onUpdated={fetchParticipants} />
      )}

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteUser} onOpenChange={o => !o && setDeleteUser(null)}>
        <AlertDialogContent style={{ background: '#111', border: '1px solid #2a2a2a' }}>
          <AlertDialogHeader>
            <AlertDialogTitle>{deleteUser?.name} Are you sure you want to delete</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} style={{ background: '#ff4425', color: '#fff' }}>
              {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ---- Create Modal ----
function CreateParticipantModal({ open, onOpenChange, onCreated }: {
  open: boolean; onOpenChange: (o: boolean) => void; onCreated: () => void;
}) {
  const { toast } = useToast();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState(generatePassword());
  const [birthDate, setBirthDate] = useState<Date | undefined>();
  const [dateInput, setDateInput] = useState('');
  const [weight, setWeight] = useState('');
  const [gender, setGender] = useState('');
  const [nickname, setNickname] = useState('');
  const [maxHrOverride, setMaxHrOverride] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pwCopied, setPwCopied] = useState(false);

  useEffect(() => { if (open) setPw(generatePassword()); }, [open]);

  const reset = () => {
    setFirstName(''); setLastName(''); setEmail(''); setBirthDate(undefined);
    setDateInput(''); setWeight(''); setGender(''); setNickname('');
    setMaxHrOverride(''); setIsSubmitting(false); setPwCopied(false);
  };

  const handleDateInputChange = (value: string) => {
    const formatted = formatDateInput(value);
    setDateInput(formatted);
    if (formatted.length === 10) {
      const parsed = parseDateString(formatted);
      if (parsed) setBirthDate(parsed);
    } else setBirthDate(undefined);
  };

  const handleCreate = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      toast({ title: 'Complete all required fields', variant: 'destructive' }); return;
    }
    if (!birthDate || !weight || !gender) {
      toast({ title: 'Date of birth, weight, and gender are required', variant: 'destructive' }); return;
    }
    setIsSubmitting(true);

    const fullName = `${firstName.trim()} ${lastName.trim()}`;
    const age = calculateAgeFromBirthDate(birthDate);
    const maxHr = calculateMaxHR(age);

    const { data, error } = await supabase.functions.invoke('manage-coach', {
      body: {
        action: 'create-participant',
        email: email.trim(),
        password: pw,
        name: fullName,
        nickname: nickname.trim() || null,
        birth_date: format(birthDate, 'yyyy-MM-dd'),
        age,
        max_hr: maxHr,
        custom_max_hr: maxHrOverride ? parseInt(maxHrOverride, 10) : null,
        weight: parseInt(weight, 10),
        gender,
      },
    });

    if (error || (data as any)?.error) {
      toast({
        title: 'Error',
        description: (data as any)?.error || error?.message || 'Could not create user',
        variant: 'destructive',
      });
      setIsSubmitting(false);
      return;
    }


    toast({ title: 'Participant created', description: `${fullName} was created successfully.` });
    setIsSubmitting(false); reset(); onOpenChange(false); onCreated();
  };

  const copyPw = () => { navigator.clipboard.writeText(pw); setPwCopied(true); setTimeout(() => setPwCopied(false), 2000); };

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: '16px', maxWidth: '480px' }}>
        <DialogHeader><DialogTitle>New Participant</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>First Name *</Label><Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First Name" /></div>
            <div className="space-y-1.5"><Label>Last Name *</Label><Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last Name" /></div>
          </div>
          <div className="space-y-1.5"><Label>Nickname (optional)</Label><Input value={nickname} onChange={e => setNickname(e.target.value)} placeholder="Optional" maxLength={30} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Email *</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" /></div>
            <div className="space-y-1.5">
              <Label>Password *</Label>
              <div className="flex gap-1">
                <Input value={pw} readOnly className="font-mono text-xs" />
                <Button variant="outline" size="icon" className="shrink-0" onClick={() => setPw(generatePassword())} title="New password">
                  <RefreshCw style={{ width: 14, height: 14 }} />
                </Button>
                <Button variant="outline" size="icon" className="shrink-0" onClick={copyPw} title="Copy">
                  <Copy style={{ width: 14, height: 14 }} />
                </Button>
              </div>
              {pwCopied && <p className="text-xs" style={{ color: '#22C55E' }}>Copied!</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Date of Birth *</Label>
              <div className="flex gap-1">
                <Input value={dateInput} onChange={e => handleDateInputChange(e.target.value)} placeholder="DD/MM/YYYY" className="flex-1" maxLength={10} />
                <Popover>
                  <PopoverTrigger asChild><Button variant="outline" size="icon" className="shrink-0">📅</Button></PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar mode="single" selected={birthDate} onSelect={d => { setBirthDate(d); setDateInput(d ? formatDateToInput(d) : ''); }} disabled={d => d > new Date() || d < new Date("1900-01-01")} initialFocus className={cn("p-3 pointer-events-auto")} captionLayout="dropdown-buttons" fromYear={1920} toYear={new Date().getFullYear()} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="space-y-1.5"><Label>Weight (kg) *</Label><Input type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="75" min={30} max={300} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Gender *</Label>
              <div style={{ display: 'flex', gap: '4px' }}>
                {(['male', 'female'] as const).map(g => (
                  <button key={g} onClick={() => setGender(g)} style={{
                    flex: 1, background: gender === g ? '#ff4425' : '#1a1a1a', color: gender === g ? '#fff' : '#666',
                    border: gender === g ? 'none' : '1px solid #2a2a2a', borderRadius: '8px', padding: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer',
                  }}>{g === 'male' ? 'Male' : 'Female'}</button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5"><Label>Max HR Override</Label><Input type="number" value={maxHrOverride} onChange={e => setMaxHrOverride(e.target.value)} placeholder="Tanaka formula" min={100} max={250} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>Cancel</Button>
          <Button onClick={handleCreate} disabled={isSubmitting} style={{ background: '#ff4425', color: '#fff' }}>
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---- Edit Modal ----
function EditParticipantModal({ user, open, onOpenChange, onUpdated }: {
  user: ParticipantRow; open: boolean; onOpenChange: (o: boolean) => void; onUpdated: () => void;
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
    if (formatted.length === 10) { const parsed = parseDateString(formatted); if (parsed) setBirthDate(parsed); }
    else setBirthDate(undefined);
  };

  const handleSave = async () => {
    if (!name.trim()) { toast({ title: 'Name is required', variant: 'destructive' }); return; }
    setIsSaving(true);
    const age = birthDate ? calculateAgeFromBirthDate(birthDate) : 30;
    const maxHr = calculateMaxHR(age);
    const { error } = await supabase.from('profiles').update({
      name: name.trim(), nickname: nickname.trim() || null,
      birth_date: birthDate ? format(birthDate, 'yyyy-MM-dd') : null,
      age, max_hr: maxHr, custom_max_hr: maxHrOverride ? parseInt(maxHrOverride, 10) : null,
      weight: weight ? parseInt(weight, 10) : null, gender: gender || null,
    }).eq('id', user.id);
    setIsSaving(false);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Profile updated' }); onOpenChange(false); onUpdated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: '16px', maxWidth: '480px' }}>
        <DialogHeader><DialogTitle>Edit Participant</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5"><Label>Name</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Nickname</Label><Input value={nickname} onChange={e => setNickname(e.target.value)} placeholder="Optional" maxLength={30} /></div>
          <div className="space-y-1.5">
            <Label>Date of Birth</Label>
            <div className="flex gap-2">
              <Input value={dateInput} onChange={e => handleDateInputChange(e.target.value)} placeholder="DD/MM/YYYY" className="flex-1" maxLength={10} />
              <Popover>
                <PopoverTrigger asChild><Button variant="outline" size="icon" className="shrink-0">📅</Button></PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar mode="single" selected={birthDate} onSelect={d => { setBirthDate(d); setDateInput(d ? formatDateToInput(d) : ''); }} disabled={d => d > new Date() || d < new Date("1900-01-01")} initialFocus className={cn("p-3 pointer-events-auto")} captionLayout="dropdown-buttons" fromYear={1920} toYear={new Date().getFullYear()} />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Weight (kg)</Label><Input type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="75" /></div>
            <div className="space-y-1.5">
              <Label>Gender</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5"><Label>Max HR Override</Label><Input type="number" value={maxHrOverride} onChange={e => setMaxHrOverride(e.target.value)} placeholder="Empty = Tanaka formula" min={100} max={250} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving} style={{ background: '#ff4425', color: '#fff' }}>
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
