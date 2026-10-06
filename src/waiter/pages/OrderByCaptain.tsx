import { useEffect, useMemo, useState } from "react";
import { Minus, Plus, Search, Trash2, ChevronDown, ChevronUp, FileText } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { getMenuItems } from "../../services/customerApi";
import { listenTables, createCaptainOrder } from "../services/waiterService";
import { printKOT } from "../services/printerService";
import { getLocalizedField, getLocalizedCategory, getMenuPriceOptions, getPriceOptionLabel, type PriceOption } from "../../types";
import ItemNoteModal from "../../components/ItemNoteModal";

type SelectedItem = {
  key: string;
  item: any;
  quantity: number;
  selectedPriceOption: PriceOption;
  note?: string;
};

function getWaiterEnglishDescription(item: any): string {
  if (!item) return "";

  if (typeof item.englishDescription === "string" && item.englishDescription.trim()) {
    const val = item.englishDescription.trim();
    if (val !== "[object Object]" && !val.startsWith("{")) return val;
  }

  if (typeof item.english_description === "string" && item.english_description.trim()) {
    const val = item.english_description.trim();
    if (val !== "[object Object]" && !val.startsWith("{")) return val;
  }

  if (typeof item.description === "string" && item.description.trim()) {
    const val = item.description.trim();
    if (val !== "[object Object]" && !val.startsWith("{")) return val;
  }

  if (typeof item.desc === "string" && item.desc.trim()) {
    const val = item.desc.trim();
    if (val !== "[object Object]" && !val.startsWith("{")) return val;
  }

  if (typeof item.metadata?.description === "string" && item.metadata.description.trim()) {
    const val = item.metadata.description.trim();
    if (val !== "[object Object]" && !val.startsWith("{")) return val;
  }

  if (typeof item.metadata?.desc === "string" && item.metadata.desc.trim()) {
    const val = item.metadata.desc.trim();
    if (val !== "[object Object]" && !val.startsWith("{")) return val;
  }

  const transEn = item.translations?.en || item.translations?.English || item.translations?.EN;
  if (typeof transEn?.description === "string" && transEn.description.trim()) {
    return transEn.description.trim();
  }

  for (const rawSource of [item.description, item.metadata?.description]) {
    let raw = rawSource;
    if (typeof raw === "string" && raw.trim().startsWith("{")) {
      try {
        raw = JSON.parse(raw);
      } catch {}
    }
    if (raw && typeof raw === "object") {
      const enVal = raw.English || raw.english || raw.en || raw.EN || raw.description || raw.desc;
      if (typeof enVal === "string" && enVal.trim() && enVal !== "[object Object]") {
        return enVal.trim();
      }
    }
  }

  const loc = getLocalizedField(item.description, "English", item);
  const itemName = typeof item.name === "string" ? item.name.trim() : "";
  if (loc && loc !== itemName && loc !== "[object Object]") {
    return loc;
  }

  return "";
}

