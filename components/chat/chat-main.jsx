"use client"

import { useEffect, useRef, useState } from "react"
import { useSession } from "next-auth/react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Smile,
  Paperclip,
  Mic,
  Send,
  MoreVertical,
  Phone,
  Video,
  ArrowLeft,
  X,
  Play,
  Pause,
  File,
  ImageIcon,
  Film,
  Music,
  FileText,
  Download,
  Users,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useToast } from "@/hooks/use-toast"
import { useMobile } from "@/hooks/use-mobile"
import VoiceCallModal from "@/components/chat/voice-call-modal"
import { formatTime } from "@/lib/utils"
import { useSocket } from "@/components/socket-provider"

export default function ChatMain({ chat, messages, onSendMessage, onBack }) {
  const [message, setMessage] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [isVoiceCallOpen, setIsVoiceCallOpen] = useState(false)
  const [audioPlayingId, setAudioPlayingId] = useState(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const recordingTimerRef = useRef(null)
  const audioRefs = useRef({})

  const { data: session } = useSession()
  const { toast } = useToast()
  const isMobile = useMobile()
  const { socket, isConnected } = useSocket()

  const isGroup = chat?.isGroup || false
  const otherUser = chat?.otherParticipants?.[0]

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    // Clean up recording when component unmounts
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
      }
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop()
      }
    }
  }, [isRecording])

  const handleSendMessage = (e) => {
    e.preventDefault()
    if (message.trim()) {
      onSendMessage(message)
      setMessage("")
    }
  }

  const getFileIcon = (fileType) => {
    switch (fileType) {
      case "image":
        return <ImageIcon size={20} className="text-blue-500" />
      case "video":
        return <Film size={20} className="text-red-500" />
      case "audio":
        return <Music size={20} className="text-purple-500" />
      case "pdf":
        return <FileText size={20} className="text-red-500" />
      case "doc":
      case "docx":
        return <FileText size={20} className="text-blue-500" />
      case "xls":
      case "xlsx":
        return <FileText size={20} className="text-green-500" />
      default:
        return <File size={20} className="text-gray-500" />
    }
  }

  const getFileTypeFromMime = (mimeType) => {
    if (mimeType.startsWith("image/")) return "image"
    if (mimeType.startsWith("video/")) return "video"
    if (mimeType.startsWith("audio/")) return "audio"
    if (mimeType === "application/pdf") return "pdf"
    if (
      mimeType === "application/msword" ||
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )
      return "doc"
    if (
      mimeType === "application/vnd.ms-excel" ||
      mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
      return "xls"
    return "file"
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)

    try {
      // Convert file to base64
      const base64Data = await convertFileToBase64(file)
      const fileType = getFileTypeFromMime(file.type)

      const response = await fetch("/api/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileData: base64Data,
          fileName: file.name,
          fileType: fileType,
        }),
      })

      if (!response.ok) throw new Error("Upload failed")

      const data = await response.json()

      // Send message with file
      onSendMessage(`Sent a ${fileType}`, data.secure_url, fileType)

      toast({
        title: "File uploaded",
        description: "Your file has been sent",
      })
    } catch (error) {
      console.error("Error uploading file:", error)
      toast({
        title: "Upload failed",
        description: "Failed to upload file. The file might be too large.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const convertFileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result)
      reader.onerror = (error) => reject(error)
    })
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/mp3" })

        // Upload the audio file
        setIsUploading(true)

        try {
          // Convert blob to base64
          const base64Data = await convertFileToBase64(audioBlob)

          const response = await fetch("/api/upload", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              fileData: base64Data,
              fileName: "voice-message.mp3",
              fileType: "audio",
            }),
          })

          if (!response.ok) throw new Error("Upload failed")

          const data = await response.json()

          // Send voice message
          onSendMessage(`Voice message (${Math.round(recordingTime)}s)`, data.secure_url, "audio", true)
        } catch (error) {
          toast({
            title: "Upload failed",
            description: "Failed to upload voice message",
            variant: "destructive",
          })
        } finally {
          setIsUploading(false)
        }

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop())

        // Reset recording state
        setIsRecording(false)
        setRecordingTime(0)
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current)
          recordingTimerRef.current = null
        }
      }

      // Start recording
      mediaRecorder.start()
      setIsRecording(true)

      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    } catch (error) {
      toast({
        title: "Microphone access denied",
        description: "Please allow microphone access to record voice messages",
        variant: "destructive",
      })
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
    }
  }

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()

      // Don't upload, just reset state
      setIsRecording(false)
      setRecordingTime(0)
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
        recordingTimerRef.current = null
      }
    }
  }

  const toggleAudioPlayback = (messageId, audioUrl) => {
    // Get or create audio element
    if (!audioRefs.current[messageId]) {
      const audio = new Audio(audioUrl)
      audioRefs.current[messageId] = audio

      audio.addEventListener("ended", () => {
        setAudioPlayingId(null)
      })
    }

    const audioElement = audioRefs.current[messageId]

    if (!audioElement) return

    if (audioPlayingId === messageId) {
      // Pause current audio
      audioElement.pause()
      setAudioPlayingId(null)
    } else {
      // Pause any playing audio
      if (audioPlayingId && audioRefs.current[audioPlayingId]) {
        audioRefs.current[audioPlayingId]?.pause()
      }

      // Play new audio
      audioElement.play()
      setAudioPlayingId(messageId)
    }
  }

  const renderMessageContent = (message) => {
    if (message.fileUrl) {
      if (message.fileType === "image") {
        return (
          <div className="mt-2 rounded-lg overflow-hidden">
            <img
              src={message.fileUrl || "/placeholder.svg"}
              alt="Image"
              className="max-w-full max-h-[300px] object-contain"
            />
          </div>
        )
      } else if (message.fileType === "audio") {
        return (
          <div className="mt-2 flex items-center gap-2 p-2 bg-gray-100 rounded-lg">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full bg-green-500 text-white hover:bg-green-600"
              onClick={() => toggleAudioPlayback(message._id, message.fileUrl)}
            >
              {audioPlayingId === message._id ? <Pause size={16} /> : <Play size={16} />}
            </Button>
            <div className="text-sm text-gray-600">{message.isVoiceMessage ? "Voice message" : "Audio"}</div>
          </div>
        )
      } else if (message.fileType === "video") {
        return (
          <div className="mt-2 rounded-lg overflow-hidden">
            <video src={message.fileUrl} controls className="max-w-full max-h-[300px]" />
          </div>
        )
      } else {
        // Generic file or document
        return (
          <div className="mt-2 flex items-center gap-2 p-2 bg-gray-100 rounded-lg">
            {getFileIcon(message.fileType)}
            <a
              href={message.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-500 hover:underline flex-1 truncate"
            >
              {message.content?.replace("Sent a ", "") || "Download file"}
            </a>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={() => window.open(message.fileUrl, "_blank")}
            >
              <Download size={16} />
            </Button>
          </div>
        )
      }
    }

    return <p className="text-gray-800">{message.content}</p>
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 bg-gray-50 border-b flex items-center">
        {isMobile && (
          <Button variant="ghost" size="icon" className="mr-2 md:hidden" onClick={onBack}>
            <ArrowLeft size={20} />
          </Button>
        )}
        <div className="flex items-center gap-3 flex-1">
          <Avatar>
            {isGroup ? (
              <div className="h-full w-full flex items-center justify-center bg-green-100">
                <Users size={20} className="text-green-600" />
              </div>
            ) : (
              <>
                <AvatarImage src={otherUser?.image || ""} alt={otherUser?.name || "User"} />
                <AvatarFallback>{otherUser?.name?.[0] || "U"}</AvatarFallback>
              </>
            )}
          </Avatar>
          <div>
            <h3 className="font-medium">{isGroup ? chat.name : otherUser?.name}</h3>
            <p className="text-xs text-gray-500">
              {isGroup ? `${chat.participants?.length || 0} participants` : otherUser?.isOnline ? "Online" : "Offline"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-gray-600 hover:bg-gray-200 rounded-full"
                  onClick={() => setIsVoiceCallOpen(true)}
                >
                  <Phone size={20} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Voice call</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="text-gray-600 hover:bg-gray-200 rounded-full">
                  <Video size={20} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Video call</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

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
            {messages.map((msg, index) => {
              const isCurrentUser = msg.senderId === session?.user?.id
              const showAvatar = !isCurrentUser && (index === 0 || messages[index - 1].senderId !== msg.senderId)
              const senderName =
                isGroup && !isCurrentUser
                  ? chat.participants.find((p) => p.userId === msg.senderId)?.name || "Unknown"
                  : null

              return (
                <motion.div
                  key={msg._id}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.2 }}
                  className={`flex ${isCurrentUser ? "justify-end" : "justify-start"} mb-4`}
                >
                  {showAvatar && !isCurrentUser && (
                    <Avatar className="mr-2 mt-1 w-8 h-8">
                      {isGroup ? (
                        <AvatarFallback>{senderName?.[0] || "U"}</AvatarFallback>
                      ) : (
                        <>
                          <AvatarImage src={otherUser?.image || ""} alt={otherUser?.name || "User"} />
                          <AvatarFallback>{otherUser?.name?.[0] || "U"}</AvatarFallback>
                        </>
                      )}
                    </Avatar>
                  )}
                  {!showAvatar && !isCurrentUser && <div className="w-8 mr-2" />}
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${
                      isCurrentUser ? "bg-green-100 rounded-tr-none" : "bg-white rounded-tl-none"
                    }`}
                  >
                    {senderName && <p className="text-xs font-medium text-green-600 mb-1">{senderName}</p>}
                    {renderMessageContent(msg)}
                    <p className="text-right text-xs text-gray-500 mt-1">
                      {formatTime(new Date(msg.createdAt))}
                      {isCurrentUser && <span className="ml-1 text-green-500">✓✓</span>}
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
        {isRecording ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 p-2 bg-white rounded-full flex items-center">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse mr-2" />
              <span className="text-gray-600">
                Recording... {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, "0")}
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-gray-600 hover:bg-gray-200 rounded-full"
              onClick={cancelRecording}
            >
              <X size={20} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="bg-green-500 text-white hover:bg-green-600 rounded-full"
              onClick={stopRecording}
            >
              <Send size={20} />
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-gray-600 hover:bg-gray-200 rounded-full"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              <Smile size={20} />
            </Button>

            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileUpload}
              disabled={isUploading}
              accept="*/*" // Accept all file types
            />

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-gray-600 hover:bg-gray-200 rounded-full"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <div className="h-5 w-5 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Paperclip size={20} />
              )}
            </Button>

            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message"
              className="flex-1 bg-white"
              disabled={isRecording || isUploading}
            />

            <Button
              type={message.trim() ? "submit" : "button"}
              variant="ghost"
              size="icon"
              className={`rounded-full ${message.trim() ? "text-green-600" : "text-gray-600"}`}
              onClick={message.trim() ? undefined : startRecording}
              disabled={isUploading}
            >
              {message.trim() ? <Send size={20} /> : <Mic size={20} />}
            </Button>
          </form>
        )}
      </div>

      {/* Voice Call Modal */}
      <VoiceCallModal isOpen={isVoiceCallOpen} onClose={() => setIsVoiceCallOpen(false)} recipient={otherUser} />
    </div>
  )
}
