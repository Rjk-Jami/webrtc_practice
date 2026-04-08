"use client"

import { Button } from "@/components/ui/button"
import { Mic, MicOff, Video, VideoOff, PhoneOff } from "lucide-react"
import { useState, useCallback, useEffect } from "react"

interface CallControlsProps {
    stream: MediaStream | null
    onEndCall: () => void
}

const CallControls = ({ stream, onEndCall }: CallControlsProps) => {
    const [isAudioEnabled, setIsAudioEnabled] = useState(true)
    const [isVideoEnabled, setIsVideoEnabled] = useState(true)

    const toggleAudio = useCallback(() => {
        if (stream) {
            const audioTrack = stream.getAudioTracks()[0]
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled
                setIsAudioEnabled(audioTrack.enabled)
            }
        }
    }, [stream])

    const toggleVideo = useCallback(() => {
        if (stream) {
            const videoTrack = stream.getVideoTracks()[0]
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled
                setIsVideoEnabled(videoTrack.enabled)
            }
        }
    }, [stream])

    useEffect(() => {
        if (stream) {
            const audioTrack = stream.getAudioTracks()[0]
            const videoTrack = stream.getVideoTracks()[0]
            setIsAudioEnabled(audioTrack?.enabled ?? true)
            setIsVideoEnabled(videoTrack?.enabled ?? true)
        }
    }, [stream])

    return (
        <div className="flex items-center justify-center gap-4">
            <Button
                variant={isAudioEnabled ? "default" : "destructive"}
                size="icon-lg"
                onClick={toggleAudio}
                className="rounded-full"
            >
                {isAudioEnabled ? <Mic className="size-5" /> : <MicOff className="size-5" />}
            </Button>

            <Button
                variant={isVideoEnabled ? "default" : "destructive"}
                size="icon-lg"
                onClick={toggleVideo}
                className="rounded-full"
            >
                {isVideoEnabled ? <Video className="size-5" /> : <VideoOff className="size-5" />}
            </Button>

            <Button
                variant="destructive"
                size="icon-lg"
                onClick={onEndCall}
                className="rounded-full bg-red-600 hover:bg-red-700"
            >
                <PhoneOff className="size-5" />
            </Button>
        </div>
    )
}

export default CallControls
