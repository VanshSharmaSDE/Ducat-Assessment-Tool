import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

/**
 * Resolves the backend Socket.IO connection URL across environments:
 * 1. Explicit env variables (VITE_SOCKET_URL, VITE_BACKEND_URL, VITE_API_URL)
 * 2. Localhost development (proxied by Vite to port 5000)
 * 3. Production VPS / Custom domain deployment (frontend at domain.com, backend at api.domain.com)
 */
export function getSocketUrl() {
  const envUrl =
    import.meta.env.VITE_SOCKET_URL ||
    import.meta.env.VITE_BACKEND_URL ||
    import.meta.env.VITE_API_URL;

  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim().replace(/\/api\/?$/, '').replace(/\/$/, '');
  }

  if (typeof window !== 'undefined' && window.location) {
    // Current origin (works seamlessly with reverse proxy like /socket.io in production VPS)
    return window.location.origin;
  }

  return '';
}

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    const primaryUrl = getSocketUrl();
    const token = localStorage.getItem('accessToken');

    const socketOptions = {
      auth: { token },
      query: token ? { token } : {},
      transports: ['polling', 'websocket'],
      withCredentials: true,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    };

    let activeSocket = io(primaryUrl, socketOptions);
    socketRef.current = activeSocket;

    let hasConnected = false;
    let connectErrors = 0;

    const handleConnect = () => {
      hasConnected = true;
      connectErrors = 0;
      const currentToken = localStorage.getItem('accessToken');
      if (currentToken) {
        activeSocket.emit('authenticate', { token: currentToken });
      }
    };

    const handleReconnect = () => {
      const currentToken = localStorage.getItem('accessToken');
      if (currentToken) {
        activeSocket.emit('authenticate', { token: currentToken });
      }
    };

    const handleConnectError = (err) => {
      connectErrors++;
      // If primary origin URL fails and we are on a custom domain, attempt api subdomain fallback
      if (!hasConnected && connectErrors >= 2) {
        const { protocol, hostname } = window.location;
        const apiFallback = `${protocol}//api.${hostname.replace(/^www\./, '')}`;
        if (primaryUrl !== apiFallback) {
          try {
            activeSocket.disconnect();
            activeSocket = io(apiFallback, socketOptions);
            socketRef.current = activeSocket;
            attachListeners(activeSocket);
            setSocket(activeSocket);
          } catch (e) {
            // ignore fallback error
          }
        }
      }
    };

    const handleSessionTerminated = () => {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      window.location.href = '/login?reason=concurrent_session';
    };

    function attachListeners(sock) {
      sock.on('connect', handleConnect);
      sock.on('reconnect', handleReconnect);
      sock.on('connect_error', handleConnectError);
      sock.on('session:terminated', handleSessionTerminated);
    }

    attachListeners(activeSocket);
    setSocket(activeSocket);

    return () => {
      if (activeSocket) {
        activeSocket.off('connect', handleConnect);
        activeSocket.off('reconnect', handleReconnect);
        activeSocket.off('connect_error', handleConnectError);
        activeSocket.off('session:terminated', handleSessionTerminated);
        activeSocket.disconnect();
      }
      socketRef.current = null;
    };
  }, []);

  // When user auth changes (login, logout, switch account), re-authenticate active socket
  useEffect(() => {
    if (!socketRef.current) return;
    const currentToken = localStorage.getItem('accessToken');

    if (user && currentToken) {
      socketRef.current.auth = { token: currentToken };
      socketRef.current.emit('authenticate', { token: currentToken });
    } else if (!user) {
      socketRef.current.emit('logout');
    }
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, socketRef }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
