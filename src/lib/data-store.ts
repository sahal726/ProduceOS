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
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured, getSupabaseClient, isConfigured } from './supabase';

const STORAGE_KEY = 'produce_os_live_data_v1';
const DELETED_IDS_KEY = 'produce_os_deleted_ids_v1';
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

export const INITIAL_FARMERS: Farmer[] = [];

export const INITIAL_PARTIES: Party[] = [];

export const INITIAL_SETTINGS: Settings = {
  shop_name: 'ProduceOS',
  owner_name: 'Umair',
  phone: '+91 98470 12345',
  address: 'Kerala, India',
  opening_cash_balance: 0,
  opening_bank_balance: 0,
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
  return {
    products: INITIAL_PRODUCTS,
    farmers: [],
    parties: [],
    purchases: [],
    sales: [],
    payments: [],
    expenses: [],
    expense_categories: INITIAL_EXPENSE_CATEGORIES,
    weight_losses: [],
    stock_adjustments: [],
    daily_rates: [],
    settings: INITIAL_SETTINGS,
    last_used_product_id: 'prod-coconut',
  };
}

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'unconfigured';

/**
 * Merge two lists of entities by ID without ever discarding newly added local items.
 */
export function mergeEntityLists<T extends { id: string; updated_at?: string; created_at?: string }>(
  localList: T[] = [],
  cloudList: T[] = [],
  deletedIds: Set<string> = new Set()
): T[] {
  const map = new Map<string, T>();

  // 1. Add cloud items first (skipping anything in deletedIds)
  for (const c of cloudList || []) {
    if (c && c.id && !deletedIds.has(c.id)) {
      map.set(c.id, c);
    }
  }

  // 2. Add or update with local items (skipping anything in deletedIds)
  // If local item does NOT exist in cloud, KEEP IT!
  // If exists in both, compare timestamps and keep the newer one.
  for (const l of localList || []) {
    if (l && l.id && !deletedIds.has(l.id)) {
      const existing = map.get(l.id);
      if (!existing) {
        map.set(l.id, l);
      } else {
        const localTime = new Date(l.updated_at || l.created_at || 0).getTime();
        const cloudTime = new Date(existing.updated_at || existing.created_at || 0).getTime();
        if (localTime >= cloudTime) {
          map.set(l.id, l);
        }
      }
    }
  }

  return Array.from(map.values());
}

/**
 * Merges local store data with cloud data non-destructively.
 */
export function mergeStoreData(
  local: ERPStoreData,
  cloud: ERPStoreData,
  deletedIds: Set<string> = new Set()
): ERPStoreData {
  return {
    ...getDefaultStoreData(),
    ...cloud,
    ...local,
    products: mergeEntityLists(local.products, cloud.products, deletedIds).length
      ? mergeEntityLists(local.products, cloud.products, deletedIds)
      : INITIAL_PRODUCTS,
    farmers: mergeEntityLists(local.farmers, cloud.farmers, deletedIds),
    parties: mergeEntityLists(local.parties, cloud.parties, deletedIds),
    purchases: mergeEntityLists(local.purchases, cloud.purchases, deletedIds).sort((a, b) =>
      (b.created_at || b.date || '').localeCompare(a.created_at || a.date || '')
    ),
    sales: mergeEntityLists(local.sales, cloud.sales, deletedIds).sort((a, b) =>
      (b.created_at || b.date || '').localeCompare(a.created_at || a.date || '')
    ),
    payments: mergeEntityLists(local.payments, cloud.payments, deletedIds).sort((a, b) =>
      (b.created_at || b.date || '').localeCompare(a.created_at || a.date || '')
    ),
    expenses: mergeEntityLists(local.expenses, cloud.expenses, deletedIds).sort((a, b) =>
      (b.created_at || b.date || '').localeCompare(a.created_at || a.date || '')
    ),
    expense_categories: mergeEntityLists(
      local.expense_categories,
      cloud.expense_categories,
      deletedIds
    ).length
      ? mergeEntityLists(local.expense_categories, cloud.expense_categories, deletedIds)
      : INITIAL_EXPENSE_CATEGORIES,
    weight_losses: mergeEntityLists(local.weight_losses, cloud.weight_losses, deletedIds),
    stock_adjustments: mergeEntityLists(local.stock_adjustments, cloud.stock_adjustments, deletedIds),
    daily_rates: mergeEntityLists(local.daily_rates, cloud.daily_rates, deletedIds),
    settings: {
      ...INITIAL_SETTINGS,
      ...(cloud.settings || {}),
      ...(local.settings || {}),
    },
    last_used_product_id: local.last_used_product_id || cloud.last_used_product_id || 'prod-coconut',
  };
}

