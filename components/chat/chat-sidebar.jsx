"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { motion } from "framer-motion"
import { Search, MessageSquarePlus, LogOut, Menu, User, Users, UserPlus } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { useSocket } from "@/components/socket-provider"
import CreateGroupModal from "./create-group-modal"

export default function ChatSidebar({ chats, selectedChatId, onSelectChat, onCreateChat, isLoading }) {
  const [searchQuery, setSearchQuery] = useState("")
  const [isNewChatOpen, setIsNewChatOpen] = useState(false)
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const { data: session } = useSession()
  const router = useRouter()
  const { isConnected } = useSocket()

  const filteredChats = searchQuery
    ? chats.filter((chat) => {
        if (chat.isGroup && chat.name) {
          return chat.name.toLowerCase().includes(searchQuery.toLowerCase())
        }
        return chat.otherParticipants.some((user) => user.name.toLowerCase().includes(searchQuery.toLowerCase()))
      })
    : chats

  const handleSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setIsSearching(true)

    try {
      const response = await fetch(`/api/users?query=${encodeURIComponent(query)}`)
      if (!response.ok) throw new Error("Failed to search users")

      const data = await response.json()
      setSearchResults(data)
    } catch (error) {
      console.error("Error searching users:", error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleUserSelect = (userId) => {
    onCreateChat(userId)
    setIsNewChatOpen(false)
  }

  const handleCreateGroup = (newGroup) => {
    onSelectChat(newGroup)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 bg-green-500 text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Avatar>
            <AvatarImage src={session?.user?.image || ""} alt={session?.user?.name || "User"} />
            <AvatarFallback>{session?.user?.name?.[0] || "U"}</AvatarFallback>
          </Avatar>
          <div>
            <span className="font-medium">{session?.user?.name}</span>
            <div className="flex items-center text-xs">
              <div className={`w-2 h-2 rounded-full mr-1 ${isConnected ? "bg-green-300" : "bg-red-400"}`}></div>
              {isConnected ? "Connected" : "Connecting..."}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white hover:bg-green-600 rounded-full">
                <MessageSquarePlus size={20} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsNewChatOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                New Chat
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsCreateGroupOpen(true)}>
                <Users className="mr-2 h-4 w-4" />
                New Group
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white hover:bg-green-600 rounded-full">
                <Menu size={20} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push("/profile")}>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/auth" })}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
        {isLoading ? (
          Array(5)
            .fill(0)
            .map((_, i) => (
              <div key={i} className="p-3 border-b flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            ))
        ) : filteredChats.length > 0 ? (
          filteredChats.map((chat) => {
            const otherUser = chat.otherParticipants[0]

            return (
              <motion.div
                key={chat._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ backgroundColor: "rgba(0,0,0,0.05)" }}
                className={`p-3 border-b cursor-pointer ${selectedChatId === chat._id.toString() ? "bg-gray-100" : ""}`}
                onClick={() => onSelectChat(chat)}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar>
                      {chat.isGroup ? (
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
                    {!chat.isGroup && otherUser?.isOnline && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium truncate">{chat.isGroup ? chat.name : otherUser?.name}</h3>
                      {chat.lastMessage && (
                        <span className="text-xs text-gray-500">
                          {new Date(chat.lastMessage.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-gray-600 truncate">
                        {chat.lastMessage?.text || "Start a conversation"}
                      </p>
                      {chat.unreadCount > 0 && (
                        <span className="bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                          {chat.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })
        ) : (
          <div className="p-4 text-center text-gray-500">{searchQuery ? "No chats found" : "No conversations yet"}</div>
        )}
      </div>

      {/* New Chat Dialog */}
      <Dialog open={isNewChatOpen} onOpenChange={setIsNewChatOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Conversation</DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <Input placeholder="Search users..." className="pl-10" onChange={(e) => handleSearch(e.target.value)} />
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {isSearching ? (
                Array(3)
                  .fill(0)
                  .map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-2">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                  ))
              ) : searchResults.length > 0 ? (
                searchResults.map((user) => (
                  <motion.div
                    key={user._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 p-2 hover:bg-gray-100 rounded-md cursor-pointer"
                    onClick={() => handleUserSelect(user._id)}
                  >
                    <Avatar>
                      <AvatarImage src={user.image || ""} alt={user.name} />
                      <AvatarFallback>{user.name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </motion.div>
                ))
              ) : (
                <p className="text-center text-gray-500">Search for users to start a conversation</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
        onCreateGroup={handleCreateGroup}
      />
    </div>
  )
}
