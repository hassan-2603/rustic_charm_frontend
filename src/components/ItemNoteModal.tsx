import React, { useState, useEffect } from "react";
import { X, FileText, Check } from "lucide-react";

type Props = {
  isOpen: boolean;
  itemName: string;
  initialNote?: string;
  onSave: (note: string) => void;
  onClose: () => void;
};

export default function ItemNoteModal({
  isOpen,
  itemName,
  initialNote = "",
  onSave,
  onClose,
}: Props) {
  const [text, setText] = useState(initialNote);

  useEffect(() => {
    if (isOpen) {
      setText(initialNote || "");
    }
  }, [isOpen, initialNote]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(text.trim());
    onClose();
  };

  const handleClear = () => {
    setText("");
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in duration-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/60">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-olive/10 text-olive rounded-xl">
              <FileText size={18} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base">Note</h3>
              <p className="text-xs text-gray-500 truncate max-w-[240px] font-medium">{itemName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. Less spicy, No onion, Extra crisp..."
            className="w-full h-28 p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-olive/40 focus:border-olive resize-none"
            autoFocus
          />

          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>{text.length} characters</span>
            {text.trim() && (
              <button
                type="button"
                onClick={handleClear}
                className="text-red-500 hover:underline cursor-pointer"
              >
                Clear note
              </button>
            )}
          </div>
        </div>

        <div className="p-3 bg-gray-50 border-t border-gray-100 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200/70 rounded-xl transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 text-sm font-semibold text-white bg-olive hover:bg-olive/90 rounded-xl shadow-sm flex items-center gap-1.5 transition cursor-pointer"
          >
            <Check size={16} />
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
