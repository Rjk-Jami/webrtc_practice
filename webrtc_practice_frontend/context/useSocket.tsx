"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { io, Socket } from "socket.io-client";

interface SocketContextType {
  socket: Socket;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const socket = useMemo(() => io("http://10.81.100.28:5000"), []);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) throw new Error("useSocket must be used inside SocketProvider");
  return context;
};
