import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { User, Plus, Heart, CalendarIcon } from 'lucide-react';
import { calculateMaxHR, getEffectiveMaxHR, calculateAgeFromBirthDate } from '@/lib/heartRateUtils';
import { formatDateInput, parseDateString, formatDateToInput } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';

interface Profile {
  id: string;
  name: string;
  age: number;
  max_hr: number;
  birth_date?: string | null;
  custom_max_hr?: number | null;
}

interface ProfileSelectorProps {
  onProfileSelected: (profile: Profile) => void;
}

export function ProfileSelector({ onProfileSelected }: ProfileSelectorProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newBirthDate, setNewBirthDate] = useState<Date | undefined>();
  const [dateInput, setDateInput] = useState('');
  const [newCustomMaxHR, setNewCustomMaxHR] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  const calculatedAge = newBirthDate ? calculateAgeFromBirthDate(newBirthDate) : null;
  const calculatedMaxHR = calculatedAge ? calculateMaxHR(calculatedAge) : null;
  const effectiveMaxHR = newCustomMaxHR ? parseInt(newCustomMaxHR) : calculatedMaxHR;

  const handleDateInputChange = (value: string) => {
    const formatted = formatDateInput(value);
    setDateInput(formatted);
    
    if (formatted.length === 10) {
      const parsed = parseDateString(formatted);
      if (parsed) {
        setNewBirthDate(parsed);
      }
    } else {
      setNewBirthDate(undefined);
    }
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    setNewBirthDate(date);
    setDateInput(date ? formatDateToInput(date) : '');
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  async function fetchProfiles() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('name');

      if (error) throw error;
      // Map profiles to include effective max_hr
      const mappedProfiles = (data || []).map(p => ({
        ...p,
        max_hr: getEffectiveMaxHR(p.age, p.custom_max_hr)
      }));
      setProfiles(mappedProfiles);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function createProfile() {
    if (!newName.trim() || !newBirthDate) return;

    const customHR = newCustomMaxHR ? parseInt(newCustomMaxHR) : null;
    const age = calculateAgeFromBirthDate(newBirthDate);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert({ 
          name: newName.trim(), 
          age: age,
          birth_date: format(newBirthDate, 'yyyy-MM-dd'),
          custom_max_hr: customHR
        })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        // Return profile with effective max_hr
        onProfileSelected({
          ...data,
          max_hr: getEffectiveMaxHR(data.age, data.custom_max_hr)
        });
      }
    } catch (error) {
      console.error('Error creating profile:', error);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 mb-4">
            <Heart className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-2">HR Training</h1>
          <p className="text-muted-foreground">Wähle dein Profil oder erstelle ein neues</p>
        </div>

        {!isCreating ? (
          <>
            <div className="w-full space-y-3 mb-6">
              {profiles.map((profile) => (
                <Button
                  key={profile.id}
                  variant="outline"
                  className="w-full h-16 justify-start gap-4 text-left"
                  onClick={() => onProfileSelected(profile)}
                >
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold">{profile.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {profile.age} Jahre • Max HR: {profile.max_hr} bpm
                    </div>
                  </div>
                </Button>
              ))}
            </div>

            <Button
              variant="default"
              className="w-full h-14 gap-2"
              onClick={() => setIsCreating(true)}
            >
              <Plus className="w-5 h-5" />
              Neues Profil erstellen
            </Button>
          </>
        ) : (
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-lg">Neues Profil</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="Dein Name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  autoFocus
                />
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
                      <Button variant="outline" size="icon" className="shrink-0">
                        <CalendarIcon className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        mode="single"
                        selected={newBirthDate}
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
                {newBirthDate && calculatedAge && calculatedMaxHR && (
                  <p className="text-sm text-muted-foreground">
                    {format(newBirthDate, "dd. MMMM yyyy", { locale: de })} • Alter: {calculatedAge} Jahre • HFmax (Tanaka): {calculatedMaxHR} bpm
                  </p>
                )}
                {!newBirthDate && (
                  <p className="text-sm text-muted-foreground">
                    Format: TT/MM/JJJJ (z.B. 15/03/1990)
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="customMaxHR">Individuelle HFmax (optional)</Label>
                <Input
                  id="customMaxHR"
                  type="number"
                  min={100}
                  max={250}
                  placeholder={calculatedMaxHR ? `${calculatedMaxHR}` : ''}
                  value={newCustomMaxHR}
                  onChange={(e) => setNewCustomMaxHR(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  {newCustomMaxHR 
                    ? `Überschreibt berechneten Wert → ${effectiveMaxHR} bpm`
                    : 'Leer lassen für automatische Berechnung'
                  }
                </p>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsCreating(false)}
                >
                  Abbrechen
                </Button>
                <Button
                  className="flex-1"
                  onClick={createProfile}
                  disabled={!newName.trim() || !newBirthDate}
                >
                  Erstellen
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
