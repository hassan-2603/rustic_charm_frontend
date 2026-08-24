import { useEffect, useState } from "react";
import { Printer, Settings as SettingsIcon, Globe, CheckCircle2, XCircle } from "lucide-react";
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
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
            isReady ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
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

  async function handleTranslate() {
    const ok = confirm(
      "This will translate your menu into all supported languages.\n\nContinue?"
    );

    if (!ok) return;

    try {
      await translateEntireMenu();

      alert("✅ Menu translated successfully.");
    } catch (err) {
      console.error(err);
      alert("❌ Translation failed. Check console.");
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

        <div className="border rounded-2xl p-6 flex items-center justify-between">
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

          <button
            onClick={handleTranslate}
            className="bg-olive text-white px-6 py-3 rounded-xl font-semibold hover:opacity-90"
          >
            🌍 Translate Menu
          </button>
        </div>
      </div>
    </div>
  );
}