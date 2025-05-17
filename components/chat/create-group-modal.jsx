"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Search, X, Check } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"

export default function CreateGroupModal({ isOpen, onClose, onCreateGroup }) {
  const [groupName, setGroupName] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState([])
  const [selectedUsers, setSelectedUsers] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens
      setGroupName("")
      setSearchQuery("")
      setSearchResults([])
      setSelectedUsers([])
    }
  }, [isOpen])

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
      toast({
        title: "Error",
        description: "Failed to search users",
        variant: "destructive",
      })
    } finally {
      setIsSearching(false)
    }
  }

  const toggleUserSelection = (user) => {
    if (selectedUsers.some((u) => u._id === user._id)) {
      setSelectedUsers(selectedUsers.filter((u) => u._id !== user._id))
    } else {
      setSelectedUsers([...selectedUsers, user])
    }
  }

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast({
        title: "Group name required",
        description: "Please enter a name for the group",
        variant: "destructive",
      })
      return
    }

    if (selectedUsers.length < 2) {
      toast({
        title: "More members needed",
        description: "Please select at least 2 users for the group",
        variant: "destructive",
      })
      return
    }

    setIsCreating(true)

    try {
      const participantIds = selectedUsers.map((user) => user._id)

      const response = await fetch("/api/chats", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          participantIds,
          isGroup: true,
          name: groupName,
        }),
      })

      if (!response.ok) throw new Error("Failed to create group")

      const newGroup = await response.json()

      toast({
        title: "Group created",
        description: `${groupName} has been created successfully`,
      })

      onCreateGroup(newGroup)
      onClose()
    } catch (error) {
      console.error("Error creating group:", error)
      toast({
        title: "Error",
        description: "Failed to create group",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Group</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <label htmlFor="group-name" className="text-sm font-medium">
              Group Name
            </label>
            <Input
              id="group-name"
              placeholder="Enter group name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Add Participants</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <Input
                placeholder="Search users..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  handleSearch(e.target.value)
                }}
              />
            </div>

            {/* Selected users */}
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedUsers.map((user) => (
                  <div
                    key={user._id}
                    className="flex items-center gap-1 bg-green-100 text-green-800 rounded-full px-3 py-1 text-sm"
                  >
                    <span>{user.name}</span>
                    <button onClick={() => toggleUserSelection(user)} className="text-green-800 hover:text-green-900">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Search results */}
            <div className="mt-2 max-h-[200px] overflow-y-auto border rounded-md">
              {isSearching ? (
                Array(3)
                  .fill(0)
                  .map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 border-b">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                  ))
              ) : searchResults.length > 0 ? (
                searchResults.map((user) => {
                  const isSelected = selectedUsers.some((u) => u._id === user._id)
                  return (
                    <motion.div
                      key={user._id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex items-center justify-between p-2 hover:bg-gray-100 cursor-pointer border-b ${
                        isSelected ? "bg-green-50" : ""
                      }`}
                      onClick={() => toggleUserSelection(user)}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={user.image || ""} alt={user.name} />
                          <AvatarFallback>{user.name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </div>
                      {isSelected && <Check size={20} className="text-green-600" />}
                    </motion.div>
                  )
                })
              ) : searchQuery ? (
                <p className="text-center text-gray-500 p-4">No users found</p>
              ) : (
                <p className="text-center text-gray-500 p-4">Search for users to add to the group</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateGroup}
              disabled={isCreating || !groupName.trim() || selectedUsers.length < 2}
              className="bg-green-500 hover:bg-green-600"
            >
              {isCreating ? "Creating..." : "Create Group"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