class ERPDataStore {
  private data: ERPStoreData;
  private deletedIds: Set<string>;
  private listeners: Set<() => void> = new Set();
  private syncStatus: SyncStatus = isConfigured() ? 'idle' : 'unconfigured';
  private syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private initialSyncDone: boolean = false;
  private lastSyncError: string | null = null;
  private realtimeChannel: RealtimeChannel | null = null;
  private hasPendingSync: boolean = false;

  constructor() {
    this.deletedIds = this.loadDeletedIds();
    this.data = this.loadFromStorage();
    if (typeof window !== 'undefined') {
      // Background initial sync
      setTimeout(() => {
        this.initCloudSync();
      }, 300);

      window.addEventListener('online', async () => {
        console.log('Online detected: syncing with cloud...');
        if (this.hasPendingSync) {
          await this.pushToCloud();
        }
        await this.pullFromCloud();
      });

      window.addEventListener('focus', async () => {
        if (isConfigured()) {
          if (this.hasPendingSync) {
            await this.pushToCloud();
          }
          await this.pullFromCloud();
        }
      });

      // Background poll every 20s to keep all devices synchronized
      setInterval(() => {
        if (typeof document !== 'undefined' && !document.hidden && isConfigured()) {
          this.pullFromCloud();
        }
      }, 20000);
    }
  }

  private loadDeletedIds(): Set<string> {
    if (typeof window === 'undefined') return new Set();
    try {
      const stored = localStorage.getItem(DELETED_IDS_KEY);
      if (stored) {
        const arr = JSON.parse(stored);
        if (Array.isArray(arr)) return new Set(arr);
      }
    } catch (e) {
      // ignore
    }
    return new Set();
  }

