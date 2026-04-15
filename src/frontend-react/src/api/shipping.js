import api from './client';

export function getQuote(items, address) {
  return api.post('/api/shipping/quote', { items, address });
}
