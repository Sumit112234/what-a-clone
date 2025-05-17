import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const session = await getServerSession(req, res, authOptions)

    if (!session?.user?.email) {
      return res.status(401).json({ error: "Unauthorized" })
    }

    const { message } = req.body

    if (!message) {
      return res.status(400).json({ error: "Message is required" })
    }

    // Check if Grok API key is available
    if (!process.env.GROK_API_KEY) {
      // Fallback response if no API key
      return res.status(200).json({
        response:
          "I'm currently in demo mode. To enable full AI capabilities, please add your Grok API key to the environment variables.",
      })
    }

    try {
      // Make request to Grok AI API
      const grokResponse = await fetch("https://api.grok.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROK_API_KEY}`,
        },
        body: JSON.stringify({
          model: "grok-1",
          messages: [
            {
              role: "system",
              content:
                "You are a helpful assistant in a WhatsApp-like chat application. Provide concise, helpful responses.",
            },
            {
              role: "user",
              content: message,
            },
          ],
          max_tokens: 500,
        }),
      })

      if (!grokResponse.ok) {
        throw new Error(`Grok API error: ${grokResponse.statusText}`)
      }

      const data = await grokResponse.json()
      const aiResponse = data.choices[0]?.message?.content || "Sorry, I couldn't generate a response."

      return res.status(200).json({ response: aiResponse })
    } catch (error) {
      console.error("Error calling Grok AI:", error)

      // Fallback response
      return res.status(200).json({
        response: "I'm having trouble connecting to my AI services right now. Please try again later.",
      })
    }
  } catch (error) {
    console.error("Error in AI chat endpoint:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}
