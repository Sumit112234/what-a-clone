"use client"

// This is a simplified version of the toast hook
import { useState, useEffect, useCallback } from "react"

// Create a simple toast context
const toasts = []
let listeners = []

const useToast = () => {
  const [, forceUpdate] = useState()

  useEffect(() => {
    const listener = () => {
      forceUpdate({})
    }

    listeners.push(listener)

    return () => {
      listeners = listeners.filter((l) => l !== listener)
    }
  }, [])

  const toast = useCallback(({ title, description, variant = "default" }) => {
    const id = Math.random().toString(36).substring(2, 9)
    const newToast = { id, title, description, variant }

    toasts.push(newToast)

    // Notify listeners
    listeners.forEach((listener) => listener())

    // Auto dismiss after 5 seconds
    setTimeout(() => {
      const index = toasts.findIndex((t) => t.id === id)
      if (index !== -1) {
        toasts.splice(index, 1)
        listeners.forEach((listener) => listener())
      }
    }, 5000)

    return id
  }, [])

  return { toast, toasts }
}

export { useToast }
