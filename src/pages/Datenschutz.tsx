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

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">Last updated: [INSERT DATE]</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">1. Data Controller</h2>
          <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
{`[YOUR NAME / COMPANY]
[STREET AND NUMBER]
[POSTAL CODE AND CITY]
Switzerland

Email: tom@balboamove.ch`}
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">2. Data We Process</h2>
          <p className="text-muted-foreground leading-relaxed">
            When you use Bheart, we process the following personal data:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground leading-relaxed">
            <li><strong className="text-foreground">Account data:</strong> Email address, encrypted password, name, nickname</li>
            <li><strong className="text-foreground">Profile data:</strong> Date of birth, weight, gender, and optional individual maximum heart rate</li>
            <li><strong className="text-foreground">Health data:</strong> Heart-rate readings during workouts, calculated training zones, and estimated calorie consumption</li>
            <li><strong className="text-foreground">Workout data:</strong> Start time, duration, average heart rate, and maximum heart rate for individual sessions</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">3. Purpose of Processing</h2>
          <p className="text-muted-foreground leading-relaxed">We use your data exclusively to:</p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground leading-relaxed">
            <li>Provide access to the app</li>
            <li>Calculate your training zones and calorie consumption</li>
            <li>Show your live workout data to your coach while you participate in a session</li>
            <li>Provide your personal workout history</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">4. Legal Basis</h2>
          <p className="text-muted-foreground leading-relaxed">
            Processing is based on your explicit consent (Art. 6(1)(a) GDPR or
            Art. 31 FADP). Because heart-rate and health data are particularly
            sensitive personal data, you explicitly consent to their processing
            when you register.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">5. Data Recipients</h2>
          <p className="text-muted-foreground leading-relaxed">
            We do not sell your data or disclose it to third parties. We use the
            following processors, who are contractually bound by our privacy standards:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground leading-relaxed">
            <li>Supabase Inc. (database and authentication hosting, [INSERT PROJECT REGION])</li>
            <li>Apple Inc. (App Store, TestFlight, optional HealthKit-Integration)</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">6. Retention Period</h2>
          <p className="text-muted-foreground leading-relaxed">
            We store your account and workout data while your account exists. Live
            heart-rate data is automatically deleted after no more than one hour.
            When your account is deleted, all associated data is permanently removed
            within 30 days.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">7. Your Rights</h2>
          <p className="text-muted-foreground leading-relaxed">You have the right to:</p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground leading-relaxed">
            <li>Access the data stored about you</li>
            <li>Correct inaccurate data</li>
            <li>Delete your data (right to be forgotten)</li>
            <li>Restrict processing</li>
            <li>Data portability</li>
            <li>Withdraw your consent with future effect</li>
            <li>Lodge a complaint with the competent supervisory authority (in Switzerland: the Federal Data Protection and Information Commissioner)</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed">
            To exercise your rights, contact us at:{' '}
            <a href="mailto:tom@balboamove.ch" className="text-primary hover:underline">tom@balboamove.ch</a>
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">8. Security</h2>
          <p className="text-muted-foreground leading-relaxed">
            Your data is encrypted in transit (TLS) and at rest. Access is protected
            by authentication and authorization policies. Coaches see your workout
            data only while you actively participate in a session.
          </p>
        </section>

        <section className="space-y-3 pb-12">
          <h2 className="text-xl font-semibold">9. Changes to This Policy</h2>
          <p className="text-muted-foreground leading-relaxed">
            We may update this Privacy Policy to reflect changes in law or app
            functionality. The current version is always available on this page.
          </p>
        </section>
      </main>
    </div>
  );
}