export default function OrderByCaptain() {
  const waiter = JSON.parse(localStorage.getItem("waiter") || "{}");
  const [searchParams] = useSearchParams();

  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [area, setArea] = useState(searchParams.get("area") || "");
  const [tableId, setTableId] = useState(searchParams.get("table") || "");
  const [selected, setSelected] = useState<SelectedItem[]>([]);
  const [placing, setPlacing] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});
  const [noteModalTarget, setNoteModalTarget] = useState<{ item: any; key?: string } | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    getMenuItems("en").then(setMenuItems).catch(console.error);
    return listenTables(setTables);
  }, []);

  const areas = useMemo(() => [...new Set(tables.map((table) => table.area))], [tables]);
  const areaTables = tables.filter((table) => !area || table.area === area);
  const filteredItems = menuItems.filter((item) => {
    const name = getLocalizedField(item.name, "English");
    const cat = getLocalizedCategory(item.category, "English") || getLocalizedField(item.category, "English");
    return `${name} ${cat}`.toLowerCase().includes(search.toLowerCase());
  });

  const total = selected.reduce(
    (sum, entry) => sum + (entry.selectedPriceOption?.amount ?? entry.item.price ?? 0) * entry.quantity,
    0
  );

  function handleSaveNote(note: string) {
    if (!noteModalTarget) return;
    const { item, key } = noteModalTarget;
    setItemNotes((prev) => ({ ...prev, [item.id]: note }));
    if (key) {
      setSelected((curr) => curr.map((s) => (s.key === key ? { ...s, note } : s)));
    } else {
      setSelected((curr) => {
        const hasItem = curr.some((s) => s.item.id === item.id);
        if (hasItem) {
          return curr.map((s) => (s.item.id === item.id ? { ...s, note } : s));
        }
        return curr;
      });
    }
    setNoteModalTarget(null);
  }

  function addItem(item: any, option?: PriceOption) {
    const opt = option || getMenuPriceOptions(item)[0];
    const savedNote = itemNotes[item.id] || "";
    const key = `${item.id}-${opt.quantity}-${opt.amount}-${opt.unit || ""}`;
    setPlacedOrderId(null);
    setSelected((current) => {
      const existing = current.find((entry) => entry.key === key);
      if (existing) {
        return current.map((entry) =>
          entry.key === key ? { ...entry, quantity: entry.quantity + 1, note: existing.note || savedNote } : entry
        );
      }
      return [...current, { key, item, quantity: 1, selectedPriceOption: opt, note: savedNote }];
    });
  }

  function changeQuantity(key: string, amount: number) {
    setSelected((current) =>
      current
        .map((entry) => (entry.key === key ? { ...entry, quantity: entry.quantity + amount } : entry))
        .filter((entry) => entry.quantity > 0)
    );
  }

  async function placeOrder() {
    const table = tables.find((entry) => entry.id === tableId);
    if (!waiter?.id || !table || selected.length === 0) {
      alert("Select an area, table, and at least one menu item.");
      return;
    }
    setPlacing(true);
    try {
      const response = await createCaptainOrder({
        tableId: table.id,
        waiterId: waiter.id,
        total,
        items: selected.map(({ item, quantity, selectedPriceOption, note }) => {
          const options = getMenuPriceOptions(item);
          const baseName = getLocalizedField(item.name, "English");
          const name =
            options.length > 1 && selectedPriceOption
              ? `${baseName} (${getPriceOptionLabel(selectedPriceOption)})`
              : baseName;
          const itemNote = note?.trim() || itemNotes[item.id]?.trim() || undefined;
          return {
            menuItemId: item.id,
            name,
            quantity,
            price: selectedPriceOption?.amount ?? item.price ?? 0,
            note: itemNote,
            specialInstructions: itemNote,
          };
        }),
      });
      await printKOT(response.id, waiter?.id);
      setSelected([]);
      setItemNotes({});
      setPlacedOrderId(null);
      alert("Order placed and KOT sent to printer!");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to place order.");
    } finally {
      setPlacing(false);
    }
  }

  return (
    <div className="space-y-8 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-3xl font-bold">Order by Captain</h1>
        <p className="text-gray-500 mt-1">Place an order directly for the waiter to serve and settle.</p>
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        <label className="text-sm font-semibold">
          Waiter
          <input
            value={waiter?.name || ""}
            disabled
            className="mt-2 w-full border rounded-xl p-3 font-normal bg-gray-100 text-gray-600"
          />
        </label>
        <label className="text-sm font-semibold">
          Area
          <select
            value={area}
            onChange={(event) => {
              setArea(event.target.value);
              setTableId("");
            }}
            className="mt-2 w-full border rounded-xl p-3 font-normal"
          >
            <option value="">Select area</option>
            {areas.map((value) => (
              <option key={value} value={value}>
                {tables.find((table) => table.area === value)?.areaLabel || value}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold">
          Table Number
          <select
            value={tableId}
            onChange={(event) => setTableId(event.target.value)}
            disabled={!area}
            className="mt-2 w-full border rounded-xl p-3 font-normal"
          >
            <option value="">Select table</option>
            {areaTables.map((table) => (
              <option key={table.id} value={table.id}>
                {table.tableNumber}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px] items-start">
        <section className="bg-white rounded-2xl border p-5 space-y-5 lg:mb-0 mb-32">
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search menu..."
              className="w-full border rounded-xl py-3 pl-11 pr-4"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {filteredItems.map((item) => {
              const options = getMenuPriceOptions(item);
              const name = getLocalizedField(item.name, "English");
              const category = getLocalizedCategory(item.category, "English") || getLocalizedField(item.category, "English");
              const desc = getWaiterEnglishDescription(item);

              return (
                <div
                  key={item.id}
                  className="border rounded-xl p-4 bg-white hover:border-olive/60 transition flex flex-col justify-between"
                >
                  <div>
                    <div className="font-semibold text-gray-900">{name}</div>
                    {desc && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                        {desc}
                      </p>
                    )}
                  </div>

                  {options.length > 1 ? (
                    <div className="mt-3 pt-2 border-t border-gray-100">
                      <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                        Select Portion
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {options.map((opt, idx) => {
                          const label = getPriceOptionLabel(opt);
                          const key = `${item.id}-${opt.quantity}-${opt.amount}-${opt.unit || ""}`;
                          const selectedEntry = selected.find((s) => s.key === key);
                          const count = selectedEntry?.quantity || 0;

                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => addItem(item, opt)}
                              className={`flex flex-col items-center justify-center p-2 rounded-xl border transition relative cursor-pointer ${
                                count > 0
                                  ? "border-olive bg-olive/10 text-olive"
                                  : "border-gray-200 bg-gray-50 hover:border-olive hover:bg-olive/5 text-gray-700"
                              }`}
                            >
                              <span className="text-xs font-medium truncate w-full text-center">{label}</span>
                              <span className="text-sm font-bold text-olive">₹{opt.amount}</span>
                              {count > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 bg-olive text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center shadow">
                                  {count}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => addItem(item, options[0])}
                      className="mt-3 flex items-center justify-between p-2.5 rounded-xl border border-gray-200 hover:border-olive hover:bg-olive/5 bg-gray-50 text-left transition cursor-pointer"
                    >
                      <span className="text-sm font-bold text-olive">₹{options[0]?.amount || item.price || 0}</span>
                      <span className="text-xs font-semibold text-olive uppercase tracking-wider">+ Add</span>
                    </button>
                  )}

                  <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setNoteModalTarget({ item })}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 cursor-pointer ${
                        itemNotes[item.id]
                          ? "border-olive bg-olive/10 text-olive"
                          : "border-gray-200 text-gray-700 hover:border-olive hover:text-olive bg-gray-50"
                      }`}
                    >
                      <FileText size={13} />
                      Note
                    </button>
                    {itemNotes[item.id] && (
                      <span className="text-xs font-medium text-olive truncate text-right flex-1">
                        Note: {itemNotes[item.id]}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section
          className={`bg-white rounded-t-2xl lg:rounded-2xl border-t lg:border border-gray-200 p-5 
          fixed bottom-0 left-0 right-0 z-50 lg:static lg:sticky lg:top-6 lg:h-fit ${
            isCollapsed ? "max-h-fit" : "max-h-[60vh]"
          } lg:max-h-[calc(100vh-2rem)] flex flex-col shadow-2xl lg:shadow-sm`}
        >
          <div className="flex justify-between items-center lg:hidden">
            <span className="font-bold text-gray-700">{selected.length} Items Selected</span>
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"
            >
              {isCollapsed ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
          </div>

          <h2 className="text-xl font-bold hidden lg:block">Selected Items</h2>

          {!isCollapsed && (
            <>
              <div className="mt-2 lg:mt-4 space-y-3 overflow-y-auto pr-2 no-scrollbar">
                {selected.map(({ key, item, quantity, selectedPriceOption, note }) => {
                  const options = getMenuPriceOptions(item);
                  const hasMultiple = options.length > 1;
                  const baseName = getLocalizedField(item.name, "English");
                  const desc = getWaiterEnglishDescription(item);
                  const optPrice = selectedPriceOption?.amount ?? item.price ?? 0;

                  return (
                    <div key={key} className="border-b pb-3">
                      <div className="flex justify-between gap-3">
                        <div>
                          <span className="font-medium text-gray-900">{baseName}</span>
                          {hasMultiple && (
                            <span className="ml-2 text-xs font-semibold text-olive bg-olive/10 px-2 py-0.5 rounded-full border border-olive/20">
                              {getPriceOptionLabel(selectedPriceOption)}
                            </span>
                          )}
                          {note ? (
                            <div className="text-xs font-medium text-olive mt-0.5">
                              Note: {note}
                            </div>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => setNoteModalTarget({ item, key })}
                            className="text-xs text-olive hover:underline flex items-center gap-1 cursor-pointer mt-1"
                          >
                            <FileText size={11} />
                            {note ? "Edit Note" : "Note"}
                          </button>
                          {desc && (
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{desc}</p>
                          )}
                        </div>
                        <button
                          onClick={() => changeQuantity(key, -quantity)}
                          title="Remove item"
                          className="text-red-600 hover:text-red-800 cursor-pointer"
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-700">₹{optPrice * quantity}</span>
                        <span className="flex items-center gap-2">
                          <button
                            onClick={() => changeQuantity(key, -1)}
                            title="Decrease quantity"
                            className="border rounded p-1 hover:bg-gray-100 cursor-pointer"
                          >
                            <Minus size={15} />
                          </button>
                          <span className="font-semibold px-1">{quantity}</span>
                          <button
                            onClick={() => changeQuantity(key, 1)}
                            title="Increase quantity"
                            className="border rounded p-1 hover:bg-gray-100 cursor-pointer"
                          >
                            <Plus size={15} />
                          </button>
                        </span>
                      </div>
                    </div>
                  );
                })}
                {selected.length === 0 && <p className="text-gray-500 pb-2">No items selected.</p>}
              </div>

              <div className="shrink-0">
                <div className="mt-5 flex justify-between border-t pt-4 font-bold text-lg">
                  <span>Total</span>
                  <span>₹{total}</span>
                </div>

                <div className="mt-4">
                  <button
                    onClick={placeOrder}
                    disabled={placing}
                    className="w-full bg-olive text-white rounded-xl py-3 font-semibold disabled:opacity-60 text-sm hover:bg-olive/90 transition shadow-sm cursor-pointer"
                  >
                    {placing ? "Printing..." : "Order & Print KOT"}
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      <ItemNoteModal
        isOpen={!!noteModalTarget}
        itemName={noteModalTarget ? getLocalizedField(noteModalTarget.item.name, "English") : ""}
        initialNote={
          noteModalTarget
            ? (noteModalTarget.key
                ? selected.find((s) => s.key === noteModalTarget.key)?.note
                : itemNotes[noteModalTarget.item.id]) || ""
            : ""
        }
        onSave={handleSaveNote}
        onClose={() => setNoteModalTarget(null)}
      />
    </div>
  );
}
