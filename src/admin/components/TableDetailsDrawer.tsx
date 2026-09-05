import { useState } from "react";
import { X, QrCode, Trash2, Printer, AlertTriangle, Copy, Check } from "lucide-react";

import TableStatusBadge from "./TableStatusBadge";
import { freeTable, deleteTable } from "../services/tableService";
import { getTableDisplayName, generateTableLink } from "../../utils/tableUtils";

type Props = {
  open: boolean;
  table: any;
  onClose: () => void;
};

export default function TableDetailsDrawer({
  open,
  table,
  onClose,
}: Props) {
  const [showQrModal, setShowQrModal] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!open || !table) return null;

  const tableDisplayName = getTableDisplayName(table);
  const tableLink = generateTableLink(table, "https://rustic-charm.in");
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(tableLink)}`;

  async function handleFreeTable() {
    if (!confirm(`Free ${tableDisplayName}?`)) return;
    await freeTable(table.id);
    onClose();
  }

  async function handleDeleteTable() {
    if (
      !confirm(
        `Permanently delete ${tableDisplayName}? Any customer using this table link will no longer be able to access the menu.`
      )
    )
      return;

    await deleteTable(table.id);
    onClose();
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(tableLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function handlePrintQr() {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${tableDisplayName}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Plus+Jakarta+Sans:wght@500;700&display=swap');
            body {
              font-family: 'Plus Jakarta Sans', sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
              background-color: #fff;
              color: #1a1a1a;
            }
            .card {
              border: 2px solid #556B2F;
              border-radius: 24px;
              padding: 36px 32px;
              text-align: center;
              max-width: 380px;
              box-shadow: 0 10px 25px rgba(85,107,47,0.1);
            }
            .brand {
              font-family: 'Playfair Display', serif;
              font-size: 26px;
              font-weight: 700;
              color: #556B2F;
              margin-bottom: 4px;
              letter-spacing: 0.05em;
            }
            .tagline {
              font-size: 11px;
              color: #888;
              text-transform: uppercase;
              letter-spacing: 0.2em;
              margin-bottom: 24px;
            }
            .qr-wrapper {
              background: #fff;
              padding: 12px;
              display: inline-block;
              border-radius: 16px;
              border: 1px solid #eee;
              margin-bottom: 20px;
            }
            .qr-img {
              width: 240px;
              height: 240px;
              display: block;
            }
            .table-title {
              font-size: 20px;
              font-weight: 700;
              color: #222;
              margin-bottom: 6px;
            }
            .scan-instructions {
              font-size: 12px;
              color: #666;
            }
            @media print {
              body { padding: 0; }
              .card { box-shadow: none; border-color: #333; }
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="brand">Rustic Charm</div>
            <div class="tagline">Exquisite European Gastronomy</div>
            <div class="qr-wrapper">
              <img src="${qrCodeUrl}" alt="QR Code" class="qr-img" />
            </div>
            <div class="table-title">${tableDisplayName}</div>
            <div class="scan-instructions">Scan with phone camera to view menu & order</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 flex justify-end z-50">
        <div className="w-full max-w-lg bg-white h-full overflow-y-auto shadow-2xl">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">
                {tableDisplayName}
              </h2>
              <p className="text-gray-500 mt-1">
                {table.areaLabel || "Restaurant Table"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 cursor-pointer"
            >
              <X />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Status */}
            <div className="border rounded-2xl p-5">
              <h3 className="font-semibold mb-4">
                Current Status
              </h3>
              <TableStatusBadge status={table.status} />
            </div>

            {/* Information */}
            <div className="border rounded-2xl p-5 space-y-4">
              <h3 className="font-semibold">
                Table Information
              </h3>
              <div className="flex justify-between">
                <span className="text-gray-500">Area</span>
                <span className="font-semibold">{table.areaLabel || table.area || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Table Number</span>
                <span className="font-semibold">{table.tableNumber ?? "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Occupied</span>
                <span className="font-semibold">{table.occupied ? "Yes" : "No"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Current Order</span>
                <span className="font-semibold">{table.currentOrderId ? table.currentOrderId.slice(0, 8) : "--"}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="border rounded-2xl p-5">
              <h3 className="font-semibold mb-5">
                Actions
              </h3>
              <div className="space-y-3">
                <button
                  onClick={() => setShowQrModal(true)}
                  className="w-full flex items-center justify-center gap-3 border border-gray-300 py-3 rounded-xl hover:bg-gray-50 font-medium transition cursor-pointer"
                >
                  <QrCode size={18} className="text-olive" />
                  View & Generate QR
                </button>

                <button
                  onClick={handlePrintQr}
                  className="w-full flex items-center justify-center gap-3 border border-gray-300 py-3 rounded-xl hover:bg-gray-50 font-medium transition cursor-pointer"
                >
                  <Printer size={18} className="text-gray-700" />
                  Print QR Code
                </button>

                <button
                  onClick={handleFreeTable}
                  className="w-full flex items-center justify-center gap-3 bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-semibold transition cursor-pointer"
                >
                  <Trash2 size={18} />
                  Free Table
                </button>

                <button
                  onClick={handleDeleteTable}
                  className="w-full flex items-center justify-center gap-3 bg-red-700 hover:bg-red-800 text-white py-3 rounded-xl font-semibold transition cursor-pointer"
                >
                  <AlertTriangle size={18} />
                  Delete Table
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* QR Code Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-gray-100 text-center relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 p-1.5 rounded-full hover:bg-gray-100 cursor-pointer"
            >
              <X size={20} />
            </button>

            <span className="text-[11px] font-bold uppercase tracking-widest text-olive bg-olive/10 px-3 py-1 rounded-full border border-olive/20">
              Customer QR Link
            </span>

            <h3 className="text-xl font-bold text-gray-900 mt-3 mb-1">
              {tableDisplayName}
            </h3>
            <p className="text-xs text-gray-500 mb-6">
              Area and table number are obfuscated in the link for security.
            </p>

            <div className="bg-cream/40 p-4 rounded-2xl border border-gray-200 inline-block mb-6 shadow-inner">
              <img
                src={qrCodeUrl}
                alt={`QR code for ${tableDisplayName}`}
                className="w-56 h-56 mx-auto rounded-xl"
              />
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 mb-6 flex items-center justify-between gap-2">
              <span className="text-xs font-mono text-gray-600 truncate text-left select-all">
                {tableLink}
              </span>
              <button
                onClick={handleCopyLink}
                className="p-1.5 text-gray-500 hover:text-olive transition flex-shrink-0 cursor-pointer"
                title="Copy Link"
              >
                {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handlePrintQr}
                className="flex-1 bg-olive hover:bg-olive-dark text-white font-semibold py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer size={16} />
                Print QR
              </button>
              <button
                onClick={() => setShowQrModal(false)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-5 rounded-xl text-xs uppercase tracking-wider transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}