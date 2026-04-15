import api from './client';

export function getCurrencies() {
  return api.get('/api/currencies');
}

export function convert(from, to) {
  return api.post('/api/currencies/convert', { from, to });
}
