"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Search, MoreVertical, MessageSquarePlus } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Chat, User } from "@/lib/types"
import { formatDistanceToNow } from "@/lib/utils"

interface ChatSidebarProps {
  chats: Chat[]
  currentUser: User
  onSelectChat: (chatId: string) => void
  selectedChatId?: string
}

export default function ChatSidebar({ chats, currentUser, onSelectChat, selectedChatId }: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredChats = chats.filter((chat) => chat.user.name.toLowerCase().includes(searchQuery.toLowerCase()))

  return (
    <div className="w-[350px] border-r flex flex-col h-full">
      {/* Header */}
      <div className="p-3 bg-emerald-600 text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Avatar>
            <AvatarImage src={currentUser.avatar || "/placeholder.svg"} alt={currentUser.name} />
            <AvatarFallback>{currentUser.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <span className="font-medium">{currentUser.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-white hover:bg-emerald-700 rounded-full">
            <MessageSquarePlus size={20} />
          </Button>
          <Button variant="ghost" size="icon" className="text-white hover:bg-emerald-700 rounded-full">
            <MoreVertical size={20} />
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="p-2 bg-gray-50">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <Input
            placeholder="Search or start new chat"
            className="pl-10 bg-white"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto">
        {filteredChats.map((chat) => (
          <motion.div
            key={chat.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ backgroundColor: "rgba(0,0,0,0.05)" }}
            className={`p-3 border-b cursor-pointer ${selectedChatId === chat.id ? "bg-gray-100" : ""}`}
            onClick={() => onSelectChat(chat.id)}
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar>
                  <AvatarImage src={chat.user.avatar || "/placeholder.svg"} alt={chat.user.name} />
                  <AvatarFallback>{chat.user.name.charAt(0)}</AvatarFallback>
                </Avatar>
                {chat.user.status === "online" && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium truncate">{chat.user.name}</h3>
                  <span className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(chat.lastMessage.timestamp))}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-600 truncate">
                    {chat.messages[chat.messages.length - 1].sender === currentUser.id
                      ? "You: "
                      : chat.messages[chat.messages.length - 1].senderName
                        ? `${chat.messages[chat.messages.length - 1].senderName}: `
                        : ""}
                    {chat.lastMessage.text}
                  </p>
                  {chat.unreadCount > 0 && (
                    <span className="bg-emerald-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {chat.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
