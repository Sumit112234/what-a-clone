"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { motion, AnimatePresence } from "framer-motion"
import { Bot } from "lucide-react"
import { useSocket } from "@/components/socket-provider"
import ChatSidebar from "@/components/chat/chat-sidebar"
import ChatMain from "@/components/chat/chat-main"
import AIChatbot from "@/components/chat/ai-chatbot"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useMobile } from "@/hooks/use-mobile"

export default function ChatLayout({ selectedChatId }) {
  const [chats, setChats] = useState([])
  const [selectedChat, setSelectedChat] = useState(null)
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAIChatbotOpen, setIsAIChatbotOpen] = useState(false)
  const { data: session } = useSession()
  const { socket, isConnected } = useSocket()
  const { toast } = useToast()
  const router = useRouter()
  const pathname = usePathname()
  const isMobile = useMobile()

  // Fetch chats
  const fetchChats = async () => {
    try {
      const response = await fetch("/api/chats")
      if (!response.ok) throw new Error("Failed to fetch chats")

      const data = await response.json()
      setChats(data)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load chats",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchChats()
  }, [toast])

  // Set selected chat based on URL
  useEffect(() => {
    if (selectedChatId && chats.length > 0) {
      const chat = chats.find((c) => c._id.toString() === selectedChatId)
      if (chat) {
        setSelectedChat(chat)
        fetchMessages(selectedChatId)
      }
    } else if (chats.length > 0 && !selectedChatId && isMobile) {
      // On mobile, if no chat is selected, show the sidebar
      setSelectedChat(null)
    }
  }, [selectedChatId, chats, isMobile])

  // Socket event listeners
  useEffect(() => {
    if (!socket) return

    console.log("Setting up socket event listeners")

    // Listen for new messages
    const handleNewMessage = (newMessage) => {
      console.log("New message received:", newMessage)

      // Update messages if the chat is currently selected
      if (selectedChat && newMessage.chatId.toString() === selectedChat._id.toString()) {
        setMessages((prev) => [...prev, newMessage])
      }

      // Update chats list with the new message
      setChats((prev) => {
        return prev.map((chat) => {
          if (chat._id.toString() === newMessage.chatId.toString()) {
            return {
              ...chat,
              lastMessage: {
                text: newMessage.content || "Attachment",
                timestamp: newMessage.createdAt,
              },
              unreadCount: chat._id.toString() === selectedChat?._id.toString() ? 0 : (chat.unreadCount || 0) + 1,
            }
          }
          return chat
        })
      })
    }

    // Listen for new chats
    const handleNewChat = (newChat) => {
      console.log("New chat received:", newChat)
      setChats((prev) => [newChat, ...prev])
    }

    // Listen for user status changes
    const handleUserStatus = ({ userId, isOnline }) => {
      console.log(`User ${userId} is now ${isOnline ? "online" : "offline"}`)
      setChats((prev) => {
        return prev.map((chat) => {
          if (!chat.isGroup && chat.otherParticipants.some((user) => user._id === userId)) {
            return {
              ...chat,
              otherParticipants: chat.otherParticipants.map((user) =>
                user._id === userId ? { ...user, isOnline } : user,
              ),
            }
          }
          return chat
        })
      })
    }

    // Listen for incoming calls
    const handleCallOffer = (data) => {
      console.log("Call offer received:", data)
      // Handle incoming call logic here
    }

    socket.on("new-message", handleNewMessage)
    socket.on("new-chat", handleNewChat)
    socket.on("user-status", handleUserStatus)
    socket.on("call-offer", handleCallOffer)
    socket.on("connect", () => {
      console.log("Socket connected in chat layout")
      // Refresh chats when reconnected
      fetchChats()
    })

    return () => {
      socket.off("new-message", handleNewMessage)
      socket.off("new-chat", handleNewChat)
      socket.off("user-status", handleUserStatus)
      socket.off("call-offer", handleCallOffer)
      socket.off("connect")
    }
  }, [socket, selectedChat])

  const fetchMessages = async (chatId) => {
    try {
      const response = await fetch(`/api/chats/${chatId}/messages`)
      if (!response.ok) throw new Error("Failed to fetch messages")

      const data = await response.json()
      setMessages(data)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive",
      })
    }
  }

  const handleSelectChat = (chat) => {
    setSelectedChat(chat)
    router.push(`/chats/${chat._id}`)

    // Mark chat as read
    setChats((prev) => {
      return prev.map((c) => {
        if (c._id.toString() === chat._id.toString()) {
          return { ...c, unreadCount: 0 }
        }
        return c
      })
    })

    fetchMessages(chat._id.toString())
  }

  const handleSendMessage = async (content, fileUrl, fileType, isVoiceMessage) => {
    if (!selectedChat || (!content && !fileUrl)) return

    try {
      const response = await fetch(`/api/chats/${selectedChat._id}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content,
          fileUrl,
          fileType,
          isVoiceMessage,
        }),
      })

      if (!response.ok) throw new Error("Failed to send message")

      const newMessage = await response.json()

      // Update local messages state
      setMessages((prev) => [...prev, newMessage])

      // Update chats with the new message
      setChats((prev) => {
        return prev.map((chat) => {
          if (chat._id.toString() === selectedChat._id.toString()) {
            return {
              ...chat,
              lastMessage: {
                text: content || "Attachment",
                timestamp: new Date().toISOString(),
              },
            }
          }
          return chat
        })
      })

      // Emit the message via socket if connected
      if (socket && isConnected) {
        socket.emit("send-message", {
          chatId: selectedChat._id,
          message: newMessage,
        })
        console.log("Message sent via socket:", newMessage)
      } else {
        console.warn("Socket not connected, message sent via API only")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      })
    }
  }

  const handleCreateChat = async (userId) => {
    try {
      const response = await fetch("/api/chats", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          participantIds: [userId],
          isGroup: false,
        }),
      })

      if (!response.ok) throw new Error("Failed to create chat")

      const newChat = await response.json()

      // Add to chats if it doesn't exist
      if (!chats.some((chat) => chat._id.toString() === newChat._id.toString())) {
        setChats((prev) => [newChat, ...prev])
      }

      // Select the new chat
      handleSelectChat(newChat)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create chat",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <AnimatePresence initial={false}>
        {(!selectedChat || !isMobile) && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: isMobile ? "100%" : "350px", opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="h-full border-r bg-white"
          >
            <ChatSidebar
              chats={chats}
              selectedChatId={selectedChat?._id.toString()}
              onSelectChat={handleSelectChat}
              onCreateChat={handleCreateChat}
              isLoading={isLoading}
            />
          </motion.div>
        )}

        {selectedChat && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex-1 h-full relative"
          >
            <ChatMain
              chat={selectedChat}
              messages={messages}
              onSendMessage={handleSendMessage}
              onBack={() => {
                setSelectedChat(null)
                router.push("/chats")
              }}
            />

            {/* AI Assistant Button */}
            <div className="absolute bottom-20 right-4">
              <Button
                className="rounded-full h-12 w-12 bg-green-500 hover:bg-green-600 shadow-lg"
                onClick={() => setIsAIChatbotOpen(true)}
              >
                <Bot size={24} />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Chatbot */}
      <AIChatbot isOpen={isAIChatbotOpen} onClose={() => setIsAIChatbotOpen(false)} />
    </div>
  )
}
