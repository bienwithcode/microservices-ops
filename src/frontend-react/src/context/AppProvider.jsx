import { SessionProvider } from './SessionContext.jsx';
import { CurrencyProvider } from './CurrencyContext.jsx';
import { CartProvider } from './CartContext.jsx';

export default function AppProvider({ children }) {
  return (
    <SessionProvider>
      <CurrencyProvider>
        <CartProvider>
          {children}
        </CartProvider>
      </CurrencyProvider>
    </SessionProvider>
  );
}
