'use client';

import React from 'react';
import { Unit } from '@/types';
import { kgToQuintal, quintalToKg } from '@/lib/calculations';

interface QuantityInputProps {
  label?: string;
  unit: Unit;
  onUnitChange: (newUnit: Unit) => void;
  rawQuantity: string;
  onQuantityChange: (val: string) => void;
  placeholder?: string;
  required?: boolean;
}

export const QuantityInput: React.FC<QuantityInputProps> = ({
  label = 'Quantity',
  unit,
  onUnitChange,
  rawQuantity,
  onQuantityChange,
  placeholder = '0.00',
  required = false,
}) => {
  const numVal = parseFloat(rawQuantity) || 0;
  const equivalent =
    unit === 'kg'
      ? `${kgToQuintal(numVal)} qtl`
      : `${quintalToKg(numVal)} kg`;

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>

        {/* kg / Quintal Toggle Switch */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={() => onUnitChange('kg')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
              unit === 'kg'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            KG
          </button>
          <button
            type="button"
            onClick={() => onUnitChange('quintal')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
              unit === 'quintal'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Quintal (qtl)
          </button>
        </div>
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
          className="w-full h-12 px-3.5 pr-20 text-lg font-bold text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-xs"
        />

        <div className="absolute right-3 pointer-events-none flex items-center text-xs font-medium text-slate-500">
          <span>{unit === 'kg' ? 'kg' : 'qtl'}</span>
        </div>
      </div>

      {numVal > 0 && (
        <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
          <span>Converted base:</span>
          <span className="font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
            = {equivalent}
          </span>
        </div>
      )}
    </div>
  );
};
