import api from './client';

export function getRecommendations(productIds, userId) {
  return api.get('/api/recommendations', { params: { productIds, userId } });
}
