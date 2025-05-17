"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Send, Bot, Loader2 } from "lucide-react"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"

export default function AIChatbot({ isOpen, onClose }) {
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      content: "Hello! I'm your AI assistant powered by Grok AI. How can I help you today?",
      isBot: true,
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const { toast } = useToast()

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSendMessage = async (e) => {
    e.preventDefault()

    if (!input.trim()) return

    const userMessage = {
      id: Date.now().toString(),
      content: input,
      isBot: false,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/ai-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: input }),
      })

      if (!response.ok) throw new Error("Failed to get AI response")

      const data = await response.json()

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString() + "-bot",
          content: data.response,
          isBot: true,
          timestamp: new Date(),
        },
      ])
    } catch (error) {
      console.error("Error getting AI response:", error)
      toast({
        title: "Error",
        description: "Failed to get a response from the AI",
        variant: "destructive",
      })

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString() + "-error",
          content: "Sorry, I'm having trouble connecting right now. Please try again later.",
          isBot: true,
          timestamp: new Date(),
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.9 }}
            className="bg-white rounded-lg shadow-xl w-full max-w-md h-[600px] max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between bg-green-500 text-white rounded-t-lg">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8 bg-white">
                  <Bot className="text-green-500" />
                </Avatar>
                <h2 className="font-semibold">Grok AI Assistant</h2>
              </div>
              <Button variant="ghost" size="sm" className="text-white hover:bg-green-600" onClick={onClose}>
                Close
              </Button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex ${msg.isBot ? "justify-start" : "justify-end"} mb-4`}
                  >
                    {msg.isBot && (
                      <Avatar className="mr-2 mt-1 h-8 w-8">
                        <Bot className="text-green-500" />
                      </Avatar>
                    )}
                    <div className={`max-w-[80%] rounded-lg p-3 ${msg.isBot ? "bg-white" : "bg-green-100"} shadow-sm`}>
                      <p className="text-gray-800 whitespace-pre-wrap">{msg.content}</p>
                      <p className="text-right text-xs text-gray-500 mt-1">
                        {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </motion.div>
                ))}
                {isLoading && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start mb-4">
                    <Avatar className="mr-2 mt-1 h-8 w-8">
                      <Bot className="text-green-500" />
                    </Avatar>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-green-500" />
                        <p className="text-gray-500">Thinking...</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1"
                disabled={isLoading}
              />
              <Button type="submit" disabled={isLoading || !input.trim()} className="bg-green-500 hover:bg-green-600">
                <Send size={18} />
              </Button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
