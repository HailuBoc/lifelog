import useAuth from "@/hooks/useAuth";

import { store } from "@/lib/storage";

export default function SettingsPage() {
  const { user, token, loading } = useAuth(false);
  const [settings, setSettings] = useState(() => {
    const saved = store.get()?.settings ?? {};
    return {
      theme: saved.theme || "dark",
      encryptionEnabled: !!saved.encryptionEnabled,
    };
  });
  const [exporting, setExporting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const announceRef = useRef(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
  const API_BASE = `${API_URL}/api/lifelog`;

  /* ✅ Mark that we're on the client for hydration-safe rendering */
  useEffect(() => {
    setIsClient(true);
  }, []);

  /* ✅ Load existing settings from store */
  useEffect(() => {
    try {
      const existing = store.get(user?.id);
      if (existing?.settings) setSettings(existing.settings);
    } catch {}
    setIsInitialLoad(false);
  }, [user?.id]);

  /* ✅ Persist settings in shared localStorage (ONLY AFTER INITIAL LOAD) */
  useEffect(() => {
    if (isInitialLoad) return;
    try {
      const existing = store.get(user?.id) || {};
      existing.settings = settings;
      store.set(user?.id, existing);
    } catch {}
  }, [settings, isInitialLoad, user?.id]);

  /* ✅ Toggle dark/light theme */
  function toggleTheme() {
    const next = settings.theme === "dark" ? "light" : "dark";
    setSettings((s) => ({ ...s, theme: next }));
    announce(`Theme set to ${next}`);
  }

  /* ✅ Toggle encryption */
  function toggleEncryption() {
    setSettings((s) => ({ ...s, encryptionEnabled: !s.encryptionEnabled }));
    announce(
      !settings.encryptionEnabled ? "Encryption enabled" : "Encryption disabled"
    );
  }

  /* ✅ Export data (local + backend if available) */
  async function exportJSON() {
    try {
      setExporting(true);
      let localData = store.get() || {};

      // try fetching from backend if available
      let backendData = {};
      try {
        const res = await fetch(`${API_BASE}`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        if (res.ok) backendData = await res.json();
      } catch {
        // ignore if offline
      }

      const payload = {
        exportedAt: new Date().toISOString(),
        settings,
        localData,
        backendData,
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lifelog-export-${new Date()
        .toISOString()
        .slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);

      announce("Export completed");
    } catch (e) {
      announce("Export failed");
    } finally {
      setTimeout(() => setExporting(false), 800);
    }
  }

  /* ✅ Clear local + backend data */
  async function clearAllData() {
    if (!confirm("Clear ALL LifeLog data? This cannot be undone.")) return;
    setClearing(true);

    try {
      // clear local storage
      store.clear(user?.id);
      localStorage.removeItem("lifelog:theme");

      // reset settings in memory (theme preserved)
      setSettings({ theme: settings.theme, encryptionEnabled: false });

      // attempt to clear backend data too
      try {
        await fetch(`${API_BASE}/clear`, { 
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
      } catch {
        // ignore if offline
      }

      announce("All data cleared");
    } catch {
      announce("Failed to clear data");
    } finally {
      setTimeout(() => setClearing(false), 800);
    }
  }

  /* Accessibility-friendly announcement */
  function announce(msg) {
    if (!announceRef.current) return;
    announceRef.current.textContent = msg;
    setTimeout(() => {
      if (announceRef.current) announceRef.current.textContent = "";
    }, 1200);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <section className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-gradient-to-b from-slate-800/60 to-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700 shadow-neu">
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-100">
              Settings & Privacy
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Control theme, data export, and privacy options. Local-first —
              nothing leaves your device unless you export.
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Appearance */}
          <div className="p-4 rounded-lg bg-slate-800/60 border border-slate-700">
            <h2 className="text-sm font-medium text-slate-200 mb-2">
              Appearance
            </h2>
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm text-slate-100">Theme</div>
                <div className="text-xs text-slate-400">
                  {isClient
                    ? settings.theme === "dark"
                      ? "Dark"
                      : "Light"
                    : ""}
                </div>
              </div>
              <button
                onClick={toggleTheme}
                className="px-3 py-2 rounded-md bg-slate-700/60 hover:bg-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                Toggle Theme
              </button>
            </div>
          </div>

          {/* Privacy */}
          <div className="p-4 rounded-lg bg-slate-800/60 border border-slate-700">
            <h2 className="text-sm font-medium text-slate-200 mb-2">Privacy</h2>
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm text-slate-100">Local Encryption</div>
                <div className="text-xs text-slate-400">
                  UI-only — full encryption would require secure keys.
                </div>
              </div>
              <button
                onClick={toggleEncryption}
                className={`px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  isClient
                    ? settings.encryptionEnabled
                      ? "bg-emerald-500 text-black"
                      : "bg-slate-700/60 text-slate-100 hover:bg-slate-700"
                    : "bg-slate-700/60 text-slate-100"
                }`}
              >
                {isClient
                  ? settings.encryptionEnabled
                    ? "Enabled"
                    : "Enable"
                  : ""}
              </button>
            </div>
          </div>

          {/* Data section */}
          <div className="sm:col-span-2 p-4 rounded-lg bg-slate-800/60 border border-slate-700">
            <h2 className="text-sm font-medium text-slate-200 mb-2">Data</h2>
            <p className="text-xs text-slate-400 mb-3">
              Export or delete your LifeLog data. Exports a JSON file containing
              stored journals, habits, and settings.
            </p>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={exportJSON}
                className="px-3 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-sm disabled:opacity-60"
                disabled={exporting}
              >
                {exporting ? "Exporting…" : "Export JSON"}
              </button>

              <button
                onClick={clearAllData}
                className="px-3 py-2 rounded-md bg-rose-600 hover:bg-rose-500 text-white text-sm disabled:opacity-60"
                disabled={clearing}
              >
                {clearing ? "Clearing…" : "Clear All Data"}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 text-xs text-slate-400">
          <p>
            Note: LifeLog stores most data locally. For secure backups or
            sharing, export your data manually.
          </p>
        </div>

        <div className="sr-only" aria-live="polite" ref={announceRef} />
      </div>
    </section>
  );
}
