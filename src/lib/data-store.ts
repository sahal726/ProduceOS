import {
  Product,
  Farmer,
  Party,
  Purchase,
  Sale,
  Payment,
  Expense,
  ExpenseCategory,
  WeightLoss,
  StockAdjustment,
  DailyRate,
  Settings,
} from '@/types';
import { supabase, isSupabaseConfigured } from './supabase';

const STORAGE_KEY = 'shop_erp_data_v1';
const AUTH_KEY = 'shop_erp_auth_pin_unlocked';

export const INITIAL_PRODUCTS: Product[] = [
  { id: 'prod-coconut', name: 'Coconut', is_active: true, min_stock_alert_kg: 500, created_at: '2026-11-01T00:00:00Z', updated_at: '2026-11-01T00:00:00Z' },
  { id: 'prod-kotta-adakka', name: 'Kotta Adakka', is_active: true, min_stock_alert_kg: 100, created_at: '2026-11-01T00:00:00Z', updated_at: '2026-11-01T00:00:00Z' },
  { id: 'prod-kora', name: 'Kora', is_active: true, min_stock_alert_kg: 100, created_at: '2026-11-01T00:00:00Z', updated_at: '2026-11-01T00:00:00Z' },
  { id: 'prod-poukka', name: 'Poukka', is_active: true, min_stock_alert_kg: 100, created_at: '2026-11-01T00:00:00Z', updated_at: '2026-11-01T00:00:00Z' },
  { id: 'prod-koka', name: 'Koka', is_active: true, min_stock_alert_kg: 50, created_at: '2026-11-01T00:00:00Z', updated_at: '2026-11-01T00:00:00Z' },
  { id: 'prod-kurumulak', name: 'Kurumulak', is_active: true, min_stock_alert_kg: 30, created_at: '2026-11-01T00:00:00Z', updated_at: '2026-11-01T00:00:00Z' },
  { id: 'prod-jaathi', name: 'Jaathi', is_active: true, min_stock_alert_kg: 25, created_at: '2026-11-01T00:00:00Z', updated_at: '2026-11-01T00:00:00Z' },
  { id: 'prod-jaathi-pathri', name: 'Jaathi Pathri', is_active: true, min_stock_alert_kg: 10, created_at: '2026-11-01T00:00:00Z', updated_at: '2026-11-01T00:00:00Z' },
  { id: 'prod-kashu-andi', name: 'Kashu Andi', is_active: true, min_stock_alert_kg: 100, created_at: '2026-11-01T00:00:00Z', updated_at: '2026-11-01T00:00:00Z' },
  { id: 'prod-kili-adakka', name: 'Kili Adakka', is_active: true, min_stock_alert_kg: 50, created_at: '2026-11-01T00:00:00Z', updated_at: '2026-11-01T00:00:00Z' },
];

export const INITIAL_EXPENSE_CATEGORIES: ExpenseCategory[] = [
  { id: 'cat-salary', name: 'Salary', is_default: true },
  { id: 'cat-kuri', name: 'Kuri', is_default: true },
  { id: 'cat-rent', name: 'Rent', is_default: true },
  { id: 'cat-emi', name: 'EMI', is_default: true },
  { id: 'cat-transport', name: 'Transport', is_default: true },
  { id: 'cat-labour', name: 'Labour', is_default: true },
  { id: 'cat-electricity', name: 'Electricity', is_default: true },
  { id: 'cat-other', name: 'Other', is_default: true },
];

export const INITIAL_FARMERS: Farmer[] = [
  { id: 'frm-rajan', name: 'Rajan Pillai', phone: '9847123456', place: 'Koduvally', opening_balance_payable: 2500, is_active: true, created_at: '2026-11-01T00:00:00Z', updated_at: '2026-11-01T00:00:00Z' },
  { id: 'frm-thomas', name: 'Thomas Kutty', phone: '9447654321', place: 'Thamarassery', opening_balance_payable: 4000, is_active: true, created_at: '2026-11-01T00:00:00Z', updated_at: '2026-11-01T00:00:00Z' },
  { id: 'frm-moidu', name: 'Moidu Haji', phone: '9895321456', place: 'Mukkam', opening_balance_payable: 0, is_active: true, created_at: '2026-11-01T00:00:00Z', updated_at: '2026-11-01T00:00:00Z' },
  { id: 'frm-vijayan', name: 'Vijayan Nair', phone: '9496781234', place: 'Kunnamangalam', opening_balance_payable: 1200, is_active: true, created_at: '2026-11-01T00:00:00Z', updated_at: '2026-11-01T00:00:00Z' },
];

