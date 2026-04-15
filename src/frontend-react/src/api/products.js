import api from './client';

export function getProducts() {
  return api.get('/api/products');
}

export function getProduct(id) {
  return api.get(`/api/products/${id}`);
}

export function searchProducts(query) {
  return api.get('/api/products/search', { params: { query } });
}
