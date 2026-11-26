'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/use-store';
import { Unit, PaymentMode, SaleItem } from '@/types';
import { QuantityInput } from '@/components/QuantityInput';
import {
  formatINR,
  formatQuantity,
  computeProductCostHistory,
} from '@/lib/calculations';
import {
  Plus,
  Trash2,
  Calendar,
  CheckCircle2,
  UserPlus,
  Search,
  TrendingUp,
  AlertTriangle,
  ChevronDown,
  Scale,
} from 'lucide-react';
import { Modal } from '@/components/Modal';

export const SellView: React.FC = () => {
  const {
    products,
    parties,
    sales,
    purchases,
    weight_losses,
    stock_adjustments,
    daily_rates,
    addParty,
    addSale,
    deleteSale,
    addWeightLoss,
    getDailyRate,
    setDailyRate,
  } = useStore();

  const todayStr = new Date().toISOString().slice(0, 10);
  const activeProducts = products.filter((p) => p.is_active);

  // Form State
  const [saleDate, setSaleDate] = useState<string>(todayStr);
  const [partySearch, setPartySearch] = useState<string>('');
  const [selectedPartyId, setSelectedPartyId] = useState<string>(parties[0]?.id || '');
  const [showPartyDropdown, setShowPartyDropdown] = useState<boolean>(false);
  const [isNewPartyModalOpen, setIsNewPartyModalOpen] = useState<boolean>(false);

  // Rate Setting Modal
  const [isRateSettingModalOpen, setIsRateSettingModalOpen] = useState<boolean>(false);
  const [tempRates, setTempRates] = useState<Record<string, string>>({});

  // New Party inline form
  const [newPartyName, setNewPartyName] = useState<string>('');
  const [newPartyPhone, setNewPartyPhone] = useState<string>('');
  const [newPartyPlace, setNewPartyPlace] = useState<string>('');
  const [newPartyOpening, setNewPartyOpening] = useState<string>('0');

  // Multi-item sales lines
  interface DraftSaleItem {
    id: string;
    product_id: string;
    product_name: string;
    raw_qty: string;
    rate_per_kg: string;
    // Optional weigh-in vs weigh-out
    show_weight_diff: boolean;
    shop_weight_raw: string;
    party_weight_raw: string;
  }

  const initialProd = activeProducts[0];
  const initialDefaultRate = initialProd ? getDailyRate(initialProd.id, saleDate) : null;

  const [items, setItems] = useState<DraftSaleItem[]>([
    {
      id: 's-item-1',
      product_id: initialProd?.id || '',
      product_name: initialProd?.name || '',
      raw_qty: '',
      rate_per_kg: initialDefaultRate ? initialDefaultRate.toString() : '',
      show_weight_diff: false,
      shop_weight_raw: '',
      party_weight_raw: '',
    },
  ]);

  // Payment State
  const [receivedNow, setReceivedNow] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('bank'); // sales usually bank/UPI
  const [notes, setNotes] = useState<string>('');
  const [stockOverrideConfirmed, setStockOverrideConfirmed] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Filtered parties
  const filteredParties = parties.filter(
    (p) =>
      p.is_active &&
      (p.name.toLowerCase().includes(partySearch.toLowerCase()) ||
        (p.place && p.place.toLowerCase().includes(partySearch.toLowerCase())) ||
        (p.phone && p.phone.includes(partySearch)))
  );

  const selectedParty = parties.find((p) => p.id === selectedPartyId);

  // Helper for product change to auto-load Today's selling rate
  const handleProductChange = (itemId: string, newProductId: string) => {
    const prod = activeProducts.find((p) => p.id === newProductId);
    const dayRatePerKg = getDailyRate(newProductId, saleDate);

    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== itemId) return i;
        const ratePerKg = dayRatePerKg ? dayRatePerKg.toString() : i.rate_per_kg;
        return {
          ...i,
          product_id: newProductId,
          product_name: prod?.name || '',
          rate_per_kg: ratePerKg,
        };
      })
    );
  };

  const handleAddItem = () => {
    const nextProd = activeProducts[0];
    const dayRate = nextProd ? getDailyRate(nextProd.id, saleDate) : null;
    setItems((prev) => [
      ...prev,
      {
        id: `s-item-${Date.now()}`,
        product_id: nextProd?.id || '',
        product_name: nextProd?.name || '',
        raw_qty: '',
        rate_per_kg: dayRate ? dayRate.toString() : '',
        show_weight_diff: false,
        shop_weight_raw: '',
        party_weight_raw: '',
      },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleUpdateItem = (id: string, updates: Partial<DraftSaleItem>) => {
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        return { ...i, ...updates };
      })
    );
  };

  // Computations
  const computedItems = items.map((it) => {
    const qtyKg = parseFloat(it.raw_qty) || 0;
    const ratePerKg = parseFloat(it.rate_per_kg) || 0;
    const lineTotal = Number((qtyKg * ratePerKg).toFixed(2));

    // Stock & Cost
    const costInfo = computeProductCostHistory(
      it.product_id,
      purchases,
      sales,
      weight_losses,
      stock_adjustments
    );
    const availableStockKg = costInfo.currentStockKg;
    const weightedAvgCost = costInfo.weightedAverageCostPerKg;
    const cogsAmount = Number((qtyKg * weightedAvgCost).toFixed(2));
    const isInsufficientStock = qtyKg > availableStockKg;

    // Weight Difference
    let weightDiffKg = 0;
    if (it.show_weight_diff) {
      const shopW = parseFloat(it.shop_weight_raw) || qtyKg;
      const partyW = parseFloat(it.party_weight_raw) || qtyKg;
      weightDiffKg = Math.max(0, shopW - partyW);
    }

    return {
      item: it,
      qtyKg,
      ratePerKg,
      lineTotal,
      availableStockKg,
      weightedAvgCost,
      cogsAmount,
      isInsufficientStock,
      weightDiffKg,
    };
  });

  const grandTotal = computedItems.reduce((acc, ci) => acc + ci.lineTotal, 0);
  const totalCogs = computedItems.reduce((acc, ci) => acc + ci.cogsAmount, 0);
  const receivedAmount = parseFloat(receivedNow) || 0;
  const balanceReceivable = Math.max(0, grandTotal - receivedAmount);
  const hasInsufficientStock = computedItems.some((ci) => ci.isInsufficientStock);

  const handleSaveParty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartyName.trim()) return;
    const added = addParty({
      name: newPartyName.trim(),
      phone: newPartyPhone.trim() || undefined,
      place: newPartyPlace.trim() || undefined,
      opening_balance_receivable: parseFloat(newPartyOpening) || 0,
      is_active: true,
    });
    setSelectedPartyId(added.id);
    setIsNewPartyModalOpen(false);
    setNewPartyName('');
    setNewPartyPhone('');
    setNewPartyPlace('');
    setNewPartyOpening('0');
  };

  const handleOpenRatesModal = () => {
    const rates: Record<string, string> = {};
    activeProducts.forEach((p) => {
      const r = getDailyRate(p.id, saleDate);
      rates[p.id] = r ? r.toString() : '';
    });
    setTempRates(rates);
    setIsRateSettingModalOpen(true);
  };

  const handleSaveRates = (e: React.FormEvent) => {
    e.preventDefault();
    Object.entries(tempRates).forEach(([prodId, val]) => {
      const parsed = parseFloat(val);
      if (!isNaN(parsed) && parsed >= 0) {
        setDailyRate(prodId, saleDate, parsed);
      }
    });
    setIsRateSettingModalOpen(false);
    // Refresh current item default rates if blank
    setItems((prev) =>
      prev.map((it) => {
        const ratePerKg = parseFloat(tempRates[it.product_id]);
        if (!ratePerKg) return it;
        return {
          ...it,
          rate_per_kg: ratePerKg.toString(),
        };
      })
    );
  };

  const handleSaveSale = () => {
    if (!selectedPartyId) {
      alert('Please select a party');
      return;
    }
    const validLines = computedItems.filter((ci) => ci.qtyKg > 0 && ci.ratePerKg > 0);
    if (validLines.length === 0) {
      alert('Please enter valid quantity and selling rate for at least one item');
      return;
    }

    if (hasInsufficientStock && !stockOverrideConfirmed) {
      alert(
        'Warning: Current stock is insufficient for one or more items. Check the override checkbox below to confirm sale.'
      );
      return;
    }

    const saleId = `sale-${Date.now()}`;

    const saleItems: SaleItem[] = validLines.map((vl) => ({
      id: `si-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sale_id: saleId,
      product_id: vl.item.product_id,
      product_name: vl.item.product_name,
      quantity_kg: vl.qtyKg,
      selling_rate_per_kg: vl.ratePerKg,
      total_amount: vl.lineTotal,
      cost_rate_per_kg: vl.weightedAvgCost,
      cogs_amount: vl.cogsAmount,
      input_unit: 'kg',
      input_quantity: parseFloat(vl.item.raw_qty) || 0,
      shop_weight_kg: vl.item.show_weight_diff ? parseFloat(vl.item.shop_weight_raw) : undefined,
      party_weight_kg: vl.item.show_weight_diff ? parseFloat(vl.item.party_weight_raw) : undefined,
      weight_diff_kg: vl.weightDiffKg > 0 ? vl.weightDiffKg : undefined,
    }));

    addSale({
      date: saleDate,
      party_id: selectedPartyId,
      party_name: selectedParty?.name || 'Party',
      total_amount: grandTotal,
      received_amount: receivedAmount,
      payment_mode: paymentMode,
      balance_receivable: balanceReceivable,
      total_cogs: totalCogs,
      notes: notes.trim() || undefined,
      items: saleItems,
    });

    // Auto-record weight difference if any item had weigh-in vs weigh-out difference
    validLines.forEach((vl) => {
      if (vl.weightDiffKg > 0) {
        addWeightLoss({
          date: saleDate,
          product_id: vl.item.product_id,
          product_name: vl.item.product_name,
          quantity_lost_kg: vl.weightDiffKg,
          reason: 'Other',
          cost_rate_per_kg: vl.weightedAvgCost,
          total_loss_value: Number((vl.weightDiffKg * vl.weightedAvgCost).toFixed(2)),
          sale_id: saleId,
          notes: `Weigh-out difference at ${selectedParty?.name || 'Party'} end`,
        });
      }
    });

    setSuccessToast(`Sale of ${formatINR(grandTotal)} recorded successfully!`);
    setTimeout(() => setSuccessToast(null), 3000);

    // Reset Form
    setItems([
      {
        id: `s-item-${Date.now()}`,
        product_id: initialProd?.id || '',
        product_name: initialProd?.name || '',
        raw_qty: '',
        rate_per_kg: initialDefaultRate ? initialDefaultRate.toString() : '',
        show_weight_diff: false,
        shop_weight_raw: '',
        party_weight_raw: '',
      },
    ]);
    setReceivedNow('');
    setNotes('');
    setStockOverrideConfirmed(false);
  };

  const todaySales = sales
    .filter((s) => s.date === saleDate)
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));

  return (
    <div className="flex flex-col gap-5 pb-12">
      {/* Toast */}
      {successToast && (
        <div className="sticky top-14 z-30 bg-emerald-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 animate-in slide-in-from-top duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-200" />
          <span>{successToast}</span>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black text-slate-900 tracking-tight">Sell to Parties</h1>
          <p className="text-xs text-slate-500">Bulk sale billing & COGS deduction</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Today's Selling Rates Button */}
          <button
            type="button"
            onClick={handleOpenRatesModal}
            className="px-2.5 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold hover:bg-blue-100 transition-colors shadow-2xs"
          >
            Today&apos;s Rates
          </button>

          {/* Date Picker */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={saleDate}
              onChange={(e) => setSaleDate(e.target.value)}
              className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* PARTY SELECTION */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Party (Customer / Buyer) <span className="text-rose-500">*</span>
          </label>
          <button
            type="button"
            onClick={() => setIsNewPartyModalOpen(true)}
            className="text-xs font-bold text-blue-700 hover:text-blue-800 flex items-center gap-1"
          >
            <UserPlus className="w-3.5 h-3.5" />
            + Add New Party
          </button>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowPartyDropdown((prev) => !prev)}
            className="w-full h-12 px-3.5 flex items-center justify-between bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl text-left transition-colors"
          >
            {selectedParty ? (
              <div>
                <span className="text-sm font-bold text-slate-900">{selectedParty.name}</span>
                {selectedParty.place && (
                  <span className="text-xs text-slate-500 ml-2">({selectedParty.place})</span>
                )}
              </div>
            ) : (
              <span className="text-sm text-slate-400">Choose a party...</span>
            )}
            <ChevronDown className="w-4 h-4 text-slate-500" />
          </button>

          {showPartyDropdown && (
            <div className="absolute top-13 left-0 right-0 z-30 bg-white border border-slate-200 rounded-xl shadow-xl p-2 max-h-60 overflow-y-auto">
              <div className="relative mb-2">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search party name or place..."
                  value={partySearch}
                  onChange={(e) => setPartySearch(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  autoFocus
                />
              </div>

              <div className="divide-y divide-slate-100">
                {filteredParties.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSelectedPartyId(p.id);
                      setShowPartyDropdown(false);
                      setPartySearch('');
                    }}
                    className={`w-full py-2 px-2.5 text-left flex items-center justify-between rounded-lg hover:bg-blue-50 ${
                      p.id === selectedPartyId ? 'bg-blue-50 text-blue-800 font-bold' : 'text-slate-800'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-semibold">{p.name}</div>
                      <div className="text-[10px] text-slate-500">{p.place || 'Party'}</div>
                    </div>
                    {p.phone && <span className="text-[10px] text-slate-400">{p.phone}</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PRODUCE SALE ITEMS */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Sale Items
          </label>
          <button
            type="button"
            onClick={handleAddItem}
            className="text-xs font-bold text-blue-700 hover:text-blue-800 flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            + Another Item
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {items.map((it, idx) => {
            const computed = computedItems[idx];
            return (
              <div
                key={it.id}
                className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl flex flex-col gap-3 relative"
              >
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(it.id)}
                    className="absolute top-2 right-2 text-rose-500 hover:text-rose-700 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                {/* Product Select */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-600 uppercase">
                      Product ({idx + 1})
                    </label>
                    <span className="text-[11px] font-semibold text-slate-500">
                      Stock: <strong className="text-slate-800">{formatQuantity(computed.availableStockKg)}</strong>
                    </span>
                  </div>
                  <select
                    value={it.product_id}
                    onChange={(e) => handleProductChange(it.id, e.target.value)}
                    className="w-full h-11 mt-1 px-3 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900"
                  >
                    {activeProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantity */}
                <QuantityInput
                  label="Quantity Sold (KG)"
                  rawQuantity={it.raw_qty}
                  onQuantityChange={(val) => handleUpdateItem(it.id, { raw_qty: val })}
                  placeholder="e.g. 50 or 500"
                  required
                />

                {/* Selling Rate (per KG) */}
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase">
                    Selling Rate per KG (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="e.g. 800"
                    value={it.rate_per_kg}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^\d*\.?\d*$/.test(val)) {
                        handleUpdateItem(it.id, { rate_per_kg: val });
                      }
                    }}
                    className="w-full h-11 mt-1 px-3 text-base font-bold text-slate-900 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Optional Weigh-in vs Weigh-out toggle */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdateItem(it.id, { show_weight_diff: !it.show_weight_diff })
                    }
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1"
                  >
                    <Scale className="w-3.5 h-3.5 text-slate-400" />
                    <span>{it.show_weight_diff ? 'Hide' : '+ Optional Weigh-in vs Weigh-out difference'}</span>
                  </button>

                  {it.show_weight_diff && (
                    <div className="grid grid-cols-2 gap-2 mt-2 p-2.5 bg-amber-50/70 border border-amber-200 rounded-xl text-xs">
                      <div>
                        <label className="text-[10px] font-bold text-amber-900 uppercase">Shop Weight (kg)</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={it.shop_weight_raw}
                          onChange={(e) => handleUpdateItem(it.id, { shop_weight_raw: e.target.value })}
                          placeholder={computed.qtyKg.toString()}
                          className="w-full h-9 px-2 bg-white border border-amber-300 rounded-lg font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-amber-900 uppercase">Party Weight (kg)</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={it.party_weight_raw}
                          onChange={(e) => handleUpdateItem(it.id, { party_weight_raw: e.target.value })}
                          placeholder={computed.qtyKg.toString()}
                          className="w-full h-9 px-2 bg-white border border-amber-300 rounded-lg font-bold"
                        />
                      </div>
                      {computed.weightDiffKg > 0 && (
                        <div className="col-span-2 text-[11px] font-bold text-amber-800">
                          Recorded Loss: {computed.weightDiffKg} kg (Auto-deducted from stock & shrinkage report)
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Stock Warning If Insufficient */}
                {computed.isInsufficientStock && (
                  <div className="flex items-center gap-1.5 p-2 bg-rose-50 border border-rose-300 text-rose-800 rounded-lg text-xs font-bold">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>
                      Stock Warning: You only have {formatQuantity(computed.availableStockKg)}.
                    </span>
                  </div>
                )}

                {/* Cost of Goods Sold (COGS) info */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-200/80 text-xs">
                  <span className="text-slate-500 font-medium">
                    COGS (Avg ₹{computed.weightedAvgCost}/kg):
                  </span>
                  <span className="font-semibold text-slate-600">{formatINR(computed.cogsAmount)}</span>
                </div>

                {/* Line Total */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-700 font-bold">Line Total:</span>
                  <span className="font-extrabold text-blue-900 text-base">
                    {formatINR(computed.lineTotal)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* BILL TOTAL & RECEIVE PAYMENT SECTION */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col gap-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <span className="text-xs font-bold text-slate-500 uppercase">Total Bill Amount</span>
          <span className="text-xl font-black text-blue-900">{formatINR(grandTotal)}</span>
        </div>

        {/* Received Now */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-bold text-slate-700 uppercase">Received Now (₹)</label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setReceivedNow(grandTotal.toString())}
                className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200"
              >
                Received Full
              </button>
              <button
                type="button"
                onClick={() => setReceivedNow('0')}
                className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200"
              >
                Received 0 (Credit)
              </button>
            </div>
          </div>

          <input
            type="text"
            inputMode="decimal"
            placeholder="0"
            value={receivedNow}
            onChange={(e) => {
              const val = e.target.value;
              if (/^\d*\.?\d*$/.test(val)) {
                setReceivedNow(val);
              }
            }}
            className="w-full h-12 px-3.5 text-lg font-bold text-slate-900 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Payment Mode */}
        {receivedAmount > 0 && (
          <div>
            <label className="text-[11px] font-bold text-slate-600 uppercase">Payment Mode</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                type="button"
                onClick={() => setPaymentMode('cash')}
                className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                  paymentMode === 'cash'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-slate-700 border-slate-300'
                }`}
              >
                Cash
              </button>
              <button
                type="button"
                onClick={() => setPaymentMode('bank')}
                className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                  paymentMode === 'bank'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-700 border-slate-300'
                }`}
              >
                Bank / UPI
              </button>
            </div>
          </div>
        )}

        {/* Balance Receivable Badge */}
        <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800">
          <span>Balance Added to Receivable (Party Owes):</span>
          <span className="font-black text-sm">{formatINR(balanceReceivable)}</span>
        </div>

        {/* Stock Override Checkbox if insufficient */}
        {hasInsufficientStock && (
          <label className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-300 rounded-xl cursor-pointer">
            <input
              type="checkbox"
              checked={stockOverrideConfirmed}
              onChange={(e) => setStockOverrideConfirmed(e.target.checked)}
              className="w-4 h-4 text-rose-600 rounded"
            />
            <span className="text-xs font-bold text-rose-900">
              I confirm stock override to proceed with this sale
            </span>
          </label>
        )}

        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes / truck number..."
          className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl"
        />

        {/* SAVE SALE BUTTON */}
        <button
          type="button"
          onClick={handleSaveSale}
          className="h-13 w-full rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-extrabold text-sm shadow-md shadow-blue-600/30 transition-all flex items-center justify-center gap-1.5 mt-2"
        >
          <span>Complete Sale & Deduct Stock</span>
        </button>
      </div>

      {/* TODAY'S SALES LIST */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">Sales on {saleDate}</h2>
          </div>
          <span className="text-xs font-bold text-slate-500">{todaySales.length} Entries</span>
        </div>

        {todaySales.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">No sales recorded for this date</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {todaySales.map((s) => (
              <div key={s.id} className="py-3 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">{s.party_name}</span>
                  <span className="text-xs font-black text-blue-900">{formatINR(s.total_amount)}</span>
                </div>

                <div className="text-[11px] text-slate-500">
                  {s.items
                    .map((it) => `${it.product_name}: ${formatQuantity(it.quantity_kg)} @ ₹${it.selling_rate_per_kg}`)
                    .join(' | ')}
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                  <span>
                    Received: <strong className="text-emerald-700">{formatINR(s.received_amount)}</strong> ({s.payment_mode})
                    {s.balance_receivable > 0 && (
                      <span className="ml-2 text-emerald-800 font-bold">
                        Due: {formatINR(s.balance_receivable)}
                      </span>
                    )}
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Delete this sale? This will restore inventory.')) {
                        deleteSale(s.id);
                      }
                    }}
                    className="text-rose-500 hover:text-rose-700 font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* TODAY'S SELLING RATES MODAL */}
      <Modal
        isOpen={isRateSettingModalOpen}
        onClose={() => setIsRateSettingModalOpen(false)}
        title={`Today's Selling Rates (${saleDate})`}
      >
        <form onSubmit={handleSaveRates} className="flex flex-col gap-3">
          <p className="text-xs text-slate-500">
            Rates set here automatically default on all sale lines today for all parties.
          </p>

          <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
            {activeProducts.map((p) => (
              <div key={p.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="text-xs font-bold text-slate-900">{p.name}</div>
                <div className="flex items-center gap-1.5 w-32">
                  <span className="text-xs text-slate-400">₹</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="Rate/kg"
                    value={tempRates[p.id] ?? ''}
                    onChange={(e) =>
                      setTempRates({ ...tempRates, [p.id]: e.target.value })
                    }
                    className="w-full h-9 px-2 text-xs font-bold border border-slate-300 rounded-lg text-right"
                  />
                  <span className="text-[10px] text-slate-400">/kg</span>
                </div>
              </div>
            ))}
          </div>

          <button
            type="submit"
            className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl mt-2 active:scale-98 transition-all text-xs"
          >
            Save Today&apos;s Rates
          </button>
        </form>
      </Modal>

      {/* NEW PARTY MODAL */}
      <Modal
        isOpen={isNewPartyModalOpen}
        onClose={() => setIsNewPartyModalOpen(false)}
        title="Add New Party (Customer / Buyer)"
      >
        <form onSubmit={handleSaveParty} className="flex flex-col gap-3.5">
          <div>
            <label className="text-xs font-semibold text-slate-700">
              Party / Company Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={newPartyName}
              onChange={(e) => setNewPartyName(e.target.value)}
              placeholder="e.g. Malabar Spices Traders"
              className="w-full h-11 mt-1 px-3 text-sm font-semibold border border-slate-300 rounded-xl"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">Phone Number (Optional)</label>
            <input
              type="tel"
              value={newPartyPhone}
              onChange={(e) => setNewPartyPhone(e.target.value)}
              placeholder="e.g. 9846011223"
              className="w-full h-11 mt-1 px-3 text-sm border border-slate-300 rounded-xl"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">Place / Market (Optional)</label>
            <input
              type="text"
              value={newPartyPlace}
              onChange={(e) => setNewPartyPlace(e.target.value)}
              placeholder="e.g. Calicut Market"
              className="w-full h-11 mt-1 px-3 text-sm border border-slate-300 rounded-xl"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">
              Existing Opening Due Party Owes Us (₹)
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={newPartyOpening}
              onChange={(e) => setNewPartyOpening(e.target.value)}
              placeholder="0"
              className="w-full h-11 mt-1 px-3 text-sm font-semibold border border-slate-300 rounded-xl"
            />
          </div>

          <button
            type="submit"
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl mt-2 active:scale-98 transition-all"
          >
            Save Party & Select
          </button>
        </form>
      </Modal>
    </div>
  );
};
