import { createContext, useContext, useState } from 'react';

const CurrencyContext = createContext(null);

const DEFAULT_CURRENCIES = ['USD', 'EUR', 'CAD', 'JPY', 'GBP', 'TRY'];

export function CurrencyProvider({ children }) {
  const [currency, setCurrencyState] = useState(() => {
    return localStorage.getItem('shop_currency') || 'USD';
  });
  const [supportedCurrencies, setSupportedCurrencies] = useState(DEFAULT_CURRENCIES);

  const setCurrency = (code) => {
    setCurrencyState(code);
    localStorage.setItem('shop_currency', code);
  };

  return (
    <CurrencyContext.Provider
      value={{ currency, setCurrency, supportedCurrencies, setSupportedCurrencies }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
}
