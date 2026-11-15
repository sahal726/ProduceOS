import {
  Purchase,
  Sale,
  Payment,
  Expense,
  WeightLoss,
  StockAdjustment,
  Farmer,
  Party,
  ProductStockInfo,
  LedgerEntry,
  DailyProfitReport,
  MonthlyProfitReport,
  CashBookSummary,
  Settings,
} from '@/types';

/**
 * 1 quintal = 100 kg
 */
export function kgToQuintal(kg: number): number {
  if (!kg || isNaN(kg)) return 0;
  return Number((kg / 100).toFixed(3));
}

export function quintalToKg(quintal: number): number {
  if (!quintal || isNaN(quintal)) return 0;
  return Number((quintal * 100).toFixed(3));
}

/**
 * Format quantity showing both kg and quintal equivalent
 * e.g. "520 kg (5.2 qtl)"
 */
export function formatQuantity(kg: number): string {
  const safeKg = Number((kg || 0).toFixed(2));
  const qtl = Number((safeKg / 100).toFixed(2));
  return `${safeKg.toLocaleString('en-IN')} kg (${qtl} qtl)`;
}

/**
 * Formats currency in Indian Rupee format (e.g. ₹1,25,000 or ₹1,25,000.50)
 */
export function formatCurrency(amount: number, showDecimals = false): string {
  const safeAmount = Number(amount || 0);
  const isNegative = safeAmount < 0;
  const absAmount = Math.abs(safeAmount);

  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: showDecimals ? 2 : (absAmount % 1 === 0 ? 0 : 2),
    maximumFractionDigits: 2,
  }).format(absAmount);

  return isNegative ? `-${formatted}` : formatted;
}

export function formatINR(amount: number): string {
  return formatCurrency(amount, false);
}

/**
 * Sorts array of objects by date ascending (YYYY-MM-DD) and then created_at
 */
export function sortByDateAsc<T extends { date: string; created_at?: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    const aTime = a.created_at || '';
    const bTime = b.created_at || '';
    return aTime.localeCompare(bTime);
  });
}

/**
 * Computes Weighted Average Cost (WAC) per product across chronological timeline.
 * Formula for purchases:
 *   new_avg = (existing_stock_value + new_purchase_value) / (existing_qty + new_qty)
 * If existing_qty <= 0:
 *   new_avg = purchase_rate
 * Reductions (sales, losses) reduce stock quantity but do not change average cost.
 */
