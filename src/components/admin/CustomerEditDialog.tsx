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
import { formatDateInput, parseDateString, formatDateToInput } from '@/lib/dateUtils';
import { Loader2, CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CustomerProfile {
  id: string;
  name: string;
  age: number;
  max_hr: number;
  birth_date?: string | null;
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
  const [birthDate, setBirthDate] = useState<Date | undefined>();
  const [dateInput, setDateInput] = useState('');
  const [customMaxHr, setCustomMaxHr] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (customer) {
      setName(customer.name);
      const date = customer.birth_date ? new Date(customer.birth_date) : undefined;
      setBirthDate(date);
      setDateInput(date ? formatDateToInput(date) : '');
      setCustomMaxHr(customer.custom_max_hr?.toString() || '');
    }
  }, [customer]);

  const calculatedAge = birthDate ? calculateAgeFromBirthDate(birthDate) : customer?.age || 30;
  const calculatedMaxHr = calculateMaxHR(calculatedAge);

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

  const handleSave = async () => {
    if (!customer) return;

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

    const { error } = await supabase
      .from('profiles')
      .update({
        name: name.trim(),
        birth_date: format(birthDate, 'yyyy-MM-dd'),
        age: age,
        max_hr: maxHr,
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
                ? `${format(birthDate, "dd. MMMM yyyy", { locale: de })} • Alter: ${calculatedAge} Jahre • HFmax: ${calculatedMaxHr} bpm`
                : 'Format: TT/MM/JJJJ (z.B. 15/03/1990)'
              }
            </p>
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
