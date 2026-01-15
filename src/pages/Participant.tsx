import { useState } from 'react';
import { ProfileSelector } from '@/components/participant/ProfileSelector';
import { HeartRateDisplay } from '@/components/participant/HeartRateDisplay';

interface Profile {
  id: string;
  name: string;
  age: number;
  max_hr: number;
}

export default function Participant() {
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);

  if (!selectedProfile) {
    return <ProfileSelector onProfileSelected={setSelectedProfile} />;
  }

  return (
    <HeartRateDisplay
      profile={selectedProfile}
      onBack={() => setSelectedProfile(null)}
    />
  );
}
