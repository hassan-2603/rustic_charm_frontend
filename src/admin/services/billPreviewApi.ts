import { requestStaffJson } from "../../services/staffApi";

export interface AuthoritativeBillItem {
  id: string;
  menuItemId: string;
  name: string;
  quantity: number;
  price: number;
  amount: number;
  section: string;
}

export interface AuthoritativeBill {
  orderId: string;
  orderNumber: string;
  tableLabel: string;
  tableNumber: string;
  waiterName: string;
  customerName: string;
  customerPhone: string;
  calculatedAt: string;
  items: AuthoritativeBillItem[];
  foodItems: AuthoritativeBillItem[];
  alcoholItems: AuthoritativeBillItem[];
  foodTotal: number;
  alcoholTotal: number;
  total: number;
  discountMode: "category" | "flat" | "percent" | null;
  foodDiscountPercent: number;
  alcoholDiscountPercent: number;
  foodDiscountAmount: number;
  alcoholDiscountAmount: number;
  discountAmount: number;
  finalTotal: number;
}

export async function fetchBillPreview(orderId: string): Promise<AuthoritativeBill> {
  if (!orderId) {
    throw new Error("Order ID is required to fetch bill preview");
  }
  return await requestStaffJson(`/orders/${encodeURIComponent(orderId)}/bill-preview`);
}