export function computeProductCostHistory(
  productId: string,
  purchases: Purchase[],
  sales: Sale[],
  weightLosses: WeightLoss[] = [],
  stockAdjustments: StockAdjustment[] = []
): {
  currentStockKg: number;
  weightedAverageCostPerKg: number;
  costByDate: Map<string, number>;
  totalPurchasedKg: number;
  totalSoldKg: number;
  totalLossKg: number;
  totalAdjustedKg: number;
} {
  // Build unified chronological event stream
  type Event =
    | { type: 'purchase'; date: string; created_at: string; qty: number; rate: number }
    | { type: 'sale'; date: string; created_at: string; qty: number }
    | { type: 'loss'; date: string; created_at: string; qty: number }
    | { type: 'adjustment'; date: string; created_at: string; qty: number };

  const events: Event[] = [];

  for (const p of purchases) {
    for (const item of p.items) {
      if (item.product_id === productId) {
        events.push({
          type: 'purchase',
          date: p.date,
          created_at: p.created_at || p.date,
          qty: item.quantity_kg,
          rate: item.rate_per_kg,
        });
      }
    }
  }

  for (const s of sales) {
    for (const item of s.items) {
      if (item.product_id === productId) {
        events.push({
          type: 'sale',
          date: s.date,
          created_at: s.created_at || s.date,
          qty: item.quantity_kg,
        });
      }
    }
  }

  for (const l of weightLosses) {
    if (l.product_id === productId) {
      events.push({
        type: 'loss',
        date: l.date,
        created_at: l.created_at || l.date,
        qty: l.quantity_lost_kg,
      });
    }
  }

  for (const a of stockAdjustments) {
    if (a.product_id === productId) {
      events.push({
        type: 'adjustment',
        date: a.date,
        created_at: a.created_at || a.date,
        qty: a.adjustment_kg,
      });
    }
  }

  // Sort chronological
  events.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.created_at.localeCompare(b.created_at);
  });

  let currentStock = 0;
  let currentCost = 0;
  const costByDate = new Map<string, number>();

  let totalPurchased = 0;
  let totalSold = 0;
  let totalLoss = 0;
  let totalAdjusted = 0;

  for (const ev of events) {
    if (ev.type === 'purchase') {
      totalPurchased += ev.qty;
      const purchaseValue = ev.qty * ev.rate;
      if (currentStock <= 0) {
        currentStock = ev.qty;
        currentCost = ev.rate;
      } else {
        const existingValue = currentStock * currentCost;
        const newTotalQty = currentStock + ev.qty;
        currentCost = (existingValue + purchaseValue) / newTotalQty;
        currentStock = newTotalQty;
      }
    } else if (ev.type === 'sale') {
      totalSold += ev.qty;
      currentStock = Math.max(0, currentStock - ev.qty);
    } else if (ev.type === 'loss') {
      totalLoss += ev.qty;
      currentStock = Math.max(0, currentStock - ev.qty);
    } else if (ev.type === 'adjustment') {
      totalAdjusted += ev.qty;
      currentStock = Math.max(0, currentStock + ev.qty);
    }
    costByDate.set(ev.date, currentCost);
  }

  return {
    currentStockKg: Number(currentStock.toFixed(3)),
    weightedAverageCostPerKg: Number(currentCost.toFixed(2)),
    costByDate,
    totalPurchasedKg: Number(totalPurchased.toFixed(3)),
    totalSoldKg: Number(totalSold.toFixed(3)),
    totalLossKg: Number(totalLoss.toFixed(3)),
    totalAdjustedKg: Number(totalAdjusted.toFixed(3)),
  };
}

/**
 * Computes Stock summary for all products
 */
export function computeAllProductsStock(
  products: { id: string; name: string; min_stock_alert_kg?: number; is_active?: boolean }[],
  purchases: Purchase[],
  sales: Sale[],
  weightLosses: WeightLoss[] = [],
  stockAdjustments: StockAdjustment[] = []
): ProductStockInfo[] {
  return products.map((prod) => {
    const costInfo = computeProductCostHistory(prod.id, purchases, sales, weightLosses, stockAdjustments);
    const stockKg = costInfo.currentStockKg;
    const stockQtl = kgToQuintal(stockKg);
    const minAlert = prod.min_stock_alert_kg || 25;
    const stockValue = Number((stockKg * costInfo.weightedAverageCostPerKg).toFixed(2));

    return {
      product_id: prod.id,
      product_name: prod.name,
      total_purchased_kg: costInfo.totalPurchasedKg,
      total_sold_kg: costInfo.totalSoldKg,
      total_loss_kg: costInfo.totalLossKg,
      total_adjusted_kg: costInfo.totalAdjustedKg,
      current_stock_kg: stockKg,
      current_stock_quintal: stockQtl,
      weightedAverageCostPerKg: costInfo.weightedAverageCostPerKg,
      weighted_average_cost_per_kg: costInfo.weightedAverageCostPerKg,
      stock_value: stockValue,
      is_low_stock: stockKg <= minAlert,
      min_stock_alert_kg: minAlert,
    };
  });
}

/**
 * Farmer Ledger computation:
 * Running balance is the amount WE OWE the farmer (Payable).
 * - Opening balance payable starts the ledger
 * - Purchases increase payable (Credit to payable)
 * - Payments to farmer decrease payable (Debit to payable)
 */
