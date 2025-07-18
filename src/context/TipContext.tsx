
import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface Tip {
  id: string;
  username: string;
  amount: number;
  message?: string;
  timestamp: Date;
  tokenType?: 'SOL' | 'WENLIVE';
}

interface TipContextType {
  currentTip: Tip | null;
  showTip: (tip: Tip) => void;
}

const TipContext = createContext<TipContextType | undefined>(undefined);

export const TipProvider = ({ children }: { children: ReactNode }) => {
  const [currentTip, setCurrentTip] = useState<Tip | null>(null);

  const showTip = (tip: Tip) => {
    setCurrentTip(tip);
    // Clear the tip after 5 seconds
    setTimeout(() => {
      setCurrentTip(null);
    }, 5000);
  };

  return (
    <TipContext.Provider value={{ currentTip, showTip }}>
      {children}
    </TipContext.Provider>
  );
};

export const useTips = () => {
  const context = useContext(TipContext);
  if (context === undefined) {
    throw new Error('useTips must be used within a TipProvider');
  }
  return context;
};
