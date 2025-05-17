const express = require("express")
const http = require("http")
const { Server } = require("socket.io")
const cors = require("cors")
const { MongoClient, ObjectId } = require("mongodb")

// Initialize Express app
const app = express()
app.use(cors())

// Create HTTP server
const server = http.createServer(app)

// Initialize Socket.IO
console.log("inside server.js ", process.env.NEXT_PUBLIC_APP_URL)
const io = new Server(server, {
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingTimeout: 60000,
})

// MongoDB connection
const mongoClient = new MongoClient(process.env.MONGODB_URI)
let db

// Connect to MongoDB
async function connectToMongo() {
  try {
    await mongoClient.connect()
    db = mongoClient.db()
    console.log("Connected to MongoDB")
  } catch (error) {
    console.error("MongoDB connection error:", error)
  }
}

connectToMongo()

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

// Start server
const PORT = process.env.PORT || 3001
server.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`)
})
