import { getCategories } from "../services/categoryService";
import { X, Globe } from "lucide-react";
import { uploadMenuImage } from "../services/storageService";
import { useEffect, useState } from "react";
import {
  addMenuItem,
  updateMenuItem,
} from "../services/menuService";
import { getLocalizedField, getMenuPriceOptions } from "../../types";
import LanguagePopup from "./LanguagePopup";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  item: any;
};


export default function MenuDrawer({
  open,
  onClose,
  onSaved,
  item,
}: Props) {
  if (!open) return null;
  const [form, setForm] = useState<{
    name: string;
    description: string;
    price: string | number;
    category: string;
    image: string;
    isVeg: boolean;
    isAvailable: boolean;
    priceOptions: Array<{ quantity: number; amount: number; unit?: string }>;
    isMarketPrice?: boolean;
  }>({
    name: "",
    description: "",
    price: "",
    category: "",
    image: "",
    isVeg: true,
    isAvailable: true,
    priceOptions: [{ quantity: 1, amount: 0, unit: "" }],
    isMarketPrice: false,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [showMarketPriceDropdown, setShowMarketPriceDropdown] = useState(false);
  const [languagePopupOpen, setLanguagePopupOpen] = useState(false);
  const [translations, setTranslations] = useState<Record<string, { name: string; description: string }>>({});

  const [preview, setPreview] = useState("");
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    async function loadCategories() {
      const data = await getCategories();
      setCategories(data);
    }

    loadCategories();
  }, []);
  useEffect(() => {
    if (item) {
      const priceOptions = getMenuPriceOptions(item);
      setForm({
        name: getLocalizedField(item.name, "English"),
        description: getLocalizedField(item.description, "English"),
        price: item.price || "",
        category: item.category || "",
        image: item.image || "",
        isVeg: item.isVeg ?? true,
        isAvailable: item.isAvailable ?? true,
        priceOptions,
        isMarketPrice: item.metadata?.isMarketPrice ?? false,
      });
      setShowOptions(priceOptions.length > 1);

      // Load translations
      setTranslations(item.translations || {});

      // Show existing image when editing
      setPreview(item.image || "");
    } else {
      setForm({
        name: "",
        description: "",
        price: "",
        category: "",
        image: "",
        isVeg: true,
        isAvailable: true,
        priceOptions: [{ quantity: 1, amount: 0, unit: "" }],
        isMarketPrice: false,
      });

      // Clear preview when adding a new item
      setPreview("");
      setSelectedFile(null);
      setShowOptions(false);
      setTranslations({});
    }
  }, [item, open]);
  async function handleSave() {
    try {
      // Start with the existing image (handles Edit with no new upload)
      let imageUrl = form.image || (item?.image ?? item?.imageUrl ?? "");

      if (selectedFile) {
        imageUrl = await uploadMenuImage(selectedFile);
      }

      const updatedName = item && typeof item.name === "object"
        ? { ...item.name, English: form.name }
        : { English: form.name };

      const updatedDescription = item && typeof item.description === "object"
        ? { ...item.description, English: form.description }
        : { English: form.description };

      const normalizedPriceOptions = form.priceOptions.filter((option) => option.amount > 0);
      const trimmedCategory = String(form.category || "").trim();
      const singlePrice = showOptions
        ? (normalizedPriceOptions.length === 1 ? normalizedPriceOptions[0].amount : Number(form.price) || 0)
        : (Number(form.price) || 0);

      const payload: any = {
        ...form,
        category: trimmedCategory,
        name: updatedName,
        description: updatedDescription,
        // Both fields so the backend (which reads imageUrl || image_url) persists it correctly
        image: imageUrl,
        imageUrl: imageUrl,
        translations,
        metadata: {
          ...(item?.metadata || {}),
          isMarketPrice: form.isMarketPrice,
        },
      };

      if (showOptions) {
        delete payload.price;
        payload.priceOptions = normalizedPriceOptions;
      } else {
        delete payload.priceOptions;
        payload.price = singlePrice;
      }

      if (item) {
        await updateMenuItem(item.id, payload);
      } else {
        await addMenuItem(payload);
      }

      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      alert("Unable to save menu item.");
    }
  }


  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex justify-end">

      <div className="w-full max-w-xl bg-white h-full overflow-y-auto shadow-2xl">

        {/* Header */}

        <div className="flex items-center justify-between p-6 border-b">

          <div>

            <h2 className="text-2xl font-bold">
              {item ? "Edit Menu Item" : "Add Menu Item"}
            </h2>

            <p className="text-gray-500 text-sm mt-1">
              Create or edit restaurant items
            </p>

          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <X />
          </button>

        </div>

        {/* Form */}

        <div className="p-6 space-y-5">

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold">
                Item Name
              </label>
              <button
                type="button"
                onClick={() => setLanguagePopupOpen(true)}
                className="p-2 rounded-lg hover:bg-gray-100 border border-gray-200 transition"
                title="Add translations"
              >
                <Globe size={18} className="text-gray-600" />
              </button>
            </div>

            <input
              value={form.name}
              onChange={(e) =>
                setForm({ ...form, name: e.target.value })
              }
              className="w-full mt-2 border rounded-xl p-3"
              placeholder="Veg Burger"
            />
          </div>

          <div>
            <label className="text-sm font-semibold">
              Description
            </label>

            <textarea
              rows={4}
              value={form.description}
              onChange={(e) =>
                setForm({
                  ...form,
                  description: e.target.value,
                })
              }
              className="w-full mt-2 border rounded-xl p-3"
              placeholder="Item description..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <div>

              <label className="text-sm font-semibold">
                {showOptions ? "Base Price" : "Price"}
              </label>

              <div className="relative">
                <input
                  type={form.isMarketPrice ? "text" : "number"}
                  value={form.isMarketPrice ? "Market Price" : form.price}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      price: e.target.value === "Market Price" ? 0 : Number(e.target.value),
                      isMarketPrice: false,
                    })
                  }
                  onFocus={() => setShowMarketPriceDropdown(true)}
                  onBlur={() => setTimeout(() => setShowMarketPriceDropdown(false), 200)}
                  className="w-full mt-2 border rounded-xl p-3"
                />
                {!showOptions && showMarketPriceDropdown && (
                  <div
                    className="absolute z-10 w-full mt-1 bg-white border rounded-xl shadow-lg cursor-pointer hover:bg-gray-50 flex items-center p-3 text-sm font-semibold"
                    onClick={() => {
                      setForm({ ...form, isMarketPrice: true, price: 0 });
                      setShowMarketPriceDropdown(false);
                    }}
                  >
                    Set as Market Price
                  </div>
                )}
              </div>

            </div>

            <div>

              <label className="text-sm font-semibold">
                Category
              </label>

              <select
                value={form.category}
                onChange={(e) =>
                  setForm({
                    ...form,
                    category: e.target.value,
                  })
                }
                className="w-full mt-2 border rounded-xl p-3"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={getLocalizedField(cat.name, "English")}>
                    {getLocalizedField(cat.name, "English")}
                  </option>
                ))}
              </select>

            </div>

          </div>

          <div className="rounded-2xl border border-dashed border-gray-300 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Pricing Options</p>
                <p className="text-xs text-gray-500">Add quantity-based price options when needed</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!showOptions) {
                    setShowOptions(true);
                    setForm((prev) => ({
                      ...prev,
                      priceOptions: [
                        { quantity: 1, amount: Number(prev.price) || 0, unit: "" },
                        { quantity: 2, amount: Number(prev.price) || 0, unit: "" },
                      ],
                    }));
                  } else {
                    setShowOptions(false);
                    setForm((prev) => ({ ...prev, priceOptions: [{ quantity: 1, amount: Number(prev.price) || 0, unit: "" }] }));
                  }
                }}
                className="rounded-full border border-olive px-3 py-1.5 text-sm font-semibold text-olive"
              >
                {showOptions ? "Remove Options" : "+ Add Option"}
              </button>
            </div>

            {showOptions && (
              <div className="mt-4 space-y-3">
                {form.priceOptions.map((option, index) => (
                  <div key={index} className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs font-semibold">Qty</label>
                      <input
                        type="number"
                        min="1"
                        value={option.quantity}
                        onChange={(e) => {
                          const value = Number(e.target.value) || 1;
                          setForm((prev) => ({
                            ...prev,
                            priceOptions: prev.priceOptions.map((item, itemIndex) => itemIndex === index ? { ...item, quantity: value } : item),
                          }));
                        }}
                        className="mt-1 w-full rounded-xl border p-2"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold">Unit</label>
                      <input
                        type="text"
                        value={option.unit ?? ""}
                        placeholder="ml / gm / pieces"
                        onChange={(e) => {
                          const value = e.target.value;
                          setForm((prev) => ({
                            ...prev,
                            priceOptions: prev.priceOptions.map((item, itemIndex) => itemIndex === index ? { ...item, unit: value } : item),
                          }));
                        }}
                        className="mt-1 w-full rounded-xl border p-2"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold">Amount</label>
                      <input
                        type="number"
                        min="0"
                        value={option.amount}
                        onChange={(e) => {
                          const value = Number(e.target.value) || 0;
                          setForm((prev) => ({
                            ...prev,
                            priceOptions: prev.priceOptions.map((item, itemIndex) => itemIndex === index ? { ...item, amount: value } : item),
                          }));
                        }}
                        className="mt-1 w-full rounded-xl border p-2"
                      />
                    </div>
                  </div>
                ))}

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setForm((prev) => ({
                        ...prev,
                        priceOptions: [...prev.priceOptions, { quantity: 1, amount: 0, unit: "" }],
                      }));
                    }}
                    className="text-sm font-semibold text-olive"
                  >
                    + Add another option
                  </button>
                </div>
              </div>
            )}
          </div>

          <div>

            <label className="text-sm font-semibold">
              Menu Image
            </label>

            <input
              type="file"
              accept="image/*"
              className="mt-2 block w-full"
              onChange={(e) => {
                if (!e.target.files?.length) return;

                const file = e.target.files[0];

                setSelectedFile(file);

                setPreview(URL.createObjectURL(file));
              }}
            />

            {preview && (
              <img
                src={preview}
                alt=""
                className="mt-4 w-full h-48 object-contain rounded-xl border"
              />
            )}

          </div>

          <div className="grid grid-cols-3 gap-5">

            <label className="flex items-center gap-2">

              <input
                type="checkbox"
                checked={form.isVeg}
                onChange={(e) =>
                  setForm({
                    ...form,
                    isVeg: e.target.checked,
                  })
                }
              />

              Veg

            </label>

            <label className="flex items-center gap-2">

              <input
                type="checkbox"
                checked={form.isAvailable}
                onChange={(e) =>
                  setForm({
                    ...form,
                    isAvailable: e.target.checked,
                  })
                }
              />

              isAvailable

            </label>

          </div>

        </div>

        {/* Footer */}

        <div className="border-t p-6 flex justify-end gap-3">

          <button
            onClick={onClose}
            className="px-5 py-3 rounded-xl border"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            className="px-6 py-3 rounded-xl bg-olive hover:bg-olive/90 text-white font-semibold"
          >
            {item ? "Update Item" : "Save Item"}
          </button>

        </div>

      </div>

      <LanguagePopup
        open={languagePopupOpen}
        onClose={() => setLanguagePopupOpen(false)}
        onSave={(newTranslations) => setTranslations((prev) => ({ ...prev, ...newTranslations }))}
        initialTranslations={translations}
      />
    </div>
  );
}