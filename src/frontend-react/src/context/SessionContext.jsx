import { createContext, useContext, useState, useEffect } from 'react';

const SessionContext = createContext(null);

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

export function SessionProvider({ children }) {
  const [sessionId] = useState(() => getSessionId());

  return (
    <SessionContext.Provider value={{ sessionId }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}
