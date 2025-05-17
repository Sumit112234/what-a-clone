import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { connectToDatabase } from "@/lib/mongodb"

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const session = await getServerSession(req, res, authOptions)

    if (!session?.user?.email) {
      return res.status(401).json({ error: "Unauthorized" })
    }

    const query = req.query.query || ""

    const { db } = await connectToDatabase()

    // Get current user
    const currentUser = await db.collection("users").findOne({ email: session.user.email })

    if (!currentUser) {
      return res.status(404).json({ error: "User not found" })
    }

    // Find users matching the query, excluding the current user
    const users = await db
      .collection("users")
      .find({
        $and: [
          { _id: { $ne: currentUser._id } },
          {
            $or: [{ name: { $regex: query, $options: "i" } }, { email: { $regex: query, $options: "i" } }],
          },
        ],
      })
      .project({ password: 0 }) // Exclude password
      .limit(10)
      .toArray()

    return res.status(200).json(users)
  } catch (error) {
    console.error("Error searching users:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}
