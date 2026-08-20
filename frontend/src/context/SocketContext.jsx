import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const backendUrl =
      (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
      (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL) ||
      'https://hostel-backend-hbul.onrender.com';

    // Normalize URL by stripping trailing slash or /api endpoint suffix
    const socketUrl = backendUrl.replace(/\/api\/?$/, '');

    console.log(`🔌 Connecting to Socket.IO backend: ${socketUrl}`);

    const socketInstance = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    socketInstance.on('connect', () => {
      console.log(`✅ Socket.IO connected with ID: ${socketInstance.id}`);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log(`❌ Socket.IO disconnected: ${reason}`);
    });

    setSocket(socketInstance);

    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, []);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};
