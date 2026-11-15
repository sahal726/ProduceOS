'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/use-store';
import {
  computeTotalCurrentFunds,
  computeFarmerLedger,
  computePartyLedger,
  computeDailyProfit,
  computeAllProductsStock,
  formatINR,
  formatQuantity,
} from '@/lib/calculations';
import {
  Wallet,
  Building2,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  AlertTriangle,
  PlusCircle,
  Receipt,
  ShoppingCart,
  Send,
  Package,
} from 'lucide-react';
import { Modal } from '@/components/Modal';
import { PaymentMode } from '@/types';

interface DashboardViewProps {
  onNavigateTab: (tab: 'home' | 'buy' | 'sell' | 'ledgers' | 'more') => void;
  onOpenLedgerItem?: (type: 'party' | 'farmer', id: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigateTab, onOpenLedgerItem }) => {
  const {
    products,
    farmers,
    parties,
    purchases,
    sales,
    payments,
    expenses,
    weight_losses,
    stock_adjustments,
    settings,
    addPayment,
    addExpense,
    expense_categories,
  } = useStore();

  const todayStr = new Date().toISOString().slice(0, 10);

  // 1. Funds
  const funds = computeTotalCurrentFunds(settings, purchases, sales, payments, expenses);

  // 2. Ledgers Totals
  const activeFarmers = farmers.filter((f) => f.is_active);
  const activeParties = parties.filter((p) => p.is_active);

  const farmerBalances = activeFarmers.map((f) => {
    const res = computeFarmerLedger(f, purchases, payments);
    return {
      farmer: f,
      payable: res.closingBalancePayable,
    };
  });
  const totalPayable = farmerBalances.reduce((sum, item) => sum + Math.max(0, item.payable), 0);

  const partyBalances = activeParties.map((p) => {
    const res = computePartyLedger(p, sales, payments);
    return {
      party: p,
      receivable: res.closingBalanceReceivable,
    };
  });
  const totalReceivable = partyBalances.reduce((sum, item) => sum + Math.max(0, item.receivable), 0);

  // 3. Today's Figures
  const todayPurchases = purchases.filter((p) => p.date === todayStr);
  const todaySales = sales.filter((s) => s.date === todayStr);
  const todayPurchasesTotal = todayPurchases.reduce((acc, p) => acc + p.total_amount, 0);
  const todaySalesTotal = todaySales.reduce((acc, s) => acc + s.total_amount, 0);
  const dailyProfit = computeDailyProfit(todayStr, sales, purchases, weight_losses);

  // 4. Stock Summary
  const stockList = computeAllProductsStock(products, purchases, sales, weight_losses, stock_adjustments);
  const lowStockCount = stockList.filter((s) => s.is_low_stock).length;

  // 5. Top 5 Dues
  const topParties = [...partyBalances]
    .filter((p) => p.receivable > 0)
    .sort((a, b) => b.receivable - a.receivable)
    .slice(0, 5);

  const topFarmers = [...farmerBalances]
    .filter((f) => f.payable > 0)
    .sort((a, b) => b.payable - a.payable)
    .slice(0, 5);

  // Quick Action Modal States
  const [quickModal, setQuickModal] = useState<
    'none' | 'receive_payment' | 'make_payment' | 'add_expense'
  >('none');

  // Receive Payment Form state
  const [selectedPartyId, setSelectedPartyId] = useState<string>(parties[0]?.id || '');
  const [receiveAmount, setReceiveAmount] = useState<string>('');
  const [receiveMode, setReceiveMode] = useState<PaymentMode>('cash');
  const [receiveNote, setReceiveNote] = useState<string>('');

  // Make Payment Form state
  const [selectedFarmerId, setSelectedFarmerId] = useState<string>(farmers[0]?.id || '');
  const [payAmount, setPayAmount] = useState<string>('');
  const [payMode, setPayMode] = useState<PaymentMode>('cash');
  const [payNote, setPayNote] = useState<string>('');

  // Expense Form state
  const [expCategory, setExpCategory] = useState<string>(expense_categories[0]?.id || '');
  const [expAmount, setExpAmount] = useState<string>('');
  const [expMode, setExpMode] = useState<PaymentMode>('cash');
  const [expNote, setExpNote] = useState<string>('');

  const handleSaveReceivePayment = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(receiveAmount);
    if (!amt || amt <= 0 || !selectedPartyId) return;
    const pty = parties.find((p) => p.id === selectedPartyId);
    if (!pty) return;

    addPayment({
      date: todayStr,
      direction: 'in',
      entity_type: 'party',
      entity_id: pty.id,
      entity_name: pty.name,
      amount: amt,
      payment_mode: receiveMode,
      notes: receiveNote.trim() || undefined,
    });
    setReceiveAmount('');
    setReceiveNote('');
    setQuickModal('none');
  };

  const handleSaveMakePayment = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(payAmount);
    if (!amt || amt <= 0 || !selectedFarmerId) return;
    const frm = farmers.find((f) => f.id === selectedFarmerId);
    if (!frm) return;

    addPayment({
      date: todayStr,
      direction: 'out',
      entity_type: 'farmer',
      entity_id: frm.id,
      entity_name: frm.name,
      amount: amt,
      payment_mode: payMode,
      notes: payNote.trim() || undefined,
    });
    setPayAmount('');
    setPayNote('');
    setQuickModal('none');
  };

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(expAmount);
    if (!amt || amt <= 0 || !expCategory) return;
    const cat = expense_categories.find((c) => c.id === expCategory);

    addExpense({
      date: todayStr,
      category_id: expCategory,
      category_name: cat?.name || 'Other',
      amount: amt,
      payment_mode: expMode,
      notes: expNote.trim() || undefined,
    });
    setExpAmount('');
    setExpNote('');
    setQuickModal('none');
  };

  return (
    <div className="flex flex-col gap-5 pb-8">
      {/* 4 TOP CARDS */}
      <div className="grid grid-cols-2 gap-3">
        {/* Cash in Hand */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-4 rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-100 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Cash in Hand</span>
            <Wallet className="w-4 h-4" />
          </div>
          <div className="text-xl font-black tracking-tight">{formatINR(funds.cashInHand)}</div>
          <span className="text-[10px] text-emerald-100/80 mt-1 font-medium">Physical currency</span>
        </div>

        {/* Bank / UPI */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-4 rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-blue-100 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Bank / UPI</span>
            <Building2 className="w-4 h-4" />
          </div>
          <div className="text-xl font-black tracking-tight">{formatINR(funds.bankBalance)}</div>
          <span className="text-[10px] text-blue-100/80 mt-1 font-medium">Account balance</span>
        </div>

        {/* Total to RECEIVE (Party Dues) */}
        <div
          onClick={() => onNavigateTab('ledgers')}
          className="bg-white border border-slate-200 hover:border-emerald-300 p-4 rounded-2xl shadow-xs cursor-pointer active:scale-98 transition-all"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">To Receive</span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-slate-900 tracking-tight">
            {formatINR(totalReceivable)}
          </div>
          <span className="text-[10px] text-slate-500 font-medium">
            From {partyBalances.filter((p) => p.receivable > 0).length} parties
          </span>
        </div>

        {/* Total to PAY (Farmer Dues) */}
        <div
          onClick={() => onNavigateTab('ledgers')}
          className="bg-white border border-slate-200 hover:border-rose-300 p-4 rounded-2xl shadow-xs cursor-pointer active:scale-98 transition-all"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-600">To Pay</span>
            <ArrowUpRight className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl font-black text-slate-900 tracking-tight">
            {formatINR(totalPayable)}
          </div>
          <span className="text-[10px] text-slate-500 font-medium">
            To {farmerBalances.filter((f) => f.payable > 0).length} farmers
          </span>
        </div>
      </div>

      {/* QUICK ACTIONS ROW */}
      <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80">
        <span className="text-[11px] font-bold text-slate-500 uppercase px-1 tracking-wider">
          Quick Actions
        </span>
        <div className="grid grid-cols-5 gap-1.5 mt-2">
          <button
            type="button"
            onClick={() => onNavigateTab('buy')}
            className="flex flex-col items-center justify-center p-2 rounded-xl bg-white hover:bg-emerald-50 active:scale-95 border border-slate-200 text-slate-800 transition-all shadow-2xs"
          >
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 mb-1">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold">Buy</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('sell')}
            className="flex flex-col items-center justify-center p-2 rounded-xl bg-white hover:bg-emerald-50 active:scale-95 border border-slate-200 text-slate-800 transition-all shadow-2xs"
          >
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 mb-1">
              <TrendingUp className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold">Sell</span>
          </button>

          <button
            type="button"
            onClick={() => setQuickModal('receive_payment')}
            className="flex flex-col items-center justify-center p-2 rounded-xl bg-white hover:bg-emerald-50 active:scale-95 border border-slate-200 text-slate-800 transition-all shadow-2xs"
          >
            <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 mb-1">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-center leading-tight">Receive</span>
          </button>

          <button
            type="button"
            onClick={() => setQuickModal('make_payment')}
            className="flex flex-col items-center justify-center p-2 rounded-xl bg-white hover:bg-emerald-50 active:scale-95 border border-slate-200 text-slate-800 transition-all shadow-2xs"
          >
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 mb-1">
              <Send className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-center leading-tight">Pay</span>
          </button>

          <button
            type="button"
            onClick={() => setQuickModal('add_expense')}
            className="flex flex-col items-center justify-center p-2 rounded-xl bg-white hover:bg-emerald-50 active:scale-95 border border-slate-200 text-slate-800 transition-all shadow-2xs"
          >
            <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-700 mb-1">
              <Receipt className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-center leading-tight">Expense</span>
          </button>
        </div>
      </div>

      {/* TODAY'S PERFORMANCE CARD */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <h2 className="text-sm font-bold text-slate-900">Today&apos;s Performance</h2>
            <span className="text-[10px] font-medium text-slate-500">({todayStr})</span>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('more')}
            className="text-xs font-semibold text-emerald-700 hover:underline"
          >
            Detailed Report →
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-100 text-center">
          <div>
            <div className="text-[11px] font-semibold text-slate-500">Purchases</div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">
              {formatINR(todayPurchasesTotal)}
            </div>
            <div className="text-[10px] text-slate-400">{todayPurchases.length} bills</div>
          </div>

          <div className="border-x border-slate-100 px-1">
            <div className="text-[11px] font-semibold text-slate-500">Sales</div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">
              {formatINR(todaySalesTotal)}
            </div>
            <div className="text-[10px] text-slate-400">{todaySales.length} bills</div>
          </div>

          <div>
            <div className="text-[11px] font-semibold text-slate-500">Daily Profit</div>
            <div
              className={`text-sm font-black mt-0.5 ${
                dailyProfit.daily_profit >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {formatINR(dailyProfit.daily_profit)}
            </div>
            <div className="text-[9px] text-slate-400 leading-tight">excl. expenses</div>
          </div>
        </div>

        {dailyProfit.shrinkage_loss_value > 0 && (
          <div className="mt-2.5 flex items-center justify-between bg-amber-50 text-amber-900 text-xs px-3 py-1.5 rounded-lg border border-amber-200">
            <span className="flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              Recorded Shrinkage Loss:
            </span>
            <span className="font-bold">-{formatINR(dailyProfit.shrinkage_loss_value)}</span>
          </div>
        )}
      </div>

      {/* STOCK SUMMARY LIST */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900">Stock In Hand</h2>
            {lowStockCount > 0 && (
              <span className="bg-rose-100 text-rose-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {lowStockCount} Low
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('more')}
            className="text-xs font-semibold text-emerald-700 hover:underline"
          >
            All Stock →
          </button>
        </div>

        <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
          {stockList.map((item) => (
            <div key={item.product_id} className="py-2.5 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span>{item.product_name}</span>
                  {item.is_low_stock && (
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" title="Low stock alert" />
                  )}
                </div>
                <div className="text-[11px] text-slate-500">
                  Avg Cost: ₹{item.weightedAverageCostPerKg}/kg
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs font-black text-slate-800">
                  {formatQuantity(item.current_stock_kg)}
                </div>
                <div className="text-[10px] font-semibold text-emerald-700">
                  Val: {formatINR(item.stock_value)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* TOP DUES SPLIT: PARTIES (Receivable) & FARMERS (Payable) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Top 5 Parties We Need to Receive From */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-900">Top Parties (Due)</span>
            <button
              type="button"
              onClick={() => onNavigateTab('ledgers')}
              className="text-[11px] text-emerald-700 font-semibold hover:underline"
            >
              View All
            </button>
          </div>

          {topParties.length === 0 ? (
            <p className="text-xs text-slate-400 py-3 text-center">No outstanding dues from parties</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {topParties.map((item) => (
                <div
                  key={item.party.id}
                  onClick={() => onOpenLedgerItem && onOpenLedgerItem('party', item.party.id)}
                  className="py-2 flex items-center justify-between hover:bg-slate-50 cursor-pointer rounded-lg px-1 transition-colors"
                >
                  <div className="truncate mr-2">
                    <div className="text-xs font-bold text-slate-800 truncate">{item.party.name}</div>
                    <div className="text-[10px] text-slate-400 truncate">{item.party.place || 'Buyer'}</div>
                  </div>
                  <div className="text-xs font-bold text-emerald-700 shrink-0">
                    {formatINR(item.receivable)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top 5 Farmers We Owe */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-900">Top Farmers (Owed)</span>
            <button
              type="button"
              onClick={() => onNavigateTab('ledgers')}
              className="text-[11px] text-rose-700 font-semibold hover:underline"
            >
              View All
            </button>
          </div>

          {topFarmers.length === 0 ? (
            <p className="text-xs text-slate-400 py-3 text-center">No outstanding dues owed to farmers</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {topFarmers.map((item) => (
                <div
                  key={item.farmer.id}
                  onClick={() => onOpenLedgerItem && onOpenLedgerItem('farmer', item.farmer.id)}
                  className="py-2 flex items-center justify-between hover:bg-slate-50 cursor-pointer rounded-lg px-1 transition-colors"
                >
                  <div className="truncate mr-2">
                    <div className="text-xs font-bold text-slate-800 truncate">{item.farmer.name}</div>
                    <div className="text-[10px] text-slate-400 truncate">{item.farmer.place || 'Supplier'}</div>
                  </div>
                  <div className="text-xs font-bold text-rose-600 shrink-0">
                    {formatINR(item.payable)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* QUICK MODAL: RECEIVE PAYMENT */}
      <Modal
        isOpen={quickModal === 'receive_payment'}
        onClose={() => setQuickModal('none')}
        title="Receive Payment from Party"
      >
        <form onSubmit={handleSaveReceivePayment} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-700">Select Party</label>
            <select
              value={selectedPartyId}
              onChange={(e) => setSelectedPartyId(e.target.value)}
              className="w-full h-11 mt-1 px-3 border border-slate-300 rounded-xl bg-white text-sm font-semibold"
            >
              {parties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.place ? `(${p.place})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">Amount Received (₹)</label>
            <input
              type="text"
              inputMode="decimal"
              value={receiveAmount}
              onChange={(e) => setReceiveAmount(e.target.value)}
              placeholder="e.g. 25000"
              required
              className="w-full h-12 mt-1 px-3 text-lg font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">Payment Mode</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                type="button"
                onClick={() => setReceiveMode('cash')}
                className={`py-2 text-xs font-bold rounded-xl border ${
                  receiveMode === 'cash'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-slate-700 border-slate-300'
                }`}
              >
                Cash
              </button>
              <button
                type="button"
                onClick={() => setReceiveMode('bank')}
                className={`py-2 text-xs font-bold rounded-xl border ${
                  receiveMode === 'bank'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-700 border-slate-300'
                }`}
              >
                Bank / UPI
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">Note (Optional)</label>
            <input
              type="text"
              value={receiveNote}
              onChange={(e) => setReceiveNote(e.target.value)}
              placeholder="Cheque no. / GPay ref"
              className="w-full h-10 mt-1 px-3 border border-slate-300 rounded-xl text-sm"
            />
          </div>

          <button
            type="submit"
            className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl mt-2 active:scale-98 transition-all"
          >
            Confirm & Save Receipt
          </button>
        </form>
      </Modal>

      {/* QUICK MODAL: MAKE PAYMENT */}
      <Modal
        isOpen={quickModal === 'make_payment'}
        onClose={() => setQuickModal('none')}
        title="Make Payment to Farmer"
      >
        <form onSubmit={handleSaveMakePayment} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-700">Select Farmer</label>
            <select
              value={selectedFarmerId}
              onChange={(e) => setSelectedFarmerId(e.target.value)}
              className="w-full h-11 mt-1 px-3 border border-slate-300 rounded-xl bg-white text-sm font-semibold"
            >
              {farmers.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} {f.place ? `(${f.place})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">Amount Paid (₹)</label>
            <input
              type="text"
              inputMode="decimal"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              placeholder="e.g. 5000"
              required
              className="w-full h-12 mt-1 px-3 text-lg font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">Payment Mode</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                type="button"
                onClick={() => setPayMode('cash')}
                className={`py-2 text-xs font-bold rounded-xl border ${
                  payMode === 'cash'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-slate-700 border-slate-300'
                }`}
              >
                Cash
              </button>
              <button
                type="button"
                onClick={() => setPayMode('bank')}
                className={`py-2 text-xs font-bold rounded-xl border ${
                  payMode === 'bank'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-700 border-slate-300'
                }`}
              >
                Bank / UPI
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">Note (Optional)</label>
            <input
              type="text"
              value={payNote}
              onChange={(e) => setPayNote(e.target.value)}
              placeholder="Settlement note"
              className="w-full h-10 mt-1 px-3 border border-slate-300 rounded-xl text-sm"
            />
          </div>

          <button
            type="submit"
            className="w-full h-12 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl mt-2 active:scale-98 transition-all"
          >
            Confirm & Pay Farmer
          </button>
        </form>
      </Modal>

      {/* QUICK MODAL: ADD EXPENSE */}
      <Modal
        isOpen={quickModal === 'add_expense'}
        onClose={() => setQuickModal('none')}
        title="Record Shop Expense"
      >
        <form onSubmit={handleSaveExpense} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-700">Expense Category</label>
            <select
              value={expCategory}
              onChange={(e) => setExpCategory(e.target.value)}
              className="w-full h-11 mt-1 px-3 border border-slate-300 rounded-xl bg-white text-sm font-semibold"
            >
              {expense_categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">Amount (₹)</label>
            <input
              type="text"
              inputMode="decimal"
              value={expAmount}
              onChange={(e) => setExpAmount(e.target.value)}
              placeholder="e.g. 1500"
              required
              className="w-full h-12 mt-1 px-3 text-lg font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">Payment Mode</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                type="button"
                onClick={() => setExpMode('cash')}
                className={`py-2 text-xs font-bold rounded-xl border ${
                  expMode === 'cash'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-slate-700 border-slate-300'
                }`}
              >
                Cash (Reduces Cash in Hand)
              </button>
              <button
                type="button"
                onClick={() => setExpMode('bank')}
                className={`py-2 text-xs font-bold rounded-xl border ${
                  expMode === 'bank'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-700 border-slate-300'
                }`}
              >
                Bank / UPI
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">Note (Optional)</label>
            <input
              type="text"
              value={expNote}
              onChange={(e) => setExpNote(e.target.value)}
              placeholder="Details or receipt info"
              className="w-full h-10 mt-1 px-3 border border-slate-300 rounded-xl text-sm"
            />
          </div>

          <button
            type="submit"
            className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl mt-2 active:scale-98 transition-all"
          >
            Save Expense
          </button>
        </form>
      </Modal>
    </div>
  );
};
