"use client";

import { useEffect, useState } from "react";
import { Smartphone } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

export default function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);

    setIsStandalone(standalone);

    const handler = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  async function handleInstall() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      return;
    }

    setShowHelp((current) => !current);
  }

  if (isStandalone) {
    return null;
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleInstall}
        className="inline-flex items-center gap-2 rounded-full bg-stone-950 px-4 py-2 text-xs font-black uppercase tracking-wide text-white shadow-sm transition hover:bg-stone-800"
      >
        <Smartphone size={14} />
        Install App
      </button>

      {showHelp && (
        <div className="absolute right-0 z-50 mt-3 w-72 rounded-2xl border border-stone-200 bg-white p-4 text-left shadow-xl shadow-stone-900/10">
          <p className="text-sm font-black text-stone-900">
            Install on your phone
          </p>

          <div className="mt-3 space-y-2 text-xs font-semibold leading-relaxed text-stone-500">
            <p>
              <span className="font-black text-stone-700">iPhone:</span> open in
              Safari, tap Share, then Add to Home Screen.
            </p>

            <p>
              <span className="font-black text-stone-700">Android:</span> open in
              Chrome, tap the menu, then Install app or Add to Home screen.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
