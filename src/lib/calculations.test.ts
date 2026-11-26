import { describe, it, expect } from 'vitest';
import {
  kgToQuintal,
  quintalToKg,
  formatQuantity,
  formatCurrency,
  computeProductCostHistory,
  computeFarmerLedger,
  computePartyLedger,
  computeDailyProfit,
  computeMonthlyProfit,
  computeCashBook,
  computeTotalCurrentFunds,
} from './calculations';
import { Farmer, Party, Purchase, Sale, Payment, Expense, WeightLoss, Settings } from '@/types';

describe('Unit Conversions & Formats', () => {
  it('converts kg to quintal correctly (1 qtl = 100 kg)', () => {
    expect(kgToQuintal(100)).toBe(1);
    expect(kgToQuintal(520)).toBe(5.2);
    expect(kgToQuintal(12.5)).toBe(0.125);
    expect(kgToQuintal(0)).toBe(0);
  });

  it('converts quintal to kg correctly', () => {
    expect(quintalToKg(1)).toBe(100);
    expect(quintalToKg(5.2)).toBe(520);
    expect(quintalToKg(0.25)).toBe(25);
  });

  it('formats quantity in kg', () => {
    expect(formatQuantity(520)).toBe('520 kg');
    expect(formatQuantity(100)).toBe('100 kg');
  });

  it('formats currency in Indian Rupees format', () => {
    const formatted = formatCurrency(125000);
    expect(formatted).toContain('1,25,000');
    expect(formatted).toContain('₹');
  });
});

describe('Weighted Average Cost (WAC) per Product', () => {
  it('calculates weighted average cost across multiple purchases at different rates', () => {
    const productId = 'prod-1';
    // Purchase 1: 100 kg @ ₹50 = ₹5,000
    // Purchase 2: 200 kg @ ₹80 = ₹16,000
    // Total: 300 kg, total cost = ₹21,000 => avg = 21000 / 300 = ₹70/kg
    const purchases: Purchase[] = [
      {
        id: 'p1',
        date: '2026-11-01',
        created_at: '2026-11-01T10:00:00Z',
        farmer_id: 'f1',
        farmer_name: 'Rajan',
        total_amount: 5000,
        paid_amount: 5000,
        payment_mode: 'cash',
        balance_payable: 0,
        items: [
          {
            id: 'pi1',
            purchase_id: 'p1',
            product_id: productId,
            product_name: 'Coconut',
            quantity_kg: 100,
            rate_per_kg: 50,
            total_amount: 5000,
          },
        ],
      },
      {
        id: 'p2',
        date: '2026-11-02',
        created_at: '2026-11-02T10:00:00Z',
        farmer_id: 'f2',
        farmer_name: 'Moidu',
        total_amount: 16000,
        paid_amount: 10000,
        payment_mode: 'bank',
        balance_payable: 6000,
        items: [
          {
            id: 'pi2',
            purchase_id: 'p2',
            product_id: productId,
            product_name: 'Coconut',
            quantity_kg: 200,
            rate_per_kg: 80,
            total_amount: 16000,
          },
        ],
      },
    ];

    const sales: Sale[] = [];
    const costInfo = computeProductCostHistory(productId, purchases, sales);

    expect(costInfo.currentStockKg).toBe(300);
    expect(costInfo.weightedAverageCostPerKg).toBe(70);
  });

  it('keeps average cost unchanged when stock is sold, reducing only stock quantity', () => {
    const productId = 'prod-1';
    const purchases: Purchase[] = [
      {
        id: 'p1',
        date: '2026-11-01',
        created_at: '2026-11-01T10:00:00Z',
        farmer_id: 'f1',
        farmer_name: 'Rajan',
        total_amount: 10000,
        paid_amount: 10000,
        payment_mode: 'cash',
        balance_payable: 0,
        items: [
          {
            id: 'pi1',
            purchase_id: 'p1',
            product_id: productId,
            product_name: 'Coconut',
            quantity_kg: 100,
            rate_per_kg: 100,
            total_amount: 10000,
          },
        ],
      },
    ];

    const sales: Sale[] = [
      {
        id: 's1',
        date: '2026-11-02',
        created_at: '2026-11-02T11:00:00Z',
        party_id: 'party-1',
        party_name: 'Malabar Traders',
        total_amount: 6000,
        received_amount: 6000,
        payment_mode: 'cash',
        balance_receivable: 0,
        total_cogs: 4000,
        items: [
          {
            id: 'si1',
            sale_id: 's1',
            product_id: productId,
            product_name: 'Coconut',
            quantity_kg: 40,
            selling_rate_per_kg: 150,
            total_amount: 6000,
            cost_rate_per_kg: 100,
            cogs_amount: 4000,
          },
        ],
      },
    ];

    const costInfo = computeProductCostHistory(productId, purchases, sales);
    expect(costInfo.currentStockKg).toBe(60); // 100 - 40 = 60
    expect(costInfo.weightedAverageCostPerKg).toBe(100);
  });
});

