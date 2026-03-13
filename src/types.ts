export interface ShopInfo {
  name: string;
  address: string;
  mobile: string;
  logo: string | null;
  services: string[];
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  price: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  customerName: string;
  customerMobile: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  grandTotal: number;
  createdAt: number;
}
