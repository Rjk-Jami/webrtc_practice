
"use client"

import { Button } from "@/components/ui/button"
import { usePeer } from "@/context/usePeerContext"
import { useSocket } from "@/context/useSocket"
import { useParams, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useState, useRef } from "react"

const page = () => {
    const { roomId } = useParams()
    const searchParams = useSearchParams()
    const email = searchParams.get("email")

    const { socket } = useSocket()
    const { peer, createOffer, createAnswer, setRemoteAnswer, sendStream, resetPeer } = usePeer()

    const [myStream, setMyStream] = useState<MediaStream | null>(null)
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
    const myVideoRef = useRef<HTMLVideoElement>(null)
    const remoteVideoRef = useRef<HTMLVideoElement>(null)
    const [remoteEmailId, setRemoteEmailId] = useState('')
    const [isCallActive, setIsCallActive] = useState(false)

    useEffect(() => {
        if (email && roomId) {
            socket.emit("join-room", { email, roomId })
        }
    }, [email, roomId, socket])

    const handleUserJoined = useCallback(async ({ email: joinedEmail }: { email: string }) => {
        console.log("User joined", joinedEmail)

        // If we already have an active call, don't create another offer
        if (isCallActive) {
            console.log("Call already active, skipping offer creation")
            return
        }

        // Reset peer connection if signaling state is not stable
        if (peer && peer.signalingState !== "stable") {
            console.log("Resetting peer due to signaling state:", peer.signalingState)
            resetPeer()
            // Wait for peer to be recreated
            await new Promise(resolve => setTimeout(resolve, 100))
        }

        const offer = await createOffer()
        console.log("Offer at user joined", offer)
        if (offer) {
            socket.emit("call-user", { email: joinedEmail, offer })
            setRemoteEmailId(joinedEmail)
            setIsCallActive(true)
        }
    }, [createOffer, socket, peer, resetPeer, isCallActive])


    const handleIncommingCall = useCallback(async ({ offer, from }: { offer: RTCSessionDescriptionInit, from: string }) => {
        console.log("Incomming call from", from, offer, "offer type")

        // Reset peer if not in valid state
        if (peer && peer.signalingState !== "stable" && peer.signalingState !== "have-remote-offer") {
            console.log("Resetting peer before handling incoming call, state:", peer.signalingState)
            resetPeer()
            await new Promise(resolve => setTimeout(resolve, 100))
        }

        const answer = await createAnswer(offer)
        if (!answer) return
        socket.emit("call-accepted", { email: from, answer })
        setRemoteEmailId(from)
        setIsCallActive(true)
    }, [createAnswer, socket, peer, resetPeer])

    const handleCallAccepted = useCallback(async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
        console.log("Call accepted", answer, "Current signaling state:", peer?.signalingState)

        // Check if peer is in correct state before setting remote answer
        if (!peer) {
            console.error("Peer not initialized")
            return
        }

        if (peer.signalingState !== "have-local-offer") {
            console.error("Cannot set remote answer, wrong signaling state:", peer.signalingState)
            // Reset peer and try again if needed
            resetPeer()
            return
        }

        try {
            await setRemoteAnswer(answer)
            // Send local stream after remote description is set
            if (myStream) {
                sendStream(myStream)
            }
        } catch (error) {
            console.error("Error setting remote answer:", error)
        }
    }, [setRemoteAnswer, myStream, sendStream, peer, resetPeer])


    const getUserMediaStream = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            setMyStream(stream)
        } catch (error) {
            console.error("Error getting user media", error)
        }
    }, [])

    const handleNegotiationNeeded = useCallback(async () => {
        if (!peer) return
        console.log("negotiationneeded event fired")

        // Only create new offer if we're in stable state and have a remote user
        if (peer.signalingState !== "stable") {
            console.log("Skipping negotiation, signaling state:", peer.signalingState)
            return
        }

        if (!remoteEmailId) {
            console.log("No remote user to negotiate with")
            return
        }

        const offer = await createOffer()
        if (offer) {
            console.log("Created offer for re-negotiation")
            socket.emit("call-user", { email: remoteEmailId, offer })
        }
    }, [peer, remoteEmailId, socket, createOffer])

    useEffect(() => {
        socket.on("user-joined", handleUserJoined)
        socket.on("incomming-call", handleIncommingCall)
        socket.on("call-accepted", handleCallAccepted)


        return () => {
            socket.off("user-joined", handleUserJoined)
            socket.off("incomming-call", handleIncommingCall)
            socket.off("call-accepted", handleCallAccepted)
        }
    }, [socket, handleUserJoined, handleIncommingCall, handleCallAccepted])

    useEffect(() => {
        if (!peer) return
        peer.addEventListener('negotiationneeded', handleNegotiationNeeded)
        return () => {
            peer.removeEventListener('negotiationneeded', handleNegotiationNeeded)
        }
    }, [peer, handleNegotiationNeeded])

    useEffect(() => {
        getUserMediaStream()
    }, [getUserMediaStream])

    useEffect(() => {
        if (!peer || !myStream) return
        myStream.getTracks().forEach((track) => {
            // Check if track is already added to prevent duplicates
            const alreadyAdded = peer.getSenders().find(s => s.track === track)
            if (!alreadyAdded) {
                peer.addTrack(track, myStream)
            }
        })
    }, [peer, myStream])

    const handleTrackEvent = useCallback((ev: RTCTrackEvent) => {
        const streams = ev.streams
        setRemoteStream(streams[0])
    }, [])



    useEffect(() => {
        if (!peer) return
        peer.addEventListener("track", handleTrackEvent)

        return () => {
            peer.removeEventListener("track", handleTrackEvent)
            peer.removeEventListener('negotiationneeded', handleNegotiationNeeded)
        }
    }, [peer, handleTrackEvent])

    useEffect(() => {
        if (myVideoRef.current && myStream) {
            myVideoRef.current.srcObject = myStream
        }
    }, [myStream])

    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream
        }
    }, [remoteStream])

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#0f172a] text-white p-8">
            <div className="w-full max-w-6xl space-y-8">
                <header className="flex justify-between items-center border-b border-slate-700 pb-4">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                        Room: {roomId}
                    </h1>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                        <span className="text-slate-400 font-medium">Live Connection</span>
                    </div>
                </header>

                <div className="">
                    <Button onClick={() => sendStream(myStream as any)}>
                        send my video
                    </Button>
                </div>
                <div className="">
                    <h4>You are connected to : {remoteEmailId}</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Local Stream */}
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                        <div className="relative bg-slate-900 rounded-xl overflow-hidden shadow-2xl border border-slate-800">
                            <div className="absolute top-4 left-4 z-10">
                                <span className="bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold border border-slate-700">
                                    You (Local)
                                </span>
                            </div>
                            <video
                                ref={myVideoRef}
                                autoPlay
                                playsInline
                                // muted
                                className="w-full aspect-video object-cover bg-black"
                            />
                        </div>
                    </div>

                    {/* Remote Stream */}
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600 to-teal-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                        <div className="relative bg-slate-900 rounded-xl overflow-hidden shadow-2xl border border-slate-800 flex items-center justify-center aspect-video">
                            <div className="absolute top-4 left-4 z-10">
                                <span className="bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold border border-slate-700">
                                    Remote Participant
                                </span>
                            </div>
                            {remoteStream ? (
                                <video
                                    ref={remoteVideoRef}
                                    autoPlay
                                    playsInline
                                    className="w-full aspect-video object-cover bg-black"
                                />
                            ) : (
                                <div className="text-center space-y-4">
                                    <div className="w-16 h-16 border-4 border-slate-700 border-t-emerald-500 rounded-full animate-spin mx-auto"></div>
                                    <p className="text-slate-400 font-medium italic">Waiting for someone to join...</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default page