describe('Ledger Balances', () => {
  it('computes Farmer ledger running payable correctly', () => {
    const farmer: Farmer = {
      id: 'f1',
      name: 'Thomas Kutty',
      opening_balance_payable: 1000,
      is_active: true,
      created_at: '2026-11-01T08:00:00Z',
      updated_at: '2026-11-01T08:00:00Z',
    };

    // Purchase ₹4,000, paid ₹2,500 now => balance adds ₹1,500
    const purchases: Purchase[] = [
      {
        id: 'p1',
        date: '2026-11-02',
        created_at: '2026-11-02T10:00:00Z',
        farmer_id: 'f1',
        farmer_name: 'Thomas Kutty',
        total_amount: 4000,
        paid_amount: 2500,
        payment_mode: 'cash',
        balance_payable: 1500,
        items: [
          {
            id: 'pi1',
            purchase_id: 'p1',
            product_id: 'p-1',
            product_name: 'Kotta Adakka',
            quantity_kg: 10,
            rate_per_kg: 400,
            total_amount: 4000,
          },
        ],
      },
    ];

    // Independent payment later: ₹1,000 paid to farmer
    const payments: Payment[] = [
      {
        id: 'pay-1',
        date: '2026-11-05',
        direction: 'out',
        entity_type: 'farmer',
        entity_id: 'f1',
        entity_name: 'Thomas Kutty',
        amount: 1000,
        payment_mode: 'bank',
        created_at: '2026-11-05T14:00:00Z',
        updated_at: '2026-11-05T14:00:00Z',
      },
    ];

    const result = computeFarmerLedger(farmer, purchases, payments);
    // Opening: 1000 + Purchase: 4000 - Paid at purchase: 2500 - Payment later: 1000 = 1500
    expect(result.closingBalancePayable).toBe(1500);
    expect(result.totalPurchased).toBe(4000);
    expect(result.totalPaid).toBe(3500); // 2500 + 1000
    // Entries in reverse chronological order (recent on top, old on bottom)
    expect(result.entries[0].id).toBe('pay-1'); // Most recent on Nov 5
    expect(result.entries[result.entries.length - 1].reference_type).toBe('opening'); // Oldest at bottom
  });

  it('computes Party ledger running receivable matching specification example', () => {
    // Specification example:
    // "Day 1 sell 10 kg Coconut for ₹2,000.
    // Day 2 sell 20 kg Coconut for ₹4,000. Total due ₹6,000.
    // Party pays ₹3,000 later. Balance shows ₹3,000."
    const party: Party = {
      id: 'pty-1',
      name: 'Kerala Agro Exporters',
      opening_balance_receivable: 0,
      is_active: true,
      created_at: '2026-11-01T00:00:00Z',
      updated_at: '2026-11-01T00:00:00Z',
    };

    const sales: Sale[] = [
      {
        id: 's1',
        date: '2026-11-01',
        created_at: '2026-11-01T10:00:00Z',
        party_id: 'pty-1',
        party_name: 'Kerala Agro Exporters',
        total_amount: 2000,
        received_amount: 0,
        payment_mode: 'cash',
        balance_receivable: 2000,
        total_cogs: 1400,
        items: [
          {
            id: 'si1',
            sale_id: 's1',
            product_id: 'p-coconut',
            product_name: 'Coconut',
            quantity_kg: 10,
            selling_rate_per_kg: 200,
            total_amount: 2000,
            cost_rate_per_kg: 140,
            cogs_amount: 1400,
          },
        ],
      },
      {
        id: 's2',
        date: '2026-11-02',
        created_at: '2026-11-02T10:00:00Z',
        party_id: 'pty-1',
        party_name: 'Kerala Agro Exporters',
        total_amount: 4000,
        received_amount: 0,
        payment_mode: 'cash',
        balance_receivable: 4000,
        total_cogs: 2800,
        items: [
          {
            id: 'si2',
            sale_id: 's2',
            product_id: 'p-coconut',
            product_name: 'Coconut',
            quantity_kg: 20,
            selling_rate_per_kg: 200,
            total_amount: 4000,
            cost_rate_per_kg: 140,
            cogs_amount: 2800,
          },
        ],
      },
    ];

    const payments: Payment[] = [
      {
        id: 'pay-rec-1',
        date: '2026-11-03',
        direction: 'in',
        entity_type: 'party',
        entity_id: 'pty-1',
        entity_name: 'Kerala Agro Exporters',
        amount: 3000,
        payment_mode: 'bank',
        created_at: '2026-11-03T16:00:00Z',
        updated_at: '2026-11-03T16:00:00Z',
      },
    ];

    const result = computePartyLedger(party, sales, payments);
    expect(result.totalBilled).toBe(6000);
    expect(result.totalReceived).toBe(3000);
    expect(result.closingBalanceReceivable).toBe(3000);
    // Entries in reverse chronological order (recent on top, old on bottom)
    expect(result.entries[0].id).toBe('pay-rec-1'); // Most recent on Day 3
    expect(result.entries[result.entries.length - 1].id).toBe('s1'); // Oldest on Day 1
  });
});

