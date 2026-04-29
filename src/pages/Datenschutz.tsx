import { useNavigate } from 'react-router-dom';
import { Heart, ArrowLeft } from 'lucide-react';

export default function Datenschutz() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
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

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Datenschutzerklärung</h1>
          <p className="text-sm text-muted-foreground">Letzte Aktualisierung: [DATUM EINFÜGEN]</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">1. Verantwortliche Stelle</h2>
          <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
{`[DEIN NAME / FIRMA]
[STRASSE UND HAUSNUMMER]
[PLZ UND ORT]
Schweiz

E-Mail: tom@balboamove.ch`}
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">2. Welche Daten wir verarbeiten</h2>
          <p className="text-muted-foreground leading-relaxed">
            Bei der Nutzung von Bheart verarbeiten wir folgende personenbezogene Daten:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground leading-relaxed">
            <li><strong className="text-foreground">Account-Daten:</strong> E-Mail-Adresse, verschlüsseltes Passwort, Name, Spitzname</li>
            <li><strong className="text-foreground">Profildaten:</strong> Geburtsdatum, Gewicht, Geschlecht, ggf. individuelle maximale Herzfrequenz</li>
            <li><strong className="text-foreground">Gesundheitsdaten:</strong> Herzfrequenz-Messwerte während Trainingseinheiten, berechnete Trainingszonen, geschätzter Kalorienverbrauch</li>
            <li><strong className="text-foreground">Trainingsdaten:</strong> Beginn, Dauer, Durchschnitts- und Maximalpuls einzelner Sessions</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">3. Zweck der Verarbeitung</h2>
          <p className="text-muted-foreground leading-relaxed">Ihre Daten werden ausschließlich verwendet, um:</p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground leading-relaxed">
            <li>Ihnen den Zugang zur App zu ermöglichen</li>
            <li>Ihre Trainingszonen und Ihren Kalorienverbrauch zu berechnen</li>
            <li>Ihrem Coach Ihre Live-Trainingsdaten anzuzeigen, während Sie an einer Session teilnehmen</li>
            <li>Ihnen Ihre persönliche Trainingshistorie zur Verfügung zu stellen</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">4. Rechtsgrundlage</h2>
          <p className="text-muted-foreground leading-relaxed">
            Die Verarbeitung erfolgt auf Basis Ihrer ausdrücklichen Einwilligung
            (Art. 6 Abs. 1 lit. a DSGVO bzw. Art. 31 DSG). Da es sich bei
            Herzfrequenz- und Gesundheitsdaten um besonders schützenswerte
            Personendaten handelt, willigen Sie mit der Registrierung explizit
            in deren Verarbeitung ein.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">5. Empfänger der Daten</h2>
          <p className="text-muted-foreground leading-relaxed">
            Wir geben Ihre Daten nicht an Dritte weiter. Wir nutzen folgende
            Auftragsverarbeiter, die vertraglich an unsere Datenschutzstandards
            gebunden sind:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground leading-relaxed">
            <li>Supabase Inc. (Datenbank- und Authentifizierungs-Hosting, [REGION SUPABASE PROJEKT EINTRAGEN])</li>
            <li>Apple Inc. (App Store, TestFlight, optional HealthKit-Integration)</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">6. Speicherdauer</h2>
          <p className="text-muted-foreground leading-relaxed">
            Ihre Account- und Trainingsdaten speichern wir, solange Ihr Account
            besteht. Live-Herzfrequenzdaten werden automatisch nach maximal einer
            Stunde gelöscht. Bei Löschung Ihres Accounts werden alle damit
            verbundenen Daten innerhalb von 30 Tagen vollständig entfernt.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">7. Ihre Rechte</h2>
          <p className="text-muted-foreground leading-relaxed">Sie haben das Recht auf:</p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground leading-relaxed">
            <li>Auskunft über die zu Ihrer Person gespeicherten Daten</li>
            <li>Berichtigung unzutreffender Daten</li>
            <li>Löschung Ihrer Daten («Recht auf Vergessenwerden»)</li>
            <li>Einschränkung der Verarbeitung</li>
            <li>Datenübertragbarkeit</li>
            <li>Widerruf Ihrer Einwilligung mit Wirkung für die Zukunft</li>
            <li>Beschwerde bei der zuständigen Aufsichtsbehörde (in der Schweiz: Eidgenössischer Datenschutz- und Öffentlichkeitsbeauftragter EDÖB)</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed">
            Zur Ausübung Ihrer Rechte kontaktieren Sie uns bitte unter:{' '}
            <a href="mailto:tom@balboamove.ch" className="text-primary hover:underline">tom@balboamove.ch</a>
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">8. Sicherheit</h2>
          <p className="text-muted-foreground leading-relaxed">
            Ihre Daten werden verschlüsselt übertragen (TLS) und gespeichert.
            Der Zugriff auf Ihre Daten ist durch Authentifizierung und
            Berechtigungs-Policies abgesichert. Coaches sehen Ihre Trainingsdaten
            nur, wenn Sie aktiv an einer Session teilnehmen.
          </p>
        </section>

        <section className="space-y-3 pb-12">
          <h2 className="text-xl font-semibold">9. Änderungen dieser Erklärung</h2>
          <p className="text-muted-foreground leading-relaxed">
            Wir behalten uns vor, diese Datenschutzerklärung anzupassen, um sie
            an geänderte Rechtslage oder Funktionalitäten anzupassen. Die jeweils
            aktuelle Version ist auf dieser Seite einsehbar.
          </p>
        </section>
      </main>
    </div>
  );
}
