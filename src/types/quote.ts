/** 报价单 */
export interface Quote {
  id: string;
  configurationId: string;
  totalPrice: number;
  materialCost: number;
  laborCost: number;
  customerName: string;
  customerPhone: string;
  status: string;
  createdAt: string;
}
