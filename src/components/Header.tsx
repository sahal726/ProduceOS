'use client';

import React from 'react';
import { useAuth } from '@/lib/auth-context';
import { useStore } from '@/lib/use-store';
import { computeTotalCurrentFunds, formatINR } from '@/lib/calculations';
import { Lock, Wallet, Calendar } from 'lucide-react';

export const Header: React.FC = () => {
  const { lock } = useAuth();
  const { settings, purchases, sales, payments, expenses } = useStore();
  const funds = computeTotalCurrentFunds(settings, purchases, sales, payments, expenses);

  const todayStr = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-2.5 shadow-xs">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* Brand & Date */}
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-base font-extrabold text-slate-900 tracking-tight">
              {settings.shop_name}
            </h1>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              ERP
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
            <Calendar className="w-3 h-3 text-slate-400" />
            <span>{todayStr}</span>
          </div>
        </div>

        {/* Cash in Hand Pill & Lock Button */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
            <Wallet className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-xs font-bold text-emerald-800">
              {formatINR(funds.cashInHand)}
            </span>
          </div>

          <button
            type="button"
            onClick={lock}
            title="Lock Shop ERP"
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 active:bg-slate-300 flex items-center justify-center text-slate-600 transition-colors"
          >
            <Lock className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
