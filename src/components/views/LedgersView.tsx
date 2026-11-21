'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/use-store';
import {
  computeFarmerLedger,
  computePartyLedger,
  formatINR,
  formatCurrency,
} from '@/lib/calculations';
import { PaymentMode } from '@/types';
import {
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  Share2,
  Download,
  Calendar,
  ChevronRight,
  ArrowLeft,
  Send,
  Filter,
  Pencil,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { Modal } from '@/components/Modal';
import jsPDF from 'jspdf';

interface LedgersViewProps {
  initialType?: 'party' | 'farmer';
  initialEntityId?: string;
}

export const LedgersView: React.FC<LedgersViewProps> = ({
  initialType = 'party',
  initialEntityId,
}) => {
  const {
    parties,
    farmers,
    sales,
    purchases,
    payments,
    settings,
    addPayment,
    updatePayment,
    deletePayment,
    updateSale,
  } = useStore();

  const todayStr = new Date().toISOString().slice(0, 10);

  // Tab: 'parties' | 'farmers' | 'payments'
  const [activeSegment, setActiveSegment] = useState<'parties' | 'farmers' | 'payments'>(
    initialType === 'farmer' ? 'farmers' : 'parties'
  );

  // Selected Entity for Detail Statement
  const [selectedEntity, setSelectedEntity] = useState<{
    type: 'party' | 'farmer';
    id: string;
  } | null>(
    initialEntityId ? { type: initialType, id: initialEntityId } : null
  );

  // Filter & Search
  const [search, setSearch] = useState<string>('');
  const [onlyHasBalance, setOnlyHasBalance] = useState<boolean>(false);

  // Payment Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [payAmount, setPayAmount] = useState<string>('');
  const [payDate, setPayDate] = useState<string>(todayStr);
  const [payMode, setPayMode] = useState<PaymentMode>('cash');
  const [payNote, setPayNote] = useState<string>('');

  // Edit Payment State
  interface EditPaymentState {
    id: string;
    reference_id: string;
    isSaleReceipt: boolean;
    entityName: string;
    entityType: 'party' | 'farmer';
    amount: string;
    date: string;
    mode: PaymentMode;
    notes: string;
  }
  const [editingPayment, setEditingPayment] = useState<EditPaymentState | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 1. Compute Party Ledgers
  const partyLedgers = parties
    .filter((p) => p.is_active)
    .map((party) => {
      const ledger = computePartyLedger(party, sales, payments);
      return {
        party,
        receivable: ledger.closingBalanceReceivable,
        totalBilled: ledger.totalBilled,
        totalReceived: ledger.totalReceived,
        ledger,
      };
    })
    .filter((p) => {
      const matchesSearch =
        p.party.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.party.place && p.party.place.toLowerCase().includes(search.toLowerCase())) ||
        (p.party.phone && p.party.phone.includes(search));
      if (!matchesSearch) return false;
      if (onlyHasBalance) return p.receivable > 0;
      return true;
    })
    .sort((a, b) => b.receivable - a.receivable);

  // 2. Compute Farmer Ledgers
  const farmerLedgers = farmers
    .filter((f) => f.is_active)
    .map((farmer) => {
      const ledger = computeFarmerLedger(farmer, purchases, payments);
      return {
        farmer,
        payable: ledger.closingBalancePayable,
        totalPurchased: ledger.totalPurchased,
        totalPaid: ledger.totalPaid,
        ledger,
      };
    })
    .filter((f) => {
      const matchesSearch =
        f.farmer.name.toLowerCase().includes(search.toLowerCase()) ||
        (f.farmer.place && f.farmer.place.toLowerCase().includes(search.toLowerCase())) ||
        (f.farmer.phone && f.farmer.phone.includes(search));
      if (!matchesSearch) return false;
      if (onlyHasBalance) return f.payable > 0;
      return true;
    })
    .sort((a, b) => b.payable - a.payable);

  // Detail View Data
  const currentPartyItem =
    selectedEntity && selectedEntity.type === 'party'
      ? partyLedgers.find((p) => p.party.id === selectedEntity.id)
      : null;

  const currentFarmerItem =
    selectedEntity && selectedEntity.type === 'farmer'
      ? farmerLedgers.find((f) => f.farmer.id === selectedEntity.id)
      : null;

  // Handle Payment Form
  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(payAmount);
    if (!amt || amt <= 0 || !selectedEntity) return;

    if (selectedEntity.type === 'party' && currentPartyItem) {
      addPayment({
        date: payDate,
        direction: 'in', // received from party
        entity_type: 'party',
        entity_id: currentPartyItem.party.id,
        entity_name: currentPartyItem.party.name,
        amount: amt,
        payment_mode: payMode,
        notes: payNote.trim() || undefined,
      });
    } else if (selectedEntity.type === 'farmer' && currentFarmerItem) {
      addPayment({
        date: payDate,
        direction: 'out', // paid to farmer
        entity_type: 'farmer',
        entity_id: currentFarmerItem.farmer.id,
        entity_name: currentFarmerItem.farmer.name,
        amount: amt,
        payment_mode: payMode,
        notes: payNote.trim() || undefined,
      });
    }

    setPayAmount('');
    setPayNote('');
    setIsPaymentModalOpen(false);
  };

  const handleOpenEditPayment = (
    entryOrPay: { id: string; reference_id?: string; date: string; amount?: number; debit?: number; credit?: number; mode?: PaymentMode; notes?: string },
    entityType: 'party' | 'farmer',
    entityName: string
  ) => {
    const standalonePay = payments.find((p) => p.id === entryOrPay.reference_id || p.id === entryOrPay.id);
    if (standalonePay) {
      setEditingPayment({
        id: standalonePay.id,
        reference_id: standalonePay.id,
        isSaleReceipt: false,
        entityName,
        entityType,
        amount: standalonePay.amount.toString(),
        date: standalonePay.date,
        mode: standalonePay.payment_mode,
        notes: standalonePay.notes || '',
      });
      return;
    }

    const saleId = entryOrPay.reference_id || entryOrPay.id.replace('rec-', '');
    const saleItem = sales.find((s) => s.id === saleId);
    if (saleItem) {
      setEditingPayment({
        id: saleItem.id,
        reference_id: saleItem.id,
        isSaleReceipt: true,
        entityName,
        entityType: 'party',
        amount: saleItem.received_amount.toString(),
        date: saleItem.date,
        mode: saleItem.payment_mode,
        notes: saleItem.notes || '',
      });
      return;
    }

    const amt = entryOrPay.amount || entryOrPay.credit || entryOrPay.debit || 0;
    setEditingPayment({
      id: entryOrPay.id,
      reference_id: entryOrPay.reference_id || entryOrPay.id,
      isSaleReceipt: false,
      entityName,
      entityType,
      amount: amt.toString(),
      date: entryOrPay.date,
      mode: entryOrPay.mode || 'cash',
      notes: entryOrPay.notes || '',
    });
  };

  const handleSaveEditPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment) return;
    const amt = parseFloat(editingPayment.amount);
    if (isNaN(amt) || amt <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (editingPayment.isSaleReceipt) {
      updateSale(editingPayment.id, {
        received_amount: amt,
        date: editingPayment.date,
        payment_mode: editingPayment.mode,
      });
    } else {
      updatePayment(editingPayment.id, {
        amount: amt,
        date: editingPayment.date,
        payment_mode: editingPayment.mode,
        notes: editingPayment.notes.trim() || undefined,
      });
    }

    setToastMessage(`Payment updated to ${formatINR(amt)} successfully!`);
    setTimeout(() => setToastMessage(null), 3000);
    setEditingPayment(null);
  };

  const handleDeletePayment = (
    entryOrPay: { id: string; reference_id?: string; amount?: number; debit?: number; credit?: number },
    entityName: string
  ) => {
    const amt = entryOrPay.amount || entryOrPay.credit || entryOrPay.debit || 0;
    if (!confirm(`Are you sure you want to delete this payment of ${formatINR(amt)} from ${entityName}?`)) {
      return;
    }

    const standalonePay = payments.find((p) => p.id === entryOrPay.reference_id || p.id === entryOrPay.id);
    if (standalonePay) {
      deletePayment(standalonePay.id);
      setToastMessage(`Payment of ${formatINR(amt)} deleted successfully!`);
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    const saleId = entryOrPay.reference_id || entryOrPay.id.replace('rec-', '');
    const saleItem = sales.find((s) => s.id === saleId);
    if (saleItem) {
      updateSale(saleItem.id, { received_amount: 0 });
      setToastMessage(`Sale payment of ${formatINR(amt)} deleted successfully!`);
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    deletePayment(entryOrPay.id);
    setToastMessage(`Payment deleted successfully!`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // WhatsApp Statement Share
  const handleShareWhatsApp = () => {
    if (selectedEntity?.type === 'party' && currentPartyItem) {
      const p = currentPartyItem.party;
      const text = `*Account Statement - ${settings.shop_name}*
Customer: ${p.name} ${p.place ? '(' + p.place + ')' : ''}
Date: ${todayStr}

Total Billed: ${formatCurrency(currentPartyItem.totalBilled)}
Total Paid: ${formatCurrency(currentPartyItem.totalReceived)}
*Outstanding Due: ${formatCurrency(currentPartyItem.receivable)}*

Please clear the pending balance at your earliest convenience. Thank you!
- ${settings.owner_name}, ${settings.phone}`;

      const url = `https://wa.me/${p.phone ? p.phone.replace(/[^0-9]/g, '') : ''}?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
    } else if (selectedEntity?.type === 'farmer' && currentFarmerItem) {
      const f = currentFarmerItem.farmer;
      const text = `*Purchase Statement - ${settings.shop_name}*
Farmer: ${f.name} ${f.place ? '(' + f.place + ')' : ''}
Date: ${todayStr}

Total Produce Supplied: ${formatCurrency(currentFarmerItem.totalPurchased)}
Total Amount Paid: ${formatCurrency(currentFarmerItem.totalPaid)}
*Balance We Owe You: ${formatCurrency(currentFarmerItem.payable)}*

- ${settings.owner_name}, ${settings.phone}`;

      const url = `https://wa.me/${f.phone ? f.phone.replace(/[^0-9]/g, '') : ''}?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
    }
  };

  // PDF Export
  const handleExportPDF = () => {
    const doc = new jsPDF();
    const isParty = selectedEntity?.type === 'party';
    const name = isParty ? currentPartyItem?.party.name : currentFarmerItem?.farmer.name;
    const place = isParty ? currentPartyItem?.party.place : currentFarmerItem?.farmer.place;
    const balance = isParty ? currentPartyItem?.receivable : currentFarmerItem?.payable;
    const entries = isParty ? currentPartyItem?.ledger.entries : currentFarmerItem?.ledger.entries;

    // Header
    doc.setFontSize(18);
    doc.text(settings.shop_name, 14, 20);
    doc.setFontSize(10);
    doc.text(`Phone: ${settings.phone} | ${settings.address}`, 14, 26);
    doc.text(`Statement Generated on: ${todayStr}`, 14, 32);

    doc.line(14, 36, 196, 36);

    // Entity details
    doc.setFontSize(13);
    doc.text(`${isParty ? 'Party' : 'Farmer'}: ${name || ''} ${place ? '(' + place + ')' : ''}`, 14, 44);
    doc.setFontSize(11);
    doc.text(
      `Current Balance: Rs. ${Number(balance || 0).toLocaleString('en-IN')} ${
        isParty ? '(Receivable from Party)' : '(Payable to Farmer)'
      }`,
      14,
      50
    );

    // Table Header
    let y = 60;
    doc.setFontSize(10);
    doc.text('Date', 14, y);
    doc.text('Description', 45, y);
    doc.text(isParty ? 'Billed (Dr)' : 'Paid (Dr)', 125, y);
    doc.text(isParty ? 'Recd (Cr)' : 'Purchase (Cr)', 155, y);
    doc.text('Balance', 180, y);
    doc.line(14, y + 2, 196, y + 2);

    y += 8;
    entries?.forEach((en) => {
      if (y > 275) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(9);
      doc.text(en.date, 14, y);
      const desc = en.description.length > 35 ? en.description.slice(0, 32) + '...' : en.description;
      doc.text(desc, 45, y);
      doc.text(en.debit > 0 ? en.debit.toString() : '-', 125, y);
      doc.text(en.credit > 0 ? en.credit.toString() : '-', 155, y);
      doc.text(en.running_balance.toString(), 180, y);
      y += 7;
    });

    doc.save(`${name || 'statement'}_ledger_${todayStr}.pdf`);
  };

  // 3. Filtered Payments for All Payments tab
  const filteredPayments = payments
    .filter((pay) => {
      const q = search.toLowerCase();
      if (!q) return true;
      return (
        pay.entity_name.toLowerCase().includes(q) ||
        (pay.notes && pay.notes.toLowerCase().includes(q)) ||
        pay.date.includes(q) ||
        pay.amount.toString().includes(q) ||
        pay.payment_mode.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return (b.created_at || '').localeCompare(a.created_at || '');
    });

  return (
    <div className="flex flex-col gap-4 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="sticky top-14 z-30 bg-emerald-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 animate-in slide-in-from-top duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-200" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* If an entity is selected, show its full Statement View */}
      {selectedEntity ? (
        <div className="flex flex-col gap-4">
          {/* Back Header */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setSelectedEntity(null)}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to List</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleShareWhatsApp}
                title="Share Statement via WhatsApp"
                className="flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 px-2.5 py-1.5 rounded-xl transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={handleExportPDF}
                title="Download PDF"
                className="flex items-center gap-1 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 px-2.5 py-1.5 rounded-xl shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>PDF</span>
              </button>
            </div>
          </div>

          {/* Statement Profile Card */}
          {selectedEntity.type === 'party' && currentPartyItem && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-base font-extrabold text-slate-900">
                    {currentPartyItem.party.name}
                  </h1>
                  <p className="text-xs text-slate-500">
                    {currentPartyItem.party.place || 'Buyer'} • {currentPartyItem.party.phone || 'No phone'}
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-[11px] font-bold uppercase text-slate-400">Balance Due</div>
                  <div className="text-lg font-black text-emerald-700">
                    {formatINR(currentPartyItem.receivable)}
                  </div>
                </div>
              </div>

              {/* Action Button: Receive Payment */}
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(true)}
                className="w-full mt-3 h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl active:scale-98 transition-all flex items-center justify-center gap-1.5 text-xs shadow-xs"
              >
                <ArrowDownLeft className="w-4 h-4" />
                <span>Receive Payment from {currentPartyItem.party.name}</span>
              </button>
            </div>
          )}

          {selectedEntity.type === 'farmer' && currentFarmerItem && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-base font-extrabold text-slate-900">
                    {currentFarmerItem.farmer.name}
                  </h1>
                  <p className="text-xs text-slate-500">
                    {currentFarmerItem.farmer.place || 'Farmer'} • {currentFarmerItem.farmer.phone || 'No phone'}
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-[11px] font-bold uppercase text-slate-400">We Owe</div>
                  <div className="text-lg font-black text-rose-600">
                    {formatINR(currentFarmerItem.payable)}
                  </div>
                </div>
              </div>

              {/* Action Button: Make Payment */}
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(true)}
                className="w-full mt-3 h-11 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl active:scale-98 transition-all flex items-center justify-center gap-1.5 text-xs shadow-xs"
              >
                <Send className="w-4 h-4" />
                <span>Make Payment to {currentFarmerItem.farmer.name}</span>
              </button>
            </div>
          )}

          {/* Running Statement Entries */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Running Ledger Statement
            </h2>

            {((selectedEntity.type === 'party'
              ? currentPartyItem?.ledger.entries
              : currentFarmerItem?.ledger.entries) || []).length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No transactions recorded</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {(selectedEntity.type === 'party'
                  ? currentPartyItem?.ledger.entries
                  : currentFarmerItem?.ledger.entries
                )?.map((entry) => (
                  <div key={entry.id} className="py-2.5 flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        <Calendar className="w-3 h-3" />
                        <span>{entry.date}</span>
                        {entry.mode && (
                          <span className="bg-slate-100 text-slate-600 font-semibold px-1 rounded uppercase text-[9px]">
                            {entry.mode}
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-bold text-slate-900 mt-0.5">{entry.description}</div>
                    </div>

                    <div className="text-right shrink-0">
                      {selectedEntity.type === 'party' ? (
                        <>
                          {entry.debit > 0 && (
                            <div className="text-xs font-bold text-slate-900">
                              +{formatINR(entry.debit)}
                            </div>
                          )}
                          {entry.credit > 0 && (
                            <div className="text-xs font-bold text-emerald-600">
                              -{formatINR(entry.credit)}
                            </div>
                          )}
                          <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
                            Bal: {formatINR(entry.running_balance)}
                          </div>
                        </>
                      ) : (
                        <>
                          {entry.credit > 0 && (
                            <div className="text-xs font-bold text-slate-900">
                              +{formatINR(entry.credit)}
                            </div>
                          )}
                          {entry.debit > 0 && (
                            <div className="text-xs font-bold text-rose-600">
                              -{formatINR(entry.debit)}
                            </div>
                          )}
                          <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
                            Bal: {formatINR(entry.running_balance)}
                          </div>
                        </>
                      )}

                      {entry.reference_type === 'payment' && (
                        <div className="flex items-center gap-1.5 mt-1.5 justify-end">
                          <button
                            type="button"
                            onClick={() =>
                              handleOpenEditPayment(
                                entry,
                                selectedEntity.type,
                                selectedEntity.type === 'party'
                                  ? currentPartyItem?.party.name || 'Party'
                                  : currentFarmerItem?.farmer.name || 'Farmer'
                              )
                            }
                            className="px-2 py-0.5 text-[10px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 flex items-center gap-1 transition-colors"
                            title="Edit payment"
                          >
                            <Pencil className="w-2.5 h-2.5" />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleDeletePayment(
                                entry,
                                selectedEntity.type === 'party'
                                  ? currentPartyItem?.party.name || 'Party'
                                  : currentFarmerItem?.farmer.name || 'Farmer'
                              )
                            }
                            className="px-2 py-0.5 text-[10px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md border border-rose-200 flex items-center gap-1 transition-colors"
                            title="Delete payment"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* LIST VIEW WITH SEGMENTED CONTROL */
        <div className="flex flex-col gap-4">
          {/* Header */}
          <div>
            <h1 className="text-lg font-black text-slate-900 tracking-tight">Ledgers & Statements</h1>
            <p className="text-xs text-slate-500">Track party dues and farmer payables</p>
          </div>

          {/* Segmented Control */}
          <div className="grid grid-cols-3 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveSegment('parties')}
              className={`py-2 text-xs font-extrabold rounded-lg transition-all ${
                activeSegment === 'parties'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Parties (Due)
            </button>
            <button
              type="button"
              onClick={() => setActiveSegment('farmers')}
              className={`py-2 text-xs font-extrabold rounded-lg transition-all ${
                activeSegment === 'farmers'
                  ? 'bg-white text-rose-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Farmers (Due)
            </button>
            <button
              type="button"
              onClick={() => setActiveSegment('payments')}
              className={`py-2 text-xs font-extrabold rounded-lg transition-all ${
                activeSegment === 'payments'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Payments
            </button>
          </div>

          {/* Search & Has-Balance Filter */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder={
                  activeSegment === 'parties'
                    ? 'Search parties by name/market...'
                    : activeSegment === 'farmers'
                    ? 'Search farmers by name/place...'
                    : 'Search payments by party, note, amount...'
                }
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 pl-9 pr-3 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {activeSegment !== 'payments' && (
              <button
                type="button"
                onClick={() => setOnlyHasBalance((prev) => !prev)}
                className={`px-3 h-10 rounded-xl text-xs font-bold border flex items-center gap-1 transition-colors ${
                  onlyHasBalance
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-slate-700 border-slate-300'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Has Balance</span>
              </button>
            )}
          </div>

          {/* LIST */}
          <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs">
            {activeSegment === 'parties' ? (
              partyLedgers.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No parties found</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {partyLedgers.map((item) => (
                    <div
                      key={item.party.id}
                      onClick={() => setSelectedEntity({ type: 'party', id: item.party.id })}
                      className="py-3 px-2 flex items-center justify-between hover:bg-slate-50 active:bg-slate-100 rounded-xl cursor-pointer transition-colors"
                    >
                      <div className="truncate mr-3">
                        <div className="text-xs font-bold text-slate-900">{item.party.name}</div>
                        <div className="text-[10px] text-slate-400">
                          {item.party.place || 'Buyer'} • Billed: {formatINR(item.totalBilled)}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <div className="text-xs font-black text-emerald-700">
                            {formatINR(item.receivable)}
                          </div>
                          <span className="text-[9px] text-slate-400 font-semibold uppercase">
                            Due from party
                          </span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : activeSegment === 'farmers' ? (
              farmerLedgers.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No farmers found</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {farmerLedgers.map((item) => (
                    <div
                      key={item.farmer.id}
                      onClick={() => setSelectedEntity({ type: 'farmer', id: item.farmer.id })}
                      className="py-3 px-2 flex items-center justify-between hover:bg-slate-50 active:bg-slate-100 rounded-xl cursor-pointer transition-colors"
                    >
                      <div className="truncate mr-3">
                        <div className="text-xs font-bold text-slate-900">{item.farmer.name}</div>
                        <div className="text-[10px] text-slate-400">
                          {item.farmer.place || 'Farmer'} • Bought: {formatINR(item.totalPurchased)}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <div className="text-xs font-black text-rose-600">
                            {formatINR(item.payable)}
                          </div>
                          <span className="text-[9px] text-slate-400 font-semibold uppercase">
                            We Owe
                          </span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              /* ALL PAYMENTS TAB */
              filteredPayments.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No payments recorded yet</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredPayments.map((pay) => (
                    <div
                      key={pay.id}
                      className="py-3 px-2 flex items-start justify-between gap-3 hover:bg-slate-50 rounded-xl transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                              pay.direction === 'in'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {pay.direction === 'in' ? 'Received (Party)' : 'Paid (Farmer)'}
                          </span>
                          <span className="text-[11px] text-slate-400 font-medium">
                            {pay.date}
                          </span>
                          <span className="bg-slate-100 text-slate-600 font-semibold px-1 rounded uppercase text-[9px]">
                            {pay.payment_mode}
                          </span>
                        </div>

                        <div className="text-xs font-bold text-slate-900 mt-1">
                          {pay.entity_name}
                        </div>
                        {pay.notes && (
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {pay.notes}
                          </div>
                        )}
                      </div>

                      <div className="text-right shrink-0 flex flex-col items-end">
                        <div
                          className={`text-sm font-black ${
                            pay.direction === 'in' ? 'text-emerald-700' : 'text-rose-600'
                          }`}
                        >
                          {pay.direction === 'in' ? '+' : '-'}
                          {formatINR(pay.amount)}
                        </div>

                        <div className="flex items-center gap-1.5 mt-2">
                          <button
                            type="button"
                            onClick={() =>
                              handleOpenEditPayment(pay, pay.entity_type, pay.entity_name)
                            }
                            className="px-2 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 flex items-center gap-1 transition-colors"
                            title="Edit this payment"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeletePayment(pay, pay.entity_name)}
                            className="px-2 py-1 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 flex items-center gap-1 transition-colors"
                            title="Delete this payment"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* PAYMENT MODAL (Receive or Make Payment on any day) */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title={
          selectedEntity?.type === 'party'
            ? `Receive Payment from ${currentPartyItem?.party.name}`
            : `Make Payment to ${currentFarmerItem?.farmer.name}`
        }
      >
        <form onSubmit={handleSavePayment} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-700">Date</label>
            <input
              type="date"
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
              className="w-full h-11 mt-1 px-3 border border-slate-300 rounded-xl font-bold text-sm bg-white"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">Amount (₹)</label>
            <input
              type="text"
              inputMode="decimal"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              placeholder="e.g. 5000"
              required
              autoFocus
              className="w-full h-12 mt-1 px-3 text-lg font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
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
            <label className="text-xs font-semibold text-slate-700">Note / Reference (Optional)</label>
            <input
              type="text"
              value={payNote}
              onChange={(e) => setPayNote(e.target.value)}
              placeholder="Payment description or reference"
              className="w-full h-10 mt-1 px-3 border border-slate-300 rounded-xl text-sm"
            />
          </div>

          <button
            type="submit"
            className={`w-full h-12 text-white font-bold rounded-xl mt-2 active:scale-98 transition-all ${
              selectedEntity?.type === 'party'
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-rose-600 hover:bg-rose-700'
            }`}
          >
            {selectedEntity?.type === 'party' ? 'Confirm Receipt' : 'Confirm Payment'}
          </button>
        </form>
      </Modal>

      {/* EDIT PAYMENT MODAL */}
      <Modal
        isOpen={!!editingPayment}
        onClose={() => setEditingPayment(null)}
        title={`Edit Payment (${editingPayment?.entityName || 'Payment'})`}
      >
        {editingPayment && (
          <form onSubmit={handleSaveEditPayment} className="flex flex-col gap-4">
            <div>
              <span className="text-xs font-semibold text-slate-500">
                {editingPayment.entityType === 'party' ? 'Customer / Party' : 'Farmer / Supplier'}
              </span>
              <div className="text-sm font-black text-slate-900 mt-0.5">
                {editingPayment.entityName}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">Payment Date</label>
              <input
                type="date"
                value={editingPayment.date}
                onChange={(e) =>
                  setEditingPayment({ ...editingPayment, date: e.target.value })
                }
                className="w-full h-11 mt-1 px-3 border border-slate-300 rounded-xl font-bold text-sm bg-white"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">
                Amount Received / Paid (₹) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={editingPayment.amount}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^\d*\.?\d*$/.test(val)) {
                    setEditingPayment({ ...editingPayment, amount: val });
                  }
                }}
                placeholder="e.g. 50000"
                required
                autoFocus
                className="w-full h-12 mt-1 px-3 text-lg font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">Payment Mode</label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  type="button"
                  onClick={() =>
                    setEditingPayment({ ...editingPayment, mode: 'cash' })
                  }
                  className={`py-2 text-xs font-bold rounded-xl border ${
                    editingPayment.mode === 'cash'
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-slate-700 border-slate-300'
                  }`}
                >
                  Cash
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setEditingPayment({ ...editingPayment, mode: 'bank' })
                  }
                  className={`py-2 text-xs font-bold rounded-xl border ${
                    editingPayment.mode === 'bank'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-700 border-slate-300'
                  }`}
                >
                  Bank / UPI
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">Note / Reference (Optional)</label>
              <input
                type="text"
                value={editingPayment.notes}
                onChange={(e) =>
                  setEditingPayment({ ...editingPayment, notes: e.target.value })
                }
                placeholder="Cheque no. / UPI ref / Notes"
                className="w-full h-10 mt-1 px-3 border border-slate-300 rounded-xl text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2">
              <button
                type="button"
                onClick={() => setEditingPayment(null)}
                className="w-full h-12 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl active:scale-98 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl active:scale-98 transition-all shadow-xs"
              >
                Save Changes
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
