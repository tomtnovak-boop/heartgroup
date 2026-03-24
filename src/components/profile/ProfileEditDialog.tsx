import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { calculateMaxHR, calculateAgeFromBirthDate } from '@/lib/heartRateUtils';
import { formatDateInput, parseDateString, formatDateToInput } from '@/lib/dateUtils';
import { Loader2, CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Profile {
  id: string;
  name: string;
  nickname?: string | null;
  age: number;
  max_hr: number;
  birth_date?: string | null;
  custom_max_hr?: number | null;
  weight?: number | null;
  height?: number | null;
  gender?: string | null;
}

interface ProfileEditDialogProps {
  profile: Profile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProfileUpdated: (profile: Profile) => void;
}

export function ProfileEditDialog({ profile, open, onOpenChange, onProfileUpdated }: ProfileEditDialogProps) {
  const [name, setName] = useState(profile.name);
  const [nickname, setNickname] = useState(profile.nickname || '');
  const [nicknameError, setNicknameError] = useState('');
  const [birthDate, setBirthDate] = useState<Date | undefined>(profile.birth_date ? new Date(profile.birth_date) : undefined);
  const [dateInput, setDateInput] = useState(profile.birth_date ? formatDateToInput(new Date(profile.birth_date)) : '');
  const [customMaxHr, setCustomMaxHr] = useState(profile.custom_max_hr?.toString() || '');
  const [weight, setWeight] = useState(profile.weight?.toString() || '');
  const [height, setHeight] = useState(profile.height?.toString() || '');
  const [gender, setGender] = useState<string>(profile.gender || '');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setName(profile.name); setNickname(profile.nickname || '');
    const date = profile.birth_date ? new Date(profile.birth_date) : undefined;
    setBirthDate(date); setDateInput(date ? formatDateToInput(date) : '');
    setCustomMaxHr(profile.custom_max_hr?.toString() || '');
    setWeight(profile.weight?.toString() || ''); setHeight(profile.height?.toString() || '');
    setGender(profile.gender || ''); setNicknameError('');
  }, [profile]);

  const handleDateInputChange = (value: string) => {
    const formatted = formatDateInput(value); setDateInput(formatted);
    if (formatted.length === 10) { const parsed = parseDateString(formatted); if (parsed) setBirthDate(parsed); }
    else setBirthDate(undefined);
  };

  const handleCalendarSelect = (date: Date | undefined) => { setBirthDate(date); setDateInput(date ? formatDateToInput(date) : ''); };

  const calculatedAge = birthDate ? calculateAgeFromBirthDate(birthDate) : profile.age;
  const calculatedMaxHr = calculateMaxHR(calculatedAge);
  const effectiveMaxHr = customMaxHr ? parseInt(customMaxHr) : calculatedMaxHr;

  const checkNicknameAvailability = async (value: string) => {
    if (!value.trim()) { setNicknameError(''); return; }
    const { data } = await supabase.from('profiles').select('id').eq('nickname', value.trim()).neq('id', profile.id).maybeSingle();
    setNicknameError(data ? 'This nickname is already taken' : '');
  };

  const handleSave = async () => {
    if (!name.trim()) { toast({ title: 'Name is required', variant: 'destructive' }); return; }
    if (!birthDate) { toast({ title: 'Date of birth is required', variant: 'destructive' }); return; }
    const age = calculateAgeFromBirthDate(birthDate);
    if (age < 10 || age > 120) { toast({ title: 'Calculated age must be between 10 and 120', variant: 'destructive' }); return; }
    const parsedCustomMaxHr = customMaxHr ? parseInt(customMaxHr, 10) : null;
    if (customMaxHr && (isNaN(parsedCustomMaxHr!) || parsedCustomMaxHr! < 100 || parsedCustomMaxHr! > 250)) {
      toast({ title: 'Custom Max HR must be between 100 and 250', variant: 'destructive' }); return;
    }
    if (nickname.trim()) {
      const { data: existingNickname } = await supabase.from('profiles').select('id').eq('nickname', nickname.trim()).neq('id', profile.id).maybeSingle();
      if (existingNickname) { toast({ title: 'Nickname already taken', variant: 'destructive' }); return; }
    }

    setIsLoading(true);
    const maxHr = calculateMaxHR(age);
    const { data, error } = await supabase.from('profiles').update({
      name: name.trim(), nickname: nickname.trim() || null,
      birth_date: format(birthDate, 'yyyy-MM-dd'), age, max_hr: maxHr,
      custom_max_hr: parsedCustomMaxHr, weight: weight ? parseInt(weight, 10) : null,
      height: height ? parseInt(height, 10) : null, gender: gender || null,
    }).eq('id', profile.id).select().single();
    setIsLoading(false);

    if (error) { toast({ title: 'Error saving', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Profile updated successfully' });
    onProfileUpdated(data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>Update your personal data for heart rate calculation.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 overflow-y-auto flex-1">
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" maxLength={100} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="nickname">Nickname (optional)</Label>
            <Input id="nickname" value={nickname} onChange={(e) => { setNickname(e.target.value); checkNicknameAvailability(e.target.value); }} placeholder="Shown on the dashboard" maxLength={30} className={cn(nicknameError && "border-destructive")} />
            {nicknameError && <p className="text-xs text-destructive">{nicknameError}</p>}
            <p className="text-xs text-muted-foreground">Displayed instead of your name on the coach dashboard</p>
          </div>
          <div className="grid gap-2">
            <Label>Date of Birth</Label>
            <div className="flex gap-2">
              <Input value={dateInput} onChange={(e) => handleDateInputChange(e.target.value)} placeholder="DD/MM/YYYY" className="flex-1" maxLength={10} />
              <Popover>
                <PopoverTrigger asChild><Button variant="outline" size="icon" className="shrink-0"><CalendarIcon className="h-4 w-4" /></Button></PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar mode="single" selected={birthDate} onSelect={handleCalendarSelect} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} initialFocus className={cn("p-3 pointer-events-auto")} captionLayout="dropdown-buttons" fromYear={1920} toYear={new Date().getFullYear()} />
                </PopoverContent>
              </Popover>
            </div>
            <p className="text-xs text-muted-foreground">
              {birthDate ? `${format(birthDate, "MMMM d, yyyy")} • Age: ${calculatedAge} years` : 'Format: DD/MM/YYYY (e.g. 15/03/1990)'}
            </p>
          </div>
          <div className="grid gap-2 p-3 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium">Estimated Max HR (Tanaka): <span className="text-primary">{calculatedMaxHr} bpm</span></p>
            <p className="text-xs text-muted-foreground">Formula: 208 - (0.7 × {calculatedAge}) = {calculatedMaxHr}</p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="customMaxHr">Custom Max HR (optional)</Label>
            <Input id="customMaxHr" type="number" value={customMaxHr} onChange={(e) => setCustomMaxHr(e.target.value)} placeholder="Empty = automatic calculation" min={100} max={250} />
            <p className="text-xs text-muted-foreground">
              {customMaxHr ? `Active Max HR: ${effectiveMaxHr} bpm (overrides Tanaka)` : 'Overrides the Tanaka calculation when set'}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label>Gender</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2"><Label htmlFor="weight">Weight (kg)</Label><Input id="weight" type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="e.g. 75" min={30} max={300} /></div>
            <div className="grid gap-2"><Label htmlFor="height">Height (cm)</Label><Input id="height" type="number" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="e.g. 175" min={100} max={250} /></div>
          </div>
          <p className="text-xs text-muted-foreground">Gender, weight, and height are needed for calorie calculation.</p>
        </div>
        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={isLoading || !!nicknameError}>{isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