export function computeFarmerLedger(
  farmer: Farmer,
  purchases: Purchase[],
  payments: Payment[]
): {
  entries: LedgerEntry[];
  closingBalancePayable: number;
  totalPurchased: number;
  totalPaid: number;
} {
  const entries: LedgerEntry[] = [];
  let runningBalance = farmer.opening_balance_payable || 0;

  if (farmer.opening_balance_payable) {
    entries.push({
      id: `open-${farmer.id}`,
      date: farmer.created_at ? farmer.created_at.slice(0, 10) : '2026-01-01',
      description: 'Opening Balance (Payable)',
      reference_type: 'opening',
      debit: 0,
      credit: farmer.opening_balance_payable,
      running_balance: runningBalance,
    });
  }

  // Purchases for this farmer
  const farmerPurchases = purchases.filter((p) => p.farmer_id === farmer.id);
  // Payments for this farmer (outward)
  const farmerPayments = payments.filter(
    (p) => p.entity_id === farmer.id && p.direction === 'out'
  );

  type RawItem =
    | { type: 'purchase'; p: Purchase; date: string; created_at: string }
    | { type: 'payment'; pay: Payment; date: string; created_at: string };

  const rawList: RawItem[] = [
    ...farmerPurchases.map((p) => ({
      type: 'purchase' as const,
      p,
      date: p.date,
      created_at: p.created_at || p.date,
    })),
    ...farmerPayments.map((pay) => ({
      type: 'payment' as const,
      pay,
      date: pay.date,
      created_at: pay.created_at || pay.date,
    })),
  ];

  rawList.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.created_at.localeCompare(b.created_at);
  });

  let totalPurchased = 0;
  let totalPaid = 0;

  for (const item of rawList) {
    if (item.type === 'purchase') {
      const p = item.p;
      totalPurchased += p.total_amount;
      // Purchase increases what we owe
      runningBalance += p.total_amount;
      const itemsDesc = p.items
        .map((i) => `${i.product_name} (${i.quantity_kg}kg @ ₹${i.rate_per_kg})`)
        .join(', ');

      entries.push({
        id: p.id,
        date: p.date,
        description: `Purchase: ${itemsDesc || 'Produce'}`,
        reference_type: 'purchase',
        reference_id: p.id,
        debit: 0,
        credit: p.total_amount,
        running_balance: runningBalance,
      });

      // If immediate payment was made at purchase time and not separately logged as a direct payment
      if (p.paid_amount > 0) {
        totalPaid += p.paid_amount;
        runningBalance -= p.paid_amount;
        entries.push({
          id: `pay-${p.id}`,
          date: p.date,
          description: `Paid at purchase (${p.payment_mode === 'cash' ? 'Cash' : 'Bank/UPI'})`,
          reference_type: 'payment',
          reference_id: p.id,
          debit: p.paid_amount,
          credit: 0,
          running_balance: runningBalance,
          mode: p.payment_mode,
        });
      }
    } else {
      const pay = item.pay;
      // Skip if this payment is already linked to a purchase where paid_amount was handled
      if (pay.purchase_id && farmerPurchases.some((fp) => fp.id === pay.purchase_id && fp.paid_amount === pay.amount)) {
        continue;
      }
      totalPaid += pay.amount;
      runningBalance -= pay.amount;
      entries.push({
        id: pay.id,
        date: pay.date,
        description: `Payment Made (${pay.payment_mode === 'cash' ? 'Cash' : 'Bank/UPI'})${pay.notes ? ': ' + pay.notes : ''}`,
        reference_type: 'payment',
        reference_id: pay.id,
        debit: pay.amount,
        credit: 0,
        running_balance: runningBalance,
        mode: pay.payment_mode,
      });
    }
  }

  return {
    entries,
    closingBalancePayable: Number(runningBalance.toFixed(2)),
    totalPurchased: Number(totalPurchased.toFixed(2)),
    totalPaid: Number(totalPaid.toFixed(2)),
  };
}

/**
 * Party Ledger computation:
 * Running balance is the amount PARTY OWES US (Receivable).
 * - Opening balance receivable starts the ledger
 * - Sales increase receivable (Debit to party receivable)
 * - Receipts from party decrease receivable (Credit to receivable)
 */
