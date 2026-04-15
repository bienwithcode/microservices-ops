import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProducts } from '../api/products.js';
import { getAds } from '../api/ads.js';
import ProductCard from '../components/ProductCard.jsx';
import AdBanner from '../components/AdBanner.jsx';

export default function Home() {
  const [products, setProducts] = useState([]);
  const [ad, setAd] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    getProducts()
      .then((res) => setProducts(res.data.products || []))
      .catch(() => {});

    getAds(['home'])
      .then((res) => {
        const ads = res.data;
        if (ads && ads.length > 0) setAd(ads[0]);
      })
      .catch(() => {});
  }, []);

  function handleProductClick(product) {
    navigate(`/product/${product.id}`);
  }

  return (
    <main role="main" className="home">
      <div className="home-mobile-hero-banner d-lg-none"></div>
      <div className="container-fluid">
        <div className="row">
          <div className="col-12 col-lg-12 px-10-percent">
            <div className="row hot-products-row px-xl-6">
              <div className="col-12">
                <h3>Hot Products</h3>
              </div>
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onClick={handleProductClick}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
      {ad && <AdBanner ad={ad} />}
    </main>
  );
}