describe('Profit Reports: Daily vs Monthly', () => {
  const sales: Sale[] = [
    {
      id: 's1',
      date: '2026-11-10',
      created_at: '2026-11-10T10:00:00Z',
      party_id: 'pty-1',
      party_name: 'Malabar Spices',
      total_amount: 15000,
      received_amount: 15000,
      payment_mode: 'bank',
      balance_receivable: 0,
      total_cogs: 10000,
      items: [
        {
          id: 'si1',
          sale_id: 's1',
          product_id: 'p-kurumulak',
          product_name: 'Kurumulak',
          quantity_kg: 25,
          selling_rate_per_kg: 600,
          total_amount: 15000,
          cost_rate_per_kg: 400,
          cogs_amount: 10000,
        },
      ],
    },
  ];

  const weightLosses: WeightLoss[] = [
    {
      id: 'wl-1',
      date: '2026-11-10',
      product_id: 'p-kurumulak',
      product_name: 'Kurumulak',
      quantity_lost_kg: 2,
      reason: 'Drying',
      cost_rate_per_kg: 400,
      total_loss_value: 800, // 2kg * ₹400
      created_at: '2026-11-10T17:00:00Z',
      updated_at: '2026-11-10T17:00:00Z',
    },
  ];

  const expenses: Expense[] = [
    {
      id: 'exp-1',
      date: '2026-11-10',
      category_id: 'cat-labour',
      category_name: 'Labour',
      amount: 1200,
      payment_mode: 'cash',
      created_at: '2026-11-10T18:00:00Z',
      updated_at: '2026-11-10T18:00:00Z',
    },
    {
      id: 'exp-2',
      date: '2026-11-15',
      category_id: 'cat-rent',
      category_name: 'Rent',
      amount: 5000,
      payment_mode: 'bank',
      created_at: '2026-11-15T09:00:00Z',
      updated_at: '2026-11-15T09:00:00Z',
    },
  ];

  it('computes daily profit EXCLUDING expenses', () => {
    // Sales: 15,000, COGS: 10,000 => Gross: 5,000
    // Shrinkage loss: 800
    // Daily profit = 5,000 - 800 = 4,200 (Expenses like 1,200 labour are NOT deducted)
    const daily = computeDailyProfit('2026-11-10', sales, [], weightLosses);

    expect(daily.total_sales).toBe(15000);
    expect(daily.total_cogs).toBe(10000);
    expect(daily.gross_profit).toBe(5000);
    expect(daily.shrinkage_loss_value).toBe(800);
    expect(daily.daily_profit).toBe(4200);
    expect(daily.items[0].profit).toBe(5000);
    expect(daily.items[0].profit_per_kg).toBe(200); // (15000 - 10000) / 25 = 200
  });

  it('computes monthly net profit INCLUDING all expenses', () => {
    // Monthly sales: 15,000, COGS: 10,000 => Gross: 5,000
    // Shrinkage: 800
    // Total expenses: 1,200 (Labour) + 5,000 (Rent) = 6,200
    // Net profit = 5,000 - 800 - 6,200 = -2,000
    const monthly = computeMonthlyProfit('2026-11', sales, [], weightLosses, expenses);

    expect(monthly.total_sales).toBe(15000);
    expect(monthly.total_cogs).toBe(10000);
    expect(monthly.gross_profit).toBe(5000);
    expect(monthly.shrinkage_loss_value).toBe(800);
    expect(monthly.total_expenses).toBe(6200);
    expect(monthly.net_profit).toBe(-2000);
  });
});

