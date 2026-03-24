import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

export function ProfileEditDialog({ 
  profile, 
  open, 
  onOpenChange, 
  onProfileUpdated 
}: ProfileEditDialogProps) {
  const [name, setName] = useState(profile.name);
  const [nickname, setNickname] = useState(profile.nickname || '');
  const [nicknameError, setNicknameError] = useState('');
  const [birthDate, setBirthDate] = useState<Date | undefined>(
    profile.birth_date ? new Date(profile.birth_date) : undefined
  );
  const [dateInput, setDateInput] = useState(
    profile.birth_date ? formatDateToInput(new Date(profile.birth_date)) : ''
  );
  const [customMaxHr, setCustomMaxHr] = useState(profile.custom_max_hr?.toString() || '');
  const [weight, setWeight] = useState(profile.weight?.toString() || '');
  const [height, setHeight] = useState(profile.height?.toString() || '');
  const [gender, setGender] = useState<string>(profile.gender || '');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Reset form when profile changes
  useEffect(() => {
    setName(profile.name);
    setNickname(profile.nickname || '');
    const date = profile.birth_date ? new Date(profile.birth_date) : undefined;
    setBirthDate(date);
    setDateInput(date ? formatDateToInput(date) : '');
    setCustomMaxHr(profile.custom_max_hr?.toString() || '');
    setWeight(profile.weight?.toString() || '');
    setHeight(profile.height?.toString() || '');
    setGender(profile.gender || '');
    setNicknameError('');
  }, [profile]);

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

  const calculatedAge = birthDate ? calculateAgeFromBirthDate(birthDate) : profile.age;
  const calculatedMaxHr = calculateMaxHR(calculatedAge);
  const effectiveMaxHr = customMaxHr ? parseInt(customMaxHr) : calculatedMaxHr;

  const checkNicknameAvailability = async (value: string) => {
    if (!value.trim()) {
      setNicknameError('');
      return;
    }
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('nickname', value.trim())
      .neq('id', profile.id)
      .maybeSingle();
    
    if (data) {
      setNicknameError('Dieser Nickname ist bereits vergeben');
    } else {
      setNicknameError('');
    }
  };

  const handleSave = async () => {
    // Validate inputs
    if (!name.trim()) {
      toast({ title: 'Name ist erforderlich', variant: 'destructive' });
      return;
    }

    if (!birthDate) {
      toast({ title: 'Geburtsdatum ist erforderlich', variant: 'destructive' });
      return;
    }

    const age = calculateAgeFromBirthDate(birthDate);
    if (age < 10 || age > 120) {
      toast({ title: 'Das berechnete Alter muss zwischen 10 und 120 sein', variant: 'destructive' });
      return;
    }

    const parsedCustomMaxHr = customMaxHr ? parseInt(customMaxHr, 10) : null;
    if (customMaxHr && (isNaN(parsedCustomMaxHr!) || parsedCustomMaxHr! < 100 || parsedCustomMaxHr! > 250)) {
      toast({ title: 'Individuelle HFmax muss zwischen 100 und 250 sein', variant: 'destructive' });
      return;
    }

    // Check nickname availability
    if (nickname.trim()) {
      const { data: existingNickname } = await supabase
        .from('profiles')
        .select('id')
        .eq('nickname', nickname.trim())
        .neq('id', profile.id)
        .maybeSingle();
      
      if (existingNickname) {
        toast({ title: 'Nickname bereits vergeben', variant: 'destructive' });
        return;
      }
    }

    setIsLoading(true);

    const maxHr = calculateMaxHR(age);

    const parsedWeight = weight ? parseInt(weight, 10) : null;

    const { data, error } = await supabase
      .from('profiles')
      .update({
        name: name.trim(),
        nickname: nickname.trim() || null,
        birth_date: format(birthDate, 'yyyy-MM-dd'),
        age: age,
        max_hr: maxHr,
        custom_max_hr: parsedCustomMaxHr,
        weight: parsedWeight,
        gender: gender || null,
      })
      .eq('id', profile.id)
      .select()
      .single();

    setIsLoading(false);

    if (error) {
      toast({ 
        title: 'Fehler beim Speichern', 
        description: error.message, 
        variant: 'destructive' 
      });
      return;
    }

    toast({ title: 'Profil erfolgreich aktualisiert' });
    onProfileUpdated(data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Profil bearbeiten</DialogTitle>
          <DialogDescription>
            Aktualisiere deine persönlichen Daten für die Herzfrequenz-Berechnung.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 overflow-y-auto flex-1">
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Dein Name"
              maxLength={100}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="nickname">Nickname (optional)</Label>
            <Input
              id="nickname"
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value);
                checkNicknameAvailability(e.target.value);
              }}
              placeholder="Wird im Dashboard angezeigt"
              maxLength={30}
              className={cn(nicknameError && "border-destructive")}
            />
            {nicknameError && (
              <p className="text-xs text-destructive">{nicknameError}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Wird anstelle deines Namens im Coach-Dashboard angezeigt
            </p>
          </div>
          <div className="grid gap-2">
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
            <p className="text-xs text-muted-foreground">
              {birthDate 
                ? `${format(birthDate, "dd. MMMM yyyy", { locale: de })} • Alter: ${calculatedAge} Jahre`
                : 'Format: TT/MM/JJJJ (z.B. 15/03/1990)'
              }
            </p>
          </div>
          <div className="grid gap-2 p-3 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium">
              Deine geschätzte HFmax (nach Tanaka): <span className="text-primary">{calculatedMaxHr} bpm</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Formel: 208 - (0,7 × {calculatedAge}) = {calculatedMaxHr}
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="customMaxHr">Individuelle HFmax (optional)</Label>
            <Input
              id="customMaxHr"
              type="number"
              value={customMaxHr}
              onChange={(e) => setCustomMaxHr(e.target.value)}
              placeholder="Leer = automatische Berechnung"
              min={100}
              max={250}
            />
            <p className="text-xs text-muted-foreground">
              {customMaxHr 
                ? `Aktive HFmax: ${effectiveMaxHr} bpm (überschreibt Tanaka-Berechnung)`
                : 'Überschreibt die Tanaka-Berechnung, wenn gesetzt'
              }
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Geschlecht</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger>
                  <SelectValue placeholder="Auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Männlich</SelectItem>
                  <SelectItem value="female">Weiblich</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="weight">Gewicht (kg)</Label>
              <Input
                id="weight"
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="z.B. 75"
                min={30}
                max={300}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Geschlecht und Gewicht werden für die Kalorienberechnung benötigt.
          </p>
        </div>
        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button onClick={handleSave} disabled={isLoading || !!nicknameError}>
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
