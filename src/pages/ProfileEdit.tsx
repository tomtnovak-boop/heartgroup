import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { calculateMaxHR, calculateAgeFromBirthDate } from '@/lib/heartRateUtils';
import { formatDateInput, parseDateString, formatDateToInput } from '@/lib/dateUtils';
import { logParticipantRedirect } from '@/lib/roleRouting';
import { Loader2, CalendarIcon, ArrowLeft, LogOut } from 'lucide-react';
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

export default function ProfileEdit() {
  const navigate = useNavigate();
  const { user, signOut } = useAuthContext();
  const { toast } = useToast();

  const handleSignOut = async () => { await signOut(); };
  const navigateToParticipant = (source: string) => {
    logParticipantRedirect(source);
    navigate('/participant');
  };

  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [nicknameError, setNicknameError] = useState('');
  const [birthDate, setBirthDate] = useState<Date | undefined>();
  const [dateInput, setDateInput] = useState('');
  const [customMaxHr, setCustomMaxHr] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [gender, setGender] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (error || !data) {
        toast({ title: 'Could not load profile', variant: 'destructive' });
        navigateToParticipant('ProfileEdit.fetchProfile.missingProfile');
        return;
      }
      setProfile(data);
      setName(data.name);
      setNickname(data.nickname || '');
      const date = data.birth_date ? new Date(data.birth_date) : undefined;
      setBirthDate(date);
      setDateInput(date ? formatDateToInput(date) : '');
      setCustomMaxHr(data.custom_max_hr?.toString() || '');
      setWeight(data.weight?.toString() || '');
      setHeight(data.height?.toString() || '');
      setGender(data.gender || '');
      setIsLoadingProfile(false);
    };
    fetchProfile();
  }, [user]);

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

  const handleCalendarSelect = (date: Date | undefined) => {
    setBirthDate(date);
    setDateInput(date ? formatDateToInput(date) : '');
  };

  const calculatedAge = birthDate ? calculateAgeFromBirthDate(birthDate) : profile?.age || 0;
  const calculatedMaxHr = calculateMaxHR(calculatedAge);
  const effectiveMaxHr = customMaxHr ? parseInt(customMaxHr) : calculatedMaxHr;

  const checkNicknameAvailability = async (value: string) => {
    if (!value.trim() || !profile) { setNicknameError(''); return; }
    const { data } = await supabase.from('profiles').select('id').eq('nickname', value.trim()).neq('id', profile.id).maybeSingle();
    setNicknameError(data ? 'This nickname is already taken' : '');
  };

  const handleSave = async () => {
    if (!profile) return;
    if (!name.trim()) { toast({ title: 'Name is required', variant: 'destructive' }); return; }
    if (!birthDate) { toast({ title: 'Date of birth is required', variant: 'destructive' }); return; }
    const age = calculateAgeFromBirthDate(birthDate);
    if (age < 10 || age > 120) { toast({ title: 'Age must be between 10 and 120', variant: 'destructive' }); return; }
    const parsedCustomMaxHr = customMaxHr ? parseInt(customMaxHr, 10) : null;
    if (customMaxHr && (isNaN(parsedCustomMaxHr!) || parsedCustomMaxHr! < 100 || parsedCustomMaxHr! > 250)) {
      toast({ title: 'Custom Max HR must be between 100 and 250', variant: 'destructive' }); return;
    }
    if (nickname.trim()) {
      const { data: existing } = await supabase.from('profiles').select('id').eq('nickname', nickname.trim()).neq('id', profile.id).maybeSingle();
      if (existing) { toast({ title: 'Nickname already taken', variant: 'destructive' }); return; }
    }

    setIsSaving(true);
    const maxHr = calculateMaxHR(age);
    const { error } = await supabase.from('profiles').update({
      name: name.trim(),
      nickname: nickname.trim() || null,
      birth_date: format(birthDate, 'yyyy-MM-dd'),
      age,
      max_hr: maxHr,
      custom_max_hr: parsedCustomMaxHr,
      weight: weight ? parseInt(weight, 10) : null,
      height: height ? parseInt(height, 10) : null,
      gender: gender || null,
    }).eq('id', profile.id);
    setIsSaving(false);

    if (error) {
      toast({ title: 'Error saving', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Profile updated successfully' });
    navigateToParticipant('ProfileEdit.handleSave.success');
  };

  if (isLoadingProfile) {
    return (
      <div className="participant-theme min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="participant-theme min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigateToParticipant('ProfileEdit.headerBack')} className="h-8 w-8">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-bold flex-1">Edit Profile</h1>
        <Button variant="ghost" size="icon" onClick={handleSignOut} className="h-8 w-8" title="Sign out">
          <LogOut className="w-4 h-4" />
        </Button>
      </header>

      {/* Form */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
        {/* Name + Nickname */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" maxLength={100} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nickname">Nickname (optional)</Label>
            <Input
              id="nickname"
              value={nickname}
              onChange={(e) => { setNickname(e.target.value); checkNicknameAvailability(e.target.value); }}
              placeholder="Shown on the dashboard"
              maxLength={30}
              className={cn(nicknameError && "border-destructive")}
            />
            {nicknameError && <p className="text-xs text-destructive">{nicknameError}</p>}
            <p className="text-xs text-muted-foreground">Displayed instead of your name on the coach dashboard</p>
          </div>
        </div>

        {/* Date of Birth */}
        <div className="space-y-1.5">
          <Label>Date of Birth</Label>
          <div className="flex gap-2">
            <Input value={dateInput} onChange={(e) => handleDateInputChange(e.target.value)} placeholder="DD/MM/YYYY" className="flex-1" maxLength={10} />
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon" className="shrink-0">
                  <CalendarIcon className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={birthDate}
                  onSelect={handleCalendarSelect}
                  disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                  captionLayout="dropdown-buttons"
                  fromYear={1920}
                  toYear={new Date().getFullYear()}
                />
              </PopoverContent>
            </Popover>
          </div>
          <p className="text-xs text-muted-foreground">
            {birthDate ? `${format(birthDate, "MMMM d, yyyy")} • Age: ${calculatedAge} years` : 'Format: DD/MM/YYYY (e.g. 15/03/1990)'}
          </p>
        </div>

        {/* Estimated Max HR (info only) */}
        <div className="p-3 bg-muted/50 rounded-lg space-y-0.5">
          <p className="text-sm font-medium">
            Estimated Max HR (Tanaka): <span className="text-primary">{calculatedMaxHr} bpm</span>
          </p>
          <p className="text-xs text-muted-foreground">
            208 − (0.7 × {calculatedAge}) = {calculatedMaxHr}
          </p>
        </div>

        {/* Custom Max HR */}
        <div className="space-y-1.5">
          <Label htmlFor="customMaxHr">Custom Max HR (optional)</Label>
          <Input
            id="customMaxHr"
            type="number"
            value={customMaxHr}
            onChange={(e) => setCustomMaxHr(e.target.value)}
            placeholder="Empty = automatic calculation"
            min={100}
            max={250}
          />
          <p className="text-xs text-muted-foreground">
            {customMaxHr ? `Active Max HR: ${effectiveMaxHr} bpm (overrides Tanaka)` : 'Overrides the Tanaka calculation when set'}
          </p>
        </div>

        {/* Gender / Weight / Height — 3-column row */}
        <div className="grid grid-cols-3 gap-3">
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
          <div className="space-y-1.5">
            <Label htmlFor="weight">Weight (kg)</Label>
            <Input id="weight" type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="75" min={30} max={300} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="height">Height (cm)</Label>
            <Input id="height" type="number" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="175" min={100} max={250} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Gender, weight, and height are needed for calorie calculation.</p>
      </div>

      {/* Save button — sticky bottom */}
      <div className="p-4 border-t border-border">
        <Button
          className="w-full h-12 text-base font-semibold"
          onClick={handleSave}
          disabled={isSaving || !!nicknameError}
        >
          {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Save
        </Button>
      </div>
    </div>
  );
}
