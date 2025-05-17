"use client"

import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { MicOff, Mic, PhoneOff, Phone } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { useSocket } from "@/components/socket-provider"
import { useToast } from "@/hooks/use-toast"
import { useSession } from "next-auth/react"

export default function VoiceCallModal({ isOpen, onClose, recipient, isIncoming = false, incomingCall = null }) {
  const [callStatus, setCallStatus] = useState(isIncoming ? "incoming" : "connecting")
  const [isMuted, setIsMuted] = useState(false)
  const [callDuration, setCallDuration] = useState(0)

  const { data: session } = useSession()
  const { socket, isConnected } = useSocket()
  const { toast } = useToast()

  const localStreamRef = useRef(null)
  const remoteStreamRef = useRef(null)
  const peerConnectionRef = useRef(null)
  const callTimerRef = useRef(null)
  const remoteAudioRef = useRef(null)

  // Initialize WebRTC for outgoing call
  useEffect(() => {
    if (!isOpen || !isConnected || isIncoming) return

    const initCall = async () => {
      try {
        // Create peer connection
        const peerConnection = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }],
        })

        peerConnectionRef.current = peerConnection

        // Get local stream
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        localStreamRef.current = stream

        // Add tracks to peer connection
        stream.getAudioTracks().forEach((track) => {
          if (peerConnection && localStreamRef.current) {
            peerConnection.addTrack(track, localStreamRef.current)
          }
        })

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            // Send this to the other peer via your signaling server
            socket?.emit("ice-candidate", {
              recipient: recipient._id,
              candidate: event.candidate,
            })
          }
        }

        // Handle incoming tracks
        peerConnection.ontrack = (event) => {
          remoteStreamRef.current = event.streams[0]

          // Play the remote audio
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = event.streams[0]
            remoteAudioRef.current.play().catch((err) => console.error("Error playing audio:", err))
          }

          setCallStatus("connected")

          // Start call timer
          callTimerRef.current = setInterval(() => {
            setCallDuration((prev) => prev + 1)
          }, 1000)
        }

        // Create and send offer
        const offer = await peerConnection.createOffer()
        await peerConnection.setLocalDescription(offer)

        // Send this offer to the other peer via your signaling server
        socket?.emit("call-offer", {
          recipient: recipient._id,
          offer,
        })
      } catch (error) {
        console.error("Error starting call:", error)
        toast({
          title: "Call failed",
          description: "Could not establish call connection",
          variant: "destructive",
        })
        handleEndCall()
      }
    }

    initCall()

    return () => {
      handleEndCall()
    }
  }, [isOpen, recipient?._id, socket, toast, isConnected, isIncoming])

  // Handle incoming call
  useEffect(() => {
    if (!socket || !isIncoming || !incomingCall) return

    const handleIncomingCall = async () => {
      try {
        // Create peer connection
        const peerConnection = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }],
        })

        peerConnectionRef.current = peerConnection

        // Get local stream
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        localStreamRef.current = stream

        // Add tracks to peer connection
        stream.getAudioTracks().forEach((track) => {
          if (peerConnection && localStreamRef.current) {
            peerConnection.addTrack(track, localStreamRef.current)
          }
        })

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            socket?.emit("ice-candidate", {
              recipient: incomingCall.caller,
              candidate: event.candidate,
            })
          }
        }

        // Handle incoming tracks
        peerConnection.ontrack = (event) => {
          remoteStreamRef.current = event.streams[0]

          // Play the remote audio
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = event.streams[0]
            remoteAudioRef.current.play().catch((err) => console.error("Error playing audio:", err))
          }

          setCallStatus("connected")

          // Start call timer
          callTimerRef.current = setInterval(() => {
            setCallDuration((prev) => prev + 1)
          }, 1000)
        }

        // Set remote description from the offer
        await peerConnection.setRemoteDescription(new RTCSessionDescription(incomingCall.offer))

        // Create answer
        const answer = await peerConnection.createAnswer()
        await peerConnection.setLocalDescription(answer)

        // Send answer to caller
        socket?.emit("call-answer", {
          caller: incomingCall.caller,
          answer,
        })

        setCallStatus("connected")
      } catch (error) {
        console.error("Error accepting call:", error)
        toast({
          title: "Call failed",
          description: "Could not establish call connection",
          variant: "destructive",
        })
        handleEndCall()
      }
    }

    // Listen for ICE candidates
    const handleIceCandidate = ({ sender, candidate }) => {
      if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
        peerConnectionRef.current
          .addIceCandidate(new RTCIceCandidate(candidate))
          .catch((err) => console.error("Error adding ICE candidate:", err))
      }
    }

    socket.on("ice-candidate", handleIceCandidate)

    // If accepting the call
    if (callStatus === "accepted") {
      handleIncomingCall()
    }

    return () => {
      socket.off("ice-candidate", handleIceCandidate)
    }
  }, [socket, isIncoming, incomingCall, callStatus, toast])

  // Listen for call answers (for outgoing calls)
  useEffect(() => {
    if (!socket || isIncoming) return

    const handleCallAnswer = async ({ answer }) => {
      if (peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer))
          setCallStatus("connected")
        } catch (error) {
          console.error("Error setting remote description:", error)
        }
      }
    }

    socket.on("call-answer", handleCallAnswer)

    return () => {
      socket.off("call-answer", handleCallAnswer)
    }
  }, [socket, isIncoming])

  const handleEndCall = () => {
    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
      localStreamRef.current = null
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }

    // Clear timer
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current)
      callTimerRef.current = null
    }

    setCallStatus("ended")
    setCallDuration(0)
    onClose()
  }

  const handleAcceptCall = () => {
    setCallStatus("accepted")
  }

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks()
      audioTracks.forEach((track) => {
        track.enabled = !track.enabled
      })
      setIsMuted(!isMuted)
    }
  }

  const formatCallDuration = () => {
    const minutes = Math.floor(callDuration / 60)
    const seconds = callDuration % 60
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-lg p-6 w-full max-w-sm text-center"
          >
            <div className="flex flex-col items-center">
              <Avatar className="h-24 w-24 mb-4">
                <AvatarImage src={recipient?.image || ""} alt={recipient?.name} />
                <AvatarFallback>{recipient?.name?.[0] || "U"}</AvatarFallback>
              </Avatar>

              <h3 className="text-xl font-semibold mb-1">{recipient?.name}</h3>

              <p className="text-gray-500 mb-6">
                {callStatus === "connecting"
                  ? "Connecting..."
                  : callStatus === "incoming"
                    ? "Incoming call..."
                    : callStatus === "connected"
                      ? formatCallDuration()
                      : "Call ended"}
              </p>

              {/* Hidden audio element for remote stream */}
              <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

              <div className="flex items-center justify-center gap-6 mt-4">
                {callStatus === "incoming" ? (
                  <>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="rounded-full h-14 w-14"
                      onClick={handleEndCall}
                    >
                      <PhoneOff size={24} />
                    </Button>
                    <Button
                      variant="default"
                      size="icon"
                      className="rounded-full h-14 w-14 bg-green-500 hover:bg-green-600"
                      onClick={handleAcceptCall}
                    >
                      <Phone size={24} />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="icon"
                      className={`rounded-full h-12 w-12 ${isMuted ? "bg-red-100" : ""}`}
                      onClick={toggleMute}
                      disabled={callStatus !== "connected"}
                    >
                      {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                    </Button>

                    <Button
                      variant="destructive"
                      size="icon"
                      className="rounded-full h-14 w-14"
                      onClick={handleEndCall}
                    >
                      <PhoneOff size={24} />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
