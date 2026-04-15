import api from './client';

export function placeOrder(order) {
  return api.post('/api/checkout', order);
}