describe('Cash Book & Cash in Hand', () => {
  const settings: Settings = {
    shop_name: 'Shop ERP',
    owner_name: 'Owner',
    phone: '9876543210',
    address: 'Kerala, India',
    opening_cash_balance: 10000,
    opening_bank_balance: 50000,
    pin_code: '1234',
  };

  it('computes cash book and cash in hand correctly', () => {
    // Day 1: Cash sale ₹5,000 received; Cash purchase ₹3,000 paid; Cash expense ₹500
    // Cash in hand = 10,000 + 5,000 - 3,000 - 500 = 11,500
    const purchases: Purchase[] = [
      {
        id: 'p1',
        date: '2026-11-15',
        farmer_id: 'f1',
        farmer_name: 'Farmer 1',
        total_amount: 3000,
        paid_amount: 3000,
        payment_mode: 'cash',
        balance_payable: 0,
        items: [],
        created_at: '2026-11-15T10:00:00Z',
        updated_at: '2026-11-15T10:00:00Z',
      },
    ];

    const sales: Sale[] = [
      {
        id: 's1',
        date: '2026-11-15',
        party_id: 'pty-1',
        party_name: 'Party 1',
        total_amount: 5000,
        received_amount: 5000,
        payment_mode: 'cash',
        balance_receivable: 0,
        total_cogs: 3000,
        items: [],
        created_at: '2026-11-15T11:00:00Z',
        updated_at: '2026-11-15T11:00:00Z',
      },
    ];

    const expenses: Expense[] = [
      {
        id: 'e1',
        date: '2026-11-15',
        category_id: 'cat-tea',
        category_name: 'Other',
        amount: 500,
        payment_mode: 'cash',
        created_at: '2026-11-15T12:00:00Z',
        updated_at: '2026-11-15T12:00:00Z',
      },
    ];

    const funds = computeTotalCurrentFunds(settings, purchases, sales, [], expenses);
    expect(funds.cashInHand).toBe(11500);
    expect(funds.bankBalance).toBe(50000);

    const cashBook = computeCashBook('2026-11-15', settings, purchases, sales, [], expenses);
    expect(cashBook.opening_cash).toBe(10000);
    expect(cashBook.cash_in).toBe(5000);
    expect(cashBook.cash_out).toBe(3500); // 3000 + 500
    expect(cashBook.closing_cash).toBe(11500);
  });
});

describe('Payment Editing & Deletion', () => {
  const party: Party = {
    id: 'pty-test',
    name: 'Test Party Traders',
    opening_balance_receivable: 0,
    is_active: true,
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-01T00:00:00Z',
  };

  const sales: Sale[] = [
    {
      id: 's-test-1',
      date: '2026-11-10',
      created_at: '2026-11-10T10:00:00Z',
      party_id: 'pty-test',
      party_name: 'Test Party Traders',
      total_amount: 100000,
      received_amount: 0,
      payment_mode: 'bank',
      balance_receivable: 100000,
      total_cogs: 70000,
      items: [],
    },
  ];

  it('adjusts party ledger when a payment is edited from 5,000 to 50,000', () => {
    // Initial payment of 5000 (wrongly typed)
    const initialPayment: Payment = {
      id: 'pay-1',
      date: '2026-11-12',
      direction: 'in',
      entity_type: 'party',
      entity_id: 'pty-test',
      entity_name: 'Test Party Traders',
      amount: 5000,
      payment_mode: 'bank',
      created_at: '2026-11-12T10:00:00Z',
    };

    const initialResult = computePartyLedger(party, sales, [initialPayment]);
    expect(initialResult.totalReceived).toBe(5000);
    expect(initialResult.closingBalanceReceivable).toBe(95000);

    // Edited payment to 50000 (corrected)
    const editedPayment: Payment = {
      ...initialPayment,
      amount: 50000,
      updated_at: '2026-11-12T10:05:00Z',
    };

    const editedResult = computePartyLedger(party, sales, [editedPayment]);
    expect(editedResult.totalReceived).toBe(50000);
    expect(editedResult.closingBalanceReceivable).toBe(50000);
  });

  it('restores party receivable when a payment is deleted', () => {
    const payment: Payment = {
      id: 'pay-1',
      date: '2026-11-12',
      direction: 'in',
      entity_type: 'party',
      entity_id: 'pty-test',
      entity_name: 'Test Party Traders',
      amount: 50000,
      payment_mode: 'bank',
      created_at: '2026-11-12T10:00:00Z',
    };

    // Before deletion
    const withPayment = computePartyLedger(party, sales, [payment]);
    expect(withPayment.closingBalanceReceivable).toBe(50000);

    // After deletion (filtered out from payments array)
    const afterDeletion = computePartyLedger(party, sales, []);
    expect(afterDeletion.totalReceived).toBe(0);
    expect(afterDeletion.closingBalanceReceivable).toBe(100000);
  });
});
