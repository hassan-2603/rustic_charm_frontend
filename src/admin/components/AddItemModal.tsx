import { useEffect, useMemo, useState } from "react";
import { Search, X, Plus, Minus, ChevronDown, ChevronUp } from "lucide-react";
import { getMenuItems } from "../services/menuService";
import { addOrderItems } from "../services/orderApi";
import { printKOT } from "../services/printerService";
import { getLocalizedField, getMenuPriceOptions } from "../../types";

type Props = {
  open: boolean;
  order: any;
  onClose: () => void;
  onItemAdded: (updatedOrder: any) => void;
};

export default function AddItemModal({ open, order, onClose, onItemAdded }: Props) {
  type SelectedItem = { item: any; quantity: number };
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<SelectedItem[]>([]);
  const [adding, setAdding] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (!open) return;
    getMenuItems().then(setMenuItems).catch(console.error);
  }, [open]);

  useEffect(() => {
    if (!open) {
      setSearch("");
      setSelected([]);
    }
  }, [open]);

  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      const name = getLocalizedField(item.name, "English");
      return `${name} ${item.category || ""}`.toLowerCase().includes(search.toLowerCase());
    });
  }, [menuItems, search]);

  if (!open || !order) return null;

  const getItemPrice = (item: any) => Number(item.price || getMenuPriceOptions(item)[0]?.amount || 0);

  function updateQuantity(item: any, amount: number) {
    setSelected((current) => {
      const existing = current.find((entry) => entry.item.id === item.id);
      if (existing) {
        return current
          .map((entry) => entry.item.id === item.id ? { ...entry, quantity: entry.quantity + amount } : entry)
          .filter((entry) => entry.quantity > 0);
      }
      if (amount > 0) {
        return [...current, { item, quantity: amount }];
      }
      return current;
    });
  }

  const total = selected.reduce((sum, entry) => sum + getItemPrice(entry.item) * entry.quantity, 0);

  async function handleAdd() {
    if (selected.length === 0) return;
    setAdding(true);
    try {
      const itemsPayload = selected.map(({ item, quantity }) => ({
        menuItemId: item.id,
        name: getLocalizedField(item.name, "English"),
        quantity,
        price: getItemPrice(item),
      }));
      const updated = await addOrderItems(order.id, itemsPayload);
      await printKOT(order.id);
      onItemAdded(updated);
      setSelected([]);
      onClose();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to add items to order.");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">

        <div className="flex justify-between items-center p-5 border-b">
          <div>
            <h2 className="text-xl font-bold">Add Item</h2>
            <p className="text-sm text-gray-500">Order #{order.orderNumber}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
            <X />
          </button>
        </div>

        <div className="p-5 border-b">
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search menu..."
              className="w-full border rounded-xl py-3 pl-11 pr-4"
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 p-5 overflow-y-auto min-h-0 space-y-3">
          {filteredItems.map((item) => {
            const selectedEntry = selected.find(s => s.item.id === item.id);
            const isSelected = !!selectedEntry;
            const currentObjQuantity = selectedEntry ? selectedEntry.quantity : 0;
            return (
              <div
                key={item.id}
                className={`flex items-center justify-between border rounded-xl p-4 transition ${isSelected ? "border-olive bg-olive/5" : "hover:border-olive bg-white"}`}
              >
                <div>
                  <div className="font-semibold">{getLocalizedField(item.name, "English")}</div>
                  <div className="text-sm text-gray-500">{item.category || ""}</div>
                  <div className="mt-1 font-semibold">₹{getItemPrice(item)}</div>
                </div>

                <div className="flex items-center bg-white border rounded-lg overflow-hidden shrink-0 shadow-sm">
                  {currentObjQuantity > 0 ? (
                    <>
                      <button onClick={() => updateQuantity(item, -1)} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold">−</button>
                      <div className="px-4 font-semibold min-w-[2.5rem] text-center">{currentObjQuantity}</div>
                      <button onClick={() => updateQuantity(item, 1)} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold">+</button>
                    </>
                  ) : (
                    <button onClick={() => updateQuantity(item, 1)} className="px-4 py-1.5 text-olive hover:bg-olive hover:text-white font-semibold transition">Add</button>
                  )}
                </div>
              </div>
            );
          })}
          {filteredItems.length === 0 && (
            <p className="text-gray-500 text-center py-6">No menu items found.</p>
          )}
        </div>

        <div className="p-5 border-t bg-white shrink-0">
          <div className="sm:hidden flex justify-between items-center mb-4">
            <span className="font-bold text-gray-700">{selected.length} Items Selected</span>
            <button onClick={() => setIsCollapsed(!isCollapsed)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200">
              {isCollapsed ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
          </div>

          {!isCollapsed && (
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div className="hidden sm:block">
                <p className="text-sm text-gray-500">{selected.length} items selected</p>
                <p className="font-bold text-lg text-gray-900">Total: ₹{total}</p>
              </div>
              <div className="sm:hidden flex justify-between">
                <span className="font-bold text-lg text-gray-900">Total</span>
                <span className="font-bold text-lg text-gray-900">₹{total}</span>
              </div>

              <div className="flex gap-3">
                <button onClick={onClose} className="border px-5 py-2.5 rounded-xl font-semibold hover:bg-gray-50 flex-1 sm:flex-none">
                  Cancel
                </button>
                <button
                  onClick={handleAdd}
                  disabled={adding || selected.length === 0}
                  className="bg-olive hover:bg-olive/90 text-white px-5 py-2.5 rounded-xl font-semibold disabled:opacity-60 flex-1 sm:flex-none"
                >
                  {adding ? "Printing..." : "Order & Print KOT"}
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
