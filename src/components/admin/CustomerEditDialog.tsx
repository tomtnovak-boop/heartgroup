import { useState, useEffect } from 'react';
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

interface CustomerProfile {
  id: string;
  name: string;
  age: number;
  max_hr: number;
  custom_max_hr?: number | null;
  user_id?: string | null;
}

interface CustomerEditDialogProps {
  customer: CustomerProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCustomerUpdated: () => void;
}

export function CustomerEditDialog({ 
  customer, 
  open, 
  onOpenChange, 
  onCustomerUpdated 
}: CustomerEditDialogProps) {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [customMaxHr, setCustomMaxHr] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (customer) {
      setName(customer.name);
      setAge(customer.age.toString());
      setCustomMaxHr(customer.custom_max_hr?.toString() || '');
    }
  }, [customer]);

  const handleSave = async () => {
    if (!customer) return;

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

    const { error } = await supabase
      .from('profiles')
      .update({
        name: name.trim(),
        age: parsedAge,
        max_hr: calculatedMaxHr,
        custom_max_hr: parsedCustomMaxHr,
      })
      .eq('id', customer.id);

    setIsLoading(false);

    if (error) {
      toast({ 
        title: 'Fehler beim Speichern', 
        description: error.message, 
        variant: 'destructive' 
      });
      return;
    }

    toast({ title: 'Kunde erfolgreich aktualisiert' });
    onCustomerUpdated();
    onOpenChange(false);
  };

  if (!customer) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Kunde bearbeiten</DialogTitle>
          <DialogDescription>
            Aktualisiere die Daten des Teilnehmers.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="customer-name">Name</Label>
            <Input
              id="customer-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name des Teilnehmers"
              maxLength={100}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="customer-age">Alter</Label>
            <Input
              id="customer-age"
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              min={10}
              max={120}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="customer-max-hr">Individuelle HFmax (optional)</Label>
            <Input
              id="customer-max-hr"
              type="number"
              value={customMaxHr}
              onChange={(e) => setCustomMaxHr(e.target.value)}
              placeholder="Leer = automatische Berechnung"
              min={100}
              max={250}
            />
            <p className="text-xs text-muted-foreground">
              Berechnete HFmax: {age ? (parseInt(age) > 40 ? Math.round(208 - 0.7 * parseInt(age)) : 220 - parseInt(age)) : '-'} bpm
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
