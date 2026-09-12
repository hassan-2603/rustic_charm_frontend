import { useEffect, useState } from "react";
import { Printer, Settings as SettingsIcon, Globe, CheckCircle2, XCircle, LayoutList, FileText } from "lucide-react";
import { getCategories } from "../services/categoryService";
import { getKotSections, setKotSections, getBillSections, setBillSections } from "../../services/settingsService";
import { translateEntireMenu } from "../services/translateMenu";
import {
  getPrinters,
  savePrinterSettings,
  testPrinter,
  type PrinterSettings,
  type PrinterStatus,
  type PrinterType,
} from "../services/printerService";

const EMPTY_SETTINGS: PrinterSettings = {
  printerName: "",
  connectionType: "network",
  ipAddress: "",
  port: 9100,
  paperWidth: "80mm",
  copies: 1,
  autoCut: true,
  autoPrint: false,
};

// One of these renders for BILL and one for KOT. Each talks to its own row
// in the backend's printers table via /api/admin/printers/:type — never to
// localStorage, never to an IP directly from the browser. Status shown here
// is the connector's last heartbeat (READY/OFFLINE), not just "has settings
// been saved", per the "Configured != Reachable" requirement.
function PrinterSection({
  title,
  type,
  status,
  onSaved,
}: {
  title: string;
  type: PrinterType;
  status: PrinterStatus | null;
  onSaved: (type: PrinterType, updated: PrinterStatus) => void;
}) {
  const [form, setForm] = useState<PrinterSettings>(status ?? EMPTY_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageOk, setMessageOk] = useState(true);

  useEffect(() => {
    if (status) setForm(status);
  }, [status]);

  function update<K extends keyof PrinterSettings>(key: K, value: PrinterSettings[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setMessage("");
  }

  async function handleSave() {
    setSaving(true);
    setMessage("");
    try {
      const updated = await savePrinterSettings(type, form);
      onSaved(type, updated);
      setMessage("Printer settings saved.");
      setMessageOk(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save printer settings.");
      setMessageOk(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setMessage("");
    try {
      const outcome = await testPrinter(type);
      setMessage(outcome.message);
      setMessageOk(outcome.ok);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Test print failed.");
      setMessageOk(false);
    } finally {
      setTesting(false);
    }
  }

  const isReady = status?.status === "READY";

  return (
    <div className="border rounded-2xl p-6 mb-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Printer size={20} />
          {title}
        </h2>
        <span
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${isReady ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
            }`}
        >
          {isReady ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
          {isReady ? "READY" : "OFFLINE"}
        </span>
      </div>
      <p className="text-gray-500 mt-2">
        {status?.configured
          ? "Configured. Status reflects whether the print connector is actually reachable, not just whether settings were saved."
          : "Not configured yet."}
      </p>

      <div className="grid gap-4 md:grid-cols-2 mt-6">
        <label className="text-sm font-medium">
          Printer name
          <input value={form.printerName} onChange={(e) => update("printerName", e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2" />
        </label>
        <label className="text-sm font-medium">
          Connection type
          <select value={form.connectionType} onChange={(e) => update("connectionType", e.target.value as PrinterSettings["connectionType"])} className="mt-1 w-full border rounded-lg px-3 py-2">
            <option value="network">Network</option>
            <option value="windows">USB/Windows Printer</option>
          </select>
        </label>
        <label className="text-sm font-medium">
          IP address
          <input value={form.ipAddress} onChange={(e) => update("ipAddress", e.target.value)} disabled={form.connectionType !== "network"} placeholder="192.168.1.50" className="mt-1 w-full border rounded-lg px-3 py-2 disabled:bg-gray-100" />
        </label>
        <label className="text-sm font-medium">
          Port
          <input type="number" min="1" max="65535" value={form.port ?? ""} onChange={(e) => update("port", e.target.value ? Number(e.target.value) : null)} disabled={form.connectionType !== "network"} className="mt-1 w-full border rounded-lg px-3 py-2 disabled:bg-gray-100" />
        </label>
        <label className="text-sm font-medium">
          Paper width
          <select value={form.paperWidth} onChange={(e) => update("paperWidth", e.target.value as PrinterSettings["paperWidth"])} className="mt-1 w-full border rounded-lg px-3 py-2">
            <option value="80mm">80mm</option>
            <option value="58mm">58mm</option>
          </select>
        </label>
        <label className="text-sm font-medium">
          Copies
          <input type="number" min="1" max="5" value={form.copies} onChange={(e) => update("copies", Math.max(1, Number(e.target.value) || 1))} className="mt-1 w-full border rounded-lg px-3 py-2" />
        </label>
        <label className="flex items-center gap-2 text-sm font-medium self-end pb-2">
          <input type="checkbox" checked={form.autoCut} onChange={(e) => update("autoCut", e.target.checked)} />
          Auto cut
        </label>
        <label className="flex items-center gap-2 text-sm font-medium self-end pb-2">
          <input type="checkbox" checked={form.autoPrint} onChange={(e) => update("autoPrint", e.target.checked)} />
          Auto print
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3 mt-6">
        <button onClick={handleSave} disabled={saving} className="bg-olive text-white px-5 py-2 rounded-xl font-semibold disabled:opacity-60">
          {saving ? "Saving..." : "Save"}
        </button>
        <button onClick={handleTest} disabled={testing || !status?.configured} className="border border-olive text-olive px-5 py-2 rounded-xl font-semibold disabled:opacity-50">
          {testing ? `Testing ${title}...` : `Test ${title}`}
        </button>
        {message && <span className={`text-sm ${messageOk ? "text-green-700" : "text-red-600"}`}>{message}</span>}
      </div>
    </div>
  );
}

function KotSectionSettings() {
  const [categories, setCategories] = useState<any[]>([]);
  const [config, setConfig] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const sections = ["Food", "Bar & Beverages", "Indian Tandoor"];

  useEffect(() => {
    Promise.all([getCategories(), getKotSections()])
      .then(([cats, conf]) => {
        setCategories(cats);
        setConfig(conf);
        setLoading(false);
      });
  }, []);

  function handleAssign(categoryId: string, section: string) {
    setConfig(prev => {
      const next = { ...prev };
      if (next[categoryId] === section) {
        delete next[categoryId];
      } else {
        next[categoryId] = section;
      }
      return next;
    });
    setMessage(""); // clear previous messages
  }

  async function handleSave() {
    setSaving(true);
    setMessage("");
    try {
      await setKotSections(config);
      setMessage("KOT Sections saved successfully.");
    } catch (e) {
      setMessage("Failed to save KOT sections.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="border rounded-2xl p-6 mb-6 text-gray-500">Loading KOT Sections...</div>;

  return (
    <div className="border rounded-2xl p-6 mb-8 mt-8">
      <h2 className="text-xl font-bold flex items-center gap-2 mb-2">
        <LayoutList size={22} />
        KOT Sections
      </h2>
      <p className="text-gray-500 mb-6">
        Click categories to assign them to a KOT section. During printing, ordered items will be automatically divided and printed as separate KOTs for each section.
      </p>

      {sections.map(section => (
        <div key={section} className="mb-6 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
          <h3 className="font-semibold text-gray-800 border-b pb-2 mb-3 uppercase tracking-wider text-sm">{section}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {categories.map(c => {
              const isChecked = config[c.id] === section;
              const cName = typeof c.name === 'object' ? c.name.English || c.name.en || Object.values(c.name)[0] : c.name;
              return (
                <label key={c.id} className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors select-none ${isChecked ? 'bg-olive/10 border-olive text-olive font-medium shadow-sm' : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-600'}`}>
                  <input type="checkbox" className="hidden" checked={isChecked} onChange={() => handleAssign(c.id, section)} />
                  <div className={`w-4 h-4 rounded appearance-none border flex items-center justify-center ${isChecked ? 'bg-olive border-olive' : 'bg-white border-gray-300'}`}>
                    {isChecked && <CheckCircle2 className="w-3 h-3 text-white" strokeWidth={4} />}
                  </div>
                  <span className="truncate flex-1 text-sm">{cName}</span>
                </label>
              )
            })}
          </div>
        </div>
      ))}
      <div className="flex items-center gap-4 mt-6">
        <button onClick={handleSave} disabled={saving} className="bg-olive text-white px-6 py-2.5 rounded-xl font-semibold shadow-sm hover:shadow active:scale-[0.98] transition-all disabled:opacity-60">
          {saving ? "Saving..." : "Save KOT Sections"}
        </button>
        {message && <span className={`text-sm font-medium ${message.includes('successfully') ? 'text-green-600' : 'text-red-500'}`}>{message}</span>}
      </div>
    </div>
  );
}

