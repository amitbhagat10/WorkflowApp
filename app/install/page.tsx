import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Globe2,
  Monitor,
  Share2,
  Smartphone,
} from "lucide-react";

export default function InstallPage() {
  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-stone-600"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </Link>

        <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-stone-500">
          Install WorkFlow Pro
        </p>

        <h1 className="page-title">Add WorkFlow Pro to your phone</h1>

        <p className="page-subtitle max-w-3xl">
          WorkFlow Pro can be installed on your phone home screen like an app.
          It opens in a clean full-screen view and works from desktop, tablet,
          iPhone and Android.
        </p>
      </div>

      <section className="grid gap-5 lg:grid-cols-3">
        <InstallCard
          icon={<Smartphone size={24} />}
          title="iPhone / iPad"
          subtitle="Use Safari"
          steps={[
            "Open WorkFlow Pro in Safari.",
            "Tap the Share button.",
            "Choose Add to Home Screen.",
            "Tap Add.",
          ]}
          note="Apple requires this manual step for web apps."
        />

        <InstallCard
          icon={<Globe2 size={24} />}
          title="Android"
          subtitle="Use Chrome"
          steps={[
            "Open WorkFlow Pro in Chrome.",
            "Tap Install App if prompted.",
            "Or tap the Chrome menu.",
            "Choose Install app or Add to Home screen.",
          ]}
          note="On Android, the Install App button may open the native install prompt directly."
        />

        <InstallCard
          icon={<Monitor size={24} />}
          title="Desktop"
          subtitle="Chrome / Edge"
          steps={[
            "Open WorkFlow Pro in Chrome or Edge.",
            "Look for the install icon in the address bar.",
            "Or open the browser menu.",
            "Choose Install WorkFlow Pro.",
          ]}
          note="Useful for office/admin users who work from a laptop."
        />
      </section>

      <section className="card">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#f4efe4] text-[#2b2926]">
            <CheckCircle2 size={24} />
          </div>

          <div>
            <h2 className="text-xl font-black tracking-tight text-stone-900">
              What your client can be told
            </h2>

            <p className="mt-2 text-sm leading-relaxed text-stone-600">
              Yes, WorkFlow Pro can be installed on your phone. It is currently
              an installable cloud web app. On iPhone, add it through Safari
              using Add to Home Screen. On Android, Chrome may show an Install
              App option. Once installed, it opens like a normal app with its own
              icon.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function InstallCard({
  icon,
  title,
  subtitle,
  steps,
  note,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  steps: string[];
  note: string;
}) {
  return (
    <div className="card">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2b2926] text-[#d8bd82]">
        {icon}
      </div>

      <h2 className="mt-5 text-2xl font-black tracking-tight text-stone-950">
        {title}
      </h2>

      <p className="mt-1 text-sm font-bold text-stone-500">{subtitle}</p>

      <div className="mt-5 space-y-3">
        {steps.map((step, index) => (
          <div key={step} className="flex gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-stone-100 text-xs font-black text-stone-700">
              {index + 1}
            </div>

            <p className="pt-1 text-sm font-medium text-stone-600">{step}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-2xl bg-stone-50 p-4">
        <div className="flex gap-2 text-sm font-semibold text-stone-500">
          <Share2 size={16} className="mt-0.5 shrink-0" />
          <p>{note}</p>
        </div>
      </div>
    </div>
  );
}