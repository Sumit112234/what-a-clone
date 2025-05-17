import { getServerSession } from "next-auth"
import { ObjectId } from "mongodb"
import { authOptions } from "@/lib/auth-options"
import { connectToDatabase } from "@/lib/mongodb"

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user?.email) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  if (req.method === "GET") {
    try {
      const { db } = await connectToDatabase()

      // Get current user
      const currentUser = await db.collection("users").findOne({ email: session.user.email })

      if (!currentUser) {
        return res.status(404).json({ error: "User not found" })
      }

      // Get all chats for the current user
      const chats = await db
        .collection("chats")
        .find({
          participants: { $elemMatch: { userId: new ObjectId(currentUser._id) } },
        })
        .toArray()

      // Get the other participants' details for each chat
      const populatedChats = await Promise.all(
        chats.map(async (chat) => {
          const otherParticipants = await Promise.all(
            chat.participants
              .filter((p) => !p.userId.equals(currentUser._id))
              .map(async (p) => {
                const user = await db.collection("users").findOne({ _id: p.userId }, { projection: { password: 0 } })
                return user
              }),
          )

          // Get the last message
          const lastMessage = await db
            .collection("messages")
            .find({ chatId: chat._id })
            .sort({ createdAt: -1 })
            .limit(1)
            .toArray()

          return {
            ...chat,
            otherParticipants,
            lastMessage: lastMessage[0] || null,
          }
        }),
      )

      return res.status(200).json(populatedChats)
    } catch (error) {
      console.error("Error fetching chats:", error)
      return res.status(500).json({ error: "Internal server error" })
    }
  } else if (req.method === "POST") {
    try {
      const { participantIds, isGroup, name } = req.body

      if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
        return res.status(400).json({ error: "Invalid participants" })
      }

      const { db } = await connectToDatabase()

      // Get current user
      const currentUser = await db.collection("users").findOne({ email: session.user.email })

      if (!currentUser) {
        return res.status(404).json({ error: "User not found" })
      }

      // Add current user to participants if not already included
      if (!participantIds.includes(currentUser._id.toString())) {
        participantIds.push(currentUser._id.toString())
      }

      // Convert string IDs to ObjectIds
      const participantObjectIds = participantIds.map((id) => new ObjectId(id))

      // Check if a direct chat already exists between these two users
      if (!isGroup && participantObjectIds.length === 2) {
        const existingChat = await db.collection("chats").findOne({
          isGroup: false,
          participants: {
            $all: [
              { $elemMatch: { userId: participantObjectIds[0] } },
              { $elemMatch: { userId: participantObjectIds[1] } },
            ],
            $size: 2,
          },
        })

        if (existingChat) {
          return res.status(200).json(existingChat)
        }
      }

      // Create new chat
      const newChat = {
        isGroup: isGroup || false,
        name: isGroup ? name : null,
        participants: participantObjectIds.map((id) => ({
          userId: id,
          hasSeenLatestMessage: id.equals(currentUser._id),
        })),
        createdAt: new Date(),
      }

      const result = await db.collection("chats").insertOne(newChat)

      return res.status(201).json({
        ...newChat,
        _id: result.insertedId,
      })
    } catch (error) {
      console.error("Error creating chat:", error)
      return res.status(500).json({ error: "Internal server error" })
    }
  } else {
    return res.status(405).json({ error: "Method not allowed" })
  }
}
