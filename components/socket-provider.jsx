"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { io } from "socket.io-client"

const SocketContext = createContext({
  socket: null,
  isConnected: false,
})

export const useSocket = () => useContext(SocketContext)

export default function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const { data: session } = useSession()

  useEffect(() => {
    if (!session?.user?.id) return

    // Initialize Socket.IO server
    const initSocketServer = async () => {
      try {
        await fetch("/api/socket")
      } catch (error) {
        console.error("Failed to initialize Socket.IO server:", error)
      }
    }

    initSocketServer()

    // Create socket connection
    const socketInstance = io({
      path: "/api/socketio",
      auth: {
        userId: session.user.id,
      },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    socketInstance.on("connect", () => {
      console.log("Socket connected with ID:", socketInstance.id)
      setIsConnected(true)
    })

    socketInstance.on("connect_error", (error) => {
      console.error("Socket connection error:", error.message)
    })

    socketInstance.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason)
      setIsConnected(false)
    })

    // Explicitly connect to the server
    socketInstance.connect()

    setSocket(socketInstance)

    return () => {
      console.log("Cleaning up socket connection")
      socketInstance.disconnect()
    }
  }, [session])

  return <SocketContext.Provider value={{ socket, isConnected }}>{children}</SocketContext.Provider>
}