export const INITIAL_PARTIES: Party[] = [
  { id: 'pty-malabar', name: 'Malabar Spices Traders', phone: '9846011223', place: 'Calicut Market', opening_balance_receivable: 35000, is_active: true, created_at: '2026-11-01T00:00:00Z', updated_at: '2026-11-01T00:00:00Z' },
  { id: 'pty-cochin', name: 'Cochin Agro Exports', phone: '9447890123', place: 'Mattancherry', opening_balance_receivable: 85000, is_active: true, created_at: '2026-11-01T00:00:00Z', updated_at: '2026-11-01T00:00:00Z' },
  { id: 'pty-wayanad', name: 'Wayanad Produce Mart', phone: '9744556677', place: 'Kalpetta', opening_balance_receivable: 12500, is_active: true, created_at: '2026-11-01T00:00:00Z', updated_at: '2026-11-01T00:00:00Z' },
];

export const INITIAL_SETTINGS: Settings = {
  shop_name: 'Shop ERP',
  owner_name: 'Umair',
  phone: '+91 98470 12345',
  address: 'Koduvally, Kozhikode, Kerala',
  opening_cash_balance: 35000,
  opening_bank_balance: 180000,
  pin_code: '1234',
  auto_backup_enabled: true,
};

export interface ERPStoreData {
  products: Product[];
  farmers: Farmer[];
  parties: Party[];
  purchases: Purchase[];
  sales: Sale[];
  payments: Payment[];
  expenses: Expense[];
  expense_categories: ExpenseCategory[];
  weight_losses: WeightLoss[];
  stock_adjustments: StockAdjustment[];
  daily_rates: DailyRate[];
  settings: Settings;
  last_used_product_id?: string;
}

