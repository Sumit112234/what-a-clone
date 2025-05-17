"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Smile, Paperclip, Mic, Send, MoreVertical, Phone, Video, ArrowLeft } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Chat, User } from "@/lib/types"
import { formatTime } from "@/lib/utils"
import { useMobile } from "@/hooks/use-mobile"

interface ChatMainProps {
  chat: Chat | null
  currentUser: User
  onSendMessage: (text: string) => void
}

export default function ChatMain({ chat, currentUser, onSendMessage }: ChatMainProps) {
  const [message, setMessage] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const isMobile = useMobile()

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim()) {
      onSendMessage(message)
      setMessage("")
    }
  }

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chat?.messages])

  if (!chat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#f0f2f5]">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
            <MessageIcon className="w-8 h-8 text-emerald-600" />
          </div>
          <h3 className="text-xl font-medium text-gray-800">WhatsApp Clone</h3>
          <p className="text-gray-500 mt-2 max-w-md">Select a chat to start messaging or create a new conversation.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="p-3 bg-gray-50 border-b flex items-center">
        {isMobile && (
          <Button variant="ghost" size="icon" className="mr-2 md:hidden">
            <ArrowLeft size={20} />
          </Button>
        )}
        <div className="flex items-center gap-3 flex-1">
          <Avatar>
            <AvatarImage src={chat.user.avatar || "/placeholder.svg"} alt={chat.user.name} />
            <AvatarFallback>{chat.user.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-medium">{chat.user.name}</h3>
            <p className="text-xs text-gray-500">{chat.user.status === "online" ? "online" : "last seen recently"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-gray-600 hover:bg-gray-200 rounded-full">
            <Phone size={20} />
          </Button>
          <Button variant="ghost" size="icon" className="text-gray-600 hover:bg-gray-200 rounded-full">
            <Video size={20} />
          </Button>
          <Button variant="ghost" size="icon" className="text-gray-600 hover:bg-gray-200 rounded-full">
            <MoreVertical size={20} />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto p-4 bg-[#e5ded8]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23ffffff' fillOpacity='0.1' fillRule='evenodd'/%3E%3C/svg%3E\")",
          backgroundSize: "auto",
        }}
      >
        <div className="max-w-3xl w-full mx-auto">
          <AnimatePresence initial={false}>
            {chat.messages.map((msg, index) => {
              const isCurrentUser = msg.sender === currentUser.id
              const showAvatar = !isCurrentUser && (index === 0 || chat.messages[index - 1].sender !== msg.sender)

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.2 }}
                  className={`flex ${isCurrentUser ? "justify-end" : "justify-start"} mb-4`}
                >
                  {showAvatar && !isCurrentUser && (
                    <Avatar className="mr-2 mt-1 w-8 h-8">
                      <AvatarImage src={chat.user.avatar || "/placeholder.svg"} alt={chat.user.name} />
                      <AvatarFallback>{chat.user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  )}
                  {!showAvatar && !isCurrentUser && <div className="w-8 mr-2" />}
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${
                      isCurrentUser ? "bg-emerald-100 rounded-tr-none" : "bg-white rounded-tl-none"
                    }`}
                  >
                    {msg.senderName && !isCurrentUser && (
                      <p className="text-xs font-medium text-emerald-600 mb-1">{msg.senderName}</p>
                    )}
                    <p className="text-gray-800">{msg.text}</p>
                    <p className="text-right text-xs text-gray-500 mt-1">
                      {formatTime(new Date(msg.timestamp))}
                      {isCurrentUser && <span className="ml-1 text-emerald-500">✓✓</span>}
                    </p>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message input */}
      <div className="p-3 bg-gray-50 border-t">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="icon" className="text-gray-600 hover:bg-gray-200 rounded-full">
            <Smile size={20} />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="text-gray-600 hover:bg-gray-200 rounded-full">
            <Paperclip size={20} />
          </Button>
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message"
            className="flex-1 bg-white"
          />
          <Button
            type={message.trim() ? "submit" : "button"}
            variant="ghost"
            size="icon"
            className={`rounded-full ${message.trim() ? "text-emerald-600" : "text-gray-600"}`}
          >
            {message.trim() ? <Send size={20} /> : <Mic size={20} />}
          </Button>
        </form>
      </div>
    </div>
  )
}

function MessageIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}
