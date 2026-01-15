import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthContext } from './AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { calculateMaxHR } from '@/lib/heartRateUtils';
import { Loader2, Mail, Lock, User, Calendar, Heart } from 'lucide-react';

interface RegisterFormProps {
  onSwitchToLogin: () => void;
}

export function RegisterForm({ onSwitchToLogin }: RegisterFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [customMaxHr, setCustomMaxHr] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signUp } = useAuthContext();
  const { toast } = useToast();
  const navigate = useNavigate();

  const calculatedMaxHr = age ? calculateMaxHR(parseInt(age)) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Validate inputs
    const ageNum = parseInt(age);
    if (isNaN(ageNum) || ageNum < 10 || ageNum > 120) {
      toast({
        title: 'Ungültiges Alter',
        description: 'Bitte gib ein gültiges Alter zwischen 10 und 120 ein.',
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

    // Create profile
    const maxHr = calculateMaxHR(ageNum);
    const customMaxHrNum = customMaxHr ? parseInt(customMaxHr) : null;

    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        user_id: authData.user.id,
        name: name.trim(),
        age: ageNum,
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
            <Label htmlFor="age">Alter</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="age"
                type="number"
                placeholder="30"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="pl-10"
                min={10}
                max={120}
                required
              />
            </div>
            {calculatedMaxHr && (
              <p className="text-xs text-muted-foreground">
                Berechnete HFmax: {calculatedMaxHr} bpm 
                {parseInt(age) > 40 ? ' (Tanaka-Formel)' : ' (220 - Alter)'}
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
