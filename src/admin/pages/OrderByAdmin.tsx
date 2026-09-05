import { useEffect, useMemo, useState } from "react";
import { Minus, Plus, Search, Trash2, ChevronDown, ChevronUp, FileText } from "lucide-react";
import { getMenuItems } from "../services/menuService";
import { getWaiters } from "../services/waiterService";
import { listenTables } from "../services/tableApi";
import { createAdminOrder } from "../services/orderApi";
import { printKOT } from "../services/printerService";
import { getLocalizedField, getMenuPriceOptions, getPriceOptionLabel, type PriceOption } from "../../types";
import OrderDescriptionModal from "../../components/OrderDescriptionModal";

type SelectedItem = {
  key: string;
  item: any;
  quantity: number;
  selectedPriceOption: PriceOption;
};

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
  const [isCollapsed, setIsCollapsed] = useState(false);

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

  const total = selected.reduce(
    (sum, entry) => sum + (entry.selectedPriceOption?.amount ?? entry.item.price ?? 0) * entry.quantity,
    0
  );

  function addItem(item: any, option?: PriceOption) {
    const opt = option || getMenuPriceOptions(item)[0];
    const key = `${item.id}-${opt.quantity}-${opt.amount}-${opt.unit || ""}`;
    setPlacedOrderId(null);
    setSelected((current) => {
      const existing = current.find((entry) => entry.key === key);
      if (existing) {
        return current.map((entry) =>
          entry.key === key ? { ...entry, quantity: entry.quantity + 1 } : entry
        );
      }
      return [...current, { key, item, quantity: 1, selectedPriceOption: opt }];
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
        items: selected.map(({ item, quantity, selectedPriceOption }) => {
          const options = getMenuPriceOptions(item);
          const baseName = getLocalizedField(item.name, "English");
          const name =
            options.length > 1 && selectedPriceOption
              ? `${baseName} (${getPriceOptionLabel(selectedPriceOption)})`
              : baseName;
          return {
            menuItemId: item.id,
            name,
            quantity,
            price: selectedPriceOption?.amount ?? item.price ?? 0,
          };
        }),
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Order by Admin</h1>
        <p className="text-gray-500 mt-1">Place an order directly for the waiter to serve and settle.</p>
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        <label className="text-sm font-semibold">
          Waiter
          <select
            value={waiterId}
            onChange={(event) => setWaiterId(event.target.value)}
            className="mt-2 w-full border rounded-xl p-3 font-normal"
          >
            <option value="">Select waiter</option>
            {waiters
              .filter((waiter) => waiter.active !== false)
              .map((waiter) => (
                <option key={waiter.id} value={waiter.id}>
                  {waiter.name}
                </option>
              ))}
          </select>
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

              return (
                <div
                  key={item.id}
                  className="border rounded-xl p-4 bg-white hover:border-olive/60 transition flex flex-col justify-between"
                >
                  <div>
                    <div className="font-semibold text-gray-900">{name}</div>
                    <div className="text-sm text-gray-500">{item.category || ""}</div>
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
                {selected.map(({ key, item, quantity, selectedPriceOption }) => {
                  const options = getMenuPriceOptions(item);
                  const hasMultiple = options.length > 1;
                  const baseName = getLocalizedField(item.name, "English");
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

                {description.trim() && (
                  <div className="mt-3 p-2.5 bg-olive/10 border border-olive/20 rounded-xl text-xs flex items-center justify-between text-olive">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      <FileText size={14} className="shrink-0" />
                      <span className="truncate font-medium">Note: {description}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDescription("")}
                      className="text-red-500 hover:text-red-700 font-bold ml-2 shrink-0 cursor-pointer"
                      title="Remove note"
                    >
                      ×
                    </button>
                  </div>
                )}

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setShowDescriptionBox(true)}
                    className={`w-full py-3 px-3 rounded-xl font-semibold border-2 transition flex items-center justify-center gap-1.5 text-sm cursor-pointer ${
                      description.trim()
                        ? "border-olive bg-olive/10 text-olive"
                        : "border-gray-300 text-gray-700 hover:border-olive hover:text-olive hover:bg-olive/5"
                    }`}
                  >
                    <FileText size={16} />
                    {description.trim() ? "Edit Note (Saved)" : "Add Description"}
                  </button>
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

      <OrderDescriptionModal
        isOpen={showDescriptionBox}
        initialDescription={description}
        onSave={(savedDesc) => setDescription(savedDesc)}
        onClose={() => setShowDescriptionBox(false)}
      />
    </div>
  );
}
