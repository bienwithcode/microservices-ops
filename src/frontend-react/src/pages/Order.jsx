import { useLocation, Link } from 'react-router-dom';
import { formatMoney } from '../api/money.js';

export default function Order() {
  const location = useLocation();
  const order = location.state?.order || JSON.parse(localStorage.getItem('lastOrder') || 'null');

  if (!order) {
    return (
      <main role="main" className="order">
        <section className="container order-complete-section">
          <div className="row">
            <div className="col-12 text-center">
              <h3>No order found</h3>
            </div>
          </div>
          <div className="row">
            <div className="col-12 text-center">
              <Link className="cymbal-button-primary" to="/" role="button">
                Continue Shopping
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main role="main" className="order">
      <section className="container order-complete-section">
        <div className="row">
          <div className="col-12 text-center">
            <h3>Your order is complete!</h3>
          </div>
          <div className="col-12 text-center">
            <p>We've sent you a confirmation email.</p>
          </div>
        </div>
        <div className="row border-bottom-solid padding-y-24">
          <div className="col-6 pl-md-0">Confirmation #</div>
          <div className="col-6 pr-md-0 text-right">{order.orderId}</div>
        </div>
        <div className="row border-bottom-solid padding-y-24">
          <div className="col-6 pl-md-0">Tracking #</div>
          <div className="col-6 pr-md-0 text-right">{order.shippingTrackingId}</div>
        </div>
        <div className="row padding-y-24">
          <div className="col-6 pl-md-0">Total Paid</div>
          <div className="col-6 pr-md-0 text-right">
            {order.totalPaid ? formatMoney(order.totalPaid) : '--'}
          </div>
        </div>
        <div className="row">
          <div className="col-12 text-center">
            <Link className="cymbal-button-primary" to="/" role="button">
              Continue Shopping
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
