import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { calculateMaxHR, calculateAgeFromBirthDate } from '@/lib/heartRateUtils';
import { formatDateInput, parseDateString, formatDateToInput } from '@/lib/dateUtils';
import { Loader2, CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CustomerProfile {
  id: string;
  name: string;
  nickname?: string | null;
  age: number;
  max_hr: number;
  birth_date?: string | null;
  custom_max_hr?: number | null;
  weight?: number | null;
  height?: number | null;
  user_id?: string | null;
}

interface CustomerEditDialogProps {
  customer: CustomerProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCustomerUpdated: () => void;
}

export function CustomerEditDialog({ customer, open, onOpenChange, onCustomerUpdated }: CustomerEditDialogProps) {
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [birthDate, setBirthDate] = useState<Date | undefined>();
  const [dateInput, setDateInput] = useState('');
  const [customMaxHr, setCustomMaxHr] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (customer) {
      setName(customer.name);
      setNickname(customer.nickname || '');
      const date = customer.birth_date ? new Date(customer.birth_date) : undefined;
      setBirthDate(date);
      setDateInput(date ? formatDateToInput(date) : '');
      setCustomMaxHr(customer.custom_max_hr?.toString() || '');
      setWeight(customer.weight?.toString() || '');
      setHeight(customer.height?.toString() || '');
    }
  }, [customer]);

  const calculatedAge = birthDate ? calculateAgeFromBirthDate(birthDate) : customer?.age || 30;
  const calculatedMaxHr = calculateMaxHR(calculatedAge);

  const handleDateInputChange = (value: string) => {
    const formatted = formatDateInput(value);
    setDateInput(formatted);
    if (formatted.length === 10) { const parsed = parseDateString(formatted); if (parsed) setBirthDate(parsed); }
    else setBirthDate(undefined);
  };

  const handleCalendarSelect = (date: Date | undefined) => { setBirthDate(date); setDateInput(date ? formatDateToInput(date) : ''); };

  const handleSave = async () => {
    if (!customer) return;
    if (!name.trim()) { toast({ title: 'Name is required', variant: 'destructive' }); return; }
    if (!birthDate) { toast({ title: 'Date of birth is required', variant: 'destructive' }); return; }
    const age = calculateAgeFromBirthDate(birthDate);
    if (age < 10 || age > 120) { toast({ title: 'Calculated age must be between 10 and 120', variant: 'destructive' }); return; }
    const parsedCustomMaxHr = customMaxHr ? parseInt(customMaxHr, 10) : null;
    if (customMaxHr && (isNaN(parsedCustomMaxHr!) || parsedCustomMaxHr! < 100 || parsedCustomMaxHr! > 250)) {
      toast({ title: 'Custom Max HR must be between 100 and 250', variant: 'destructive' }); return;
    }

    setIsLoading(true);
    const maxHr = calculateMaxHR(age);
    const { error } = await supabase.from('profiles').update({
      name: name.trim(), nickname: nickname.trim() || null,
      birth_date: format(birthDate, 'yyyy-MM-dd'), age, max_hr: maxHr,
      custom_max_hr: parsedCustomMaxHr, weight: weight ? parseInt(weight, 10) : null, height: height ? parseInt(height, 10) : null,
    }).eq('id', customer.id);
    setIsLoading(false);

    if (error) { toast({ title: 'Error saving', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Customer updated successfully' });
    onCustomerUpdated();
    onOpenChange(false);
  };

  if (!customer) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Customer</DialogTitle>
          <DialogDescription>Update participant data.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="customer-name">Name</Label>
            <Input id="customer-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Participant name" maxLength={100} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="customer-nickname">Nickname</Label>
            <Input id="customer-nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="Optional" maxLength={30} />
          </div>
          <div className="grid gap-2">
            <Label>Date of Birth</Label>
            <div className="flex gap-2">
              <Input value={dateInput} onChange={(e) => handleDateInputChange(e.target.value)} placeholder="DD/MM/YYYY" className="flex-1" maxLength={10} />
              <Popover>
                <PopoverTrigger asChild><Button variant="outline" size="icon" className="shrink-0"><CalendarIcon className="h-4 w-4" /></Button></PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar mode="single" selected={birthDate} onSelect={handleCalendarSelect} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} initialFocus className={cn("p-3 pointer-events-auto")} captionLayout="dropdown-buttons" fromYear={1920} toYear={new Date().getFullYear()} />
                </PopoverContent>
              </Popover>
            </div>
            <p className="text-xs text-muted-foreground">
              {birthDate ? `${format(birthDate, "MMMM d, yyyy")} • Age: ${calculatedAge} years • Max HR: ${calculatedMaxHr} bpm` : 'Format: DD/MM/YYYY (e.g. 15/03/1990)'}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2"><Label htmlFor="customer-weight">Weight (kg)</Label><Input id="customer-weight" type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="e.g. 75" min={30} max={300} /></div>
            <div className="grid gap-2"><Label htmlFor="customer-height">Height (cm)</Label><Input id="customer-height" type="number" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="e.g. 175" min={100} max={250} /></div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="customer-max-hr">Custom Max HR (optional)</Label>
            <Input id="customer-max-hr" type="number" value={customMaxHr} onChange={(e) => setCustomMaxHr(e.target.value)} placeholder="Empty = automatic calculation" min={100} max={250} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={isLoading}>{isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