export function getDefaultStoreData(): ERPStoreData {
  const today = new Date().toISOString().slice(0, 10);
  const samplePurchases: Purchase[] = [
    {
      id: 'pur-init-1',
      date: today,
      farmer_id: 'frm-rajan',
      farmer_name: 'Rajan Pillai',
      total_amount: 14500,
      paid_amount: 10000,
      payment_mode: 'cash',
      balance_payable: 4500,
      notes: 'Fresh harvest',
      created_at: `${today}T08:30:00Z`,
      updated_at: `${today}T08:30:00Z`,
      items: [
        {
          id: 'pi-1',
          purchase_id: 'pur-init-1',
          product_id: 'prod-coconut',
          product_name: 'Coconut',
          quantity_kg: 250,
          rate_per_kg: 34,
          total_amount: 8500,
          input_unit: 'kg',
          input_quantity: 250,
        },
        {
          id: 'pi-2',
          purchase_id: 'pur-init-1',
          product_id: 'prod-kotta-adakka',
          product_name: 'Kotta Adakka',
          quantity_kg: 15,
          rate_per_kg: 400,
          total_amount: 6000,
          input_unit: 'kg',
          input_quantity: 15,
        },
      ],
    },
    {
      id: 'pur-init-2',
      date: today,
      farmer_id: 'frm-thomas',
      farmer_name: 'Thomas Kutty',
      total_amount: 28500,
      paid_amount: 28500,
      payment_mode: 'bank',
      balance_payable: 0,
      notes: 'Full payment via UPI',
      created_at: `${today}T09:15:00Z`,
      updated_at: `${today}T09:15:00Z`,
      items: [
        {
          id: 'pi-3',
          purchase_id: 'pur-init-2',
          product_id: 'prod-kurumulak',
          product_name: 'Kurumulak',
          quantity_kg: 45,
          rate_per_kg: 580,
          total_amount: 26100,
          input_unit: 'kg',
          input_quantity: 45,
        },
        {
          id: 'pi-4',
          purchase_id: 'pur-init-2',
          product_id: 'prod-jaathi',
          product_name: 'Jaathi',
          quantity_kg: 8,
          rate_per_kg: 300,
          total_amount: 2400,
          input_unit: 'kg',
          input_quantity: 8,
        },
      ],
    },
  ];

  const sampleSales: Sale[] = [
    {
      id: 'sale-init-1',
      date: today,
      party_id: 'pty-malabar',
      party_name: 'Malabar Spices Traders',
      total_amount: 32000,
      received_amount: 20000,
      payment_mode: 'bank',
      balance_receivable: 12000,
      total_cogs: 23200,
      notes: 'Sold 40kg Kurumulak bulk',
      created_at: `${today}T11:00:00Z`,
      updated_at: `${today}T11:00:00Z`,
      items: [
        {
          id: 'si-1',
          sale_id: 'sale-init-1',
          product_id: 'prod-kurumulak',
          product_name: 'Kurumulak',
          quantity_kg: 40,
          selling_rate_per_kg: 800,
          total_amount: 32000,
          cost_rate_per_kg: 580,
          cogs_amount: 23200,
          input_unit: 'quintal',
          input_quantity: 0.4,
        },
      ],
    },
  ];

  const sampleLosses: WeightLoss[] = [
    {
      id: 'wl-init-1',
      date: today,
      product_id: 'prod-kurumulak',
      product_name: 'Kurumulak',
      quantity_lost_kg: 1.5,
      reason: 'Drying',
      cost_rate_per_kg: 580,
      total_loss_value: 870,
      notes: 'After sun drying loss',
      created_at: `${today}T12:00:00Z`,
      updated_at: `${today}T12:00:00Z`,
    },
  ];

  const sampleExpenses: Expense[] = [
    {
      id: 'exp-init-1',
      date: today,
      category_id: 'cat-labour',
      category_name: 'Labour',
      amount: 1500,
      payment_mode: 'cash',
      notes: 'Sorting & weighing labour',
      created_at: `${today}T13:00:00Z`,
      updated_at: `${today}T13:00:00Z`,
    },
    {
      id: 'exp-init-2',
      date: today,
      category_id: 'cat-transport',
      category_name: 'Transport',
      amount: 800,
      payment_mode: 'cash',
      notes: 'Local auto freight',
      created_at: `${today}T14:30:00Z`,
      updated_at: `${today}T14:30:00Z`,
    },
  ];

  const sampleDailyRates: DailyRate[] = [
    { id: 'dr-1', product_id: 'prod-coconut', rate_date: today, selling_rate_per_kg: 42, created_at: today },
    { id: 'dr-2', product_id: 'prod-kotta-adakka', rate_date: today, selling_rate_per_kg: 460, created_at: today },
    { id: 'dr-3', product_id: 'prod-kurumulak', rate_date: today, selling_rate_per_kg: 800, created_at: today },
    { id: 'dr-4', product_id: 'prod-jaathi', rate_date: today, selling_rate_per_kg: 380, created_at: today },
    { id: 'dr-5', product_id: 'prod-jaathi-pathri', rate_date: today, selling_rate_per_kg: 1950, created_at: today },
    { id: 'dr-6', product_id: 'prod-kashu-andi', rate_date: today, selling_rate_per_kg: 720, created_at: today },
  ];

  return {
    products: INITIAL_PRODUCTS,
    farmers: INITIAL_FARMERS,
    parties: INITIAL_PARTIES,
    purchases: samplePurchases,
    sales: sampleSales,
    payments: [],
    expenses: sampleExpenses,
    expense_categories: INITIAL_EXPENSE_CATEGORIES,
    weight_losses: sampleLosses,
    stock_adjustments: [],
    daily_rates: sampleDailyRates,
    settings: INITIAL_SETTINGS,
    last_used_product_id: 'prod-coconut',
  };
}

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'unconfigured';

class ERPDataStore {
  private data: ERPStoreData;
  private listeners: Set<() => void> = new Set();
  private syncStatus: SyncStatus = isSupabaseConfigured ? 'idle' : 'unconfigured';
  private syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private initialSyncDone: boolean = false;

  constructor() {
    this.data = this.loadFromStorage();
    if (typeof window !== 'undefined') {
      // Background initial sync
      setTimeout(() => {
        this.initCloudSync();
      }, 300);

      window.addEventListener('online', () => {
        console.log('Online detected: pulling latest data from cloud...');
        this.pullFromCloud();
      });
    }
  }

  private async initCloudSync() {
    if (this.initialSyncDone) return;
    this.initialSyncDone = true;
    if (isSupabaseConfigured && supabase) {
      await this.pullFromCloud();
    }
  }

  public getSyncStatus(): SyncStatus {
    return this.syncStatus;
  }

  private setSyncStatus(status: SyncStatus): void {
    this.syncStatus = status;
    this.notifyListeners();
  }

