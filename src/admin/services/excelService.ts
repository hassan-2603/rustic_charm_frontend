import * as XLSX from "xlsx-js-style";
import { saveAs } from "file-saver";

function parseDate(value: any): Date | null {
  if (!value) return null;
  if (typeof value?.toDate === "function") return value.toDate();
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function toIndiaDate(date: Date) {
  const tzStr = date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  return new Date(tzStr);
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

export function generateRusticCharmReport(orders: any[], filenamePrefix: string, isAuto: boolean = false) {
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
        grTotal: 0
      };
    }
    const g = groups[dateStr];
    
    let fTotal = 0;
    let lTotal = 0;
    order.items?.forEach((item: any) => {
      const cat = item.category?.English || item.category || "";
      const isLiquor = /beer|wine|liquor|liqueur|cocktail|spirits|alcohol|whisky|whiskey|vodka|rum|gin|tequila|brandy/i.test(cat);
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
      
      const pm = (order.paymentMethod || "").toUpperCase();
      if (pm === "CASH") g.cash += finalTot;
      else if (pm === "CARD") g.card += finalTot;
      else g.online += finalTot;
    }
  });

  const sortedDates = Object.values(groups).sort((a: any, b: any) => a.bizDate.getTime() - b.bizDate.getTime());
  
  const nowIndia = toIndiaDate(new Date());

  const minDateStr = sortedDates.length > 0 ? sortedDates[0].dateStr : formatStr(nowIndia);
  const maxDateStr = sortedDates.length > 0 ? sortedDates[sortedDates.length - 1].dateStr : formatStr(nowIndia);
  const printDateStr = formatStr(nowIndia) + " " + formatTime(nowIndia);

  const aoa: any[][] = [
    ["RUSTIC CHARM"],
    ["BILL WISE SALE REPORT"],
    [`REPORT DATE: ${minDateStr} TO ${maxDateStr}`],
    [`PRINT DATE: ${printDateStr}`],
    [],
    [],
    ["DATE", "B.NO.START", "B.NO.END", "FOOD", "TOTAL", "B.NO.START", "B.NO.END", "LIQUOR", "TOTAL", "GR.TOTAL", "CASH", "CARD", "ONLINE"]
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
      g.foodMin === 99999999 ? 0 : g.foodMin,
      g.foodMax === 0 ? 0 : g.foodMax,
      g.food,
      g.food,
      g.liquorMin === 99999999 ? 0 : g.liquorMin,
      g.liquorMax === 0 ? 0 : g.liquorMax,
      g.liquor,
      g.liquor,
      g.grTotal,
      g.cash,
      g.card,
      g.online
    ]);
  });
  
  const bottomTotalRowIndex = aoa.length + 1; // 1-indexed for XLSX
  aoa.push([
    null, null, null, 
    sumFood, sumFood, 
    null, null, 
    sumLiquor, sumLiquor, 
    sumGrTotal, sumCash, sumCard, sumOnline
  ]);

  const grossAmount = sumGrTotal + overallCancel + overallDiscount - overallService;
  
  while(aoa.length <= 10) aoa.push(new Array(13).fill(null));
  
  aoa[6][13] = null;
  aoa[6][14] = "GROSS AMOUNT:";
  aoa[6][15] = grossAmount;
  
  aoa[7][13] = null;
  aoa[7][14] = "BILL CANCEL AMOUNT:(-)";
  aoa[7][15] = overallCancel;

  aoa[8][13] = null;
  aoa[8][14] = "DISCOUNT:(-)";
  aoa[8][15] = overallDiscount;

  aoa[9][13] = null;
  aoa[9][14] = "Service Chrg@0.00%:(+)";
  aoa[9][15] = overallService;
  
  aoa[10][13] = null;
  aoa[10][14] = "NET AMOUNT:";
  aoa[10][15] = sumGrTotal;

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
    
    // Main Table header (row 7)
    if (rowNum === 7 && colStr <= 'M') {
      worksheet[cell].s = headerStyle;
    } else if (rowNum > 7 && rowNum < bottomTotalRowIndex && colStr <= 'M') {
      // Table data
      worksheet[cell].s = dataStyle;
    } else if (rowNum === bottomTotalRowIndex && colStr <= 'M') {
      // Bottom total inner row
      worksheet[cell].s = totalsStyle;
    }

    // Side summary
    if (rowNum >= 7 && rowNum <= 11 && (colStr === 'O' || colStr === 'P')) {
      if (colStr === 'O') {
        worksheet[cell].s = {
          font: { bold: true, color: { rgb: "333333" } },
          fill: { fgColor: { rgb: "F4F4F4" } },
          border: thinBorder,
          alignment: { horizontal: "right" }
        };
      }
      if (colStr === 'P') {
        worksheet[cell].s = {
          font: { bold: true },
          border: thinBorder
        };
      }
    }
  }

  worksheet["!cols"] = [
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 4 },
    { wch: 25 },
    { wch: 15 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Report");

  const excel = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  saveAs(
    new Blob([excel], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `${filenamePrefix}_${nowIndia.toISOString().slice(0, 10)}${isAuto ? "_AUTO" : ""}.xlsx`
  );
}

export function exportOrdersExcel(orders: any[], isAuto: boolean = false) {
  generateRusticCharmReport(orders, "Orders", isAuto);
}

export function exportRevenueExcel(orders: any[]) {
  generateRusticCharmReport(orders, "Revenue");
}
