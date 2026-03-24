import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuthContext } from './AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { calculateMaxHR, calculateAgeFromBirthDate } from '@/lib/heartRateUtils';
import { formatDateInput, parseDateString, formatDateToInput } from '@/lib/dateUtils';
import { Loader2, Mail, Lock, User, CalendarIcon, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RegisterFormProps {
  onSwitchToLogin: () => void;
}

export function RegisterForm({ onSwitchToLogin }: RegisterFormProps) {
  const REGISTRATION_OPEN = false;

  if (!REGISTRATION_OPEN) {
    return (
      <Card className="w-full max-w-md mx-auto bg-card border-border">
        <CardContent className="text-center p-8 space-y-4">
          <h2 className="text-xl font-semibold">Registration Currently Closed</h2>
          <p className="text-muted-foreground">
            We are not accepting new registrations at this time.<br />
            Please contact the administrator if you need access.
          </p>
          <p className="text-sm text-muted-foreground">
            Already registered?{' '}
            <button type="button" onClick={onSwitchToLogin} className="text-primary hover:underline font-medium">Sign in now</button>
          </p>
        </CardContent>
      </Card>
    );
  }
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [nicknameError, setNicknameError] = useState('');
  const [birthDate, setBirthDate] = useState<Date | undefined>();
  const [dateInput, setDateInput] = useState('');
  const [customMaxHr, setCustomMaxHr] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signUp } = useAuthContext();
  const { toast } = useToast();
  const navigate = useNavigate();

  const calculatedAge = birthDate ? calculateAgeFromBirthDate(birthDate) : null;
  const calculatedMaxHr = calculatedAge ? calculateMaxHR(calculatedAge) : null;

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

  const checkNicknameAvailability = async (value: string) => {
    if (!value.trim()) { setNicknameError(''); return; }
    const { data } = await supabase.from('profiles').select('id').eq('nickname', value.trim()).maybeSingle();
    setNicknameError(data ? 'This nickname is already taken' : '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!birthDate) {
      toast({ title: 'Date of birth required', description: 'Please select your date of birth.', variant: 'destructive' });
      setIsLoading(false);
      return;
    }

    const age = calculateAgeFromBirthDate(birthDate);
    if (age < 10 || age > 120) {
      toast({ title: 'Invalid date of birth', description: 'Calculated age must be between 10 and 120.', variant: 'destructive' });
      setIsLoading(false);
      return;
    }

    const { data: authData, error: authError } = await signUp(email, password);
    if (authError) {
      toast({ title: 'Registration failed', description: authError.message, variant: 'destructive' });
      setIsLoading(false);
      return;
    }

    if (!authData.user) {
      toast({ title: 'Registration failed', description: 'Could not create account.', variant: 'destructive' });
      setIsLoading(false);
      return;
    }

    if (nickname.trim()) {
      const { data: existingNickname } = await supabase.from('profiles').select('id').eq('nickname', nickname.trim()).maybeSingle();
      if (existingNickname) {
        toast({ title: 'Nickname already taken', description: 'Please choose a different nickname.', variant: 'destructive' });
        setIsLoading(false);
        return;
      }
    }

    const maxHr = calculateMaxHR(age);
    const customMaxHrNum = customMaxHr ? parseInt(customMaxHr) : null;
    const parsedWeight = weight ? parseInt(weight, 10) : null;
    const parsedHeight = height ? parseInt(height, 10) : null;

    const { error: profileError } = await supabase.from('profiles').insert({
      user_id: authData.user.id,
      name: name.trim(),
      nickname: nickname.trim() || null,
      age, birth_date: format(birthDate, 'yyyy-MM-dd'),
      max_hr: maxHr, custom_max_hr: customMaxHrNum,
      weight: parsedWeight, height: parsedHeight,
    });

    if (profileError) {
      toast({ title: 'Could not create profile', description: profileError.message, variant: 'destructive' });
      setIsLoading(false);
      return;
    }

    toast({ title: 'Welcome!', description: 'Your account has been created successfully.' });
    navigate('/participant');
  };

  return (
    <Card className="w-full max-w-md mx-auto bg-card border-border">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Register</CardTitle>
        <CardDescription>Create your profile for heart rate training</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input id="email" type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input id="password" type="password" placeholder="At least 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" minLength={6} required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">First Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input id="name" type="text" placeholder="Max" value={name} onChange={(e) => setName(e.target.value)} className="pl-10" required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nickname">Nickname (optional)</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="nickname" type="text" placeholder="Displayed on the dashboard"
                value={nickname}
                onChange={(e) => { setNickname(e.target.value); checkNicknameAvailability(e.target.value); }}
                className={cn("pl-10", nicknameError && "border-destructive")}
                maxLength={30}
              />
            </div>
            {nicknameError && <p className="text-xs text-destructive">{nicknameError}</p>}
            <p className="text-xs text-muted-foreground">Shown instead of your name on the coach dashboard</p>
          </div>

          <div className="space-y-2">
            <Label>Date of Birth</Label>
            <div className="flex gap-2">
              <Input value={dateInput} onChange={(e) => handleDateInputChange(e.target.value)} placeholder="DD/MM/YYYY" className="flex-1" maxLength={10} />
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon" type="button" className="shrink-0"><CalendarIcon className="h-4 w-4" /></Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar mode="single" selected={birthDate} onSelect={handleCalendarSelect} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} initialFocus className={cn("p-3 pointer-events-auto")} captionLayout="dropdown-buttons" fromYear={1920} toYear={new Date().getFullYear()} />
                </PopoverContent>
              </Popover>
            </div>
            {birthDate && calculatedAge && calculatedMaxHr && (
              <p className="text-xs text-muted-foreground">
                {format(birthDate, "MMMM d, yyyy")} • Age: {calculatedAge} years • Max HR (Tanaka): {calculatedMaxHr} bpm
              </p>
            )}
            {!birthDate && <p className="text-xs text-muted-foreground">Format: DD/MM/YYYY (e.g. 15/03/1990)</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input id="weight" type="number" placeholder="e.g. 75" value={weight} onChange={(e) => setWeight(e.target.value)} min={30} max={300} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="height">Height (cm)</Label>
              <Input id="height" type="number" placeholder="e.g. 175" value={height} onChange={(e) => setHeight(e.target.value)} min={100} max={250} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customMaxHr">Custom Max HR (optional)</Label>
            <div className="relative">
              <Heart className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input id="customMaxHr" type="number" placeholder="Overrides automatic calculation" value={customMaxHr} onChange={(e) => setCustomMaxHr(e.target.value)} className="pl-10" min={100} max={250} />
            </div>
            <p className="text-xs text-muted-foreground">If known, overrides the automatic calculation</p>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Registering...</>) : 'Register'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Already registered?{' '}
            <button type="button" onClick={onSwitchToLogin} className="text-primary hover:underline font-medium">Sign in now</button>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
