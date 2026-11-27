'use client';

import React, { useState, useId } from 'react';
import { useStore } from '@/lib/use-store';
import { Unit, PaymentMode, PurchaseItem } from '@/types';
import { QuantityInput } from '@/components/QuantityInput';
import { formatINR, formatQuantity } from '@/lib/calculations';
import {
  Plus,
  Trash2,
  Calendar,
  CheckCircle2,
  UserPlus,
  Search,
  ShoppingCart,
  ChevronDown,
  Pencil,
  RotateCcw,
} from 'lucide-react';
import { Modal } from '@/components/Modal';

export const BuyView: React.FC = () => {
  const {
    products,
    farmers,
    purchases,
    addFarmer,
    addPurchase,
    updatePurchase,
    deletePurchase,
    last_used_product_id,
  } = useStore();

  const todayStr = new Date().toISOString().slice(0, 10);
  const activeProducts = products.filter((p) => p.is_active);

  // Form State
  const [purchaseDate, setPurchaseDate] = useState<string>(todayStr);
  const [farmerSearch, setFarmerSearch] = useState<string>('');
  const [selectedFarmerId, setSelectedFarmerId] = useState<string>(farmers[0]?.id || '');
  const [showFarmerDropdown, setShowFarmerDropdown] = useState<boolean>(false);
  const [isNewFarmerModalOpen, setIsNewFarmerModalOpen] = useState<boolean>(false);

  // New Farmer inline form
  const [newFarmerName, setNewFarmerName] = useState<string>('');
  const [newFarmerPhone, setNewFarmerPhone] = useState<string>('');
  const [newFarmerPlace, setNewFarmerPlace] = useState<string>('');
  const [newFarmerOpening, setNewFarmerOpening] = useState<string>('0');

  // Items in current purchase
  interface DraftItem {
    id: string;
    product_id: string;
    product_name: string;
    unit: Unit;
    raw_qty: string;
    rate_per_kg: string;
    custom_total?: string;
  }

  const initialProductId =
    last_used_product_id && activeProducts.some((p) => p.id === last_used_product_id)
      ? last_used_product_id
      : activeProducts[0]?.id || '';

  const [items, setItems] = useState<DraftItem[]>([
    {
      id: 'item-1',
      product_id: initialProductId,
      product_name: activeProducts.find((p) => p.id === initialProductId)?.name || '',
      unit: 'kg',
      raw_qty: '',
      rate_per_kg: '',
    },
  ]);

  // Payment State
  const [paidNow, setPaidNow] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash');
  const [notes, setNotes] = useState<string>('');
  const [billRoundAdjustment, setBillRoundAdjustment] = useState<number>(0);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Edit Existing Purchase State
  interface EditPurchaseState {
    id: string;
    farmer_name: string;
    total_amount: string;
    paid_amount: string;
    payment_mode: PaymentMode;
    date: string;
    notes: string;
  }
  const [editingPurchase, setEditingPurchase] = useState<EditPurchaseState | null>(null);

  // Filtered farmers
  const filteredFarmers = farmers.filter(
    (f) =>
      f.is_active &&
      (f.name.toLowerCase().includes(farmerSearch.toLowerCase()) ||
        (f.place && f.place.toLowerCase().includes(farmerSearch.toLowerCase())) ||
        (f.phone && f.phone.includes(farmerSearch)))
  );

  const selectedFarmer = farmers.find((f) => f.id === selectedFarmerId);

  // Item helpers
  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        product_id: initialProductId,
        product_name: activeProducts.find((p) => p.id === initialProductId)?.name || '',
        unit: 'kg',
        raw_qty: '',
        rate_per_kg: '',
      },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleUpdateItem = (id: string, updates: Partial<DraftItem>) => {
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        const updated = { ...i, ...updates };
        if (updates.product_id) {
          const prod = activeProducts.find((p) => p.id === updates.product_id);
          if (prod) updated.product_name = prod.name;
        }
        return updated;
      })
    );
  };

  // Calculations for current draft
  const computedItems: {
    item: DraftItem;
    qtyKg: number;
    rate: number;
    calculatedTotal: number;
    total: number;
    isCustomTotal: boolean;
  }[] = items.map((it) => {
    const rawQty = parseFloat(it.raw_qty) || 0;
    const qtyKg = rawQty;
    const rate = parseFloat(it.rate_per_kg) || 0;
    const calculatedTotal = Number((qtyKg * rate).toFixed(2));
    const hasCustomTotal =
      it.custom_total !== undefined &&
      it.custom_total !== '' &&
      !isNaN(parseFloat(it.custom_total));
    const total = hasCustomTotal ? parseFloat(it.custom_total!) : calculatedTotal;
    return {
      item: it,
      qtyKg,
      rate,
      calculatedTotal,
      total,
      isCustomTotal: hasCustomTotal,
    };
  });

  const sumActualTotals = computedItems.reduce((acc, ci) => acc + ci.total, 0);
  const grandTotal = Math.max(0, Number((sumActualTotals + billRoundAdjustment).toFixed(2)));
  const paidAmount = parseFloat(paidNow) || 0;
  const balancePayable = Math.max(0, Number((grandTotal - paidAmount).toFixed(2)));

  // Quick fill paid now
  const handlePayFull = () => {
    setPaidNow(grandTotal.toString());
  };
  const handlePayZero = () => {
    setPaidNow('0');
  };

  const handleSaveFarmer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFarmerName.trim()) return;
    const added = addFarmer({
      name: newFarmerName.trim(),
      phone: newFarmerPhone.trim() || undefined,
      place: newFarmerPlace.trim() || undefined,
      opening_balance_payable: parseFloat(newFarmerOpening) || 0,
      is_active: true,
    });
    setSelectedFarmerId(added.id);
    setIsNewFarmerModalOpen(false);
    setNewFarmerName('');
    setNewFarmerPhone('');
    setNewFarmerPlace('');
    setNewFarmerOpening('0');
  };

  const handleOpenEditPurchase = (p: (typeof purchases)[0]) => {
    setEditingPurchase({
      id: p.id,
      farmer_name: p.farmer_name,
      total_amount: p.total_amount.toString(),
      paid_amount: p.paid_amount.toString(),
      payment_mode: p.payment_mode,
      date: p.date,
      notes: p.notes || '',
    });
  };

  const handleSaveEditedPurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPurchase) return;
    const tot = parseFloat(editingPurchase.total_amount) || 0;
    const paid = parseFloat(editingPurchase.paid_amount) || 0;

    updatePurchase(editingPurchase.id, {
      total_amount: tot,
      paid_amount: paid,
      payment_mode: editingPurchase.payment_mode,
      date: editingPurchase.date,
      notes: editingPurchase.notes.trim() || undefined,
    });

    setSuccessToast(`Purchase price updated to ${formatINR(tot)} successfully!`);
    setTimeout(() => setSuccessToast(null), 3000);
    setEditingPurchase(null);
  };

  const handleSavePurchase = (saveAndAddNext = false) => {
    if (!selectedFarmerId) {
      alert('Please select a farmer');
      return;
    }
    const validLines = computedItems.filter((ci) => ci.qtyKg > 0 && (ci.rate > 0 || ci.total > 0));
    if (validLines.length === 0) {
      alert('Please enter valid quantity and rate for at least one product');
      return;
    }

    const purchaseItems: PurchaseItem[] = validLines.map((vl) => {
      const effectiveRate = vl.qtyKg > 0 ? Number((vl.total / vl.qtyKg).toFixed(2)) : vl.rate;
      return {
        id: `pi-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        purchase_id: '',
        product_id: vl.item.product_id,
        product_name: vl.item.product_name,
        quantity_kg: vl.qtyKg,
        rate_per_kg: effectiveRate,
        total_amount: vl.total,
        input_unit: vl.item.unit,
        input_quantity: parseFloat(vl.item.raw_qty) || 0,
      };
    });

    addPurchase({
      date: purchaseDate,
      farmer_id: selectedFarmerId,
      farmer_name: selectedFarmer?.name || 'Farmer',
      total_amount: grandTotal,
      paid_amount: paidAmount,
      payment_mode: paymentMode,
      balance_payable: balancePayable,
      notes: notes.trim() || undefined,
      items: purchaseItems,
    });

    setSuccessToast(`Purchase of ${formatINR(grandTotal)} saved successfully!`);
    setTimeout(() => setSuccessToast(null), 3000);
    setBillRoundAdjustment(0);

    if (saveAndAddNext) {
      // Keep last used product for rapid 5kg farmer buying!
      const lastProduct = validLines[validLines.length - 1]?.item.product_id || initialProductId;
      setItems([
        {
          id: `item-${Date.now()}`,
          product_id: lastProduct,
          product_name: activeProducts.find((p) => p.id === lastProduct)?.name || '',
          unit: 'kg',
          raw_qty: '',
          rate_per_kg: '',
        },
      ]);
      setPaidNow('');
      setNotes('');
    } else {
      setItems([
        {
          id: `item-${Date.now()}`,
          product_id: initialProductId,
          product_name: activeProducts.find((p) => p.id === initialProductId)?.name || '',
          unit: 'kg',
          raw_qty: '',
          rate_per_kg: '',
        },
      ]);
      setPaidNow('');
      setNotes('');
    }
  };

  // Today's purchase list (recent on top)
  const todayPurchases = purchases
    .filter((p) => p.date === purchaseDate)
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));

  return (
    <div className="flex flex-col gap-5 pb-12">
      {/* Toast Notification */}
      {successToast && (
        <div className="sticky top-14 z-30 bg-emerald-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 animate-in slide-in-from-top duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-200" />
          <span>{successToast}</span>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black text-slate-900 tracking-tight">Buy from Farmers</h1>
          <p className="text-xs text-slate-500">Fast small-lot purchase entry</p>
        </div>

        {/* Backdated Date Picker */}
        <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 shadow-2xs">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
            className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none"
          />
        </div>
      </div>

      {/* FARMER SELECTION */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Farmer (Supplier) <span className="text-rose-500">*</span>
          </label>
          <button
            type="button"
            onClick={() => setIsNewFarmerModalOpen(true)}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
          >
            <UserPlus className="w-3.5 h-3.5" />
            + Add New Farmer
          </button>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowFarmerDropdown((prev) => !prev)}
            className="w-full h-12 px-3.5 flex items-center justify-between bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl text-left transition-colors"
          >
            {selectedFarmer ? (
              <div>
                <span className="text-sm font-bold text-slate-900">{selectedFarmer.name}</span>
                {selectedFarmer.place && (
                  <span className="text-xs text-slate-500 ml-2">({selectedFarmer.place})</span>
                )}
              </div>
            ) : (
              <span className="text-sm text-slate-400">Choose a farmer...</span>
            )}
            <ChevronDown className="w-4 h-4 text-slate-500" />
          </button>

          {showFarmerDropdown && (
            <div className="absolute top-13 left-0 right-0 z-30 bg-white border border-slate-200 rounded-xl shadow-xl p-2 max-h-60 overflow-y-auto">
              <div className="relative mb-2">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search farmer name or place..."
                  value={farmerSearch}
                  onChange={(e) => setFarmerSearch(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  autoFocus
                />
              </div>

              <div className="divide-y divide-slate-100">
                {filteredFarmers.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      setSelectedFarmerId(f.id);
                      setShowFarmerDropdown(false);
                      setFarmerSearch('');
                    }}
                    className={`w-full py-2 px-2.5 text-left flex items-center justify-between rounded-lg hover:bg-emerald-50 ${
                      f.id === selectedFarmerId ? 'bg-emerald-50 text-emerald-800 font-bold' : 'text-slate-800'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-semibold">{f.name}</div>
                      <div className="text-[10px] text-slate-500">{f.place || 'Farmer'}</div>
                    </div>
                    {f.phone && <span className="text-[10px] text-slate-400">{f.phone}</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PURCHASE ITEMS ENTRY (MULTI-ITEM SUPPORT) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Produce Items
          </label>
          <button
            type="button"
            onClick={handleAddItem}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
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
                  <label className="text-[11px] font-bold text-slate-600 uppercase">
                    Product ({idx + 1})
                  </label>
                  <select
                    value={it.product_id}
                    onChange={(e) => handleUpdateItem(it.id, { product_id: e.target.value })}
                    className="w-full h-11 mt-1 px-3 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900"
                  >
                    {activeProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantity in KG */}
                <QuantityInput
                  label="Quantity (KG)"
                  rawQuantity={it.raw_qty}
                  onQuantityChange={(val) => {
                    handleUpdateItem(it.id, { raw_qty: val, custom_total: undefined });
                  }}
                  placeholder="e.g. 5 or 25.5"
                  required
                />

                {/* Rate per KG & Editable Item Total */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold text-slate-700 uppercase">
                      Rate / KG (₹) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="e.g. 42"
                      value={it.rate_per_kg}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (/^\d*\.?\d*$/.test(val)) {
                          handleUpdateItem(it.id, { rate_per_kg: val, custom_total: undefined });
                        }
                      }}
                      className="w-full h-11 mt-1 px-3 text-sm font-bold text-slate-900 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 uppercase">
                        Item Total (₹)
                      </label>
                      {computed.isCustomTotal && (
                        <button
                          type="button"
                          onClick={() => handleUpdateItem(it.id, { custom_total: undefined })}
                          className="text-[10px] text-amber-700 hover:text-amber-900 font-bold underline"
                          title="Reset to Qty × Rate"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder={computed.calculatedTotal > 0 ? computed.calculatedTotal.toString() : '0'}
                      value={
                        it.custom_total !== undefined
                          ? it.custom_total
                          : computed.calculatedTotal > 0
                          ? computed.calculatedTotal.toString()
                          : ''
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        if (/^\d*\.?\d*$/.test(val)) {
                          handleUpdateItem(it.id, { custom_total: val });
                        }
                      }}
                      className={`w-full h-11 mt-1 px-3 text-sm font-extrabold rounded-xl focus:ring-2 focus:ring-emerald-500 ${
                        computed.isCustomTotal
                          ? 'bg-amber-50 border border-amber-300 text-amber-950 font-black'
                          : 'bg-white border border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                {/* Line Total Summary / Rounding status */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-200/80 text-xs">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-slate-500 font-medium">Final Line Price:</span>
                    {computed.isCustomTotal && (
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                        Rounded from {formatINR(computed.calculatedTotal)}
                      </span>
                    )}
                  </div>
                  <span className="font-extrabold text-slate-900 text-sm">
                    {formatINR(computed.total)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* BILL TOTAL & PAYMENT SECTION */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col gap-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 flex-wrap gap-2">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase">Total Bill Amount</span>
            {billRoundAdjustment !== 0 && (
              <span className="ml-2 text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                Adjusted by {billRoundAdjustment > 0 ? '+' : ''}{billRoundAdjustment}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {grandTotal % 10 !== 0 && grandTotal > 10 && (
              <button
                type="button"
                onClick={() => {
                  const rounded = Math.floor(grandTotal / 10) * 10;
                  setBillRoundAdjustment(rounded - sumActualTotals);
                }}
                className="text-[11px] font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 px-2 py-0.5 rounded-lg border border-emerald-300 transition-colors"
                title="Quick Round down to nearest 10"
              >
                Round to ₹{Math.floor(grandTotal / 10) * 10}
              </button>
            )}
            {billRoundAdjustment !== 0 && (
              <button
                type="button"
                onClick={() => setBillRoundAdjustment(0)}
                className="text-[10px] text-slate-500 underline font-medium"
              >
                Reset
              </button>
            )}
            <span className="text-xl font-black text-emerald-800">{formatINR(grandTotal)}</span>
          </div>
        </div>

        {/* Paid Now Field */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-bold text-slate-700 uppercase">
              Paid Now (₹)
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePayFull}
                className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200"
              >
                Pay Full
              </button>
              <button
                type="button"
                onClick={handlePayZero}
                className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200"
              >
                Pay 0 (Full Credit)
              </button>
            </div>
          </div>

          <input
            type="text"
            inputMode="decimal"
            placeholder="0"
            value={paidNow}
            onChange={(e) => {
              const val = e.target.value;
              if (/^\d*\.?\d*$/.test(val)) {
                setPaidNow(val);
              }
            }}
            className="w-full h-12 px-3.5 text-lg font-bold text-slate-900 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Payment Mode */}
        {paidAmount > 0 && (
          <div>
            <label className="text-[11px] font-bold text-slate-600 uppercase">
              Payment Mode
            </label>
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

        {/* Balance Payable Badge */}
        <div className="flex items-center justify-between p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800">
          <span>Balance Added to Payable (We Owe):</span>
          <span className="font-black text-sm">{formatINR(balancePayable)}</span>
        </div>

        {/* Note */}
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes / bag count..."
          className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl"
        />

        {/* ACTION BUTTONS (Speed Optimized!) */}
        <div className="grid grid-cols-2 gap-2 mt-2">
          <button
            type="button"
            onClick={() => handleSavePurchase(true)}
            className="h-13 rounded-xl bg-emerald-100 hover:bg-emerald-200 active:scale-98 text-emerald-800 font-extrabold text-sm border border-emerald-300 transition-all flex items-center justify-center gap-1.5"
          >
            <span>Save & Add Next</span>
          </button>

          <button
            type="button"
            onClick={() => handleSavePurchase(false)}
            className="h-13 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-extrabold text-sm shadow-md shadow-emerald-600/30 transition-all flex items-center justify-center gap-1.5"
          >
            <span>Save Purchase</span>
          </button>
        </div>
      </div>

      {/* TODAY'S PURCHASE LIST */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <ShoppingCart className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900">Purchases on {purchaseDate}</h2>
          </div>
          <span className="text-xs font-bold text-slate-500">
            {todayPurchases.length} Entries
          </span>
        </div>

        {todayPurchases.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">No purchases recorded for this date</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {todayPurchases.map((p) => (
              <div key={p.id} className="py-3 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">{p.farmer_name}</span>
                  <span className="text-xs font-black text-slate-900">{formatINR(p.total_amount)}</span>
                </div>

                <div className="text-[11px] text-slate-500">
                  {p.items
                    .map((it) => `${it.product_name}: ${formatQuantity(it.quantity_kg)} @ ₹${it.rate_per_kg}`)
                    .join(' | ')}
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                  <span>
                    Paid: <strong className="text-emerald-700">{formatINR(p.paid_amount)}</strong> ({p.payment_mode})
                    {p.balance_payable > 0 && (
                      <span className="ml-2 text-rose-600 font-bold">
                        Due: {formatINR(p.balance_payable)}
                      </span>
                    )}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEditPurchase(p)}
                      className="text-blue-600 hover:text-blue-800 font-bold text-xs flex items-center gap-1 transition-colors"
                      title="Edit price or payment"
                    >
                      <Pencil className="w-3 h-3" />
                      <span>Edit Price</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Delete purchase of ${formatINR(p.total_amount)} from ${p.farmer_name}? This will restore stock.`)) {
                          deletePurchase(p.id);
                        }
                      }}
                      className="text-rose-500 hover:text-rose-700 font-medium text-xs flex items-center gap-1 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* NEW FARMER MODAL */}
      <Modal
        isOpen={isNewFarmerModalOpen}
        onClose={() => setIsNewFarmerModalOpen(false)}
        title="Add New Farmer (Supplier)"
      >
        <form onSubmit={handleSaveFarmer} className="flex flex-col gap-3.5">
          <div>
            <label className="text-xs font-semibold text-slate-700">
              Farmer Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={newFarmerName}
              onChange={(e) => setNewFarmerName(e.target.value)}
              placeholder="e.g. Rajan Pillai"
              className="w-full h-11 mt-1 px-3 text-sm font-semibold border border-slate-300 rounded-xl"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">Phone Number (Optional)</label>
            <input
              type="tel"
              value={newFarmerPhone}
              onChange={(e) => setNewFarmerPhone(e.target.value)}
              placeholder="e.g. 9847123456"
              className="w-full h-11 mt-1 px-3 text-sm border border-slate-300 rounded-xl"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">Place / Village (Optional)</label>
            <input
              type="text"
              value={newFarmerPlace}
              onChange={(e) => setNewFarmerPlace(e.target.value)}
              placeholder="e.g. Koduvally"
              className="w-full h-11 mt-1 px-3 text-sm border border-slate-300 rounded-xl"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">
              Existing Opening Due We Owe (₹)
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={newFarmerOpening}
              onChange={(e) => setNewFarmerOpening(e.target.value)}
              placeholder="0"
              className="w-full h-11 mt-1 px-3 text-sm font-semibold border border-slate-300 rounded-xl"
            />
            <span className="text-[10px] text-slate-400">
              Leave 0 if starting fresh with no prior dues.
            </span>
          </div>

          <button
            type="submit"
            className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl mt-2 active:scale-98 transition-all"
          >
            Save Farmer & Select
          </button>
        </form>
      </Modal>

      {/* EDIT PURCHASE / PRICE MODAL */}
      {editingPurchase && (
        <Modal
          isOpen={true}
          onClose={() => setEditingPurchase(null)}
          title={`Edit Purchase Price (${editingPurchase.farmer_name})`}
        >
          <form onSubmit={handleSaveEditedPurchase} className="flex flex-col gap-3.5">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 uppercase">
                  Total Purchase Price (₹) <span className="text-rose-500">*</span>
                </label>
                {parseFloat(editingPurchase.total_amount) % 10 !== 0 && parseFloat(editingPurchase.total_amount) > 10 && (
                  <button
                    type="button"
                    onClick={() => {
                      const rounded = Math.floor(parseFloat(editingPurchase.total_amount) / 10) * 10;
                      setEditingPurchase({ ...editingPurchase, total_amount: rounded.toString() });
                    }}
                    className="text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 transition-colors"
                  >
                    Round to ₹{Math.floor(parseFloat(editingPurchase.total_amount) / 10) * 10}
                  </button>
                )}
              </div>
              <input
                type="text"
                inputMode="decimal"
                required
                value={editingPurchase.total_amount}
                onChange={(e) =>
                  setEditingPurchase({ ...editingPurchase, total_amount: e.target.value })
                }
                className="w-full h-11 px-3 border border-slate-300 rounded-xl text-base font-extrabold text-slate-900 bg-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase">Paid Now (₹)</label>
              <input
                type="text"
                inputMode="decimal"
                value={editingPurchase.paid_amount}
                onChange={(e) =>
                  setEditingPurchase({ ...editingPurchase, paid_amount: e.target.value })
                }
                className="w-full h-11 mt-1 px-3 border border-slate-300 rounded-xl text-base font-bold text-slate-900 bg-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase">Payment Mode</label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setEditingPurchase({ ...editingPurchase, payment_mode: 'cash' })}
                  className={`h-10 rounded-xl font-bold text-xs border ${
                    editingPurchase.payment_mode === 'cash'
                      ? 'bg-emerald-700 text-white border-emerald-700'
                      : 'bg-white text-slate-700 border-slate-300'
                  }`}
                >
                  Cash
                </button>
                <button
                  type="button"
                  onClick={() => setEditingPurchase({ ...editingPurchase, payment_mode: 'bank' })}
                  className={`h-10 rounded-xl font-bold text-xs border ${
                    editingPurchase.payment_mode === 'bank'
                      ? 'bg-emerald-700 text-white border-emerald-700'
                      : 'bg-white text-slate-700 border-slate-300'
                  }`}
                >
                  Bank / UPI
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase">Date</label>
              <input
                type="date"
                value={editingPurchase.date}
                onChange={(e) => setEditingPurchase({ ...editingPurchase, date: e.target.value })}
                className="w-full h-11 mt-1 px-3 border border-slate-300 rounded-xl text-sm font-bold bg-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase">Notes (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Rounded price"
                value={editingPurchase.notes}
                onChange={(e) => setEditingPurchase({ ...editingPurchase, notes: e.target.value })}
                className="w-full h-11 mt-1 px-3 border border-slate-300 rounded-xl text-sm font-semibold bg-white"
              />
            </div>

            <button
              type="submit"
              className="w-full h-12 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl active:scale-98 transition-all text-sm mt-2"
            >
              Update Purchase Price
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
};
