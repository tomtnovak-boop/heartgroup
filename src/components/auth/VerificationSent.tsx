import { Mail } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface VerificationSentProps {
  email: string;
  onBackToLogin: () => void;
}

export function VerificationSent({ email, onBackToLogin }: VerificationSentProps) {
  return (
    <Card className="w-full max-w-md mx-auto bg-card border-border">
      <CardContent className="text-center p-8 space-y-5">
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
          <Mail className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">Check your inbox</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          We've sent a verification link to{' '}
          <span className="font-medium text-foreground">{email}</span>.
          <br />
          Click the link to activate your account.
        </p>
        <p className="text-xs text-muted-foreground">
          Didn't receive the email? Check your spam folder.
        </p>
        <Button variant="outline" onClick={onBackToLogin} className="mt-2">
          Back to Sign In
        </Button>
      </CardContent>
    </Card>
  );
}
