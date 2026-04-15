import api from './client';

export function getAds(contextKeys) {
  return api.get('/api/ads', { params: { contextKeys } });
}