  public async pullFromCloud(): Promise<boolean> {
    if (!supabase || !isSupabaseConfigured) {
      this.setSyncStatus('unconfigured');
      return false;
    }
    try {
      this.setSyncStatus('syncing');
      const { data, error } = await supabase
        .from('erp_store')
        .select('data, updated_at')
        .eq('id', 'shop_main')
        .maybeSingle();

      if (error) {
        console.error('Supabase pull error:', error);
        this.setSyncStatus('error');
        return false;
      }

      if (data && data.data) {
        const cloudData = data.data as ERPStoreData;
        this.data = {
          ...getDefaultStoreData(),
          ...cloudData,
          products: cloudData.products && cloudData.products.length > 0 ? cloudData.products : INITIAL_PRODUCTS,
          expense_categories: cloudData.expense_categories && cloudData.expense_categories.length > 0 ? cloudData.expense_categories : INITIAL_EXPENSE_CATEGORIES,
        };
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
        }
        this.setSyncStatus('synced');
        this.notifyListeners();
        return true;
      } else {
        // First time cloud setup: push current local state to cloud
        await this.pushToCloud();
        return true;
      }
    } catch (err) {
      console.error('Failed to sync from Supabase', err);
      this.setSyncStatus('error');
      return false;
    }
  }

  public async pushToCloud(): Promise<boolean> {
    if (!supabase || !isSupabaseConfigured) {
      this.setSyncStatus('unconfigured');
      return false;
    }
    try {
      this.setSyncStatus('syncing');
      const { error } = await supabase
        .from('erp_store')
        .upsert({
          id: 'shop_main',
          data: this.data,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Supabase push error:', error);
        this.setSyncStatus('error');
        return false;
      }

      this.setSyncStatus('synced');
      return true;
    } catch (err) {
      console.error('Failed to push to Supabase', err);
      this.setSyncStatus('error');
      return false;
    }
  }

  private scheduleCloudSync(): void {
    if (!isSupabaseConfigured || !supabase) return;
    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
    }
    this.syncDebounceTimer = setTimeout(() => {
      this.pushToCloud();
    }, 1500);
  }

  private loadFromStorage(): ERPStoreData {
    if (typeof window === 'undefined') {
      return getDefaultStoreData();
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Ensure all required fields exist
        return {
          ...getDefaultStoreData(),
          ...parsed,
          products: parsed.products && parsed.products.length > 0 ? parsed.products : INITIAL_PRODUCTS,
          expense_categories: parsed.expense_categories && parsed.expense_categories.length > 0 ? parsed.expense_categories : INITIAL_EXPENSE_CATEGORIES,
        };
      }
    } catch (e) {
      console.error('Failed to parse local storage data', e);
    }
    const defaultData = getDefaultStoreData();
    this.saveToStorage(defaultData);
    return defaultData;
  }

  private saveToStorage(data: ERPStoreData): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      this.notifyListeners();
      this.scheduleCloudSync();
    } catch (e) {
      console.error('Failed to save to localStorage', e);
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('Listener callback error', err);
      }
    });
  }

  public getData(): ERPStoreData {
    return this.data;
  }

  public updateData(updater: (prev: ERPStoreData) => ERPStoreData): void {
    this.data = updater(this.data);
    this.saveToStorage(this.data);
  }

  // --- Products ---
  public addProduct(product: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Product {
    const newProd: Product = {
      ...product,
      id: `prod-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.updateData((prev) => ({
      ...prev,
      products: [...prev.products, newProd],
    }));
    return newProd;
  }

  public updateProduct(id: string, updates: Partial<Product>): void {
    this.updateData((prev) => ({
      ...prev,
      products: prev.products.map((p) =>
        p.id === id ? { ...p, ...updates, updated_at: new Date().toISOString() } : p
      ),
    }));
  }

  // --- Farmers ---
  public addFarmer(farmer: Omit<Farmer, 'id' | 'created_at' | 'updated_at'>): Farmer {
    const newFarmer: Farmer = {
      ...farmer,
      id: `frm-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.updateData((prev) => ({
      ...prev,
      farmers: [...prev.farmers, newFarmer],
    }));
    return newFarmer;
  }

  public updateFarmer(id: string, updates: Partial<Farmer>): void {
    this.updateData((prev) => ({
      ...prev,
      farmers: prev.farmers.map((f) =>
        f.id === id ? { ...f, ...updates, updated_at: new Date().toISOString() } : f
      ),
    }));
  }

  // --- Parties ---
  public addParty(party: Omit<Party, 'id' | 'created_at' | 'updated_at'>): Party {
    const newParty: Party = {
      ...party,
      id: `pty-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.updateData((prev) => ({
      ...prev,
      parties: [...prev.parties, newParty],
    }));
    return newParty;
  }

  public updateParty(id: string, updates: Partial<Party>): void {
    this.updateData((prev) => ({
      ...prev,
      parties: prev.parties.map((p) =>
        p.id === id ? { ...p, ...updates, updated_at: new Date().toISOString() } : p
      ),
    }));
  }

  // --- Purchases ---
  public addPurchase(purchase: Omit<Purchase, 'id' | 'created_at' | 'updated_at'>): Purchase {
    const newPurchase: Purchase = {
      ...purchase,
      id: `pur-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.updateData((prev) => ({
      ...prev,
      purchases: [newPurchase, ...prev.purchases],
      last_used_product_id:
        newPurchase.items.length > 0 ? newPurchase.items[0].product_id : prev.last_used_product_id,
    }));
    return newPurchase;
  }

  public deletePurchase(id: string): void {
    this.updateData((prev) => ({
      ...prev,
      purchases: prev.purchases.filter((p) => p.id !== id),
    }));
  }

  // --- Sales ---
  public addSale(sale: Omit<Sale, 'id' | 'created_at' | 'updated_at'>): Sale {
    const newSale: Sale = {
      ...sale,
      id: `sale-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.updateData((prev) => ({
      ...prev,
      sales: [newSale, ...prev.sales],
    }));
    return newSale;
  }

  public deleteSale(id: string): void {
    this.updateData((prev) => ({
      ...prev,
      sales: prev.sales.filter((s) => s.id !== id),
    }));
  }

  // --- Payments ---
  public addPayment(payment: Omit<Payment, 'id' | 'created_at' | 'updated_at'>): Payment {
    const newPayment: Payment = {
      ...payment,
      id: `pay-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.updateData((prev) => ({
      ...prev,
      payments: [newPayment, ...prev.payments],
    }));
    return newPayment;
  }

  // --- Expenses ---
  public addExpense(expense: Omit<Expense, 'id' | 'created_at' | 'updated_at'>): Expense {
    const newExpense: Expense = {
      ...expense,
      id: `exp-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.updateData((prev) => ({
      ...prev,
      expenses: [newExpense, ...prev.expenses],
    }));
    return newExpense;
  }

  public deleteExpense(id: string): void {
    this.updateData((prev) => ({
      ...prev,
      expenses: prev.expenses.filter((e) => e.id !== id),
    }));
  }

  public addExpenseCategory(name: string): ExpenseCategory {
    const newCat: ExpenseCategory = {
      id: `cat-${Date.now()}`,
      name: name.trim(),
      is_default: false,
    };
    this.updateData((prev) => ({
      ...prev,
      expense_categories: [...prev.expense_categories, newCat],
    }));
    return newCat;
  }

  // --- Weight Loss ---
  public addWeightLoss(loss: Omit<WeightLoss, 'id' | 'created_at' | 'updated_at'>): WeightLoss {
    const newLoss: WeightLoss = {
      ...loss,
      id: `wl-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.updateData((prev) => ({
      ...prev,
      weight_losses: [newLoss, ...prev.weight_losses],
    }));
    return newLoss;
  }

  // --- Daily Rates ---
  public setDailyRate(productId: string, date: string, sellingRatePerKg: number): void {
    this.updateData((prev) => {
      const filtered = prev.daily_rates.filter(
        (dr) => !(dr.product_id === productId && dr.rate_date === date)
      );
      const newRate: DailyRate = {
        id: `dr-${Date.now()}`,
        product_id: productId,
        rate_date: date,
        selling_rate_per_kg: sellingRatePerKg,
        created_at: new Date().toISOString(),
      };
      return {
        ...prev,
        daily_rates: [...filtered, newRate],
      };
    });
  }

  public getDailyRate(productId: string, date: string): number | null {
    const found = this.data.daily_rates.find(
      (dr) => dr.product_id === productId && dr.rate_date === date
    );
    return found ? found.selling_rate_per_kg : null;
  }

  // --- Settings ---
  public updateSettings(settings: Partial<Settings>): void {
    this.updateData((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...settings },
    }));
  }

  // --- Export & Reset ---
  public exportDataJSON(): string {
    return JSON.stringify(this.data, null, 2);
  }

  public importDataJSON(jsonStr: string): boolean {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.products && parsed.settings) {
        this.updateData(() => parsed);
        return true;
      }
    } catch (e) {
      console.error('Import failed', e);
    }
    return false;
  }

  public resetToDemo(): void {
    const fresh = getDefaultStoreData();
    this.updateData(() => fresh);
  }
}

// Singleton instance
export const dataStore = new ERPDataStore();
