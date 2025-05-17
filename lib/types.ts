export interface User {
  _id: string
  name: string
  email: string
  image?: string
}

export interface Message {
  _id: string
  chatId: string
  senderId: string
  content: string | null
  fileUrl?: string
  fileType?: string
  isVoiceMessage?: boolean
  createdAt: string
}

export interface Chat {
  _id: string
  isGroup: boolean
  name?: string
  participants: {
    userId: string
    hasSeenLatestMessage: boolean
  }[]
  otherParticipants: User[]
  lastMessage?: {
    text: string
    timestamp: string
  }
  unreadCount: number
  createdAt: string
}
