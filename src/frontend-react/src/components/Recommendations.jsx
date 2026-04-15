import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getProduct } from '../api/products.js';

export default function Recommendations({ productIds }) {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    if (!productIds || productIds.length === 0) return;

    Promise.all(productIds.map((id) => getProduct(id).then((res) => res.data)))
      .then((results) => setProducts(results.filter(Boolean)))
      .catch(() => {});
  }, [productIds]);

  if (!products || products.length === 0) return null;

  return (
    <section className="recommendations">
      <div className="container">
        <div className="row">
          <div className="col-xl-10 offset-xl-1">
            <h2>You May Also Like</h2>
            <div className="row">
              {products.map((p) => (
                <div key={p.id} className="col-md-3">
                  <div>
                    <Link to={`/product/${p.id}`}>
                      <img alt="" src={p.picture} />
                    </Link>
                    <div>
                      <h5>{p.name}</h5>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
