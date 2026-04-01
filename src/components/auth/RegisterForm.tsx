import { useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAuthContext } from './AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { calculateMaxHR, calculateAgeFromBirthDate } from '@/lib/heartRateUtils';
import { formatDateInput, parseDateString, formatDateToInput } from '@/lib/dateUtils';
import { Loader2, Mail, Lock, User, CalendarIcon, Heart, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RegisterFormProps {
  onSwitchToLogin: () => void;
  onRegistered: (email: string) => void;
}

export function RegisterForm({ onSwitchToLogin, onRegistered }: RegisterFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDate, setBirthDate] = useState<Date | undefined>();
  const [dateInput, setDateInput] = useState('');
  const [weight, setWeight] = useState('');
  const [gender, setGender] = useState('');
  const [customMaxHr, setCustomMaxHr] = useState('');
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { signUp } = useAuthContext();
  const { toast } = useToast();

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!birthDate) {
      toast({ title: 'Date of birth required', description: 'Please select your date of birth.', variant: 'destructive' });
      setIsLoading(false);
      return;
    }

    if (!gender) {
      toast({ title: 'Gender required', description: 'Please select your gender.', variant: 'destructive' });
      setIsLoading(false);
      return;
    }

    if (!privacyConsent) {
      toast({ title: 'Consent required', description: 'Please accept the data processing terms.', variant: 'destructive' });
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

    const maxHr = calculateMaxHR(age);
    const customMaxHrNum = customMaxHr ? parseInt(customMaxHr) : null;
    const parsedWeight = weight ? parseInt(weight, 10) : null;
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

    const { error: profileError } = await supabase.from('profiles').insert({
      user_id: authData.user.id,
      name: fullName,
      age,
      birth_date: format(birthDate, 'yyyy-MM-dd'),
      max_hr: maxHr,
      custom_max_hr: customMaxHrNum,
      weight: parsedWeight,
      gender,
    });

    if (profileError) {
      console.error('Profile creation error:', profileError);
    }

    setIsLoading(false);
    onRegistered(email);
  };

  return (
    <Card className="w-full max-w-md mx-auto bg-card border-border">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Create Account</CardTitle>
        <CardDescription>Join your heart rate training group</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input id="firstName" placeholder="Max" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="pl-10" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input id="lastName" placeholder="Mustermann" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reg-email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input id="reg-email" type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reg-password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input id="reg-password" type="password" placeholder="Min. 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" minLength={8} required />
            </div>
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
                Age: {calculatedAge} years • Max HR (Tanaka): {calculatedMaxHr} bpm
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input id="weight" type="number" placeholder="e.g. 75" value={weight} onChange={(e) => setWeight(e.target.value)} min={30} max={300} required />
            </div>
            <div className="space-y-2">
              <Label>Gender</Label>
              <RadioGroup value={gender} onValueChange={setGender} className="flex gap-4 pt-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="male" id="male" />
                  <Label htmlFor="male" className="cursor-pointer font-normal">Male</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="female" id="female" />
                  <Label htmlFor="female" className="cursor-pointer font-normal">Female</Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customMaxHr" className="flex items-center gap-1.5">
              Max HR Override (optional)
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3.5 h-3.5 text-muted-foreground/60 cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-[260px] text-xs">
                  We calculate your max HR automatically using the Tanaka formula. Only fill this in if you know your actual max HR from a sports medical test.
                </TooltipContent>
              </Tooltip>
            </Label>
            <div className="relative">
              <Heart className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input id="customMaxHr" type="number" placeholder="Leave empty to use Tanaka formula: 208 − 0.7 × age" value={customMaxHr} onChange={(e) => setCustomMaxHr(e.target.value)} className="pl-10" min={100} max={250} />
            </div>
          </div>

          <div className="flex items-start space-x-3 rounded-md border border-border p-3 bg-muted/30">
            <Checkbox
              id="privacy"
              checked={privacyConsent}
              onCheckedChange={(checked) => setPrivacyConsent(checked === true)}
              className="mt-0.5"
            />
            <Label htmlFor="privacy" className="text-xs text-muted-foreground leading-relaxed cursor-pointer font-normal">
              Your data is confidential. We use your personal information solely to calculate your heart rate zones and calorie expenditure during training sessions. Your data is never shared with third parties. By registering, you agree to our data processing terms.
            </Label>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading || !privacyConsent}>
            {isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating account...</>) : 'Create account'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <button type="button" onClick={onSwitchToLogin} className="text-primary hover:underline font-medium">Sign in</button>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
