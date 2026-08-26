import { X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  addCategory,
  updateCategory,
} from "../services/categoryService";
import { getLocalizedField } from "../../types";
import LanguagePopup from "./LanguagePopup";
import { Globe } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  item: any;
};

export default function CategoryDrawer({
  open,
  onClose,
  onSaved,
  item,
}: Props) {
  const [form, setForm] = useState({
    name: "",
    isActive: true,
  });
  const [languagePopupOpen, setLanguagePopupOpen] = useState(false);
  const [translations, setTranslations] = useState<Record<string, { name: string; description: string }>>({});

  useEffect(() => {
    if (item) {
      setForm({
        name: getLocalizedField(item.name, "English"),
        isActive: item.isActive ?? true,
      });
      const parsedTranslations: Record<string, { name: string; description: string }> = {};
      if (typeof item.name === "object") {
        for (const key of Object.keys(item.name)) {
          if (key !== "English" && key !== "en") {
            parsedTranslations[key] = { name: item.name[key], description: "" };
          }
        }
      }
      setTranslations(parsedTranslations);
    } else {
      setForm({
        name: "",
        isActive: true,
      });
      setTranslations({});
    }
  }, [item, open]);

  async function handleSave() {
    try {
      const updatedName = { English: form.name };
      for (const [lang, trans] of Object.entries(translations)) {
        if (trans && trans.name) {
          (updatedName as any)[lang] = trans.name;
        }
      }

      const payload = {
        ...form,
        name: updatedName
      };

      if (item) {
        await updateCategory(item.id, payload);
      } else {
        await addCategory(payload);
      }

      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      alert("Unable to save category.");
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex justify-end">

      <div className="w-full max-w-md bg-white h-full shadow-2xl overflow-y-auto">

        <div className="flex items-center justify-between p-6 border-b">

          <div>
            <h2 className="text-2xl font-bold">
              {item ? "Edit Category" : "Add Category"}
            </h2>

            <p className="text-gray-500 mt-1 text-sm">
              Manage restaurant categories
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <X />
          </button>

        </div>

        <div className="p-6 space-y-6">

          <div>

            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold">
                Category Name
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
                setForm({
                  ...form,
                  name: e.target.value,
                })
              }
              className="w-full mt-2 border rounded-xl p-3"
              placeholder="Example: Burgers"
            />

          </div>

          <label className="flex items-center gap-3">

            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) =>
                setForm({
                  ...form,
                  isActive: e.target.checked,
                })
              }
            />

            Active Category

          </label>

        </div>

        <div className="border-t p-6 flex justify-end gap-3">

          <button
            onClick={onClose}
            className="px-5 py-3 border rounded-xl"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            className="px-6 py-3 rounded-xl bg-olive text-white font-semibold"
          >
            {item ? "Update Category" : "Save Category"}
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