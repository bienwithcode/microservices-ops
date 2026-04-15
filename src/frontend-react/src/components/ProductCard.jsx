import { formatMoney } from '../api/money.js';

export default function ProductCard({ product, onClick }) {
  if (!product) return null;

  return (
    <div className="col-md-4 hot-product-card">
      <a href="#" onClick={(e) => { e.preventDefault(); onClick && onClick(product); }}>
        <img loading="lazy" src={product.picture} alt={product.name} />
        <div className="hot-product-card-img-overlay"></div>
      </a>
      <div>
        <div className="hot-product-card-name">{product.name}</div>
        <div className="hot-product-card-price">
          {formatMoney(product.price)}
        </div>
      </div>
    </div>
  );
}
