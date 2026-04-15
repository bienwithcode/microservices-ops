import axios from 'axios';

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getSessionId() {
  let id = localStorage.getItem('shop_session-id');
  if (!id) {
    id = uuidv4();
    localStorage.setItem('shop_session-id', id);
  }
  return id;
}

const api = axios.create({
  baseURL: '/',
});

api.interceptors.request.use((config) => {
  config.headers['X-Session-Id'] = getSessionId();
  return config;
});

export default api;
