import * as XLSX from "xlsx-js-style";
import { saveAs } from "file-saver";

function parseDate(value: any): Date | null {
  if (!value) return null;
  if (typeof value?.toDate === "function") return value.toDate();
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  let s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(s)) {
    s = s.replace(" ", "T");
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function toIndiaDate(date: Date): Date {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false
    }).formatToParts(date);
    const p: Record<string, number> = {};
    for (const part of parts) {
      if (part.type !== 'literal') p[part.type] = parseInt(part.value, 10);
    }
    return new Date(p.year, p.month - 1, p.day, p.hour === 24 ? 0 : p.hour, p.minute, p.second);
  } catch {
    const tzStr = date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
    const d = new Date(tzStr);
    return isNaN(d.getTime()) ? date : d;
  }
}

function formatStr(date: Date) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${String(date.getDate()).padStart(2, '0')}-${months[date.getMonth()]}-${date.getFullYear()}`;
}

function formatTime(date: Date) {
  let h = date.getHours();
  const m = String(date.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? h : 12;
  return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
}

export function generateRusticCharmReport(
  orders: any[],
  filenamePrefix: string,
  isAuto: boolean = false,
  dateRangeOverride?: { start: string; end: string }
) {
  const groups: Record<string, any> = {};

  let overallCancel = 0;
  let overallDiscount = 0;
  let overallService = 0;

  orders.forEach(order => {
    let d = parseDate(order.createdAt);
    if (!d) return;

    const bizDate = toIndiaDate(d);

    if (bizDate.getHours() < 7) {
      bizDate.setDate(bizDate.getDate() - 1);
    }
    const dateStr = formatStr(bizDate);

    if (!groups[dateStr]) {
      groups[dateStr] = {
        dateStr, bizDate,
        foodMin: 99999999, foodMax: 0,
        liquorMin: 99999999, liquorMax: 0,
        food: 0, liquor: 0,
        cash: 0, card: 0, online: 0,
        tip: 0,
        grTotal: 0
      };
    }
    const g = groups[dateStr];

    let fTotal = 0;
    let lTotal = 0;
    order.items?.forEach((item: any) => {
      const cat = item.category?.English || item.category || "";
      const isLiquor =
        /beer|wine|liquor|liqueur|cocktail|spirits|alcohol|whisky|whiskey|vodka|rum|gin|tequila|brandy/i.test(cat) ||
        /beer|wine|liquor|liqueur|cocktail|spirits|alcohol|whisky|whiskey|vodka|rum|gin|tequila|brandy|budweiser|kingfisher|tuborg|heineken|carlsberg|hoegaarden|breezer|cabo|port no|johnnie walker|teacher|smirnoff|bacardi/i.test(item.name || "");
      const lineTotal = (Number(item.price) || 0) * (Number(item.quantity) || 0);
      if (isLiquor) lTotal += lineTotal;
      else fTotal += lineTotal;
    });

    const hasFood = fTotal > 0;
    const hasLiquor = lTotal > 0;
    const bNo = Number(order.billNumber) || 0;

    if (hasFood && bNo) {
      if (bNo < g.foodMin) g.foodMin = bNo;
      if (bNo > g.foodMax) g.foodMax = bNo;
    }
    if (hasLiquor && bNo) {
      if (bNo < g.liquorMin) g.liquorMin = bNo;
      if (bNo > g.liquorMax) g.liquorMax = bNo;
    }

    const disc = Number(order.discountAmount) || 0;
    overallDiscount += disc;

    if (order.status === "Cancelled") {
      overallCancel += (Number(order.total) || 0);
    }

    const fRatio = (fTotal + lTotal) > 0 ? (fTotal / (fTotal + lTotal)) : 0;
    const lRatio = (fTotal + lTotal) > 0 ? (lTotal / (fTotal + lTotal)) : 0;

    const fNet = Math.round(fTotal - (disc * fRatio));
    const lNet = Math.round(lTotal - (disc * lRatio));

    if (order.status !== "Cancelled") {
      g.food += fNet;
      g.liquor += lNet;

      const finalTot = Number(order.finalTotal ?? order.total) || 0;
      g.grTotal += finalTot;

      // Handle split payments:
      const splits = order.paymentSplits
        ? (typeof order.paymentSplits === 'string' ? JSON.parse(order.paymentSplits) : order.paymentSplits)
        : null;

      if (splits && (splits.cash || splits.Cash || splits.card || splits.Card || splits.upi || splits.UPI || splits.zomato || splits.Zomato)) {
        const cashAmt = Number(splits.cash ?? splits.Cash ?? 0) || 0;
        const cardAmt = Number(splits.card ?? splits.Card ?? 0) || 0;
        const upiAmt = Number(splits.upi ?? splits.UPI ?? 0) || 0;
        const zomatoAmt = Number(splits.zomato ?? splits.Zomato ?? 0) || 0;
        g.cash += cashAmt;
        g.card += cardAmt;
        g.online += (upiAmt + zomatoAmt);
      } else {
        const pm = (order.paymentMethod || "").toUpperCase();
        if (pm.includes("CASH") && !pm.includes("UPI") && !pm.includes("CARD")) g.cash += finalTot;
        else if (pm.includes("CARD") && !pm.includes("CASH") && !pm.includes("UPI")) g.card += finalTot;
        else g.online += finalTot;
      }

      // Tip is recorded separately and NOT added to total
      const tip = Number(order.tipAmount || order.tip || 0);
      if (tip > 0) {
        g.tip = (g.tip || 0) + tip;
      }
    }
  });

  const sortedDates = Object.values(groups).sort((a: any, b: any) => a.bizDate.getTime() - b.bizDate.getTime());

  const nowIndia = toIndiaDate(new Date());

  const minDateStr = dateRangeOverride?.start || (sortedDates.length > 0 ? sortedDates[0].dateStr : formatStr(nowIndia));
  const maxDateStr = dateRangeOverride?.end || (sortedDates.length > 0 ? sortedDates[sortedDates.length - 1].dateStr : formatStr(nowIndia));
  const printDateStr = formatStr(nowIndia) + " " + formatTime(nowIndia);

  const aoa: any[][] = [
    ["RUSTIC CHARM"],
    ["BILL WISE SALE REPORT"],
    [`REPORT DATE: ${minDateStr} TO ${maxDateStr}`],
    [`PRINT DATE: ${printDateStr}`],
    [],
    [],
    ["DATE", "FOOD", "TOTAL", "LIQUOR", "TOTAL", "GR.TOTAL", "CASH", "CARD", "ONLINE", null, null, null, null, "TIP"]
  ];

  let sumFood = 0, sumLiquor = 0, sumGrTotal = 0, sumCash = 0, sumCard = 0, sumOnline = 0;

  sortedDates.forEach((g: any) => {
    sumFood += g.food;
    sumLiquor += g.liquor;
    sumGrTotal += g.grTotal;
    sumCash += g.cash;
    sumCard += g.card;
    sumOnline += g.online;

    aoa.push([
      g.dateStr,
      g.food,
      g.food,
      g.liquor,
      g.liquor,
      g.grTotal,
      g.cash,
      g.card,
      g.online,
      null, // J spacer
      null, // K
      null, // L
      null, // M spacer
      g.tip || 0 // N TIP
    ]);
  });

  const bottomTotalRowIndex = aoa.length + 1; // 1-indexed for XLSX
  aoa.push([
    null,
    sumFood, sumFood,
    sumLiquor, sumLiquor,
    sumGrTotal, sumCash, sumCard, sumOnline,
    null,
    null,
    null,
    null,
    null // N no operation on tip
  ]);

  const grossAmount = sumGrTotal + overallCancel + overallDiscount - overallService;

  while (aoa.length <= 11) aoa.push(new Array(14).fill(null));

  aoa[6][9] = null;
  aoa[6][10] = "GROSS AMOUNT:";
  aoa[6][11] = grossAmount;

  aoa[7][9] = null;
  aoa[7][10] = "BILL CANCEL AMOUNT:(-)";
  aoa[7][11] = overallCancel;

  aoa[8][9] = null;
  aoa[8][10] = "DISCOUNT:(-)";
  aoa[8][11] = overallDiscount;

  aoa[9][9] = null;
  aoa[9][10] = "Service Chrg@0.00%:(+)";
  aoa[9][11] = overallService;

  aoa[10][9] = null;
  aoa[10][10] = "NET AMOUNT:";
  aoa[10][11] = sumGrTotal;

  const worksheet = XLSX.utils.aoa_to_sheet(aoa);

  // Apply Styling
  const thinBorder = {
    top: { style: "thin", color: { auto: 1 } },
    bottom: { style: "thin", color: { auto: 1 } },
    left: { style: "thin", color: { auto: 1 } },
    right: { style: "thin", color: { auto: 1 } }
  };

  const headerStyle = {
    font: { bold: true, color: { rgb: "FFFFFF" }, sz: 12 },
    fill: { fgColor: { rgb: "216A4C" } }, // A nice rustic green
    alignment: { horizontal: "center", vertical: "center" },
    border: thinBorder
  };

  const totalsStyle = {
    font: { bold: true, color: { rgb: "000000" } },
    fill: { fgColor: { rgb: "EAEAEA" } },
    border: thinBorder
  };

  const dataStyle = {
    border: thinBorder,
    alignment: { vertical: "center" }
  };

  const titleFont = { bold: true, sz: 14, color: { rgb: "216A4C" } };

  for (const cell in worksheet) {
    if (cell.startsWith("!")) continue;
    const colStr = cell.replace(/[0-9]/g, '');
    const rowNum = parseInt(cell.replace(/[^0-9]/g, ''), 10);

    // Top headers
    if (rowNum >= 1 && rowNum <= 4) {
      if (!worksheet[cell].s) worksheet[cell].s = {};
      worksheet[cell].s.font = rowNum === 1 || rowNum === 2 ? titleFont : { bold: true, color: { rgb: "555555" } };
    }

    // Main Table header (row 7) and TIP header (Col N)
    if (rowNum === 7 && (colStr <= 'I' || colStr === 'N')) {
      worksheet[cell].s = headerStyle;
    } else if (rowNum > 7 && rowNum < bottomTotalRowIndex && (colStr <= 'I' || colStr === 'N')) {
      // Table data
      worksheet[cell].s = dataStyle;
    } else if (rowNum === bottomTotalRowIndex && (colStr <= 'I' || colStr === 'N')) {
      // Bottom total inner row
      worksheet[cell].s = totalsStyle;
    }

    // Side summary remains unchanged
    if (rowNum >= 7 && rowNum <= 11 && (colStr === 'K' || colStr === 'L')) {
      if (colStr === 'K') {
        worksheet[cell].s = {
          font: { bold: true, color: { rgb: "333333" } },
          fill: { fgColor: { rgb: "F4F4F4" } },
          border: thinBorder,
          alignment: { horizontal: "right" }
        };
      }
      if (colStr === 'L') {
        worksheet[cell].s = {
          font: { bold: true },
          border: thinBorder
        };
      }
    }
  }

  worksheet["!cols"] = [
    { wch: 14 }, // A: DATE
    { wch: 12 }, // B: FOOD
    { wch: 12 }, // C: TOTAL
    { wch: 12 }, // D: LIQUOR
    { wch: 12 }, // E: TOTAL
    { wch: 12 }, // F: GR.TOTAL
    { wch: 12 }, // G: CASH
    { wch: 12 }, // H: CARD
    { wch: 12 }, // I: ONLINE
    { wch: 4 },  // J: spacer
    { wch: 25 }, // K: side summary label
    { wch: 15 }, // L: side summary value
    { wch: 4 },  // M: spacer
    { wch: 12 }  // N: TIP
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Report");

  const excel = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  saveAs(
    new Blob([excel], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `${filenamePrefix}_${nowIndia.toISOString().slice(0, 10)}${isAuto ? "_AUTO" : ""}.xlsx`
  );
}

export function exportOrdersExcel(
  orders: any[],
  isAuto: boolean = false,
  prefix: string = "Orders",
  dateRangeOverride?: { start: string; end: string }
) {
  generateRusticCharmReport(orders, prefix, isAuto, dateRangeOverride);
}

export function exportRevenueExcel(orders: any[]) {
  generateRusticCharmReport(orders, "Revenue");
}

