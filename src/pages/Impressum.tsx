import { useNavigate } from 'react-router-dom';
import { Heart, ArrowLeft } from 'lucide-react';

export default function Impressum() {
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
            Zurück
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
        <h1 className="text-3xl font-bold">Impressum</h1>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Anbieter</h2>
          <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
{`[DEIN NAME / FIRMA]
[STRASSE UND HAUSNUMMER]
[PLZ UND ORT]
Schweiz`}
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Kontakt</h2>
          <p className="text-muted-foreground leading-relaxed">
            E-Mail:{' '}
            <a href="mailto:tom@balboamove.ch" className="text-primary hover:underline">tom@balboamove.ch</a>
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Haftungsausschluss</h2>
          <p className="text-muted-foreground leading-relaxed">
            Bheart ist eine Trainings-Hilfsanwendung und ersetzt keine
            medizinische Beratung. Die berechneten Trainingszonen und
            Kalorienschätzungen basieren auf wissenschaftlichen Formeln (Tanaka,
            Keytel) und sind Annäherungswerte. Konsultieren Sie vor Beginn eines
            Trainingsprogramms einen Arzt, insbesondere bei bestehenden
            gesundheitlichen Einschränkungen.
          </p>
        </section>

        <section className="space-y-3 pb-12">
          <h2 className="text-xl font-semibold">Urheberrecht</h2>
          <p className="text-muted-foreground leading-relaxed">
            Inhalte und Werke auf dieser Plattform unterliegen dem
            schweizerischen Urheberrecht. Vervielfältigung, Bearbeitung,
            Verbreitung und jede Art der Verwertung außerhalb der Grenzen des
            Urheberrechts bedürfen der schriftlichen Zustimmung des Anbieters.
          </p>
        </section>
      </main>
    </div>
  );
}