export function computePartyLedger(
  party: Party,
  sales: Sale[],
  payments: Payment[]
): {
  entries: LedgerEntry[];
  closingBalanceReceivable: number;
  totalBilled: number;
  totalReceived: number;
} {
  const entries: LedgerEntry[] = [];
  let runningBalance = party.opening_balance_receivable || 0;

  if (party.opening_balance_receivable) {
    entries.push({
      id: `open-${party.id}`,
      date: party.created_at ? party.created_at.slice(0, 10) : '2026-01-01',
      description: 'Opening Balance (Receivable)',
      reference_type: 'opening',
      debit: party.opening_balance_receivable,
      credit: 0,
      running_balance: runningBalance,
    });
  }

  const partySales = sales.filter((s) => s.party_id === party.id);
  const partyPayments = payments.filter(
    (p) => p.entity_id === party.id && p.direction === 'in'
  );

  type RawItem =
    | { type: 'sale'; s: Sale; date: string; created_at: string }
    | { type: 'payment'; pay: Payment; date: string; created_at: string };

  const rawList: RawItem[] = [
    ...partySales.map((s) => ({
      type: 'sale' as const,
      s,
      date: s.date,
      created_at: s.created_at || s.date,
    })),
    ...partyPayments.map((pay) => ({
      type: 'payment' as const,
      pay,
      date: pay.date,
      created_at: pay.created_at || pay.date,
    })),
  ];

  rawList.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.created_at.localeCompare(b.created_at);
  });

  let totalBilled = 0;
  let totalReceived = 0;

  for (const item of rawList) {
    if (item.type === 'sale') {
      const s = item.s;
      totalBilled += s.total_amount;
      runningBalance += s.total_amount;
      const itemsDesc = s.items
        .map((i) => `${i.product_name} (${i.quantity_kg}kg @ ₹${i.selling_rate_per_kg})`)
        .join(', ');

      entries.push({
        id: s.id,
        date: s.date,
        description: `Sale: ${itemsDesc || 'Produce'}`,
        reference_type: 'sale',
        reference_id: s.id,
        debit: s.total_amount,
        credit: 0,
        running_balance: runningBalance,
      });

      if (s.received_amount > 0) {
        totalReceived += s.received_amount;
        runningBalance -= s.received_amount;
        entries.push({
          id: `rec-${s.id}`,
          date: s.date,
          description: `Received at sale (${s.payment_mode === 'cash' ? 'Cash' : 'Bank/UPI'})`,
          reference_type: 'payment',
          reference_id: s.id,
          debit: 0,
          credit: s.received_amount,
          running_balance: runningBalance,
          mode: s.payment_mode,
        });
      }
    } else {
      const pay = item.pay;
      if (pay.sale_id && partySales.some((ps) => ps.id === pay.sale_id && ps.received_amount === pay.amount)) {
        continue;
      }
      totalReceived += pay.amount;
      runningBalance -= pay.amount;
      entries.push({
        id: pay.id,
        date: pay.date,
        description: `Payment Received (${pay.payment_mode === 'cash' ? 'Cash' : 'Bank/UPI'})${pay.notes ? ': ' + pay.notes : ''}`,
        reference_type: 'payment',
        reference_id: pay.id,
        debit: 0,
        credit: pay.amount,
        running_balance: runningBalance,
        mode: pay.payment_mode,
      });
    }
  }

  return {
    entries,
    closingBalanceReceivable: Number(runningBalance.toFixed(2)),
    totalBilled: Number(totalBilled.toFixed(2)),
    totalReceived: Number(totalReceived.toFixed(2)),
  };
}

/**
 * MODULE 7: DAILY PROFIT (excludes expenses)
 * Daily profit = sales revenue − cost of goods sold − shrinkage loss (weight loss value) for that day.
 */
