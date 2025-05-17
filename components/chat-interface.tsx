"use client"

import { useEffect, useState } from "react"
import { io, type Socket } from "socket.io-client"
import ChatSidebar from "./chat-sidebar"
import ChatMain from "./chat-main"
import type { User, Message, Chat } from "@/lib/types"

export default function ChatInterface() {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [currentUser, setCurrentUser] = useState<User>({
    id: "1",
    name: "John Doe",
    avatar: "/placeholder.svg?height=40&width=40",
    status: "online",
  })

  const [selectedChat, setSelectedChat] = useState<Chat | null>(null)
  const [chats, setChats] = useState<Chat[]>([
    {
      id: "1",
      user: {
        id: "2",
        name: "Alice Smith",
        avatar: "/placeholder.svg?height=40&width=40",
        status: "online",
      },
      messages: [
        {
          id: "1",
          text: "Hey, how are you?",
          sender: "2",
          timestamp: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: "2",
          text: "I'm good, thanks! How about you?",
          sender: "1",
          timestamp: new Date(Date.now() - 3500000).toISOString(),
        },
        {
          id: "3",
          text: "Doing well. Did you finish the project?",
          sender: "2",
          timestamp: new Date(Date.now() - 3400000).toISOString(),
        },
      ],
      unreadCount: 0,
      lastMessage: {
        text: "Doing well. Did you finish the project?",
        timestamp: new Date(Date.now() - 3400000).toISOString(),
      },
    },
    {
      id: "2",
      user: {
        id: "3",
        name: "Bob Johnson",
        avatar: "/placeholder.svg?height=40&width=40",
        status: "offline",
      },
      messages: [
        {
          id: "1",
          text: "Can we meet tomorrow?",
          sender: "3",
          timestamp: new Date(Date.now() - 86400000).toISOString(),
        },
      ],
      unreadCount: 1,
      lastMessage: {
        text: "Can we meet tomorrow?",
        timestamp: new Date(Date.now() - 86400000).toISOString(),
      },
    },
    {
      id: "3",
      user: {
        id: "4",
        name: "Work Group",
        avatar: "/placeholder.svg?height=40&width=40",
        status: "online",
        isGroup: true,
      },
      messages: [
        {
          id: "1",
          text: "Meeting at 3pm today",
          sender: "5",
          senderName: "Emma Davis",
          timestamp: new Date(Date.now() - 7200000).toISOString(),
        },
        {
          id: "2",
          text: "I'll be there",
          sender: "1",
          timestamp: new Date(Date.now() - 7100000).toISOString(),
        },
      ],
      unreadCount: 0,
      lastMessage: {
        text: "I'll be there",
        timestamp: new Date(Date.now() - 7100000).toISOString(),
      },
    },
  ])

  useEffect(() => {
    // In a real app, you would connect to your actual socket server
    const newSocket = io("http://localhost:3001", {
      autoConnect: false,
    })

    setSocket(newSocket)

    // For demo purposes, we're not actually connecting to a server
    // newSocket.connect();

    return () => {
      newSocket.disconnect()
    }
  }, [])

  const sendMessage = (text: string) => {
    if (!selectedChat) return

    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      sender: currentUser.id,
      timestamp: new Date().toISOString(),
    }

    // Update the local state immediately for a responsive UI
    const updatedChats = chats.map((chat) => {
      if (chat.id === selectedChat.id) {
        return {
          ...chat,
          messages: [...chat.messages, newMessage],
          lastMessage: {
            text,
            timestamp: new Date().toISOString(),
          },
        }
      }
      return chat
    })

    setChats(updatedChats)
    setSelectedChat((prev) => {
      if (!prev) return null
      return {
        ...prev,
        messages: [...prev.messages, newMessage],
        lastMessage: {
          text,
          timestamp: new Date().toISOString(),
        },
      }
    })

    // In a real app, you would emit this message to the server
    // socket?.emit('send-message', { chatId: selectedChat.id, message: newMessage });
  }

  const selectChat = (chatId: string) => {
    const chat = chats.find((c) => c.id === chatId)
    if (chat) {
      // Mark messages as read
      const updatedChats = chats.map((c) => {
        if (c.id === chatId) {
          return { ...c, unreadCount: 0 }
        }
        return c
      })
      setChats(updatedChats)
      setSelectedChat(chat)
    }
  }

  return (
    <div className="flex h-full">
      <ChatSidebar
        chats={chats}
        currentUser={currentUser}
        onSelectChat={selectChat}
        selectedChatId={selectedChat?.id}
      />
      <ChatMain chat={selectedChat} currentUser={currentUser} onSendMessage={sendMessage} />
    </div>
  )
}
