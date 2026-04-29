import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSession } from '../context/SessionContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { getProduct } from '../api/products.js';
import { addItem } from '../api/cart.js';
import { getRecommendations } from '../api/recommendations.js';
import { getAds } from '../api/ads.js';
import { formatMoney } from '../api/money.js';
import Recommendations from '../components/Recommendations.jsx';
import AdBanner from '../components/AdBanner.jsx';

export default function Product() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { sessionId } = useSession();
  const { refreshCart } = useCart();
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [recommendations, setRecommendations] = useState([]);
  const [ad, setAd] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;

    getProduct(id)
      .then((res) => {
        const data = res.data;
        setProduct(data);
        if (data && data.categories) {
          getAds(data.categories)
            .then((adsRes) => { const ads = adsRes.data; if (ads && ads.length > 0) setAd(ads[0]); })
            .catch(() => {});
        }
      })
      .catch((err) => setError(err.message));

    getRecommendations([id], '')
      .then((res) => setRecommendations(res.data || []))
      .catch(() => {});
  }, [id]);

  async function handleAddToCart(e) {
    e.preventDefault();
    try {
      await addItem(sessionId, { productId: id, quantity: Number(quantity) });
      await refreshCart();
      navigate('/cart');
    } catch (err) {
      setError(err.message);
    }
  }

  if (!product) {
    return <main role="main"><div className="container"><p>Loading...</p></div></main>;
  }

  return (
    <main role="main">
      <div className="h-product container">
        <div className="row">
          <div className="col-md-6">
            <img className="product-image" alt="" src={product.picture} />
          </div>
          <div className="product-info col-md-5">
            <div className="product-wrapper">
              <h2>{product.name}</h2>
              <p className="product-price">{formatMoney(product.price)}</p>
              <p>{product.description}</p>

              <form onSubmit={handleAddToCart}>
                <input type="hidden" name="product_id" value={product.id} />
                <div className="product-quantity-dropdown">
                  <select
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  >
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5</option>
                    <option value="10">10</option>
                  </select>
                  <img src="/icons/Hipster_DownArrow.svg" alt="" />
                </div>
                <button type="submit" className="cymbal-button-primary">
                  Add To Cart
                </button>
              </form>

              {error && <p style={{ color: 'red' }}>{error}</p>}
            </div>
          </div>
        </div>
      </div>
      {recommendations.length > 0 && (
        <Recommendations productIds={recommendations.map((r) => r.id)} />
      )}
      {ad && <AdBanner ad={ad} />}
    </main>
  );
}
