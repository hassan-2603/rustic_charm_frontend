import { useState, useEffect, useMemo } from "react";
import { X, ArrowRight, UtensilsCrossed, AlertCircle, CheckCircle2 } from "lucide-react";
import { updateOrderTable } from "../services/waiterService";

type Props = {
  open: boolean;
  order: any;
  tables: any[];
  onClose: () => void;
  onTableChanged: (updatedOrder: any) => void;
};

export default function ChangeTableModal({
  open,
  order,
  tables,
  onClose,
  onTableChanged,
}: Props) {
  const [selectedArea, setSelectedArea] = useState("");
  const [selectedTableId, setSelectedTableId] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const areas = useMemo(() => {
    const set = new Set<string>();
    tables.forEach((t) => {
      if (t.area) set.add(t.area);
    });
    return Array.from(set);
  }, [tables]);

  const currentTable = useMemo(() => {
    if (!order) return null;
    return (
      tables.find(
        (t) =>
          t.id === order.tableId ||
          (order.tableReference && (t.tableKey === order.tableReference || t.id === order.tableReference))
      ) || null
    );
  }, [order, tables]);

  const selectedTable = useMemo(() => {
    return tables.find((t) => t.id === selectedTableId) || null;
  }, [tables, selectedTableId]);

  useEffect(() => {
    if (open && order) {
      setErrorMsg("");
      const initialArea = currentTable?.area || order.tableArea || (areas[0] || "");
      const initialTableId = currentTable?.id || order.tableId || "";
      setSelectedArea(initialArea);
      setSelectedTableId(initialTableId);
    }
  }, [open, order, currentTable, areas]);

  const areaTables = useMemo(() => {
    if (!selectedArea) return tables;
    return tables.filter((t) => t.area === selectedArea);
  }, [tables, selectedArea]);

  if (!open || !order) return null;

  const isCurrentTable = Boolean(
    selectedTable &&
      (selectedTable.id === currentTable?.id ||
        selectedTable.id === order.tableId ||
        selectedTable.tableKey === order.tableReference)
  );

  const isTargetOccupied = Boolean(
    selectedTable &&
      !isCurrentTable &&
      (selectedTable.occupied || String(selectedTable.status).toLowerCase() === "occupied")
  );

  async function handleUpdateTable() {
    if (!selectedTable || isCurrentTable || isTargetOccupied) return;

    setSaving(true);
    setErrorMsg("");
    try {
      const response = await updateOrderTable(order.id, selectedTable.id);
      const updatedOrder = response?.data || response || {
        ...order,
        tableId: selectedTable.id,
        tableReference: selectedTable.tableKey,
        tableNumber: selectedTable.tableNumber,
        tableArea: selectedTable.area,
        tableLabel: selectedTable.displayName,
      };

      onTableChanged(updatedOrder);
      onClose();
    } catch (err: any) {
      console.error("Failed to change table:", err);
      setErrorMsg(err instanceof Error ? err.message : "Unable to change table. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const currentDisplayName =
    order.tableLabel ||
    currentTable?.displayName ||
    order.tableReference ||
    `Table ${order.tableNumber || "--"}`;

  const currentAreaLabel =
    currentTable?.areaLabel ||
    currentTable?.area ||
    order.tableArea ||
    "Current Section";

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b bg-gray-50/70">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <UtensilsCrossed size={20} className="text-olive" />
              Change Table
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Order #{order.orderNumber} • {currentDisplayName}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Transfer Visual Card */}
          <div className="bg-gradient-to-r from-amber-50/70 via-gray-50 to-green-50/70 border border-gray-200 rounded-xl p-4 flex items-center justify-between text-sm">
            <div className="flex-1">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                Current Table
              </span>
              <p className="font-bold text-gray-900 mt-0.5">{currentDisplayName}</p>
              <p className="text-xs text-gray-500">{currentAreaLabel}</p>
            </div>

            <div className="px-3 text-gray-400">
              <ArrowRight size={20} className="text-olive" />
            </div>

            <div className="flex-1 text-right">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                New Table
              </span>
              <p className="font-bold text-gray-900 mt-0.5">
                {selectedTable
                  ? selectedTable.displayName || `Table ${selectedTable.tableNumber}`
                  : "Select table"}
              </p>
              <p className="text-xs text-gray-500">
                {selectedTable ? selectedTable.areaLabel || selectedTable.area : "--"}
              </p>
            </div>
          </div>

          {/* Section / Area Dropdown */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              1. Select Section / Area
            </label>
            <select
              value={selectedArea}
              onChange={(e) => {
                const newArea = e.target.value;
                setSelectedArea(newArea);
                const matchingTables = tables.filter((t) => t.area === newArea);
                if (matchingTables.length > 0) {
                  const firstAvail =
                    matchingTables.find(
                      (t) =>
                        !t.occupied &&
                        String(t.status).toLowerCase() !== "occupied" &&
                        t.id !== currentTable?.id
                    ) || matchingTables[0];
                  setSelectedTableId(firstAvail.id);
                } else {
                  setSelectedTableId("");
                }
              }}
              disabled={saving}
              className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 bg-white text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-olive/40 focus:border-olive"
            >
              <option value="">Select Section / Area</option>
              {areas.map((area) => {
                const areaLabel =
                  tables.find((t) => t.area === area)?.areaLabel || area;
                return (
                  <option key={area} value={area}>
                    {areaLabel}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Table Number Dropdown */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              2. Select Table Number
            </label>
            <select
              value={selectedTableId}
              onChange={(e) => setSelectedTableId(e.target.value)}
              disabled={saving || !selectedArea}
              className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 bg-white text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-olive/40 focus:border-olive"
            >
              <option value="">Select Table Number</option>
              {areaTables.map((t) => {
                const isCur =
                  t.id === currentTable?.id ||
                  t.id === order.tableId ||
                  t.tableKey === order.tableReference;
                const isOcc =
                  !isCur &&
                  (t.occupied || String(t.status).toLowerCase() === "occupied");
                const label = `${t.displayName || `Table ${t.tableNumber}`} ${
                  isCur ? "(Current)" : isOcc ? "(Occupied)" : "(Available)"
                }`;
                return (
                  <option key={t.id} value={t.id}>
                    {label}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Warnings and Info Notes */}
          {isCurrentTable && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800">
              <CheckCircle2 size={16} className="shrink-0 text-blue-600" />
              <span>This order is currently assigned to this table. Please choose a different table to move it.</span>
            </div>
          )}

          {isTargetOccupied && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
              <AlertCircle size={16} className="shrink-0 text-red-600" />
              <span>
                Selected table is currently occupied by another order. Please select an available table.
              </span>
            </div>
          )}

          {selectedTable && !isCurrentTable && !isTargetOccupied && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-xs text-green-800">
              <CheckCircle2 size={16} className="shrink-0 text-green-600" />
              <span>
                Moving this order will mark <strong>{selectedTable.displayName || `Table ${selectedTable.tableNumber}`}</strong> as Occupied and free <strong>{currentDisplayName}</strong>.
              </span>
            </div>
          )}

          {errorMsg && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
              <AlertCircle size={16} className="shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50/70">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl border border-gray-300 font-semibold text-gray-700 hover:bg-gray-100 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleUpdateTable}
            disabled={!selectedTable || isCurrentTable || isTargetOccupied || saving}
            className="px-6 py-2.5 rounded-xl bg-olive hover:bg-olive/90 text-white font-semibold shadow transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? "Updating Table..." : "Update Table"}
          </button>
        </div>
      </div>
    </div>
  );
}
