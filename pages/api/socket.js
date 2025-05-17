import { Server as SocketIOServer } from "socket.io"
import { ObjectId } from "mongodb"
import { connectToDatabase } from "@/lib/mongodb"

// Map to store all active socket connections
const users = new Map()

// Socket.IO server instance
let io

export default function handler(req, res) {
  if (res.socket.server.io) {
    console.log("Socket.IO already running")
    res.end()
    return
  }

  console.log("Setting up Socket.IO server...")

  // Create a new Socket.IO server
  io = new SocketIOServer(res.socket.server, {
    path: "/api/socketio",
    addTrailingSlash: false,
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
    pingTimeout: 60000,
  })

  // Store the Socket.IO server on the server object
  res.socket.server.io = io

  // Connect to MongoDB and set up socket handlers
  setupSocketHandlers(io)

  console.log("Socket.IO server started")
  res.end()
}

async function setupSocketHandlers(io) {
  // Connect to MongoDB
  const { db } = await connectToDatabase()

  // Socket.IO connection handler
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id)

    // Get user ID from auth data
    const userId = socket.handshake.auth.userId

    if (!userId) {
      console.log("Socket connection without userId, disconnecting:", socket.id)
      socket.disconnect()
      return
    }

    console.log(`User ${userId} authenticated and connected with socket ${socket.id}`)

    // Store the socket connection
    users.set(userId, socket)

    // Join a room specific to this user
    socket.join(userId)

    // Update user's online status
    if (db) {
      db.collection("users")
        .updateOne({ _id: new ObjectId(userId) }, { $set: { isOnline: true, lastSeen: new Date() } })
        .then(() => {
          console.log(`User ${userId} marked as online in database`)

          // Broadcast to all users that this user is online
          socket.broadcast.emit("user-status", {
            userId: userId,
            isOnline: true,
          })
        })
        .catch((err) => {
          console.error(`Error updating online status for user ${userId}:`, err)
        })
    }

    // Handle new messages
    socket.on("send-message", async (data) => {
      try {
        const { chatId, message } = data

        if (!chatId || !message) return

        // Get chat to find recipients
        const chat = await db.collection("chats").findOne({ _id: new ObjectId(chatId) })

        if (!chat) return

        // Emit to all participants except sender
        chat.participants.forEach((participant) => {
          if (participant.userId.toString() !== userId) {
            io.to(participant.userId.toString()).emit("new-message", message)
          }
        })
      } catch (error) {
        console.error("Error sending message:", error)
      }
    })

    // Handle call offers
    socket.on("call-offer", (data) => {
      const { recipient, offer } = data
      io.to(recipient).emit("call-offer", {
        caller: userId,
        offer,
      })
    })

    // Handle call answers
    socket.on("call-answer", (data) => {
      const { caller, answer } = data
      io.to(caller).emit("call-answer", { answer })
    })

    // Handle ICE candidates
    socket.on("ice-candidate", (data) => {
      const { recipient, candidate } = data
      io.to(recipient).emit("ice-candidate", {
        sender: userId,
        candidate,
      })
    })

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id)

      // Remove the socket connection
      users.delete(userId)

      // Update user's offline status
      if (userId && db) {
        const lastSeen = new Date()
        db.collection("users")
          .updateOne({ _id: new ObjectId(userId) }, { $set: { isOnline: false, lastSeen } })
          .then(() => {
            console.log(`User ${userId} marked as offline in database`)

            // Broadcast to all users that this user is offline
            io.emit("user-status", {
              userId: userId,
              isOnline: false,
              lastSeen,
            })
          })
          .catch((err) => {
            console.error(`Error updating offline status for user ${userId}:`, err)
          })
      }
    })
  })
}

// Helper function to get the Socket.IO instance
export function getIO() {
  return io
}
