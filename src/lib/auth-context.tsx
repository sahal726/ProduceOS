'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useStore } from './use-store';

interface AuthContextType {
  isAuthenticated: boolean;
  unlock: (pin: string) => boolean;
  lock: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  unlock: () => false,
  lock: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings } = useStore();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true); // start true on SSR, check client
  const [isReady, setIsReady] = useState<boolean>(false);

  useEffect(() => {
    const saved = localStorage.getItem('shop_erp_authenticated');
    if (saved === 'true') {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
    setIsReady(true);
  }, []);

  const unlock = (enteredPin: string): boolean => {
    const targetPin = settings.pin_code || '1234';
    if (enteredPin === targetPin) {
      setIsAuthenticated(true);
      localStorage.setItem('shop_erp_authenticated', 'true');
      return true;
    }
    return false;
  };

  const lock = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('shop_erp_authenticated');
  };

  if (!isReady) {
    return null; // prevent hydration mismatch
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, unlock, lock }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
