'use client';

import React from 'react';
import { Home, ShoppingCart, TrendingUp, BookOpen, MoreHorizontal } from 'lucide-react';

export type ActiveTab = 'home' | 'buy' | 'sell' | 'ledgers' | 'more';

interface BottomTabBarProps {
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({ activeTab, onChangeTab }) => {
  const tabs: { id: ActiveTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'buy', label: 'Buy', icon: ShoppingCart },
    { id: 'sell', label: 'Sell', icon: TrendingUp },
    { id: 'ledgers', label: 'Ledgers', icon: BookOpen },
    { id: 'more', label: 'More', icon: MoreHorizontal },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 pb-[max(env(safe-area-inset-bottom),8px)] shadow-lg">
      <div className="max-w-md mx-auto grid grid-cols-5 px-1 pt-1.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChangeTab(tab.id)}
              className={`flex flex-col items-center justify-center min-h-[50px] py-1 rounded-xl transition-all select-none ${
                isActive
                  ? 'text-emerald-700 font-bold'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              <div
                className={`p-1 rounded-xl transition-all ${
                  isActive ? 'bg-emerald-100/80 text-emerald-700 scale-105' : ''
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className={`text-[11px] mt-0.5 tracking-tight ${isActive ? 'font-bold' : ''}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
