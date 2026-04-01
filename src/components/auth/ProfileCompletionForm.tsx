import { useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { calculateMaxHR, calculateAgeFromBirthDate } from '@/lib/heartRateUtils';
import { formatDateInput, parseDateString, formatDateToInput } from '@/lib/dateUtils';
import { Loader2, CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProfileCompletionFormProps {
  profileId: string;
  existingData: {
    birth_date?: string | null;
    weight?: number | null;
    gender?: string | null;
  };
  onComplete: () => void;
}

export function ProfileCompletionForm({ profileId, existingData, onComplete }: ProfileCompletionFormProps) {
  const [birthDate, setBirthDate] = useState<Date | undefined>(
    existingData.birth_date ? new Date(existingData.birth_date) : undefined
  );
  const [dateInput, setDateInput] = useState(
    existingData.birth_date ? formatDateToInput(new Date(existingData.birth_date)) : ''
  );
  const [weight, setWeight] = useState(existingData.weight?.toString() || '');
  const [gender, setGender] = useState(existingData.gender || '');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

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

    if (!birthDate || !weight || !gender) {
      toast({ title: 'All fields required', description: 'Please fill in all fields to continue.', variant: 'destructive' });
      setIsLoading(false);
      return;
    }

    const age = calculateAgeFromBirthDate(birthDate);
    const maxHr = calculateMaxHR(age);

    const { error } = await supabase.from('profiles').update({
      birth_date: format(birthDate, 'yyyy-MM-dd'),
      age,
      weight: parseInt(weight, 10),
      gender,
      max_hr: maxHr,
    }).eq('id', profileId);

    if (error) {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
      setIsLoading(false);
      return;
    }

    toast({ title: 'Profile complete!', description: 'You can now start training.' });
    onComplete();
  };

  return (
    <div className="participant-theme min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <Card className="w-full max-w-md bg-card border-border">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
          <CardDescription>We need a few more details to calculate your heart rate zones.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!existingData.birth_date && (
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
              </div>
            )}

            {!existingData.weight && (
              <div className="space-y-2">
                <Label htmlFor="comp-weight">Weight (kg)</Label>
                <Input id="comp-weight" type="number" placeholder="e.g. 75" value={weight} onChange={(e) => setWeight(e.target.value)} min={30} max={300} required />
              </div>
            )}

            {!existingData.gender && (
              <div className="space-y-2">
                <Label>Gender</Label>
                <RadioGroup value={gender} onValueChange={setGender} className="flex gap-4 pt-1">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="male" id="comp-male" />
                    <Label htmlFor="comp-male" className="cursor-pointer font-normal">Male</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="female" id="comp-female" />
                    <Label htmlFor="comp-female" className="cursor-pointer font-normal">Female</Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>) : 'Continue to Training'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
