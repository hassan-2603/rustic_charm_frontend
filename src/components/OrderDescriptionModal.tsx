import React, { useState, useEffect } from "react";
import { X, FileText, Check } from "lucide-react";

type Props = {
  isOpen: boolean;
  initialDescription?: string;
  onSave: (description: string) => void;
  onClose: () => void;
  title?: string;
};

export default function OrderDescriptionModal({
  isOpen,
  initialDescription = "",
  onSave,
  onClose,
  title = "Order Description / Kitchen Note",
}: Props) {
  const [text, setText] = useState(initialDescription);

  useEffect(() => {
    if (isOpen) {
      setText(initialDescription || "");
    }
  }, [isOpen, initialDescription]);

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
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in duration-200">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-olive/10 text-olive rounded-xl">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-lg">{title}</h3>
              <p className="text-xs text-gray-500">This note will be printed at the bottom of the KOT</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type special instructions, cooking notes, allergy info, or table preferences here..."
            className="w-full h-36 p-3.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-olive/40 focus:border-olive resize-none"
            autoFocus
          />

          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>{text.length} characters</span>
            {text.trim() && (
              <button
                type="button"
                onClick={handleClear}
                className="text-red-500 hover:underline"
              >
                Clear note
              </button>
            )}
          </div>
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200/70 rounded-xl transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2.5 text-sm font-semibold text-white bg-olive hover:bg-olive/90 rounded-xl shadow-sm flex items-center gap-2 transition"
          >
            <Check size={16} />
            Save Description
          </button>
        </div>
      </div>
    </div>
  );
}