function BillSectionSettings() {
  const [categories, setCategories] = useState<any[]>([]);
  const [config, setConfig] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const sections = ["Food", "Liquor"];

  useEffect(() => {
    Promise.all([getCategories(), getBillSections()])
      .then(([cats, conf]) => {
        setCategories(cats);
        setConfig(conf);
        setLoading(false);
      });
  }, []);

  function handleAssign(categoryId: string, section: string) {
    setConfig(prev => {
      const next = { ...prev };
      if (next[categoryId] === section) {
        delete next[categoryId];
      } else {
        next[categoryId] = section;
      }
      return next;
    });
    setMessage(""); // clear previous messages
  }

  async function handleSave() {
    setSaving(true);
    setMessage("");
    try {
      await setBillSections(config);
      setMessage("Bill Sections saved successfully.");
    } catch (e) {
      setMessage("Failed to save Bill sections.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="border rounded-2xl p-6 mb-6 text-gray-500">Loading Bill Sections...</div>;

  return (
    <div className="border rounded-2xl p-6 mb-8 mt-8">
      <h2 className="text-xl font-bold flex items-center gap-2 mb-2">
        <FileText size={22} />
        Bill Print Sections
      </h2>
      <p className="text-gray-500 mb-6">
        Assign categories to Food or Liquor. During printing, ordered items will be automatically divided into these two sections under a single bill. Categories not assigned will default to Food.
      </p>

      {sections.map(section => (
        <div key={section} className="mb-6 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
          <h3 className="font-semibold text-gray-800 border-b pb-2 mb-3 uppercase tracking-wider text-sm">{section}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {categories.map(c => {
              const isChecked = config[c.id] === section;
              const cName = typeof c.name === 'object' ? c.name.English || c.name.en || Object.values(c.name)[0] : c.name;
              return (
                <label key={c.id} className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors select-none ${isChecked ? 'bg-olive/10 border-olive text-olive font-medium shadow-sm' : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-600'}`}>
                  <input type="checkbox" className="hidden" checked={isChecked} onChange={() => handleAssign(c.id, section)} />
                  <div className={`w-4 h-4 rounded appearance-none border flex items-center justify-center ${isChecked ? 'bg-olive border-olive' : 'bg-white border-gray-300'}`}>
                    {isChecked && <CheckCircle2 className="w-3 h-3 text-white" strokeWidth={4} />}
                  </div>
                  <span className="truncate flex-1 text-sm">{cName}</span>
                </label>
              )
            })}
          </div>
        </div>
      ))}
      <div className="flex items-center gap-4 mt-6">
        <button onClick={handleSave} disabled={saving} className="bg-olive text-white px-6 py-2.5 rounded-xl font-semibold shadow-sm hover:shadow active:scale-[0.98] transition-all disabled:opacity-60">
          {saving ? "Saving..." : "Save Bill Sections"}
        </button>
        {message && <span className={`text-sm font-medium ${message.includes('successfully') ? 'text-green-600' : 'text-red-500'}`}>{message}</span>}
      </div>
    </div>
  );
}

export default function Settings() {
  const [printers, setPrinters] = useState<{ bill: PrinterStatus | null; kot: PrinterStatus | null }>({ bill: null, kot: null });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getPrinters();
        if (!cancelled) setPrinters(data);
      } catch (error) {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : "Unable to load printer settings.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleSaved(type: PrinterType, updated: PrinterStatus) {
    setPrinters((current) => ({ ...current, [type]: updated }));
  }

  const [translating, setTranslating] = useState(false);
  const [progressText, setProgressText] = useState("");

  async function handleTranslate() {
    const ok = confirm(
      "This will translate untranslated menu items and descriptions into all supported languages.\n\nExisting translations and English will NOT be modified.\n\nContinue?"
    );

    if (!ok) return;

    setTranslating(true);
    setProgressText("Fetching menu items...");

    try {
      const summary = await translateEntireMenu((progress) => {
        setProgressText(
          `Translating ${progress.current} of ${progress.total}: ${progress.itemName}`
        );
      });

      alert(
        `✅ Translation Completed!\n\n` +
        `• Total items inspected: ${summary.total}\n` +
        `• Items newly translated: ${summary.itemsTranslated}\n` +
        `• Descriptions translated: ${summary.descriptionsTranslated}\n` +
        `• Items already translated (skipped): ${summary.skippedCount}\n\n` +
        `All previous translations and English names remain completely untouched.`
      );
    } catch (err) {
      console.error(err);
      alert("❌ Translation failed. Check console for details.");
    } finally {
      setTranslating(false);
      setProgressText("");
    }
  }

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-2xl shadow-sm border p-8">
        <div className="flex items-center gap-3 mb-6">
          <SettingsIcon size={28} />
          <div>
            <h1 className="text-2xl font-bold">
              Restaurant Settings
            </h1>

            <p className="text-gray-500">
              Manage restaurant tools and utilities.
            </p>
          </div>
        </div>

        <div className="mb-2">
          <h2 className="text-xl font-bold">Printer Settings</h2>
          <p className="text-gray-500 mt-1">
            Configure the restaurant's Bill and KOT printers once. Every waiter's phone and the admin panel
            print through these same printers automatically — no setup is needed on any individual device.
          </p>
        </div>

        {loading ? (
          <div className="border rounded-2xl p-6 mb-6 text-gray-500">Loading printer settings...</div>
        ) : loadError ? (
          <div className="border rounded-2xl p-6 mb-6 text-red-600">{loadError}</div>
        ) : (
          <>
            <PrinterSection title="Bill Printer" type="bill" status={printers.bill} onSaved={handleSaved} />
            <PrinterSection title="KOT Printer" type="kot" status={printers.kot} onSaved={handleSaved} />
          </>
        )}

        <KotSectionSettings />
        <BillSectionSettings />

        <div className="border rounded-2xl p-6 flex items-center justify-between mt-8">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Globe size={20} />
              Translate Entire Menu
            </h2>

            <p className="text-gray-500 mt-2">
              Automatically translate every menu item's
              name and description into Russian, German,
              Spanish, Kazakh, Hebrew, Japanese and Korean.
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <button
              onClick={handleTranslate}
              disabled={translating}
              className="bg-olive text-white px-6 py-3 rounded-xl font-semibold hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2 transition"
            >
              {translating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Translating Menu...</span>
                </>
              ) : (
                <>
                  <span>🌍</span>
                  <span>Translate Menu</span>
                </>
              )}
            </button>
            {translating && progressText && (
              <p className="text-xs text-olive font-medium animate-pulse max-w-xs text-right truncate">
                {progressText}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}