export function computeDailyProfit(
  date: string,
  sales: Sale[],
  purchases: Purchase[],
  weightLosses: WeightLoss[]
): DailyProfitReport {
  const daySales = sales.filter((s) => s.date === date);
  const dayLosses = weightLosses.filter((l) => l.date === date);

  let totalSales = 0;
  let totalCogs = 0;

  // Breakdown by product
  const itemMap = new Map<
    string,
    { product_id: string; product_name: string; qty: number; sales: number; cogs: number }
  >();

  for (const s of daySales) {
    for (const item of s.items) {
      totalSales += item.total_amount;
      const cogs = item.cogs_amount || item.quantity_kg * item.cost_rate_per_kg;
      totalCogs += cogs;

      const existing = itemMap.get(item.product_id) || {
        product_id: item.product_id,
        product_name: item.product_name,
        qty: 0,
        sales: 0,
        cogs: 0,
      };
      existing.qty += item.quantity_kg;
      existing.sales += item.total_amount;
      existing.cogs += cogs;
      itemMap.set(item.product_id, existing);
    }
  }

  const shrinkageLossValue = dayLosses.reduce((acc, l) => acc + l.total_loss_value, 0);
  const grossProfit = totalSales - totalCogs;
  const dailyProfit = grossProfit - shrinkageLossValue;

  const items = Array.from(itemMap.values()).map((it) => {
    const profit = it.sales - it.cogs;
    const profitPerKg = it.qty > 0 ? profit / it.qty : 0;
    return {
      product_id: it.product_id,
      product_name: it.product_name,
      quantity_sold_kg: Number(it.qty.toFixed(2)),
      sales_amount: Number(it.sales.toFixed(2)),
      cogs_amount: Number(it.cogs.toFixed(2)),
      profit: Number(profit.toFixed(2)),
      profit_per_kg: Number(profitPerKg.toFixed(2)),
    };
  });

  return {
    date,
    total_sales: Number(totalSales.toFixed(2)),
    total_cogs: Number(totalCogs.toFixed(2)),
    gross_profit: Number(grossProfit.toFixed(2)),
    shrinkage_loss_value: Number(shrinkageLossValue.toFixed(2)),
    daily_profit: Number(dailyProfit.toFixed(2)),
    items,
  };
}

/**
 * MODULE 7: MONTHLY PROFIT (includes expenses)
 * Monthly net profit = total sales − total COGS − total shrinkage loss − total expenses for the month.
 */
