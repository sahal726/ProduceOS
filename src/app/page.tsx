'use client';

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { PinScreen } from '@/components/PinScreen';
import { Header } from '@/components/Header';
import { BottomTabBar, ActiveTab } from '@/components/BottomTabBar';
import { DashboardView } from '@/components/views/DashboardView';
import { BuyView } from '@/components/views/BuyView';
import { SellView } from '@/components/views/SellView';
import { LedgersView } from '@/components/views/LedgersView';
import { MoreView } from '@/components/views/MoreView';
import { Share, PlusSquare, X } from 'lucide-react';

function AppContent() {
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [initialLedgerEntity, setInitialLedgerEntity] = useState<{
    type: 'party' | 'farmer';
    id: string;
  } | null>(null);

  // iOS Add to Home Screen Banner detection
  const [showIosPrompt, setShowIosPrompt] = useState<boolean>(false);

  useEffect(() => {
    // Check if iOS and not in standalone mode
    const isIos =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream: unknown }).MSStream;
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    const dismissed = localStorage.getItem('shop_erp_ios_prompt_dismissed');

    if (isIos && !isStandalone && !dismissed) {
      setShowIosPrompt(true);
    }
  }, []);

  if (!isAuthenticated) {
    return <PinScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col justify-between">
      <div>
        <Header />

        {/* iOS PWA Install Guide Banner */}
        {showIosPrompt && (
          <div className="max-w-md mx-auto px-4 pt-2">
            <div className="bg-emerald-900 text-white text-xs p-3 rounded-2xl flex items-start justify-between shadow-md relative">
              <div className="pr-4 flex flex-col gap-1">
                <span className="font-bold flex items-center gap-1 text-emerald-200">
                  <PlusSquare className="w-4 h-4 text-emerald-300" />
                  Install Shop ERP on your iPhone
                </span>
                <span className="text-[11px] text-emerald-100/90 leading-tight">
                  Tap <Share className="w-3 h-3 inline mx-0.5 text-emerald-300" /> <strong>Share</strong> in Safari, then tap <strong>&apos;Add to Home Screen&apos;</strong> to install.
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowIosPrompt(false);
                  localStorage.setItem('shop_erp_ios_prompt_dismissed', 'true');
                }}
                className="text-emerald-300 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Viewport Frame for 390px mobile aesthetic */}
        <main className="max-w-md mx-auto px-4 pt-3 pb-24">
          {activeTab === 'home' && (
            <DashboardView
              onNavigateTab={(tab) => {
                setInitialLedgerEntity(null);
                setActiveTab(tab);
              }}
              onOpenLedgerItem={(type, id) => {
                setInitialLedgerEntity({ type, id });
                setActiveTab('ledgers');
              }}
            />
          )}

          {activeTab === 'buy' && <BuyView />}

          {activeTab === 'sell' && <SellView />}

          {activeTab === 'ledgers' && (
            <LedgersView
              initialType={initialLedgerEntity?.type}
              initialEntityId={initialLedgerEntity?.id}
            />
          )}

          {activeTab === 'more' && <MoreView />}
        </main>
      </div>

      <BottomTabBar
        activeTab={activeTab}
        onChangeTab={(tab) => {
          setInitialLedgerEntity(null);
          setActiveTab(tab);
        }}
      />
    </div>
  );
}

export default function Home() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
