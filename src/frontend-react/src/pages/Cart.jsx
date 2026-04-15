import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSession } from '../context/SessionContext.jsx';
import { useCurrency } from '../context/CurrencyContext.jsx';
import { getCart, emptyCart } from '../api/cart.js';
import { getProduct } from '../api/products.js';
import { getQuote } from '../api/shipping.js';
import { placeOrder } from '../api/checkout.js';
import { formatMoney } from '../api/money.js';

const MONTHS = [
  { value: 1, label: 'January' }, { value: 2, label: 'February' },
  { value: 3, label: 'March' }, { value: 4, label: 'April' },
  { value: 5, label: 'May' }, { value: 6, label: 'June' },
  { value: 7, label: 'July' }, { value: 8, label: 'August' },
  { value: 9, label: 'September' }, { value: 10, label: 'October' },
  { value: 11, label: 'November' }, { value: 12, label: 'December' },
];

export default function Cart() {
  const { sessionId } = useSession();
  const { currency } = useCurrency();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [shippingCost, setShippingCost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form state
  const [email, setEmail] = useState('someone@example.com');
  const [streetAddress, setStreetAddress] = useState('1600 Amphitheatre Parkway');
  const [zipCode, setZipCode] = useState('94043');
  const [city, setCity] = useState('Mountain View');
  const [state, setState] = useState('CA');
  const [country, setCountry] = useState('United States');
  const [ccNumber, setCcNumber] = useState('4432801561520454');
  const [ccMonth, setCcMonth] = useState(1);
  const [ccYear, setCcYear] = useState(new Date().getFullYear() + 1);
  const [ccCvv, setCcCvv] = useState('672');

  const expirationYears = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i);

  const fetchCart = useCallback(async () => {
    setLoading(true);
    try {
      const cartRes = await getCart(sessionId);
      const cartData = cartRes.data;
      if (!cartData || !cartData.items || cartData.items.length === 0) {
        setItems([]);
        setLoading(false);
        return;
      }
      // Enrich cart items with product details
      const enriched = await Promise.all(
        cartData.items.map(async (item) => {
          try {
            const productRes = await getProduct(item.productId);
            const product = productRes.data;
            return {
              ...item,
              name: product.name,
              picture: product.picture,
              price: product.priceUsd || product.price,
            };
          } catch {
            return {
              ...item,
              name: item.productId,
              picture: '',
              price: item.price || { units: 0, nanos: 0, currencyCode: 'USD' },
            };
          }
        })
      );
      setItems(enriched);

      // Get shipping quote
      try {
        const quoteRes = await getQuote(enriched);
        const cost = quoteRes.data.costUsd || quoteRes.data;
        setShippingCost({
          currencyCode: cost.currencyCode,
          units: Number(cost.units) || 0,
          nanos: cost.nanos || 0,
        });
      } catch {
        setShippingCost({ units: 0, nanos: 0, currencyCode: 'USD' });
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }, [sessionId]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  async function handleEmptyCart() {
    try {
      await emptyCart(sessionId);
      setItems([]);
      setShippingCost(null);
    } catch (err) {
      setError(err.message);
    }
  }

  function computeTotal() {
    let totalUnits = 0;
    let totalNanos = 0;
    const currencyCode = items.length > 0 && items[0].price ? items[0].price.currencyCode : 'USD';

    items.forEach((item) => {
      const qty = item.quantity || 1;
      const p = item.price || { units: 0, nanos: 0 };
      totalUnits += (p.units || 0) * qty;
      totalNanos += (p.nanos || 0) * qty;
    });

    if (shippingCost) {
      totalUnits += shippingCost.units || 0;
      totalNanos += shippingCost.nanos || 0;
    }

    totalUnits += Math.floor(totalNanos / 1000000000);
    totalNanos = totalNanos % 1000000000;

    return { units: totalUnits, nanos: totalNanos, currencyCode };
  }

  async function handlePlaceOrder(e) {
    e.preventDefault();
    try {
      const address = { streetAddress, zipCode, city, state, country };
      const creditCard = {
        creditCardNumber: ccNumber,
        creditCardExpirationMonth: ccMonth,
        creditCardExpirationYear: ccYear,
        creditCardCvv: Number(ccCvv),
      };
      const orderRes = await placeOrder({
        userId: sessionId,
        userCurrency: currency,
        email,
        address,
        creditCard,
      });
      const order = orderRes.data.order || orderRes.data;
      // Store order data and navigate
      localStorage.setItem('lastOrder', JSON.stringify(order));
      navigate('/order', { state: { order } });
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) {
    return <main role="main"><div className="container"><p>Loading cart...</p></div></main>;
  }

  if (items.length === 0) {
    return (
      <main role="main" className="cart-sections">
        <section className="empty-cart-section">
          <h3>Your shopping cart is empty!</h3>
          <p>Items you add to your shopping cart will appear here.</p>
          <Link className="cymbal-button-primary" to="/" role="button">
            Continue Shopping
          </Link>
        </section>
      </main>
    );
  }

  const totalCost = computeTotal();

  return (
    <main role="main" className="cart-sections">
      <section className="container">
        <div className="row">
          <div className="col-lg-6 col-xl-5 offset-xl-1 cart-summary-section">
            <div className="row mb-3 py-2">
              <div className="col-4 pl-md-0">
                <h3>Cart ({items.length})</h3>
              </div>
              <div className="col-8 pr-md-0 text-right">
                <button
                  className="cymbal-button-secondary cart-summary-empty-cart-button"
                  onClick={handleEmptyCart}
                >
                  Empty Cart
                </button>
                <Link className="cymbal-button-primary" to="/" role="button">
                  Continue Shopping
                </Link>
              </div>
            </div>

            {items.map((item, idx) => (
              <div key={item.productId || idx} className="row cart-summary-item-row">
                <div className="col-md-4 pl-md-0">
                  <Link to={`/product/${item.productId}`}>
                    <img className="img-fluid" alt="" src={item.picture} />
                  </Link>
                </div>
                <div className="col-md-8 pr-md-0">
                  <div className="row">
                    <div className="col"><h4>{item.name}</h4></div>
                  </div>
                  <div className="row cart-summary-item-row-item-id-row">
                    <div className="col">SKU #{item.productId}</div>
                  </div>
                  <div className="row">
                    <div className="col">Quantity: {item.quantity}</div>
                    <div className="col pr-md-0 text-right">
                      <strong>{formatMoney(item.price)}</strong>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <div className="row cart-summary-shipping-row">
              <div className="col pl-md-0">Shipping</div>
              <div className="col pr-md-0 text-right">
                {shippingCost ? formatMoney(shippingCost) : '--'}
              </div>
            </div>

            <div className="row cart-summary-total-row">
              <div className="col pl-md-0">Total</div>
              <div className="col pr-md-0 text-right">{formatMoney(totalCost)}</div>
            </div>
          </div>

          <div className="col-lg-5 offset-lg-1 col-xl-4">
            <form className="cart-checkout-form" onSubmit={handlePlaceOrder}>
              <div className="row">
                <div className="col"><h3>Shipping Address</h3></div>
              </div>

              <div className="form-row">
                <div className="col cymbal-form-field">
                  <label htmlFor="email">E-mail Address</label>
                  <input type="email" id="email" value={email}
                    onChange={(e) => setEmail(e.target.value)} required />
                </div>
              </div>

              <div className="form-row">
                <div className="col cymbal-form-field">
                  <label htmlFor="street_address">Street Address</label>
                  <input type="text" id="street_address" value={streetAddress}
                    onChange={(e) => setStreetAddress(e.target.value)} required />
                </div>
              </div>

              <div className="form-row">
                <div className="col cymbal-form-field">
                  <label htmlFor="zip_code">Zip Code</label>
                  <input type="text" id="zip_code" value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)} required pattern="\d{4,5}" />
                </div>
              </div>

              <div className="form-row">
                <div className="col cymbal-form-field">
                  <label htmlFor="city">City</label>
                  <input type="text" id="city" value={city}
                    onChange={(e) => setCity(e.target.value)} required />
                </div>
              </div>

              <div className="form-row">
                <div className="col-md-5 cymbal-form-field">
                  <label htmlFor="state">State</label>
                  <input type="text" id="state" value={state}
                    onChange={(e) => setState(e.target.value)} required />
                </div>
                <div className="col-md-7 cymbal-form-field">
                  <label htmlFor="country">Country</label>
                  <input type="text" id="country" value={country}
                    onChange={(e) => setCountry(e.target.value)} required />
                </div>
              </div>

              <div className="row">
                <div className="col"><h3 className="payment-method-heading">Payment Method</h3></div>
              </div>

              <div className="form-row">
                <div className="col cymbal-form-field">
                  <label htmlFor="credit_card_number">Credit Card Number</label>
                  <input type="text" id="credit_card_number"
                    value={ccNumber} onChange={(e) => setCcNumber(e.target.value)}
                    required pattern="\d{16}" />
                </div>
              </div>

              <div className="form-row">
                <div className="col-md-5 cymbal-form-field">
                  <label htmlFor="cc_month">Month</label>
                  <select id="cc_month" value={ccMonth}
                    onChange={(e) => setCcMonth(Number(e.target.value))}>
                    {MONTHS.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                  <img src="/icons/Hipster_DownArrow.svg" alt="" className="cymbal-dropdown-chevron" />
                </div>
                <div className="col-md-4 cymbal-form-field">
                  <label htmlFor="cc_year">Year</label>
                  <select id="cc_year" value={ccYear}
                    onChange={(e) => setCcYear(Number(e.target.value))}>
                    {expirationYears.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                  <img src="/icons/Hipster_DownArrow.svg" alt="" className="cymbal-dropdown-chevron" />
                </div>
                <div className="col-md-3 cymbal-form-field">
                  <label htmlFor="cc_cvv">CVV</label>
                  <input type="password" id="cc_cvv" value={ccCvv}
                    onChange={(e) => setCcCvv(e.target.value)} required pattern="\d{3}" />
                </div>
              </div>

              {error && <div className="form-row"><div className="col"><p style={{ color: 'red' }}>{error}</p></div></div>}

              <div className="form-row justify-content-center">
                <div className="col text-center">
                  <button className="cymbal-button-primary" type="submit">
                    Place Order
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
