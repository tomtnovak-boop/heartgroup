import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { User, Plus, Heart } from 'lucide-react';

interface Profile {
  id: string;
  name: string;
  age: number;
  max_hr: number;
}

interface ProfileSelectorProps {
  onProfileSelected: (profile: Profile) => void;
}

export function ProfileSelector({ onProfileSelected }: ProfileSelectorProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAge, setNewAge] = useState(30);
  const [isLoading, setIsLoading] = useState(true);

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
      setProfiles(data || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function createProfile() {
    if (!newName.trim()) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert({ name: newName.trim(), age: newAge })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        onProfileSelected(data);
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
                <Label htmlFor="age">Alter</Label>
                <Input
                  id="age"
                  type="number"
                  min={10}
                  max={100}
                  value={newAge}
                  onChange={(e) => setNewAge(parseInt(e.target.value) || 30)}
                />
                <p className="text-sm text-muted-foreground">
                  Max. Herzfrequenz: {220 - newAge} bpm
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
                  disabled={!newName.trim()}
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
