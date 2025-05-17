import { getServerSession } from "next-auth"
import { ObjectId } from "mongodb"
import { authOptions } from "@/lib/auth-options"
import { connectToDatabase } from "@/lib/mongodb"
import { encryptMessage, decryptMessage } from "@/lib/encryption"

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user?.email) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const chatId = req.query.chatId

  if (!chatId || !ObjectId.isValid(chatId)) {
    return res.status(400).json({ error: "Invalid chat ID" })
  }

  if (req.method === "GET") {
    try {
      const { db } = await connectToDatabase()

      // Get current user
      const currentUser = await db.collection("users").findOne({ email: session.user.email })

      if (!currentUser) {
        return res.status(404).json({ error: "User not found" })
      }

      // Check if user is a participant in the chat
      const chat = await db.collection("chats").findOne({
        _id: new ObjectId(chatId),
        "participants.userId": new ObjectId(currentUser._id),
      })

      if (!chat) {
        return res.status(404).json({ error: "Chat not found or user not a participant" })
      }

      // Get messages
      const messages = await db
        .collection("messages")
        .find({ chatId: new ObjectId(chatId) })
        .sort({ createdAt: 1 })
        .toArray()

      // Decrypt messages
      const decryptedMessages = messages.map((message) => ({
        ...message,
        content: message.content ? decryptMessage(message.content) : null,
      }))

      // Mark messages as seen
      await db.collection("chats").updateOne(
        {
          _id: new ObjectId(chatId),
          "participants.userId": new ObjectId(currentUser._id),
        },
        { $set: { "participants.$.hasSeenLatestMessage": true } },
      )

      return res.status(200).json(decryptedMessages)
    } catch (error) {
      console.error("Error fetching messages:", error)
      return res.status(500).json({ error: "Internal server error" })
    }
  } else if (req.method === "POST") {
    try {
      const { content, fileUrl, fileType, isVoiceMessage } = req.body

      if ((!content || content.trim() === "") && !fileUrl) {
        return res.status(400).json({ error: "Message content or file is required" })
      }

      const { db } = await connectToDatabase()

      // Get current user
      const currentUser = await db.collection("users").findOne({ email: session.user.email })

      if (!currentUser) {
        return res.status(404).json({ error: "User not found" })
      }

      // Check if user is a participant in the chat
      const chat = await db.collection("chats").findOne({
        _id: new ObjectId(chatId),
        "participants.userId": new ObjectId(currentUser._id),
      })

      if (!chat) {
        return res.status(404).json({ error: "Chat not found or user not a participant" })
      }

      // Encrypt message content
      const encryptedContent = content ? encryptMessage(content) : null

      // Create message
      const newMessage = {
        chatId: new ObjectId(chatId),
        senderId: new ObjectId(currentUser._id),
        content: encryptedContent,
        fileUrl,
        fileType,
        isVoiceMessage: isVoiceMessage || false,
        createdAt: new Date(),
      }

      const result = await db.collection("messages").insertOne(newMessage)

      // Update chat with latest message info
      await db.collection("chats").updateMany(
        { _id: new ObjectId(chatId) },
        {
          $set: {
            "participants.$[other].hasSeenLatestMessage": false,
            lastMessageAt: new Date(),
          },
        },
        {
          arrayFilters: [{ "other.userId": { $ne: new ObjectId(currentUser._id) } }],
        },
      )

      // Set current user as having seen the latest message
      await db.collection("chats").updateOne(
        {
          _id: new ObjectId(chatId),
          "participants.userId": new ObjectId(currentUser._id),
        },
        { $set: { "participants.$.hasSeenLatestMessage": true } },
      )

      // Return decrypted message for the sender
      return res.status(201).json({
        ...newMessage,
        _id: result.insertedId,
        content: content, // Return original content for the sender
      })
    } catch (error) {
      console.error("Error sending message:", error)
      return res.status(500).json({ error: "Internal server error" })
    }
  } else {
    return res.status(405).json({ error: "Method not allowed" })
  }
}
