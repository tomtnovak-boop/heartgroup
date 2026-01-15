import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Loader2 } from 'lucide-react';

interface Profile {
  id: string;
  name: string;
  age: number;
  max_hr: number;
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
  const [age, setAge] = useState(profile.age.toString());
  const [customMaxHr, setCustomMaxHr] = useState(profile.custom_max_hr?.toString() || '');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    // Validate inputs
    const parsedAge = parseInt(age, 10);
    if (!name.trim()) {
      toast({ title: 'Name ist erforderlich', variant: 'destructive' });
      return;
    }
    if (isNaN(parsedAge) || parsedAge < 10 || parsedAge > 120) {
      toast({ title: 'Alter muss zwischen 10 und 120 sein', variant: 'destructive' });
      return;
    }

    const parsedCustomMaxHr = customMaxHr ? parseInt(customMaxHr, 10) : null;
    if (customMaxHr && (isNaN(parsedCustomMaxHr!) || parsedCustomMaxHr! < 100 || parsedCustomMaxHr! > 250)) {
      toast({ title: 'Individuelle HFmax muss zwischen 100 und 250 sein', variant: 'destructive' });
      return;
    }

    setIsLoading(true);

    // Calculate max_hr based on age using appropriate formula
    const calculatedMaxHr = parsedAge > 40 
      ? Math.round(208 - 0.7 * parsedAge) 
      : 220 - parsedAge;

    const { data, error } = await supabase
      .from('profiles')
      .update({
        name: name.trim(),
        age: parsedAge,
        max_hr: calculatedMaxHr,
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
            <Label htmlFor="age">Alter</Label>
            <Input
              id="age"
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              min={10}
              max={120}
            />
            <p className="text-xs text-muted-foreground">
              Wird für die HFmax-Berechnung verwendet
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
