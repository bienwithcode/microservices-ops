import api from './client';

export function getCart(userId) {
  return api.get(`/api/cart/${userId}`);
}

export function addItem(userId, item) {
  return api.post(`/api/cart/${userId}/items`, item);
}

export function emptyCart(userId) {
  return api.delete(`/api/cart/${userId}`);
}