export function computeMonthlyProfit(
  yearMonth: string, // YYYY-MM
  sales: Sale[],
  purchases: Purchase[],
  weightLosses: WeightLoss[],
  expenses: Expense[]
): MonthlyProfitReport {
  const monthSales = sales.filter((s) => s.date.startsWith(yearMonth));
  const monthLosses = weightLosses.filter((l) => l.date.startsWith(yearMonth));
  const monthExpenses = expenses.filter((e) => e.date.startsWith(yearMonth));

  let totalSales = 0;
  let totalCogs = 0;

  for (const s of monthSales) {
    for (const item of s.items) {
      totalSales += item.total_amount;
      totalCogs += item.cogs_amount || item.quantity_kg * item.cost_rate_per_kg;
    }
  }

  const shrinkageLossValue = monthLosses.reduce((acc, l) => acc + l.total_loss_value, 0);
  const grossProfit = totalSales - totalCogs;

  const totalExpenses = monthExpenses.reduce((acc, e) => acc + e.amount, 0);
  const netProfit = grossProfit - shrinkageLossValue - totalExpenses;

  // Expenses grouped by category
  const expenseCatMap = new Map<string, number>();
  for (const exp of monthExpenses) {
    const cat = exp.category_name || 'Other';
    expenseCatMap.set(cat, (expenseCatMap.get(cat) || 0) + exp.amount);
  }
  const expensesByCategory = Array.from(expenseCatMap.entries()).map(([category, amount]) => ({
    category,
    amount: Number(amount.toFixed(2)),
  }));

  // Day by day breakdown for chart
  const dayMap = new Map<string, { sales: number; cogs: number; shrinkage: number }>();
  for (const s of monthSales) {
    const d = s.date;
    const entry = dayMap.get(d) || { sales: 0, cogs: 0, shrinkage: 0 };
    entry.sales += s.total_amount;
    for (const item of s.items) {
      entry.cogs += item.cogs_amount || item.quantity_kg * item.cost_rate_per_kg;
    }
    dayMap.set(d, entry);
  }
  for (const l of monthLosses) {
    const d = l.date;
    const entry = dayMap.get(d) || { sales: 0, cogs: 0, shrinkage: 0 };
    entry.shrinkage += l.total_loss_value;
    dayMap.set(d, entry);
  }

  const dailyBreakdown = Array.from(dayMap.entries())
    .map(([date, val]) => ({
      date,
      sales: Number(val.sales.toFixed(2)),
      cogs: Number(val.cogs.toFixed(2)),
      shrinkage: Number(val.shrinkage.toFixed(2)),
      daily_profit: Number((val.sales - val.cogs - val.shrinkage).toFixed(2)),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Compute previous month comparison
  const [yearStr, monthStr] = yearMonth.split('-');
  const prevMonthDate = new Date(Number(yearStr), Number(monthStr) - 2, 1);
  const prevYearMonth = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;

  const prevSales = sales.filter((s) => s.date.startsWith(prevYearMonth));
  const prevLosses = weightLosses.filter((l) => l.date.startsWith(prevYearMonth));
  const prevExpenses = expenses.filter((e) => e.date.startsWith(prevYearMonth));

  let prevTotalSales = 0;
  let prevTotalCogs = 0;
  for (const s of prevSales) {
    for (const item of s.items) {
      prevTotalSales += item.total_amount;
      prevTotalCogs += item.cogs_amount || item.quantity_kg * item.cost_rate_per_kg;
    }
  }
  const prevShrinkage = prevLosses.reduce((acc, l) => acc + l.total_loss_value, 0);
  const prevGross = prevTotalSales - prevTotalCogs;
  const prevExpenseTotal = prevExpenses.reduce((acc, e) => acc + e.amount, 0);
  const prevNet = prevGross - prevShrinkage - prevExpenseTotal;

  return {
    month: yearMonth,
    total_sales: Number(totalSales.toFixed(2)),
    total_cogs: Number(totalCogs.toFixed(2)),
    gross_profit: Number(grossProfit.toFixed(2)),
    shrinkage_loss_value: Number(shrinkageLossValue.toFixed(2)),
    total_expenses: Number(totalExpenses.toFixed(2)),
    net_profit: Number(netProfit.toFixed(2)),
    expenses_by_category: expensesByCategory,
    daily_breakdown: dailyBreakdown,
    previous_month: {
      total_sales: Number(prevTotalSales.toFixed(2)),
      gross_profit: Number(prevGross.toFixed(2)),
      net_profit: Number(prevNet.toFixed(2)),
    },
  };
}

/**
 * MODULE 8: CASH BOOK
 * Cash in hand = opening cash balance + cash received − cash paid out (including cash expenses).
 * Bank balance = opening bank balance + bank received − bank paid out (including bank expenses).
 */
export function computeCashBook(
  date: string,
  settings: Settings,
  purchases: Purchase[],
  sales: Sale[],
  payments: Payment[],
  expenses: Expense[]
): CashBookSummary {
  // Compute running balance up to the start of 'date' to find daily opening balances
  let runningCash = settings.opening_cash_balance || 0;
  let runningBank = settings.opening_bank_balance || 0;

  type LedgerCashItem = {
    id: string;
    date: string;
    created_at: string;
    type: 'purchase_payment' | 'sale_receipt' | 'direct_payment' | 'expense' | 'opening';
    description: string;
    mode: 'cash' | 'bank';
    direction: 'in' | 'out';
    amount: number;
  };

  const allItems: LedgerCashItem[] = [];

  // 1. Purchases with instant paid_amount
  for (const p of purchases) {
    if (p.paid_amount > 0) {
      allItems.push({
        id: `p-pay-${p.id}`,
        date: p.date,
        created_at: p.created_at || p.date,
        type: 'purchase_payment',
        description: `Paid to ${p.farmer_name} (Purchase)`,
        mode: p.payment_mode,
        direction: 'out',
        amount: p.paid_amount,
      });
    }
  }

  // 2. Sales with instant received_amount
  for (const s of sales) {
    if (s.received_amount > 0) {
      allItems.push({
        id: `s-rec-${s.id}`,
        date: s.date,
        created_at: s.created_at || s.date,
        type: 'sale_receipt',
        description: `Received from ${s.party_name} (Sale)`,
        mode: s.payment_mode,
        direction: 'in',
        amount: s.received_amount,
      });
    }
  }

  // 3. Direct Payments made or received (excluding those linked to purchase/sale if already counted)
  for (const pay of payments) {
    if (pay.purchase_id || pay.sale_id) continue; // avoid double counting
    allItems.push({
      id: pay.id,
      date: pay.date,
      created_at: pay.created_at || pay.date,
      type: 'direct_payment',
      description: pay.direction === 'in' ? `Received from ${pay.entity_name}` : `Paid to ${pay.entity_name}`,
      mode: pay.payment_mode,
      direction: pay.direction,
      amount: pay.amount,
    });
  }

  // 4. Expenses
  for (const exp of expenses) {
    allItems.push({
      id: exp.id,
      date: exp.date,
      created_at: exp.created_at || exp.date,
      type: 'expense',
      description: `Expense: ${exp.category_name}${exp.notes ? ' (' + exp.notes + ')' : ''}`,
      mode: exp.payment_mode,
      direction: 'out',
      amount: exp.amount,
    });
  }

  // Sort chronological
  allItems.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.created_at.localeCompare(b.created_at);
  });

  // Calculate opening balance before the target date
  for (const it of allItems) {
    if (it.date < date) {
      if (it.mode === 'cash') {
        if (it.direction === 'in') runningCash += it.amount;
        else runningCash -= it.amount;
      } else {
        if (it.direction === 'in') runningBank += it.amount;
        else runningBank -= it.amount;
      }
    }
  }

  const openingCash = runningCash;
  const openingBank = runningBank;

  let cashIn = 0;
  let cashOut = 0;
  let bankIn = 0;
  let bankOut = 0;

  const dayEntries: CashBookSummary['entries'] = [];

  for (const it of allItems) {
    if (it.date === date) {
      const amountIn = it.direction === 'in' ? it.amount : 0;
      const amountOut = it.direction === 'out' ? it.amount : 0;

      if (it.mode === 'cash') {
        cashIn += amountIn;
        cashOut += amountOut;
        runningCash = runningCash + amountIn - amountOut;
      } else {
        bankIn += amountIn;
        bankOut += amountOut;
        runningBank = runningBank + amountIn - amountOut;
      }

      dayEntries.push({
        id: it.id,
        time: it.created_at.slice(11, 16) || '--:--',
        type: it.type,
        description: it.description,
        mode: it.mode,
        amount_in: amountIn,
        amount_out: amountOut,
        running_cash: runningCash,
        running_bank: runningBank,
      });
    }
  }

  return {
    date,
    opening_cash: Number(openingCash.toFixed(2)),
    opening_bank: Number(openingBank.toFixed(2)),
    cash_in: Number(cashIn.toFixed(2)),
    cash_out: Number(cashOut.toFixed(2)),
    closing_cash: Number(runningCash.toFixed(2)),
    bank_in: Number(bankIn.toFixed(2)),
    bank_out: Number(bankOut.toFixed(2)),
    closing_bank: Number(runningBank.toFixed(2)),
    entries: dayEntries,
  };
}

/**
 * Computes Global Overall Cash in hand & Bank balance across all time
 */
export function computeTotalCurrentFunds(
  settings: Settings,
  purchases: Purchase[],
  sales: Sale[],
  payments: Payment[],
  expenses: Expense[]
): { cashInHand: number; bankBalance: number } {
  let cash = settings.opening_cash_balance || 0;
  let bank = settings.opening_bank_balance || 0;

  // Purchases
  for (const p of purchases) {
    if (p.paid_amount > 0) {
      if (p.payment_mode === 'cash') cash -= p.paid_amount;
      else bank -= p.paid_amount;
    }
  }

  // Sales
  for (const s of sales) {
    if (s.received_amount > 0) {
      if (s.payment_mode === 'cash') cash += s.received_amount;
      else bank += s.received_amount;
    }
  }

  // Direct payments
  for (const pay of payments) {
    if (pay.purchase_id || pay.sale_id) continue;
    if (pay.payment_mode === 'cash') {
      if (pay.direction === 'in') cash += pay.amount;
      else cash -= pay.amount;
    } else {
      if (pay.direction === 'in') bank += pay.amount;
      else bank -= pay.amount;
    }
  }

  // Expenses
  for (const exp of expenses) {
    if (exp.payment_mode === 'cash') cash -= exp.amount;
    else bank -= exp.amount;
  }

  return {
    cashInHand: Number(cash.toFixed(2)),
    bankBalance: Number(bank.toFixed(2)),
  };
}
