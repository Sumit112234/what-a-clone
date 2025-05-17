import { getServerSession } from "next-auth"
import { v2 as cloudinary } from "cloudinary"
import { authOptions } from "@/lib/auth-options"

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb", // Increase size limit for larger files
    },
  },
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const session = await getServerSession(req, res, authOptions)

    if (!session?.user?.email) {
      return res.status(401).json({ error: "Unauthorized" })
    }

    // Get file data from request
    const { fileData, fileName, fileType } = req.body

    if (!fileData) {
      return res.status(400).json({ error: "No file data provided" })
    }

    // Upload to Cloudinary
    try {
      const result = await new Promise((resolve, reject) => {
        const uploadOptions = {
          resource_type: "auto", // Automatically detect file type
          filename_override: fileName,
        }

        cloudinary.uploader.upload(fileData, uploadOptions, (error, result) => {
          if (error) reject(error)
          else resolve(result)
        })
      })

      return res.status(200).json(result)
    } catch (error) {
      console.error("Error uploading to Cloudinary:", error)
      return res.status(500).json({ error: "Failed to upload file" })
    }
  } catch (error) {
    console.error("Error uploading file:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}
