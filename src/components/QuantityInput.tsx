'use client';

import React from 'react';
import { Unit } from '@/types';

interface QuantityInputProps {
  label?: string;
  unit?: Unit;
  onUnitChange?: (newUnit: Unit) => void;
  rawQuantity: string;
  onQuantityChange: (val: string) => void;
  placeholder?: string;
  required?: boolean;
}

export const QuantityInput: React.FC<QuantityInputProps> = ({
  label = 'Quantity',
  rawQuantity,
  onQuantityChange,
  placeholder = '0.00',
  required = false,
}) => {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
        <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
          KG
        </span>
      </div>

      <div className="relative flex items-center">
        <input
          type="text"
          inputMode="decimal"
          value={rawQuantity}
          onChange={(e) => {
            const val = e.target.value;
            // Allow decimals and numbers only
            if (/^\d*\.?\d*$/.test(val)) {
              onQuantityChange(val);
            }
          }}
          placeholder={placeholder}
          className="w-full h-12 px-3.5 pr-14 text-lg font-bold text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-xs"
        />

        <div className="absolute right-3.5 pointer-events-none flex items-center text-xs font-bold text-slate-500 uppercase">
          <span>kg</span>
        </div>
      </div>
    </div>
  );
};
