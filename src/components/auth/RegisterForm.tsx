import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [nicknameError, setNicknameError] = useState('');
  const [birthDate, setBirthDate] = useState<Date | undefined>();
  const [dateInput, setDateInput] = useState('');
  const [customMaxHr, setCustomMaxHr] = useState('');
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
      if (parsed) {
        setBirthDate(parsed);
      }
    } else {
      setBirthDate(undefined);
    }
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    setBirthDate(date);
    setDateInput(date ? formatDateToInput(date) : '');
  };

  const checkNicknameAvailability = async (value: string) => {
    if (!value.trim()) {
      setNicknameError('');
      return;
    }
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('nickname', value.trim())
      .maybeSingle();
    
    if (data) {
      setNicknameError('Dieser Nickname ist bereits vergeben');
    } else {
      setNicknameError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Validate inputs
    if (!birthDate) {
      toast({
        title: 'Geburtsdatum erforderlich',
        description: 'Bitte wähle dein Geburtsdatum aus.',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    const age = calculateAgeFromBirthDate(birthDate);
    if (age < 10 || age > 120) {
      toast({
        title: 'Ungültiges Geburtsdatum',
        description: 'Das berechnete Alter muss zwischen 10 und 120 liegen.',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    // Sign up user
    const { data: authData, error: authError } = await signUp(email, password);

    if (authError) {
      toast({
        title: 'Registrierung fehlgeschlagen',
        description: authError.message,
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    if (!authData.user) {
      toast({
        title: 'Registrierung fehlgeschlagen',
        description: 'Benutzerkonto konnte nicht erstellt werden.',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    // Check nickname availability one more time
    if (nickname.trim()) {
      const { data: existingNickname } = await supabase
        .from('profiles')
        .select('id')
        .eq('nickname', nickname.trim())
        .maybeSingle();
      
      if (existingNickname) {
        toast({
          title: 'Nickname bereits vergeben',
          description: 'Bitte wähle einen anderen Nickname.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }
    }

    // Create profile
    const maxHr = calculateMaxHR(age);
    const customMaxHrNum = customMaxHr ? parseInt(customMaxHr) : null;

    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        user_id: authData.user.id,
        name: name.trim(),
        nickname: nickname.trim() || null,
        age: age,
        birth_date: format(birthDate, 'yyyy-MM-dd'),
        max_hr: maxHr,
        custom_max_hr: customMaxHrNum,
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      toast({
        title: 'Profil konnte nicht erstellt werden',
        description: profileError.message,
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    toast({
      title: 'Willkommen!',
      description: 'Dein Konto wurde erfolgreich erstellt.',
    });

    navigate('/participant');
  };

  return (
    <Card className="w-full max-w-md mx-auto bg-card border-border">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Registrieren</CardTitle>
        <CardDescription>
          Erstelle dein Profil für das Herzfrequenz-Training
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-Mail</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="deine@email.de"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Passwort</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="Mindestens 6 Zeichen"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                minLength={6}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Vorname</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="name"
                type="text"
                placeholder="Max"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nickname">Nickname (optional)</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="nickname"
                type="text"
                placeholder="Wird im Dashboard angezeigt"
                value={nickname}
                onChange={(e) => {
                  setNickname(e.target.value);
                  checkNicknameAvailability(e.target.value);
                }}
                className={cn("pl-10", nicknameError && "border-destructive")}
                maxLength={30}
              />
            </div>
            {nicknameError && (
              <p className="text-xs text-destructive">{nicknameError}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Wird anstelle deines Namens im Coach-Dashboard angezeigt
            </p>
          </div>

          <div className="space-y-2">
            <Label>Geburtsdatum</Label>
            <div className="flex gap-2">
              <Input
                value={dateInput}
                onChange={(e) => handleDateInputChange(e.target.value)}
                placeholder="TT/MM/JJJJ"
                className="flex-1"
                maxLength={10}
              />
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon" type="button" className="shrink-0">
                    <CalendarIcon className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={birthDate}
                    onSelect={handleCalendarSelect}
                    disabled={(date) =>
                      date > new Date() || date < new Date("1900-01-01")
                    }
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                    captionLayout="dropdown-buttons"
                    fromYear={1920}
                    toYear={new Date().getFullYear()}
                  />
                </PopoverContent>
              </Popover>
            </div>
            {birthDate && calculatedAge && calculatedMaxHr && (
              <p className="text-xs text-muted-foreground">
                {format(birthDate, "dd. MMMM yyyy", { locale: de })} • Alter: {calculatedAge} Jahre • HFmax (Tanaka): {calculatedMaxHr} bpm
              </p>
            )}
            {!birthDate && (
              <p className="text-xs text-muted-foreground">
                Format: TT/MM/JJJJ (z.B. 15/03/1990)
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="customMaxHr">
              Individuelle HFmax (optional)
            </Label>
            <div className="relative">
              <Heart className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="customMaxHr"
                type="number"
                placeholder="Überschreibt die automatische Berechnung"
                value={customMaxHr}
                onChange={(e) => setCustomMaxHr(e.target.value)}
                className="pl-10"
                min={100}
                max={250}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Falls bekannt, überschreibt die automatische Berechnung
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Registrieren...
              </>
            ) : (
              'Registrieren'
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Bereits registriert?{' '}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-primary hover:underline font-medium"
            >
              Jetzt anmelden
            </button>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
