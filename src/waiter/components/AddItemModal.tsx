import { useEffect, useMemo, useState } from "react";
import { Search, X, Plus, Minus, ChevronDown, ChevronUp, FileText } from "lucide-react";
import { getMenuItems } from "../../services/customerApi";
import { addOrderItems } from "../services/waiterService";
import { printKOT } from "../services/printerService";
import { getLocalizedField, getMenuPriceOptions, getPriceOptionLabel, type PriceOption } from "../../types";
import OrderDescriptionModal from "../../components/OrderDescriptionModal";

type Props = {
  open: boolean;
  order: any;
  onClose: () => void;
  onItemAdded: (updatedOrder: any) => void;
};

type SelectedItem = {
  key: string;
  item: any;
  quantity: number;
  selectedPriceOption: PriceOption;
};

export default function AddItemModal({ open, order, onClose, onItemAdded }: Props) {
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<SelectedItem[]>([]);
  const [adding, setAdding] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [description, setDescription] = useState(order?.description || "");
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDescription(order?.description || "");
    getMenuItems().then(setMenuItems).catch(console.error);
  }, [open, order]);

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

  function updateQuantity(item: any, option: PriceOption, amount: number) {
    const opt = option || getMenuPriceOptions(item)[0];
    const key = `${item.id}-${opt.quantity}-${opt.amount}-${opt.unit || ""}`;
    setSelected((current) => {
      const existing = current.find((entry) => entry.key === key);
      if (existing) {
        return current
          .map((entry) => (entry.key === key ? { ...entry, quantity: entry.quantity + amount } : entry))
          .filter((entry) => entry.quantity > 0);
      }
      if (amount > 0) {
        return [...current, { key, item, quantity: amount, selectedPriceOption: opt }];
      }
      return current;
    });
  }

  const total = selected.reduce(
    (sum, entry) => sum + (entry.selectedPriceOption?.amount ?? entry.item.price ?? 0) * entry.quantity,
    0
  );

  async function handleAdd() {
    if (selected.length === 0) return;
    setAdding(true);
    try {
      const itemsPayload = selected.map(({ item, quantity, selectedPriceOption }) => {
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
          categoryId: item.categoryId || (item as any).category_id || "",
          category: (item as any).category || (item as any).category_name || "",
        };
      });
      const updated = await addOrderItems(order.id, itemsPayload, description);
      const waiter = JSON.parse(localStorage.getItem("waiter") || "{}");
      await printKOT(order.id, waiter?.id, { action: "ADD", items: itemsPayload, description });
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
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 cursor-pointer">
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
            const options = getMenuPriceOptions(item);
            const name = getLocalizedField(item.name, "English");

            if (options.length > 1) {
              return (
                <div
                  key={item.id}
                  className="border rounded-xl p-4 bg-white hover:border-olive/60 transition space-y-3"
                >
                  <div>
                    <div className="font-semibold text-gray-900">{name}</div>
                    <div className="text-sm text-gray-500">{item.category || ""}</div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-gray-100">
                    <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                      Select Portion
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {options.map((opt, idx) => {
                        const label = getPriceOptionLabel(opt);
                        const entryKey = `${item.id}-${opt.quantity}-${opt.amount}-${opt.unit || ""}`;
                        const selectedEntry = selected.find((s) => s.key === entryKey);
                        const currentObjQuantity = selectedEntry ? selectedEntry.quantity : 0;

                        return (
                          <div
                            key={idx}
                            className={`flex items-center justify-between rounded-xl p-2.5 border transition ${
                              currentObjQuantity > 0
                                ? "border-olive bg-olive/5"
                                : "border-gray-200 bg-gray-50"
                            }`}
                          >
                            <div className="overflow-hidden mr-2">
                              <span className="text-xs font-medium text-gray-700 block truncate">
                                {label}
                              </span>
                              <span className="text-sm font-bold text-olive">₹{opt.amount}</span>
                            </div>

                            <div className="flex items-center bg-white border rounded-lg overflow-hidden shrink-0 shadow-sm">
                              {currentObjQuantity > 0 ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => updateQuantity(item, opt, -1)}
                                    className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold cursor-pointer"
                                  >
                                    −
                                  </button>
                                  <div className="px-2.5 font-semibold min-w-[1.75rem] text-center text-xs">
                                    {currentObjQuantity}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => updateQuantity(item, opt, 1)}
                                    className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold cursor-pointer"
                                  >
                                    +
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(item, opt, 1)}
                                  className="px-3 py-1 text-olive hover:bg-olive hover:text-white font-semibold text-xs transition cursor-pointer"
                                >
                                  + Add
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            }

            const singleOpt = options[0];
            const entryKey = `${item.id}-${singleOpt.quantity}-${singleOpt.amount}-${singleOpt.unit || ""}`;
            const selectedEntry = selected.find((s) => s.key === entryKey);
            const isSelected = !!selectedEntry;
            const currentObjQuantity = selectedEntry ? selectedEntry.quantity : 0;

            return (
              <div
                key={item.id}
                className={`flex items-center justify-between border rounded-xl p-4 transition ${
                  isSelected ? "border-olive bg-olive/5" : "hover:border-olive bg-white"
                }`}
              >
                <div>
                  <div className="font-semibold">{name}</div>
                  <div className="text-sm text-gray-500">{item.category || ""}</div>
                  <div className="mt-1 font-semibold">₹{singleOpt?.amount || item.price || 0}</div>
                </div>

                <div className="flex items-center bg-white border rounded-lg overflow-hidden shrink-0 shadow-sm">
                  {currentObjQuantity > 0 ? (
                    <>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item, singleOpt, -1)}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold cursor-pointer"
                      >
                        −
                      </button>
                      <div className="px-4 font-semibold min-w-[2.5rem] text-center">
                        {currentObjQuantity}
                      </div>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item, singleOpt, 1)}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold cursor-pointer"
                      >
                        +
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => updateQuantity(item, singleOpt, 1)}
                      className="px-4 py-1.5 text-olive hover:bg-olive hover:text-white font-semibold transition cursor-pointer"
                    >
                      Add
                    </button>
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
          {description.trim() && (
            <div className="mb-3 p-2.5 bg-olive/10 border border-olive/20 rounded-xl text-xs flex items-center justify-between text-olive">
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

          <div className="sm:hidden flex justify-between items-center mb-4">
            <span className="font-bold text-gray-700">{selected.length} Items Selected</span>
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 cursor-pointer"
            >
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

              <div className="flex flex-wrap sm:flex-nowrap gap-2.5 sm:gap-3 items-center">
                <button
                  type="button"
                  onClick={() => setShowDescriptionModal(true)}
                  className={`border-2 px-4 py-2.5 rounded-xl font-semibold transition flex items-center justify-center gap-1.5 text-sm flex-1 sm:flex-none cursor-pointer ${
                    description.trim()
                      ? "border-olive bg-olive/10 text-olive"
                      : "border-gray-300 text-gray-700 hover:border-olive hover:text-olive hover:bg-olive/5"
                  }`}
                >
                  <FileText size={16} />
                  {description.trim() ? "Edit Note (Saved)" : "Add Description"}
                </button>
                <button
                  onClick={onClose}
                  className="border px-4 py-2.5 rounded-xl font-semibold hover:bg-gray-50 text-sm flex-1 sm:flex-none cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdd}
                  disabled={adding || selected.length === 0}
                  className="bg-olive hover:bg-olive/90 text-white px-5 py-2.5 rounded-xl font-semibold disabled:opacity-60 text-sm flex-1 sm:flex-none shadow-sm transition cursor-pointer"
                >
                  {adding ? "Printing..." : "Order & Print KOT"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <OrderDescriptionModal
        isOpen={showDescriptionModal}
        initialDescription={description}
        onSave={(savedDesc) => setDescription(savedDesc)}
        onClose={() => setShowDescriptionModal(false)}
      />
    </div>
  );
}
