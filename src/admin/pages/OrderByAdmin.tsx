import { useEffect, useMemo, useState } from "react";
import { Minus, Plus, Search, Trash2 } from "lucide-react";
import { getMenuItems } from "../services/menuService";
import { getWaiters } from "../services/waiterService";
import { listenTables } from "../services/tableApi";
import { createAdminOrder } from "../services/orderApi";
import { printKOT } from "../services/printerService";
import { getLocalizedField, getMenuPriceOptions } from "../../types";

type SelectedItem = { item: any; quantity: number };

export default function OrderByAdmin() {
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [waiters, setWaiters] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [waiterId, setWaiterId] = useState("");
  const [area, setArea] = useState("");
  const [tableId, setTableId] = useState("");
  const [selected, setSelected] = useState<SelectedItem[]>([]);
  const [placing, setPlacing] = useState(false);
  const [description, setDescription] = useState("");
  const [showDescriptionBox, setShowDescriptionBox] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);
  const [printingKot, setPrintingKot] = useState(false);

  useEffect(() => {
    getMenuItems().then(setMenuItems).catch(console.error);
    getWaiters().then(setWaiters).catch(console.error);
    return listenTables(setTables);
  }, []);

  const areas = useMemo(() => [...new Set(tables.map((table) => table.area))], [tables]);
  const areaTables = tables.filter((table) => !area || table.area === area);
  const filteredItems = menuItems.filter((item) => {
    const name = getLocalizedField(item.name, "English");
    return `${name} ${item.category || ""}`.toLowerCase().includes(search.toLowerCase());
  });
  const getItemPrice = (item: any) => Number(item.price || getMenuPriceOptions(item)[0]?.amount || 0);
  const total = selected.reduce((sum, entry) => sum + getItemPrice(entry.item) * entry.quantity, 0);

  function addItem(item: any) {
    setPlacedOrderId(null);
    setSelected((current) => {
      const existing = current.find((entry) => entry.item.id === item.id);
      if (existing) return current.map((entry) => entry.item.id === item.id ? { ...entry, quantity: entry.quantity + 1 } : entry);
      return [...current, { item, quantity: 1 }];
    });
  }

  function changeQuantity(id: string, amount: number) {
    setSelected((current) => current
      .map((entry) => entry.item.id === id ? { ...entry, quantity: entry.quantity + amount } : entry)
      .filter((entry) => entry.quantity > 0));
  }

  async function placeOrder() {
    const waiter = waiters.find((entry) => entry.id === waiterId);
    const table = tables.find((entry) => entry.id === tableId);
    if (!waiter || !table || selected.length === 0) {
      alert("Select a waiter, area, table, and at least one menu item.");
      return;
    }
    setPlacing(true);
    try {
      const response = await createAdminOrder({
        tableId: table.id,
        waiterId: waiter.id,
        total,
        items: selected.map(({ item, quantity }) => ({
          menuItemId: item.id,
          name: getLocalizedField(item.name, "English"),
          quantity,
          price: getItemPrice(item),
        })),
        description: description.trim() ? description.trim() : undefined,
      });
      await printKOT(response.id);
      setSelected([]);
      setPlacedOrderId(null);
      alert("Order placed and KOT sent to printer!");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to place order.");
    } finally {
      setPlacing(false);
    }
  }

  return <div className="space-y-8">
    <div><h1 className="text-3xl font-bold">Order by Admin</h1><p className="text-gray-500 mt-1">Place an order directly for the waiter to serve and settle.</p></div>
    <div className="grid gap-5 md:grid-cols-3">
      <label className="text-sm font-semibold">Waiter<select value={waiterId} onChange={(event) => setWaiterId(event.target.value)} className="mt-2 w-full border rounded-xl p-3 font-normal"><option value="">Select waiter</option>{waiters.filter((waiter) => waiter.active !== false).map((waiter) => <option key={waiter.id} value={waiter.id}>{waiter.name}</option>)}</select></label>
      <label className="text-sm font-semibold">Area<select value={area} onChange={(event) => { setArea(event.target.value); setTableId(""); }} className="mt-2 w-full border rounded-xl p-3 font-normal"><option value="">Select area</option>{areas.map((value) => <option key={value} value={value}>{tables.find((table) => table.area === value)?.areaLabel || value}</option>)}</select></label>
      <label className="text-sm font-semibold">Table Number<select value={tableId} onChange={(event) => setTableId(event.target.value)} disabled={!area} className="mt-2 w-full border rounded-xl p-3 font-normal"><option value="">Select table</option>{areaTables.map((table) => <option key={table.id} value={table.id}>{table.tableNumber}</option>)}</select></label>
    </div>
    <div className="grid gap-6 lg:grid-cols-[1fr_360px] items-start">
      <section className="bg-white rounded-2xl border p-5 space-y-5 lg:mb-0 mb-32">
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search menu..." className="w-full border rounded-xl py-3 pl-11 pr-4" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {filteredItems.map((item) => (
            <button key={item.id} onClick={() => addItem(item)} className="text-left border rounded-xl p-4 hover:border-olive hover:bg-gray-50 flex flex-col justify-between">
              <div>
                <div className="font-semibold">{getLocalizedField(item.name, "English")}</div>
                <div className="text-sm text-gray-500">{item.category || ""}</div>
              </div>
              <div className="mt-2 font-semibold">₹{item.price || getMenuPriceOptions(item)[0]?.amount || 0}</div>
            </button>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-t-2xl lg:rounded-2xl border-t lg:border border-gray-200 p-5 
        fixed bottom-0 left-0 right-0 z-50 lg:static lg:sticky lg:top-6 lg:h-fit max-h-[60vh] lg:max-h-[calc(100vh-2rem)] flex flex-col shadow-2xl lg:shadow-sm"
      >
        <h2 className="text-xl font-bold hidden lg:block">Selected Items</h2>

        <div className="mt-2 lg:mt-4 space-y-3 overflow-y-auto pr-2 no-scrollbar">
          {selected.map(({ item, quantity }) => (
            <div key={item.id} className="border-b pb-3"><div className="flex justify-between gap-3"><span className="font-medium">{getLocalizedField(item.name, "English")}</span><button onClick={() => changeQuantity(item.id, -quantity)} title="Remove item" className="text-red-600"><Trash2 size={17} /></button></div><div className="mt-2 flex items-center justify-between"><span>₹{getItemPrice(item) * quantity}</span><span className="flex items-center gap-2"><button onClick={() => changeQuantity(item.id, -1)} title="Decrease quantity" className="border rounded p-1"><Minus size={15} /></button><span>{quantity}</span><button onClick={() => changeQuantity(item.id, 1)} title="Increase quantity" className="border rounded p-1"><Plus size={15} /></button></span></div></div>
          ))}
          {selected.length === 0 && <p className="text-gray-500 pb-2">No items selected.</p>}
        </div>

        <div className="shrink-0">
          <div className="mt-5 flex justify-between border-t pt-4 font-bold text-lg">
            <span>Total</span>
            <span>₹{total}</span>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button onClick={() => setShowDescriptionBox(!showDescriptionBox)} className="w-full text-olive border-2 border-olive rounded-xl py-3 font-semibold hover:bg-olive/10 hidden lg:block">
              {showDescriptionBox ? "Hide Description" : "Add Description"}
            </button>
            <button onClick={placeOrder} disabled={placing} className="w-full bg-olive text-white rounded-xl py-3 font-semibold disabled:opacity-60 col-span-2 lg:col-span-1">
              {placing ? "Printing..." : "Order & Print KOT"}
            </button>
          </div>
          {showDescriptionBox && (
            <div className="mt-3 hidden lg:block">
              <textarea
                className="w-full border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-olive"
                rows={3}
                placeholder="Add order description (prints on KOT)..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          )}
        </div>
      </section>
    </div>
  </div>;
}
