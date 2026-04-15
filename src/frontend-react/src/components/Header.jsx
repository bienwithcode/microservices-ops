import { Link } from 'react-router-dom';
import { useCurrency } from '../context/CurrencyContext.jsx';
import { useCart } from '../context/CartContext.jsx';

const IS_CYMBAL_BRAND = import.meta.env.VITE_CYMBAL_BRAND === 'true';
const BANNER_MESSAGE = import.meta.env.VITE_BANNER_MESSAGE || '';

function currencySymbol(code) {
  const symbols = {
    USD: '$', EUR: '\u20AC', GBP: '\u00A3', JPY: '\u00A5',
    CAD: 'C$', AUD: 'A$', CHF: 'CHF', CNY: '\u00A5', SEK: 'kr',
    BRL: 'R$', INR: '\u20B9', MXN: 'MX$', KRW: '\u20A9',
  };
  return symbols[code] || code;
}

export default function Header() {
  const { supportedCurrencies, currency, setCurrency } = useCurrency();
  const { cartSize } = useCart();

  return (
    <header>
      {BANNER_MESSAGE && (
        <div className="navbar">
          <div className="container d-flex justify-content-center">
            <div className="h-free-shipping">{BANNER_MESSAGE}</div>
          </div>
        </div>
      )}
      <div className="navbar sub-navbar">
        <div className="container d-flex justify-content-between">
          <Link to="/" className="navbar-brand d-flex align-items-center">
            {IS_CYMBAL_BRAND ? (
              <img src="/icons/Cymbal_NavLogo.svg" alt="" className="top-left-logo-cymbal" />
            ) : (
              <img src="/icons/Hipster_NavLogo.svg" alt="" className="top-left-logo" />
            )}
          </Link>
          <div className="controls">
            {supportedCurrencies && supportedCurrencies.length > 0 && (
              <div className="h-controls">
                <div className="h-control">
                  <span className="icon currency-icon">{currencySymbol(currency)}</span>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                  >
                    {supportedCurrencies.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <img src="/icons/Hipster_DownArrow.svg" alt="" className="icon arrow" />
                </div>
              </div>
            )}
            <Link to="/cart" className="cart-link">
              <img src="/icons/Hipster_CartIcon.svg" alt="Cart icon" className="logo" title="Cart" />
              {cartSize > 0 && (
                <span className="cart-size-circle">{cartSize}</span>
              )}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
