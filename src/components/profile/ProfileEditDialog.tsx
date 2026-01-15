import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
import { Loader2, CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Profile {
  id: string;
  name: string;
  age: number;
  max_hr: number;
  birth_date?: string | null;
  custom_max_hr?: number | null;
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
  const [birthDate, setBirthDate] = useState<Date | undefined>(
    profile.birth_date ? new Date(profile.birth_date) : undefined
  );
  const [customMaxHr, setCustomMaxHr] = useState(profile.custom_max_hr?.toString() || '');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Reset form when profile changes
  useEffect(() => {
    setName(profile.name);
    setBirthDate(profile.birth_date ? new Date(profile.birth_date) : undefined);
    setCustomMaxHr(profile.custom_max_hr?.toString() || '');
  }, [profile]);

  const calculatedAge = birthDate ? calculateAgeFromBirthDate(birthDate) : profile.age;
  const calculatedMaxHr = calculateMaxHR(calculatedAge);

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

    setIsLoading(true);

    const maxHr = calculateMaxHR(age);

    const { data, error } = await supabase
      .from('profiles')
      .update({
        name: name.trim(),
        birth_date: format(birthDate, 'yyyy-MM-dd'),
        age: age,
        max_hr: maxHr,
        custom_max_hr: parsedCustomMaxHr,
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Profil bearbeiten</DialogTitle>
          <DialogDescription>
            Aktualisiere deine persönlichen Daten für die Herzfrequenz-Berechnung.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
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
            <Label>Geburtsdatum</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !birthDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {birthDate ? format(birthDate, "dd. MMMM yyyy", { locale: de }) : "Geburtsdatum wählen"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={birthDate}
                  onSelect={setBirthDate}
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
            <p className="text-xs text-muted-foreground">
              Aktuelles Alter: {calculatedAge} Jahre | Berechnete HFmax: {calculatedMaxHr} bpm
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
              Überschreibt die automatische Berechnung, wenn gesetzt
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
