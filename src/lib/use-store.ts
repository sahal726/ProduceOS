'use client';

import { useState, useEffect } from 'react';
import { dataStore, ERPStoreData, SyncStatus } from './data-store';

export function useStore(): ERPStoreData & {
  syncStatus: SyncStatus;
  pullFromCloud: () => Promise<boolean>;
  pushToCloud: () => Promise<boolean>;
  getLastSyncError: () => string | null;
  addProduct: typeof dataStore.addProduct;
  updateProduct: typeof dataStore.updateProduct;
  addFarmer: typeof dataStore.addFarmer;
  updateFarmer: typeof dataStore.updateFarmer;
  addParty: typeof dataStore.addParty;
  updateParty: typeof dataStore.updateParty;
  addPurchase: typeof dataStore.addPurchase;
  updatePurchase: typeof dataStore.updatePurchase;
  deletePurchase: typeof dataStore.deletePurchase;
  addSale: typeof dataStore.addSale;
  updateSale: typeof dataStore.updateSale;
  deleteSale: typeof dataStore.deleteSale;
  addPayment: typeof dataStore.addPayment;
  updatePayment: typeof dataStore.updatePayment;
  deletePayment: typeof dataStore.deletePayment;
  addExpense: typeof dataStore.addExpense;
  deleteExpense: typeof dataStore.deleteExpense;
  addExpenseCategory: typeof dataStore.addExpenseCategory;
  addWeightLoss: typeof dataStore.addWeightLoss;
  setDailyRate: typeof dataStore.setDailyRate;
  getDailyRate: typeof dataStore.getDailyRate;
  updateSettings: typeof dataStore.updateSettings;
  exportDataJSON: typeof dataStore.exportDataJSON;
  importDataJSON: typeof dataStore.importDataJSON;
  resetToDemo: typeof dataStore.resetToDemo;
  clearAllForLiveTesting: typeof dataStore.clearAllForLiveTesting;
} {
  const [data, setData] = useState<ERPStoreData>(dataStore.getData());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(dataStore.getSyncStatus());

  useEffect(() => {
    // Initial sync
    setData(dataStore.getData());
    setSyncStatus(dataStore.getSyncStatus());
    // Subscribe to changes
    const unsubscribe = dataStore.subscribe(() => {
      setData({ ...dataStore.getData() });
      setSyncStatus(dataStore.getSyncStatus());
    });
    return () => unsubscribe();
  }, []);

  return {
    ...data,
    syncStatus,
    pullFromCloud: dataStore.pullFromCloud.bind(dataStore),
    pushToCloud: dataStore.pushToCloud.bind(dataStore),
    getLastSyncError: dataStore.getLastSyncError.bind(dataStore),
    addProduct: dataStore.addProduct.bind(dataStore),
    updateProduct: dataStore.updateProduct.bind(dataStore),
    addFarmer: dataStore.addFarmer.bind(dataStore),
    updateFarmer: dataStore.updateFarmer.bind(dataStore),
    addParty: dataStore.addParty.bind(dataStore),
    updateParty: dataStore.updateParty.bind(dataStore),
    addPurchase: dataStore.addPurchase.bind(dataStore),
    updatePurchase: dataStore.updatePurchase.bind(dataStore),
    deletePurchase: dataStore.deletePurchase.bind(dataStore),
    addSale: dataStore.addSale.bind(dataStore),
    updateSale: dataStore.updateSale.bind(dataStore),
    deleteSale: dataStore.deleteSale.bind(dataStore),
    addPayment: dataStore.addPayment.bind(dataStore),
    updatePayment: dataStore.updatePayment.bind(dataStore),
    deletePayment: dataStore.deletePayment.bind(dataStore),
    addExpense: dataStore.addExpense.bind(dataStore),
    deleteExpense: dataStore.deleteExpense.bind(dataStore),
    addExpenseCategory: dataStore.addExpenseCategory.bind(dataStore),
    addWeightLoss: dataStore.addWeightLoss.bind(dataStore),
    setDailyRate: dataStore.setDailyRate.bind(dataStore),
    getDailyRate: dataStore.getDailyRate.bind(dataStore),
    updateSettings: dataStore.updateSettings.bind(dataStore),
    exportDataJSON: dataStore.exportDataJSON.bind(dataStore),
    importDataJSON: dataStore.importDataJSON.bind(dataStore),
    resetToDemo: dataStore.resetToDemo.bind(dataStore),
    clearAllForLiveTesting: dataStore.clearAllForLiveTesting.bind(dataStore),
  };
}
