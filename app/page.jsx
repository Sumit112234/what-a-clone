import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import ChatLayout from "@/components/chat/chat-layout"

export default async function ChatsPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/auth")
  }

  return <ChatLayout />
}
