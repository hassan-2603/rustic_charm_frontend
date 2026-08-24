import { useEffect, useMemo, useState } from "react";
import { Search, X, Plus, Minus } from "lucide-react";
import { getMenuItems } from "../services/menuService";
import { addOrderItems } from "../services/orderApi";
import { getLocalizedField, getMenuPriceOptions } from "../../types";

type Props = {
  open: boolean;
  order: any;
  onClose: () => void;
  onItemAdded: (updatedOrder: any) => void;
};

export default function AddItemModal({ open, order, onClose, onItemAdded }: Props) {
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [justAddedName, setJustAddedName] = useState("");

  useEffect(() => {
    if (!open) return;
    getMenuItems().then(setMenuItems).catch(console.error);
  }, [open]);

  useEffect(() => {
    if (!open) {
      setSearch("");
      setSelectedItem(null);
      setQuantity(1);
      setJustAddedName("");
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

  function selectItem(item: any) {
    setSelectedItem(item);
    setQuantity(1);
    setJustAddedName("");
  }

  async function handleAdd() {
    if (!selectedItem) return;
    setAdding(true);
    try {
      const updated = await addOrderItems(order.id, [
        {
          menuItemId: selectedItem.id,
          name: getLocalizedField(selectedItem.name, "English"),
          quantity,
          price: getItemPrice(selectedItem),
        },
      ]);
      onItemAdded(updated);
      setJustAddedName(getLocalizedField(selectedItem.name, "English"));
      setSelectedItem(null);
      setQuantity(1);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to add item to order.");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">

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
          {justAddedName && (
            <p className="mt-3 text-sm font-medium text-green-600">
              Added "{justAddedName}" to the order.
            </p>
          )}
        </div>

        <div className="p-5 overflow-y-auto grid gap-3 sm:grid-cols-2">
          {filteredItems.map((item) => {
            const isSelected = selectedItem?.id === item.id;
            return (
              <button
                key={item.id}
                onClick={() => selectItem(item)}
                className={`text-left border rounded-xl p-4 transition ${
                  isSelected ? "border-olive bg-olive/5" : "hover:border-olive hover:bg-gray-50"
                }`}
              >
                <div className="font-semibold">{getLocalizedField(item.name, "English")}</div>
                <div className="text-sm text-gray-500">{item.category || ""}</div>
                <div className="mt-2 font-semibold">₹{getItemPrice(item)}</div>
              </button>
            );
          })}
          {filteredItems.length === 0 && (
            <p className="text-gray-500 col-span-full text-center py-6">No menu items found.</p>
          )}
        </div>

        {selectedItem && (
          <div className="p-5 border-t bg-gray-50 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold">{getLocalizedField(selectedItem.name, "English")}</p>
              <p className="text-sm text-gray-500">₹{getItemPrice(selectedItem)} each</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="border rounded p-1.5"
              >
                <Minus size={15} />
              </button>
              <span className="w-6 text-center font-semibold">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="border rounded p-1.5"
              >
                <Plus size={15} />
              </button>
            </div>
            <button
              onClick={handleAdd}
              disabled={adding}
              className="bg-olive hover:bg-olive/90 text-white px-5 py-2.5 rounded-xl font-semibold disabled:opacity-60"
            >
              {adding ? "Adding..." : "Add to Order"}
            </button>
          </div>
        )}

        <div className="p-5 border-t flex justify-end">
          <button onClick={onClose} className="border px-5 py-2.5 rounded-xl font-semibold hover:bg-gray-50">
            Done
          </button>
        </div>

      </div>
    </div>
  );
}
