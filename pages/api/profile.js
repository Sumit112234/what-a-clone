import { getServerSession } from "next-auth"
import { ObjectId } from "mongodb"
import { authOptions } from "@/lib/auth-options"
import { connectToDatabase } from "@/lib/mongodb"

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user?.email) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const { db } = await connectToDatabase()

  // Get current user
  const currentUser = await db.collection("users").findOne({ email: session.user.email })

  if (!currentUser) {
    return res.status(404).json({ error: "User not found" })
  }

  if (req.method === "GET") {
    // Return user profile data
    return res.status(200).json({
      name: currentUser.name,
      email: currentUser.email,
      image: currentUser.image,
      status: currentUser.status || "Hey there! I am using WhatsApp Clone",
    })
  } else if (req.method === "PUT") {
    try {
      const { name, status, image } = req.body

      if (!name) {
        return res.status(400).json({ error: "Name is required" })
      }

      // Update user profile
      await db.collection("users").updateOne(
        { _id: new ObjectId(currentUser._id) },
        {
          $set: {
            name,
            status: status || "Hey there! I am using WhatsApp Clone",
            ...(image && { image }),
            updatedAt: new Date(),
          },
        },
      )

      return res.status(200).json({ message: "Profile updated successfully" })
    } catch (error) {
      console.error("Error updating profile:", error)
      return res.status(500).json({ error: "Internal server error" })
    }
  } else {
    return res.status(405).json({ error: "Method not allowed" })
  }
}
