import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Mail, ArrowLeft } from 'lucide-react';

interface ForgotPasswordFormProps {
  onSwitchToLogin: () => void;
}

export function ForgotPasswordForm({ onSwitchToLogin }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setIsLoading(false);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }

    setSent(true);
    toast({ title: 'Email sent', description: 'Check your inbox for the reset link.' });
  };

  return (
    <Card className="w-full max-w-md mx-auto bg-card border-border">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Forgot Password</CardTitle>
        <CardDescription>
          {sent
            ? 'We have sent you an email with a reset link.'
            : 'Enter your email address to reset your password.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!sent ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="reset-email" type="email" placeholder="your@email.com"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  className="pl-10" required
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</>) : 'Send Reset Link'}
            </Button>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground text-center">
            Didn't receive an email? Check your spam folder or try again.
          </p>
        )}

        <div className="mt-6 text-center">
          <button type="button" onClick={onSwitchToLogin} className="text-sm text-primary hover:underline font-medium inline-flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" />
            Back to login
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