  private saveDeletedIds(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(Array.from(this.deletedIds)));
    } catch (e) {
      // ignore
    }
  }

  private recordDeletion(id: string): void {
    this.deletedIds.add(id);
    this.saveDeletedIds();
  }

  private initRealtimeSync(): void {
    if (typeof window === 'undefined') return;
    const client = getSupabaseClient();
    if (!client) return;

    if (this.realtimeChannel) {
      try {
        client.removeChannel(this.realtimeChannel);
      } catch (e) {
        // ignore
      }
      this.realtimeChannel = null;
    }

    try {
      this.realtimeChannel = client
        .channel('erp_store_live')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'erp_store', filter: 'id=eq.shop_main' },
          (payload) => {
            const row = payload.new as { data?: ERPStoreData } | null;
            if (row && row.data && typeof row.data === 'object' && Object.keys(row.data).length > 2) {
              const cloudData = row.data;
              // Non-destructive merge preserves local additions
              const merged = mergeStoreData(this.data, cloudData, this.deletedIds);
              this.data = merged;
              if (typeof window !== 'undefined') {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
              }
              this.setSyncStatus('synced');
              this.notifyListeners();
            }
          }
        )
        .subscribe();
    } catch (e) {
      console.warn('Realtime subscription not active, using polling fallback', e);
    }
  }

  private async initCloudSync() {
    if (this.initialSyncDone) return;
    this.initialSyncDone = true;
    if (isConfigured()) {
      await this.pullFromCloud();
    }
  }

  public getSyncStatus(): SyncStatus {
    return this.syncStatus;
  }

  public getLastSyncError(): string | null {
    return this.lastSyncError;
  }

  private setSyncStatus(status: SyncStatus): void {
    this.syncStatus = status;
    this.notifyListeners();
  }

  public async pullFromCloud(): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) {
      this.setSyncStatus('unconfigured');
      this.lastSyncError = 'Supabase credentials not configured';
      return false;
    }
    try {
      this.setSyncStatus('syncing');
      const { data, error } = await client
        .from('erp_store')
        .select('data, updated_at')
        .eq('id', 'shop_main')
        .maybeSingle();

      if (error) {
        console.error('Supabase pull error:', error);
        this.lastSyncError = error.message || JSON.stringify(error);
        this.setSyncStatus('error');
        return false;
      }

      const hasCloudData =
        data &&
        data.data &&
        typeof data.data === 'object' &&
        Object.keys(data.data).length > 2;

      if (hasCloudData) {
        const cloudData = data.data as ERPStoreData;
        
        // Intelligent non-destructive merge: local items are NEVER discarded
        const merged = mergeStoreData(this.data, cloudData, this.deletedIds);

        // Check if local has items that were NOT yet in cloud
        const hadLocalOnlyPurchases = this.data.purchases.some(
          (lp) => !cloudData.purchases?.some((cp) => cp.id === lp.id)
        );
        const hadLocalOnlySales = this.data.sales.some(
          (ls) => !cloudData.sales?.some((cs) => cs.id === ls.id)
        );
        const hadLocalOnlyPayments = this.data.payments.some(
          (lpay) => !cloudData.payments?.some((cpay) => cpay.id === lpay.id)
        );
        const shouldPushMergedToCloud =
          this.hasPendingSync || hadLocalOnlyPurchases || hadLocalOnlySales || hadLocalOnlyPayments;

        this.data = merged;
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
        }
        this.lastSyncError = null;
        this.setSyncStatus('synced');
        this.initRealtimeSync();
        this.notifyListeners();

        // If local had unsynced items, push the merged state to cloud immediately
        if (shouldPushMergedToCloud) {
          await this.pushToCloud();
        }

        return true;
      } else {
        // Cloud has empty placeholder `{}`: push current local state to cloud!
        return await this.pushToCloud();
      }
    } catch (err: unknown) {
      console.error('Failed to sync from Supabase', err);
      this.lastSyncError = err instanceof Error ? err.message : 'Connection failed';
      this.setSyncStatus('error');
      return false;
    }
  }

  public async pushToCloud(): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) {
      this.setSyncStatus('unconfigured');
      this.lastSyncError = 'Supabase credentials not configured';
      return false;
    }
    try {
      this.setSyncStatus('syncing');
      const { error } = await client
        .from('erp_store')
        .upsert({
          id: 'shop_main',
          data: this.data,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Supabase push error:', error);
        this.lastSyncError = error.message || JSON.stringify(error);
        this.setSyncStatus('error');
        // Auto-retry in 5 seconds
        setTimeout(() => {
          if (this.hasPendingSync && isConfigured()) {
            this.pushToCloud();
          }
        }, 5000);
        return false;
      }

      this.hasPendingSync = false;
      this.lastSyncError = null;
      this.setSyncStatus('synced');
      this.initRealtimeSync();
      return true;
    } catch (err: unknown) {
      console.error('Failed to push to Supabase', err);
      this.lastSyncError = err instanceof Error ? err.message : 'Connection failed';
      this.setSyncStatus('error');
      setTimeout(() => {
        if (this.hasPendingSync && isConfigured()) {
          this.pushToCloud();
        }
      }, 5000);
      return false;
    }
  }

  private scheduleCloudSync(): void {
    if (!isConfigured()) return;
    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
    }
    this.syncDebounceTimer = setTimeout(() => {
      this.pushToCloud();
    }, 400);
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
    this.hasPendingSync = true;
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
    this.recordDeletion(id);
    this.updateData((prev) => ({
      ...prev,
      purchases: prev.purchases.filter((p) => p.id !== id),
    }));
  }

  public updatePurchase(id: string, updates: Partial<Purchase>): void {
    this.updateData((prev) => ({
      ...prev,
      purchases: prev.purchases.map((p) => {
        if (p.id !== id) return p;
        const updated = { ...p, ...updates, updated_at: new Date().toISOString() };
        if (updates.paid_amount !== undefined || updates.total_amount !== undefined) {
          const tot = updates.total_amount !== undefined ? updates.total_amount : p.total_amount;
          const paid = updates.paid_amount !== undefined ? updates.paid_amount : p.paid_amount;
          updated.balance_payable = Math.max(0, tot - paid);
        }
        return updated;
      }),
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
    this.recordDeletion(id);
    this.updateData((prev) => ({
      ...prev,
      sales: prev.sales.filter((s) => s.id !== id),
    }));
  }

  public updateSale(id: string, updates: Partial<Sale>): void {
    this.updateData((prev) => ({
      ...prev,
      sales: prev.sales.map((s) => {
        if (s.id !== id) return s;
        const updated = { ...s, ...updates, updated_at: new Date().toISOString() };
        if (updates.received_amount !== undefined || updates.total_amount !== undefined) {
          const tot = updates.total_amount !== undefined ? updates.total_amount : s.total_amount;
          const rec = updates.received_amount !== undefined ? updates.received_amount : s.received_amount;
          updated.balance_receivable = Math.max(0, tot - rec);
        }
        return updated;
      }),
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

  public updatePayment(id: string, updates: Partial<Payment>): void {
    this.updateData((prev) => ({
      ...prev,
      payments: prev.payments.map((p) =>
        p.id === id ? { ...p, ...updates, updated_at: new Date().toISOString() } : p
      ),
    }));
  }

  public deletePayment(id: string): void {
    this.recordDeletion(id);
    this.updateData((prev) => ({
      ...prev,
      payments: prev.payments.filter((p) => p.id !== id),
    }));
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
    this.recordDeletion(id);
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

  public deleteWeightLoss(id: string): void {
    this.recordDeletion(id);
    this.updateData((prev) => ({
      ...prev,
      weight_losses: prev.weight_losses.filter((wl) => wl.id !== id),
    }));
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

  public async clearAllForLiveTesting(): Promise<boolean> {
    const clean = getDefaultStoreData();
    this.data = clean;
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
      localStorage.removeItem('shop_erp_data_v1');
    }
    this.notifyListeners();
    if (isConfigured()) {
      return await this.pushToCloud();
    }
    return true;
  }
}

// Singleton instance
export const dataStore = new ERPDataStore();
