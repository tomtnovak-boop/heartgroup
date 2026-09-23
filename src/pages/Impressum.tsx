import { useNavigate } from 'react-router-dom';
import { Heart, ArrowLeft } from 'lucide-react';

export default function Legal Notice() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center">
              <Heart className="w-4 h-4 text-primary" fill="currentColor" />
            </div>
            <div className="font-bold text-lg">
              <span className="text-foreground">B</span>
              <span className="text-primary">heart</span>
            </div>
          </div>

          <div className="w-16" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        <h1 className="text-3xl font-bold">Legal Notice</h1>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Provider</h2>
          <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
{`[YOUR NAME / COMPANY]
[STREET AND NUMBER]
[POSTAL CODE AND CITY]
Switzerland`}
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Contact</h2>
          <p className="text-muted-foreground leading-relaxed">
            Email:{' '}
            <a href="mailto:tom@balboamove.ch" className="text-primary hover:underline">tom@balboamove.ch</a>
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Disclaimer</h2>
          <p className="text-muted-foreground leading-relaxed">
            Bheart is a workout support application and does not replace medical
            advice. Calculated training zones and calorie estimates are based on
            scientific formulas (Tanaka, Keytel) and are approximate. Consult a
            physician before beginning a workout program, especially if you have
            existing health conditions.
          </p>
        </section>

        <section className="space-y-3 pb-12">
          <h2 className="text-xl font-semibold">Copyright</h2>
          <p className="text-muted-foreground leading-relaxed">
            Content and works on this platform are subject to Swiss copyright law.
            Reproduction, editing, distribution, or any other use beyond the limits
            of copyright law requires the provider's written consent.
          </p>
        </section>
      </main>
    </div>
  );
}
