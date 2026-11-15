'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/use-store';
import {
  computeAllProductsStock,
  computeDailyProfit,
  computeMonthlyProfit,
  computeCashBook,
  formatINR,
  formatQuantity,
  kgToQuintal,
  quintalToKg,
} from '@/lib/calculations';
import { LossReason, PaymentMode } from '@/types';
import {
  Package,
  Scale,
  Receipt,
  FileSpreadsheet,
  BookOpen,
  Settings as SettingsIcon,
  Tag,
  ArrowLeft,
  Plus,
  Trash2,
  Calendar,
  AlertTriangle,
  Download,
  Share2,
  Database,
  Lock,
  RefreshCw,
  Building2,
  Wallet,
} from 'lucide-react';
import { Modal } from '@/components/Modal';
import jsPDF from 'jspdf';

type SubView =
  | 'menu'
  | 'stock'
  | 'weight_loss'
  | 'expenses'
  | 'reports'
  | 'cash_book'
  | 'products'
  | 'settings';

export const MoreView: React.FC = () => {
  const {
    products,
    purchases,
    sales,
    payments,
    expenses,
    weight_losses,
    stock_adjustments,
    expense_categories,
    daily_rates,
    settings,
    addProduct,
    updateProduct,
    addWeightLoss,
    addExpense,
    deleteExpense,
    addExpenseCategory,
    setDailyRate,
    getDailyRate,
    updateSettings,
    exportDataJSON,
    importDataJSON,
    resetToDemo,
  } = useStore();

  const todayStr = new Date().toISOString().slice(0, 10);
  const currentMonthStr = todayStr.slice(0, 7); // YYYY-MM

  const [activeSubView, setActiveSubView] = useState<SubView>('menu');

  // Stock List
  const stockList = computeAllProductsStock(
    products,
    purchases,
    sales,
    weight_losses,
    stock_adjustments
  );

  // --- 1. WEIGHT LOSS STATE ---
  const [lossDate, setLossDate] = useState<string>(todayStr);
  const [lossProductId, setLossProductId] = useState<string>(products[0]?.id || '');
  const [lossQtyRaw, setLossQtyRaw] = useState<string>('');
  const [lossReason, setLossReason] = useState<LossReason>('Drying');
  const [lossNote, setLossNote] = useState<string>('');

  const handleRecordWeightLoss = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(lossQtyRaw);
    if (!qty || qty <= 0 || !lossProductId) return;

    const prodStock = stockList.find((s) => s.product_id === lossProductId);
    const prodName = prodStock?.product_name || 'Produce';
    const costRate = prodStock?.weightedAverageCostPerKg || 0;
    const lossValue = Number((qty * costRate).toFixed(2));

    addWeightLoss({
      date: lossDate,
      product_id: lossProductId,
      product_name: prodName,
      quantity_lost_kg: qty,
      reason: lossReason,
      cost_rate_per_kg: costRate,
      total_loss_value: lossValue,
      notes: lossNote.trim() || undefined,
    });

    setLossQtyRaw('');
    setLossNote('');
    alert(`Weight loss of ${qty} kg recorded successfully.`);
  };

  // --- 2. EXPENSES STATE ---
  const [expCategory, setExpCategory] = useState<string>(expense_categories[0]?.id || '');
  const [expAmount, setExpAmount] = useState<string>('');
  const [expDate, setExpDate] = useState<string>(todayStr);
  const [expMode, setExpMode] = useState<PaymentMode>('cash');
  const [expNote, setExpNote] = useState<string>('');
  const [newCatName, setNewCatName] = useState<string>('');
  const [isAddCatModalOpen, setIsAddCatModalOpen] = useState<boolean>(false);

  const handleAddExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(expAmount);
    if (!amt || amt <= 0 || !expCategory) return;
    const cat = expense_categories.find((c) => c.id === expCategory);

    addExpense({
      date: expDate,
      category_id: expCategory,
      category_name: cat?.name || 'Other',
      amount: amt,
      payment_mode: expMode,
      notes: expNote.trim() || undefined,
    });

    setExpAmount('');
    setExpNote('');
  };

  const handleAddNewCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const cat = addExpenseCategory(newCatName);
    setExpCategory(cat.id);
    setNewCatName('');
    setIsAddCatModalOpen(false);
  };

  // --- 3. REPORTS STATE ---
  const [reportType, setReportType] = useState<'daily' | 'monthly'>('daily');
  const [reportDate, setReportDate] = useState<string>(todayStr);
  const [reportMonth, setReportMonth] = useState<string>(currentMonthStr);

  const dailyReport = computeDailyProfit(reportDate, sales, purchases, weight_losses);
  const monthlyReport = computeMonthlyProfit(
    reportMonth,
    sales,
    purchases,
    weight_losses,
    expenses
  );

  const handleExportReportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(settings.shop_name, 14, 20);
    doc.setFontSize(11);
    doc.text(`Phone: ${settings.phone} | ${settings.address}`, 14, 26);

    if (reportType === 'daily') {
      doc.text(`DAILY PROFIT REPORT (${reportDate})`, 14, 34);
      doc.setFontSize(9);
      doc.text('* Note: Expenses are counted in the monthly report only.', 14, 40);
      doc.line(14, 42, 196, 42);

      let y = 50;
      doc.text(`Sales Revenue: Rs. ${dailyReport.total_sales}`, 14, y);
      y += 6;
      doc.text(`Cost of Goods Sold (COGS): Rs. ${dailyReport.total_cogs}`, 14, y);
      y += 6;
      doc.text(`Gross Profit: Rs. ${dailyReport.gross_profit}`, 14, y);
      y += 6;
      doc.text(`Recorded Shrinkage Loss: Rs. ${dailyReport.shrinkage_loss_value}`, 14, y);
      y += 7;
      doc.setFontSize(12);
      doc.text(`DAILY NET PROFIT: Rs. ${dailyReport.daily_profit}`, 14, y);

      y += 12;
      doc.setFontSize(10);
      doc.text('Product Item Breakdown:', 14, y);
      y += 6;
      dailyReport.items.forEach((it) => {
        doc.setFontSize(9);
        doc.text(
          `${it.product_name} - Qty: ${it.quantity_sold_kg}kg | Sales: Rs.${it.sales_amount} | Cost: Rs.${it.cogs_amount} | Profit: Rs.${it.profit} (Rs.${it.profit_per_kg}/kg)`,
          14,
          y
        );
        y += 6;
      });
      doc.save(`daily_profit_${reportDate}.pdf`);
    } else {
      doc.text(`MONTHLY NET PROFIT REPORT (${reportMonth})`, 14, 34);
      doc.line(14, 38, 196, 38);

      let y = 46;
      doc.text(`Total Sales: Rs. ${monthlyReport.total_sales}`, 14, y);
      y += 6;
      doc.text(`Total COGS: Rs. ${monthlyReport.total_cogs}`, 14, y);
      y += 6;
      doc.text(`Gross Profit: Rs. ${monthlyReport.gross_profit}`, 14, y);
      y += 6;
      doc.text(`Shrinkage Loss: Rs. ${monthlyReport.shrinkage_loss_value}`, 14, y);
      y += 6;
      doc.text(`Total Expenses: Rs. ${monthlyReport.total_expenses}`, 14, y);
      y += 8;
      doc.setFontSize(12);
      doc.text(`MONTHLY NET PROFIT: Rs. ${monthlyReport.net_profit}`, 14, y);

      y += 12;
      doc.setFontSize(10);
      doc.text('Expenses by Category:', 14, y);
      y += 6;
      monthlyReport.expenses_by_category.forEach((ec) => {
        doc.setFontSize(9);
        doc.text(`${ec.category}: Rs. ${ec.amount}`, 14, y);
        y += 6;
      });
      doc.save(`monthly_profit_${reportMonth}.pdf`);
    }
  };

  const handleExportReportCSV = () => {
    let csv = '';
    if (reportType === 'daily') {
      csv = `Date,Product,Quantity Sold (kg),Sales Amount,COGS Amount,Profit,Profit per kg\n`;
      dailyReport.items.forEach((it) => {
        csv += `${reportDate},"${it.product_name}",${it.quantity_sold_kg},${it.sales_amount},${it.cogs_amount},${it.profit},${it.profit_per_kg}\n`;
      });
      csv += `\nTotal Sales,${dailyReport.total_sales}\nTotal COGS,${dailyReport.total_cogs}\nGross Profit,${dailyReport.gross_profit}\nShrinkage Loss,${dailyReport.shrinkage_loss_value}\nDaily Profit,${dailyReport.daily_profit}\n`;
    } else {
      csv = `Month,${reportMonth}\nTotal Sales,${monthlyReport.total_sales}\nTotal COGS,${monthlyReport.total_cogs}\nGross Profit,${monthlyReport.gross_profit}\nShrinkage Loss,${monthlyReport.shrinkage_loss_value}\nTotal Expenses,${monthlyReport.total_expenses}\nNet Profit,${monthlyReport.net_profit}\n\nCategory,Expense Amount\n`;
      monthlyReport.expenses_by_category.forEach((ec) => {
        csv += `"${ec.category}",${ec.amount}\n`;
      });
    }

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${reportType}_${reportType === 'daily' ? reportDate : reportMonth}.csv`;
    a.click();
  };

  // --- 4. CASH BOOK STATE ---
  const [cashBookDate, setCashBookDate] = useState<string>(todayStr);
  const cashBook = computeCashBook(
    cashBookDate,
    settings,
    purchases,
    sales,
    payments,
    expenses
  );

  // --- 5. PRODUCTS STATE ---
  const [newProductName, setNewProductName] = useState<string>('');
  const [newProductMinStock, setNewProductMinStock] = useState<string>('50');
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState<boolean>(false);

  const handleAddProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName.trim()) return;
    addProduct({
      name: newProductName.trim(),
      is_active: true,
      min_stock_alert_kg: parseFloat(newProductMinStock) || 50,
    });
    setNewProductName('');
    setIsAddProductModalOpen(false);
  };

  // --- 6. SETTINGS STATE ---
  const [settingsForm, setSettingsForm] = useState(settings);
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(settingsForm);
    alert('Settings updated successfully!');
  };

  const handleBackupExport = () => {
    const jsonStr = exportDataJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shop_erp_backup_${todayStr}.json`;
    a.click();
  };

  const handleBackupImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = importDataJSON(content);
      if (success) {
        alert('Data imported and restored successfully!');
      } else {
        alert('Failed to parse backup JSON file. Please ensure it is a valid Shop ERP backup.');
      }
    };
    reader.readAsText(file);
  };

  // SUBVIEW DISPATCH
  return (
    <div className="flex flex-col gap-4 pb-12">
      {/* Navigation Header if in subview */}
      {activeSubView !== 'menu' && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubView('menu')}
            className="flex items-center gap-1 text-xs font-bold text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>More Menu</span>
          </button>
        </div>
      )}

      {/* --- MENU SUBVIEW --- */}
      {activeSubView === 'menu' && (
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-lg font-black text-slate-900 tracking-tight">More Modules</h1>
            <p className="text-xs text-slate-500">Stock, Expenses, Reports, Cash Book & Settings</p>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {/* 1. Stock & Valuation */}
            <div
              onClick={() => setActiveSubView('stock')}
              className="p-4 bg-white border border-slate-200 hover:border-emerald-300 rounded-2xl flex items-center justify-between cursor-pointer active:scale-99 transition-all shadow-xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">Stock & Valuation</div>
                  <div className="text-xs text-slate-500">
                    {stockList.length} products • Weighted average cost
                  </div>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-700">Open →</span>
            </div>

            {/* 2. Weight Loss Tracking */}
            <div
              onClick={() => setActiveSubView('weight_loss')}
              className="p-4 bg-white border border-slate-200 hover:border-amber-300 rounded-2xl flex items-center justify-between cursor-pointer active:scale-99 transition-all shadow-xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">Weight Difference / Loss</div>
                  <div className="text-xs text-slate-500">
                    Drying, shrinkage & wastage recording
                  </div>
                </div>
              </div>
              <span className="text-xs font-bold text-amber-700">Open →</span>
            </div>

            {/* 3. Expenses */}
            <div
              onClick={() => setActiveSubView('expenses')}
              className="p-4 bg-white border border-slate-200 hover:border-rose-300 rounded-2xl flex items-center justify-between cursor-pointer active:scale-99 transition-all shadow-xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">Shop Expenses</div>
                  <div className="text-xs text-slate-500">
                    Monthly grouped: Salary, Rent, Kuri, Labour...
                  </div>
                </div>
              </div>
              <span className="text-xs font-bold text-rose-700">Open →</span>
            </div>

            {/* 4. Profit Reports */}
            <div
              onClick={() => setActiveSubView('reports')}
              className="p-4 bg-white border border-slate-200 hover:border-blue-300 rounded-2xl flex items-center justify-between cursor-pointer active:scale-99 transition-all shadow-xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">Profit Reports</div>
                  <div className="text-xs text-slate-500">
                    Daily (excl. expenses) & Monthly (net profit)
                  </div>
                </div>
              </div>
              <span className="text-xs font-bold text-blue-700">Open →</span>
            </div>

            {/* 5. Cash Book */}
            <div
              onClick={() => setActiveSubView('cash_book')}
              className="p-4 bg-white border border-slate-200 hover:border-teal-300 rounded-2xl flex items-center justify-between cursor-pointer active:scale-99 transition-all shadow-xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">Daily Cash Book</div>
                  <div className="text-xs text-slate-500">Cash in hand & Bank movements</div>
                </div>
              </div>
              <span className="text-xs font-bold text-teal-700">Open →</span>
            </div>

            {/* 6. Products & Daily Rates */}
            <div
              onClick={() => setActiveSubView('products')}
              className="p-4 bg-white border border-slate-200 hover:border-indigo-300 rounded-2xl flex items-center justify-between cursor-pointer active:scale-99 transition-all shadow-xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">Products & Daily Rates</div>
                  <div className="text-xs text-slate-500">
                    10 Malayalam products & daily selling rates
                  </div>
                </div>
              </div>
              <span className="text-xs font-bold text-indigo-700">Open →</span>
            </div>

            {/* 7. Settings */}
            <div
              onClick={() => setActiveSubView('settings')}
              className="p-4 bg-white border border-slate-200 hover:border-slate-400 rounded-2xl flex items-center justify-between cursor-pointer active:scale-99 transition-all shadow-xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                  <SettingsIcon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">Settings & Cloud Sync</div>
                  <div className="text-xs text-slate-500">
                    Opening balances, PIN code, Supabase
                  </div>
                </div>
              </div>
              <span className="text-xs font-bold text-slate-700">Open →</span>
            </div>
          </div>
        </div>
      )}

      {/* --- 1. SUBVIEW: STOCK & VALUATION --- */}
      {activeSubView === 'stock' && (
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-lg font-black text-slate-900 tracking-tight">Stock & Valuation</h1>
            <p className="text-xs text-slate-500">
              Live quantities in KG and Quintals with weighted average cost
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <div className="divide-y divide-slate-100">
              {stockList.map((item) => (
                <div key={item.product_id} className="py-3 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-black text-slate-900">{item.product_name}</span>
                      {item.is_low_stock && (
                        <span className="px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">
                          Low Stock
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-black text-emerald-800">
                      Val: {formatINR(item.stock_value)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>
                      Current Stock: <strong>{formatQuantity(item.current_stock_kg)}</strong>
                    </span>
                    <span>
                      Avg Cost: <strong>₹{item.weightedAverageCostPerKg}/kg</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-1 text-[10px] text-slate-400 bg-slate-50 p-2 rounded-xl mt-1">
                    <div>
                      Bought: <strong className="text-slate-700">{item.total_purchased_kg}kg</strong>
                    </div>
                    <div>
                      Sold: <strong className="text-slate-700">{item.total_sold_kg}kg</strong>
                    </div>
                    <div>
                      Loss: <strong className="text-amber-700">{item.total_loss_kg}kg</strong>
                    </div>
                    <div>
                      Min Alert: <strong className="text-slate-700">{item.min_stock_alert_kg}kg</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- 2. SUBVIEW: WEIGHT LOSS --- */}
      {activeSubView === 'weight_loss' && (
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-lg font-black text-slate-900 tracking-tight">
              Weight Difference / Loss
            </h1>
            <p className="text-xs text-slate-500">
              Record shrinkage, drying loss or spillage to deduct stock & track loss value
            </p>
          </div>

          {/* Record Loss Form */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
              Record Weight Difference
            </h2>

            <form onSubmit={handleRecordWeightLoss} className="flex flex-col gap-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700">Date</label>
                <input
                  type="date"
                  value={lossDate}
                  onChange={(e) => setLossDate(e.target.value)}
                  className="w-full h-11 mt-1 px-3 border border-slate-300 rounded-xl font-bold text-sm bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Product</label>
                <select
                  value={lossProductId}
                  onChange={(e) => setLossProductId(e.target.value)}
                  className="w-full h-11 mt-1 px-3 border border-slate-300 rounded-xl font-bold text-sm bg-white"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">
                  Quantity Lost (KG) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="e.g. 2.5"
                  required
                  value={lossQtyRaw}
                  onChange={(e) => setLossQtyRaw(e.target.value)}
                  className="w-full h-12 mt-1 px-3 text-lg font-bold border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Reason</label>
                <select
                  value={lossReason}
                  onChange={(e) => setLossReason(e.target.value as LossReason)}
                  className="w-full h-11 mt-1 px-3 border border-slate-300 rounded-xl font-bold text-sm bg-white"
                >
                  <option value="Drying">Drying (Sun drying produce)</option>
                  <option value="Shrinkage">Shrinkage (Moisture reduction)</option>
                  <option value="Wastage">Wastage (Spoiled lot)</option>
                  <option value="Spillage">Spillage (Transit / handling)</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Note (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 5 bags drying batch #2"
                  value={lossNote}
                  onChange={(e) => setLossNote(e.target.value)}
                  className="w-full h-10 mt-1 px-3 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full h-12 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl active:scale-98 transition-all text-xs"
              >
                Save Weight Difference
              </button>
            </form>
          </div>

          {/* History */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
              Recorded Losses ({weight_losses.length})
            </h2>

            {weight_losses.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No weight losses recorded</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {weight_losses.map((wl) => (
                  <div key={wl.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        {wl.product_name} - {wl.quantity_lost_kg} kg ({wl.reason})
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {wl.date} {wl.notes ? `• ${wl.notes}` : ''}
                      </div>
                    </div>
                    <div className="text-xs font-black text-rose-600">
                      -{formatINR(wl.total_loss_value)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- 3. SUBVIEW: EXPENSES --- */}
      {activeSubView === 'expenses' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-black text-slate-900 tracking-tight">Shop Expenses</h1>
              <p className="text-xs text-slate-500">
                Monthly expenses (Salary, Rent, Kuri, Transport...)
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddCatModalOpen(true)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
            >
              + Category
            </button>
          </div>

          {/* Add Expense Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
              Record New Expense
            </h2>

            <form onSubmit={handleAddExpenseSubmit} className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-600">Date</label>
                  <input
                    type="date"
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    className="w-full h-11 px-2 border border-slate-300 rounded-xl text-xs font-bold bg-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600">Category</label>
                  <select
                    value={expCategory}
                    onChange={(e) => setExpCategory(e.target.value)}
                    className="w-full h-11 px-2 border border-slate-300 rounded-xl text-xs font-bold bg-white"
                  >
                    {expense_categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600">
                  Amount (₹) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="e.g. 2000"
                  required
                  value={expAmount}
                  onChange={(e) => setExpAmount(e.target.value)}
                  className="w-full h-12 px-3 text-lg font-bold border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600">Payment Mode</label>
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
                    Cash
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

              <input
                type="text"
                placeholder="Optional notes..."
                value={expNote}
                onChange={(e) => setExpNote(e.target.value)}
                className="w-full h-10 px-3 text-xs border border-slate-300 rounded-xl"
              />

              <button
                type="submit"
                className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl active:scale-98 transition-all text-xs"
              >
                Save Expense
              </button>
            </form>
          </div>

          {/* Monthly Expense Summary */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
              Expenses History ({expenses.length})
            </h2>

            {expenses.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No expenses recorded</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {expenses.map((e) => (
                  <div key={e.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900">{e.category_name}</div>
                      <div className="text-[10px] text-slate-400">
                        {e.date} • {e.payment_mode === 'cash' ? 'Cash' : 'Bank'}
                        {e.notes ? ` • ${e.notes}` : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-black text-rose-600">{formatINR(e.amount)}</span>
                      <button
                        type="button"
                        onClick={() => deleteExpense(e.id)}
                        className="text-slate-400 hover:text-rose-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- 4. SUBVIEW: PROFIT REPORTS --- */}
      {activeSubView === 'reports' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-black text-slate-900 tracking-tight">Profit Reports</h1>
              <p className="text-xs text-slate-500">Daily & Monthly trading profitability</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportReportPDF}
                className="flex items-center gap-1 text-xs font-bold text-slate-700 bg-white border border-slate-200 px-2.5 py-1.5 rounded-xl shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>PDF</span>
              </button>
              <button
                type="button"
                onClick={handleExportReportCSV}
                className="flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1.5 rounded-xl"
              >
                <span>CSV</span>
              </button>
            </div>
          </div>

          {/* Toggle Daily vs Monthly */}
          <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setReportType('daily')}
              className={`py-2 text-xs font-extrabold rounded-lg transition-all ${
                reportType === 'daily'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Daily Profit (Excl. Expenses)
            </button>
            <button
              type="button"
              onClick={() => setReportType('monthly')}
              className={`py-2 text-xs font-extrabold rounded-lg transition-all ${
                reportType === 'monthly'
                  ? 'bg-white text-blue-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Monthly Net Profit (Incl. Expenses)
            </button>
          </div>

          {reportType === 'daily' ? (
            /* DAILY PROFIT VIEW */
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between bg-white border border-slate-200 p-3 rounded-2xl shadow-xs">
                <span className="text-xs font-bold text-slate-600">Select Date</span>
                <input
                  type="date"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  className="text-xs font-bold text-slate-800 bg-transparent border border-slate-300 rounded-lg px-2 py-1"
                />
              </div>

              {/* Notice Banner */}
              <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Note:</strong> Expenses are counted in the monthly report.
                </span>
              </div>

              {/* Summary Cards */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <div className="text-[11px] font-bold text-slate-500 uppercase">Sales Revenue</div>
                    <div className="text-base font-black text-slate-900 mt-0.5">
                      {formatINR(dailyReport.total_sales)}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl">
                    <div className="text-[11px] font-bold text-slate-500 uppercase">COGS</div>
                    <div className="text-base font-black text-slate-700 mt-0.5">
                      {formatINR(dailyReport.total_cogs)}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl">
                    <div className="text-[11px] font-bold text-slate-500 uppercase">Shrinkage Loss</div>
                    <div className="text-base font-black text-rose-600 mt-0.5">
                      -{formatINR(dailyReport.shrinkage_loss_value)}
                    </div>
                  </div>

                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                    <div className="text-[11px] font-black text-emerald-800 uppercase">Daily Profit</div>
                    <div className="text-lg font-black text-emerald-700 mt-0.5">
                      {formatINR(dailyReport.daily_profit)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Item-wise breakdown */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
                  Item-wise Profit Breakdown
                </h2>

                {dailyReport.items.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">No sales on this day</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {dailyReport.items.map((it) => (
                      <div key={it.product_id} className="py-2.5 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-slate-900">{it.product_name}</div>
                          <div className="text-[10px] text-slate-500">
                            Qty: {it.quantity_sold_kg}kg • Rev: {formatINR(it.sales_amount)} • Cost: {formatINR(it.cogs_amount)}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-xs font-black text-emerald-700">
                            +{formatINR(it.profit)}
                          </div>
                          <div className="text-[10px] text-slate-400 font-semibold">
                            ₹{it.profit_per_kg.toFixed(2)}/kg
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* MONTHLY NET PROFIT VIEW */
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between bg-white border border-slate-200 p-3 rounded-2xl shadow-xs">
                <span className="text-xs font-bold text-slate-600">Select Month</span>
                <input
                  type="month"
                  value={reportMonth}
                  onChange={(e) => setReportMonth(e.target.value)}
                  className="text-xs font-bold text-slate-800 bg-transparent border border-slate-300 rounded-lg px-2 py-1"
                />
              </div>

              {/* High-level figures */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <div className="text-[11px] font-bold text-slate-500">Gross Sales</div>
                    <div className="text-sm font-black text-slate-900 mt-0.5">
                      {formatINR(monthlyReport.total_sales)}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl">
                    <div className="text-[11px] font-bold text-slate-500">Gross Profit</div>
                    <div className="text-sm font-black text-slate-900 mt-0.5">
                      {formatINR(monthlyReport.gross_profit)}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl">
                    <div className="text-[11px] font-bold text-slate-500">Shrinkage Loss</div>
                    <div className="text-sm font-black text-rose-600 mt-0.5">
                      -{formatINR(monthlyReport.shrinkage_loss_value)}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl">
                    <div className="text-[11px] font-bold text-slate-500">Shop Expenses</div>
                    <div className="text-sm font-black text-rose-600 mt-0.5">
                      -{formatINR(monthlyReport.total_expenses)}
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-xl flex items-center justify-between">
                  <div>
                    <div className="text-xs uppercase font-bold text-emerald-100">Monthly Net Profit</div>
                    <div className="text-xl font-black">{formatINR(monthlyReport.net_profit)}</div>
                  </div>

                  {monthlyReport.previous_month && (
                    <div className="text-right text-[11px] text-emerald-100">
                      <div>Prev Month:</div>
                      <div className="font-bold">{formatINR(monthlyReport.previous_month.net_profit)}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Expenses by Category */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
                  Monthly Expenses by Category
                </h2>

                {monthlyReport.expenses_by_category.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3 text-center">No expenses in this month</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {monthlyReport.expenses_by_category.map((ec) => (
                      <div key={ec.category} className="py-2 flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800">{ec.category}</span>
                        <span className="font-bold text-rose-600">{formatINR(ec.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- 5. SUBVIEW: CASH BOOK --- */}
      {activeSubView === 'cash_book' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-black text-slate-900 tracking-tight">Daily Cash Book</h1>
              <p className="text-xs text-slate-500">Live physical cash & bank ledger tracking</p>
            </div>

            <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={cashBookDate}
                onChange={(e) => setCashBookDate(e.target.value)}
                className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none"
              />
            </div>
          </div>

          {/* Cash Summary Banner */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl">
              <div className="text-[11px] font-bold text-emerald-800 uppercase">Closing Cash in Hand</div>
              <div className="text-lg font-black text-emerald-900 mt-0.5">
                {formatINR(cashBook.closing_cash)}
              </div>
              <div className="text-[10px] text-emerald-700 mt-1">
                Opening: {formatINR(cashBook.opening_cash)}
              </div>
            </div>

            <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl">
              <div className="text-[11px] font-bold text-blue-800 uppercase">Closing Bank / UPI</div>
              <div className="text-lg font-black text-blue-900 mt-0.5">
                {formatINR(cashBook.closing_bank)}
              </div>
              <div className="text-[10px] text-blue-700 mt-1">
                Opening: {formatINR(cashBook.opening_bank)}
              </div>
            </div>
          </div>

          {/* Cash In & Out of Day */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
              Daily Transactions ({cashBook.entries.length})
            </h2>

            {cashBook.entries.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                No money movements on this date
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {cashBook.entries.map((en) => (
                  <div key={en.id} className="py-2.5 flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-slate-900">{en.description}</div>
                      <div className="text-[10px] text-slate-400">
                        {en.mode === 'cash' ? 'Cash' : 'Bank'} • {en.time}
                      </div>
                    </div>

                    <div className="text-right">
                      {en.amount_in > 0 && (
                        <div className="text-xs font-bold text-emerald-700">+{formatINR(en.amount_in)}</div>
                      )}
                      {en.amount_out > 0 && (
                        <div className="text-xs font-bold text-rose-600">-{formatINR(en.amount_out)}</div>
                      )}
                      <div className="text-[10px] text-slate-400">
                        {en.mode === 'cash' ? `Cash: ${formatINR(en.running_cash)}` : `Bank: ${formatINR(en.running_bank)}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- 6. SUBVIEW: PRODUCTS & DAILY RATES --- */}
      {activeSubView === 'products' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-black text-slate-900 tracking-tight">Products & Rates</h1>
              <p className="text-xs text-slate-500">
                10 Malayalam products, minimum stock alerts & daily selling rates
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsAddProductModalOpen(true)}
              className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Product</span>
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
              Configured Products ({products.length})
            </h2>

            <div className="divide-y divide-slate-100">
              {products.map((p) => {
                const dayRate = getDailyRate(p.id, todayStr);
                return (
                  <div key={p.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span>{p.name}</span>
                        {!p.is_active && (
                          <span className="text-[10px] bg-slate-100 text-slate-500 px-1 rounded">
                            Inactive
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Min Alert: {p.min_stock_alert_kg} kg
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">Today&apos;s Rate</span>
                        <span className="text-xs font-bold text-blue-700">
                          {dayRate ? `₹${dayRate}/kg` : 'Not set'}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => updateProduct(p.id, { is_active: !p.is_active })}
                        className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${
                          p.is_active
                            ? 'bg-rose-50 border-rose-200 text-rose-700'
                            : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        }`}
                      >
                        {p.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* --- 7. SUBVIEW: SETTINGS & CLOUD SYNC --- */}
      {activeSubView === 'settings' && (
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-lg font-black text-slate-900 tracking-tight">Settings & Cloud</h1>
            <p className="text-xs text-slate-500">Shop profile, opening balances, PIN & Supabase</p>
          </div>

          <form onSubmit={handleSaveSettings} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col gap-3.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Shop Profile & Balances
            </h2>

            <div>
              <label className="text-xs font-semibold text-slate-700">Shop Name</label>
              <input
                type="text"
                value={settingsForm.shop_name}
                onChange={(e) => setSettingsForm({ ...settingsForm, shop_name: e.target.value })}
                className="w-full h-11 mt-1 px-3 border border-slate-300 rounded-xl text-sm font-semibold"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">Owner Name</label>
              <input
                type="text"
                value={settingsForm.owner_name}
                onChange={(e) => setSettingsForm({ ...settingsForm, owner_name: e.target.value })}
                className="w-full h-11 mt-1 px-3 border border-slate-300 rounded-xl text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-slate-700">Opening Cash (₹)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={settingsForm.opening_cash_balance}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      opening_cash_balance: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full h-11 mt-1 px-3 border border-slate-300 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">Opening Bank (₹)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={settingsForm.opening_bank_balance}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      opening_bank_balance: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full h-11 mt-1 px-3 border border-slate-300 rounded-xl font-bold"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">Owner Security PIN (4 Digits)</label>
              <input
                type="password"
                maxLength={4}
                value={settingsForm.pin_code}
                onChange={(e) => setSettingsForm({ ...settingsForm, pin_code: e.target.value })}
                className="w-full h-11 mt-1 px-3 border border-slate-300 rounded-xl font-bold tracking-widest text-center"
              />
            </div>

            <button
              type="submit"
              className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl mt-2 active:scale-98 transition-all text-xs"
            >
              Save Settings
            </button>
          </form>

          {/* Backup & Restore */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col gap-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Data Backup & Restore
            </h2>
            <p className="text-xs text-slate-500">
              Export your entire Shop ERP database as a JSON backup file or restore from a previous file.
            </p>

            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                type="button"
                onClick={handleBackupExport}
                className="h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Export Backup</span>
              </button>

              <label className="h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer">
                <Share2 className="w-4 h-4" />
                <span>Import JSON</span>
                <input type="file" accept=".json" onChange={handleBackupImport} className="hidden" />
              </label>
            </div>

            <button
              type="button"
              onClick={() => {
                if (confirm('Reset Shop ERP to default demo data? All current changes will be restored to clean demo state.')) {
                  resetToDemo();
                  alert('Reset complete!');
                }
              }}
              className="mt-2 text-xs text-rose-600 hover:text-rose-800 font-semibold text-center py-2"
            >
              Reset to Initial Demo State
            </button>
          </div>
        </div>
      )}

      {/* ADD EXPENSE CATEGORY MODAL */}
      <Modal
        isOpen={isAddCatModalOpen}
        onClose={() => setIsAddCatModalOpen(false)}
        title="Add Expense Category"
      >
        <form onSubmit={handleAddNewCategory} className="flex flex-col gap-3.5">
          <div>
            <label className="text-xs font-semibold text-slate-700">Category Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Vehicle Repair, Fuel"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="w-full h-11 mt-1 px-3 border border-slate-300 rounded-xl font-semibold text-sm"
              autoFocus
            />
          </div>
          <button
            type="submit"
            className="w-full h-12 bg-slate-900 text-white font-bold rounded-xl active:scale-98"
          >
            Create Category
          </button>
        </form>
      </Modal>

      {/* ADD PRODUCT MODAL */}
      <Modal
        isOpen={isAddProductModalOpen}
        onClose={() => setIsAddProductModalOpen(false)}
        title="Add Produce Product"
      >
        <form onSubmit={handleAddProductSubmit} className="flex flex-col gap-3.5">
          <div>
            <label className="text-xs font-semibold text-slate-700">Product Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Cardamom / Elakkaya"
              value={newProductName}
              onChange={(e) => setNewProductName(e.target.value)}
              className="w-full h-11 mt-1 px-3 border border-slate-300 rounded-xl font-semibold text-sm"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700">Min Stock Alert Threshold (kg)</label>
            <input
              type="text"
              inputMode="decimal"
              value={newProductMinStock}
              onChange={(e) => setNewProductMinStock(e.target.value)}
              placeholder="50"
              className="w-full h-11 mt-1 px-3 border border-slate-300 rounded-xl font-semibold text-sm"
            />
          </div>
          <button
            type="submit"
            className="w-full h-12 bg-emerald-600 text-white font-bold rounded-xl active:scale-98"
          >
            Create Product
          </button>
        </form>
      </Modal>
    </div>
  );
};
