export type Unit = 'kg' | 'quintal';

export type PaymentMode = 'cash' | 'bank';

export interface Product {
  id: string;
  name: string; // e.g. "Coconut", "Kotta Adakka", "Kurumulak"
  malayalam_name?: string;
  is_active: boolean;
  min_stock_alert_kg: number;
  created_at: string;
  updated_at: string;
}

export interface DailyRate {
  id: string;
  product_id: string;
  rate_date: string; // YYYY-MM-DD
  selling_rate_per_kg: number;
  created_at: string;
}

export interface Farmer {
  id: string;
  name: string;
  phone?: string;
  place?: string;
  opening_balance_payable: number; // what we owed before system start
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Party {
  id: string;
  name: string;
  phone?: string;
  place?: string;
  opening_balance_receivable: number; // what party owed before system start
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PurchaseItem {
  id: string;
  purchase_id: string;
  product_id: string;
  product_name: string;
  quantity_kg: number;
  rate_per_kg: number;
  total_amount: number;
  input_unit?: Unit;
  input_quantity?: number;
}

export interface Purchase {
  id: string;
  date: string; // YYYY-MM-DD
  farmer_id: string;
  farmer_name: string;
  total_amount: number;
  paid_amount: number;
  payment_mode: PaymentMode;
  balance_payable: number;
  notes?: string;
  items: PurchaseItem[];
  is_edited?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  product_name: string;
  quantity_kg: number;
  selling_rate_per_kg: number;
  total_amount: number;
  cost_rate_per_kg: number; // weighted average cost at time of sale
  cogs_amount: number; // quantity_kg * cost_rate_per_kg
  input_unit?: Unit;
  input_quantity?: number;
  shop_weight_kg?: number;
  party_weight_kg?: number;
  weight_diff_kg?: number;
}

export interface Sale {
  id: string;
  date: string; // YYYY-MM-DD
  party_id: string;
  party_name: string;
  total_amount: number;
  received_amount: number;
  payment_mode: PaymentMode;
  balance_receivable: number;
  total_cogs: number;
  notes?: string;
  items: SaleItem[];
  is_edited?: boolean;
  created_at: string;
  updated_at?: string;
}

export type PaymentDirection = 'in' | 'out'; // 'in' = received from party; 'out' = paid to farmer
export type PaymentEntity = 'party' | 'farmer';

export interface Payment {
  id: string;
  date: string; // YYYY-MM-DD
  direction: PaymentDirection;
  entity_type: PaymentEntity;
  entity_id: string;
  entity_name: string;
  amount: number;
  payment_mode: PaymentMode;
  notes?: string;
  sale_id?: string;
  purchase_id?: string;
  created_at: string;
  updated_at?: string;
}

export interface ExpenseCategory {
  id: string;
  name: string; // Salary, Kuri, Rent, EMI, Transport, Labour, Electricity, Other
  is_default?: boolean;
}

export interface Expense {
  id: string;
  date: string; // YYYY-MM-DD
  category_id: string;
  category_name: string;
  amount: number;
  payment_mode: PaymentMode;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export type LossReason = 'Drying' | 'Shrinkage' | 'Wastage' | 'Spillage' | 'Other';

export interface WeightLoss {
  id: string;
  date: string; // YYYY-MM-DD
  product_id: string;
  product_name: string;
  quantity_lost_kg: number;
  reason: LossReason;
  cost_rate_per_kg: number;
  total_loss_value: number; // quantity_lost_kg * cost_rate_per_kg
  sale_id?: string; // if tied to weigh-in vs weigh-out on a sale
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface StockAdjustment {
  id: string;
  date: string;
  product_id: string;
  adjustment_kg: number; // positive or negative
  reason: string;
  created_at: string;
}

export interface ProductStockInfo {
  product_id: string;
  product_name: string;
  total_purchased_kg: number;
  total_sold_kg: number;
  total_loss_kg: number;
  total_adjusted_kg: number;
  current_stock_kg: number;
  current_stock_quintal: number;
  weighted_average_cost_per_kg: number;
  weightedAverageCostPerKg: number;
  stock_value: number;
  is_low_stock: boolean;
  min_stock_alert_kg: number;
}

export interface LedgerEntry {
  id: string;
  date: string;
  description: string;
  reference_type: 'purchase' | 'sale' | 'payment' | 'opening';
  reference_id?: string;
  debit: number; // For party: increase receivable; For farmer: payments made to reduce payable
  credit: number; // For party: payments received; For farmer: purchase increase payable
  running_balance: number;
  mode?: PaymentMode;
}

export interface DailyProfitReport {
  date: string;
  total_sales: number;
  total_cogs: number;
  gross_profit: number;
  shrinkage_loss_value: number;
  daily_profit: number; // sales - cogs - shrinkage loss (NO expenses)
  items: {
    product_id: string;
    product_name: string;
    quantity_sold_kg: number;
    sales_amount: number;
    cogs_amount: number;
    profit: number;
    profit_per_kg: number;
  }[];
}

export interface MonthlyProfitReport {
  month: string; // YYYY-MM
  total_sales: number;
  total_cogs: number;
  gross_profit: number;
  shrinkage_loss_value: number;
  total_expenses: number;
  net_profit: number; // sales - cogs - shrinkage loss - expenses
  expenses_by_category: { category: string; amount: number }[];
  daily_breakdown: {
    date: string;
    sales: number;
    cogs: number;
    shrinkage: number;
    daily_profit: number;
  }[];
  previous_month?: {
    total_sales: number;
    gross_profit: number;
    net_profit: number;
  };
}

export interface CashBookSummary {
  date: string;
  opening_cash: number;
  opening_bank: number;
  cash_in: number;
  cash_out: number;
  closing_cash: number;
  bank_in: number;
  bank_out: number;
  closing_bank: number;
  entries: {
    id: string;
    time: string;
    type: 'purchase_payment' | 'sale_receipt' | 'direct_payment' | 'expense' | 'opening';
    description: string;
    mode: PaymentMode;
    amount_in: number;
    amount_out: number;
    running_cash: number;
    running_bank: number;
  }[];
}

export interface Settings {
  shop_name: string;
  owner_name: string;
  phone: string;
  address: string;
  opening_cash_balance: number;
  opening_bank_balance: number;
  pin_code: string; // for quick PIN lock
  supabase_url?: string;
  supabase_anon_key?: string;
  auto_backup_enabled?: boolean;
}
