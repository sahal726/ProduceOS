'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useStore } from '@/lib/use-store';
import { Lock, Delete, Store, ShieldCheck } from 'lucide-react';

export const PinScreen: React.FC = () => {
  const { unlock } = useAuth();
  const { settings } = useStore();
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<boolean>(false);

  const handleDigit = (digit: string) => {
    if (pin.length >= 4) return;
    const nextPin = pin + digit;
    setPin(nextPin);
    setError(false);

    if (nextPin.length === 4) {
      setTimeout(() => {
        const success = unlock(nextPin);
        if (!success) {
          setError(true);
          setPin('');
        }
      }, 100);
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(false);
  };

  const handleQuickDemoUnlock = () => {
    unlock(settings.pin_code || '1234');
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-emerald-950 text-white px-6 py-12 select-none safe-top safe-bottom">
      {/* Header Info */}
      <div className="flex flex-col items-center text-center mt-6">
        <div className="w-16 h-16 rounded-3xl bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center mb-3 shadow-lg shadow-emerald-950/40">
          <Store className="w-8 h-8 text-emerald-400" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">{settings.shop_name}</h1>
        <p className="text-xs text-emerald-300/80 mt-1">Kerala Agricultural Produce Trading</p>
        <div className="mt-4 flex items-center gap-1.5 text-xs text-emerald-200/90 bg-emerald-900/60 px-3 py-1 rounded-full border border-emerald-800">
          <Lock className="w-3.5 h-3.5 text-emerald-400" />
          <span>Owner Access: {settings.owner_name}</span>
        </div>
      </div>

      {/* PIN Dots */}
      <div className="flex flex-col items-center my-6">
        <div className={`flex gap-4 my-3 transition-transform ${error ? 'animate-shake' : ''}`}>
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = pin.length > idx;
            return (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  error
                    ? 'bg-rose-500 ring-4 ring-rose-500/30'
                    : isFilled
                    ? 'bg-emerald-400 scale-110 shadow-md shadow-emerald-400/50'
                    : 'bg-emerald-900 border border-emerald-700/60'
                }`}
              />
            );
          })}
        </div>
        {error ? (
          <p className="text-xs font-medium text-rose-400 mt-2">Incorrect PIN. Try again</p>
        ) : (
          <p className="text-xs text-emerald-300/60 mt-2">Enter 4-digit security PIN</p>
        )}
      </div>

      {/* iOS Number Pad */}
      <div className="w-full max-w-[280px] grid grid-cols-3 gap-4 mb-4">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
          <button
            key={digit}
            type="button"
            onClick={() => handleDigit(digit)}
            className="w-18 h-18 mx-auto rounded-full bg-emerald-900/40 hover:bg-emerald-800/60 active:bg-emerald-700/80 active:scale-95 border border-emerald-800/60 flex items-center justify-center text-2xl font-semibold text-white transition-all duration-150 shadow-sm"
          >
            {digit}
          </button>
        ))}

        {/* Bottom row: Demo Quick-Unlock, 0, Backspace */}
        <button
          type="button"
          onClick={handleQuickDemoUnlock}
          title="Quick Unlock (Default: 1234)"
          className="w-18 h-18 mx-auto rounded-full bg-emerald-900/20 hover:bg-emerald-800/40 active:scale-95 flex flex-col items-center justify-center text-[10px] text-emerald-400 transition-all font-medium border border-emerald-800/30"
        >
          <ShieldCheck className="w-5 h-5 mb-0.5" />
          <span>PIN: {settings.pin_code || '1234'}</span>
        </button>

        <button
          type="button"
          onClick={() => handleDigit('0')}
          className="w-18 h-18 mx-auto rounded-full bg-emerald-900/40 hover:bg-emerald-800/60 active:bg-emerald-700/80 active:scale-95 border border-emerald-800/60 flex items-center justify-center text-2xl font-semibold text-white transition-all duration-150 shadow-sm"
        >
          0
        </button>

        <button
          type="button"
          onClick={handleDelete}
          className="w-18 h-18 mx-auto rounded-full bg-emerald-900/20 hover:bg-emerald-800/40 active:scale-95 flex items-center justify-center text-emerald-300 transition-all"
        >
          <Delete className="w-6 h-6" />
        </button>
      </div>

      <div className="text-center text-[11px] text-emerald-400/50">
        Protected ERP • Local Offline PWA & Cloud Ready
      </div>
    </div>
  );
};
