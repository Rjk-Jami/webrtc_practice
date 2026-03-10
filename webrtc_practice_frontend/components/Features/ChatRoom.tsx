'use client'
import { useCallback, useEffect, useState } from "react"
import { Input } from "../ui/input"
import { Button } from "../ui/button"
import { useSocket } from "@/context/useSocket"
import { useRouter } from "next/navigation"

const ChatRoom = () => {
    const router = useRouter()
    const { socket } = useSocket()
    const [email, setEmail] = useState('')
    const [roomId, setRoomId] = useState('')




    const handleRoomJoin = useCallback(({ roomId }: { roomId: string }) => {
        router.push(`/room/${roomId}`)
    }, [router])


    useEffect(() => {
        socket.on("joined-room", handleRoomJoin)

        return () => {
            socket.off("joined-room", handleRoomJoin)
        }

    }, [socket])

    const handleSubmit = useCallback(() => {
        if (!email || !roomId) return;
        router.push(`/room/${roomId}?email=${encodeURIComponent(email)}`)
    }, [email, roomId, router])


    return (
        <div className="flex flex-col gap-4 min-w-xl max-w-2xl mx-auto">
            <Input type="email" value={email} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} placeholder="Email" />
            <Input type="text" value={roomId} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRoomId(e.target.value)} placeholder="Room ID" />
            <Button variant={"default"} onClick={handleSubmit}>Join</Button>
        </div>
    )
}

export default ChatRoom