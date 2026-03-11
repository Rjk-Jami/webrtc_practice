"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import Stream from "stream";

interface PeerContextType {
  peer: RTCPeerConnection | null;
  createOffer: () => Promise<RTCSessionDescriptionInit | null>;
  createAnswer: (
    offer: RTCSessionDescriptionInit,
  ) => Promise<RTCSessionDescriptionInit | void>;
  setRemoteAnswer: (ans: RTCSessionDescriptionInit) => Promise<void>;
  sendStream: (stream: MediaStream) => Promise<void>;
  resetPeer: () => void;
}

const PeerContext = createContext<PeerContextType | undefined>(undefined);

export const PeerProvider = ({ children }: { children: React.ReactNode }) => {
  const [peer, setPeer] = useState<RTCPeerConnection | null>(null);

  // ✅ Create peer ONLY on client after mount
  useEffect(() => {
    const p = new RTCPeerConnection({
      iceServers: [
        {
          urls: [
            "stun:stun.l.google.com:19302",
            "stun:global.stun.twilio.com:3478",
          ],
        },
      ],
    });
    setPeer(p);

    return () => {
      p.close();
    };
  }, []);

  const createOffer = useCallback(async () => {
    if (!peer) return null;

    if (peer.signalingState !== "stable") {
      console.log("Cannot create offer, signaling state:", peer.signalingState);
      return null;
    }

    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);

    return offer;
  }, [peer]);

  const createAnswer = useCallback(
    async (offer: RTCSessionDescriptionInit) => {
      if (!peer) return;

      // Validate offer before setting
      if (!offer || !offer.type || !offer.sdp) {
        console.error("Invalid offer:", offer);
        return;
      }

      // Set remote description first - this will transition to have-remote-offer state
      // We allow setting when in stable state (initial state) or have-remote-offer (if retrying)
      // if (peer.signalingState !== "stable" && peer.signalingState !== "have-remote-offer") {
      //   console.log("Cannot set remote offer, signaling state:", peer.signalingState)
      //   return
      // }

      console.log("Setting remote description with offer:", offer.type);
      await peer.setRemoteDescription(new RTCSessionDescription(offer));

      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      return answer;
    },
    [peer],
  );

  const setRemoteAnswer = useCallback(
    async (ans: RTCSessionDescriptionInit) => {
      if (!peer) return;

      console.log(peer.signalingState, "peer.signalingState");

      // Can only set remote answer when in have-local-offer state (we created an offer and are waiting for answer)
      if (peer.signalingState !== "have-local-offer") {
        console.log(
          "Cannot set remote answer, signaling state:",
          peer.signalingState,
        );
        return;
      }

      // Validate answer before setting
      if (!ans || !ans.type || !ans.sdp) {
        console.error("Invalid answer:", ans);
        return;
      }

      console.log("Setting remote description with answer:", ans.type);
      await peer.setRemoteDescription(new RTCSessionDescription(ans));
    },
    [peer],
  );

  const sendStream = useCallback(
    async (stream: MediaStream) => {
      if (!peer) return;
      const tracks = stream.getTracks();
      for (const track of tracks) {
        const alreadyAdded = peer.getSenders().find((s) => s.track === track);
        if (!alreadyAdded) {
          peer.addTrack(track, stream);
        }
      }
    },
    [peer],
  );

  const resetPeer = useCallback(() => {
    if (peer) {
      peer.close();
    }
    const newPeer = new RTCPeerConnection({
      iceServers: [
        {
          urls: [
            "stun:stun.l.google.com:19302",
            "stun:global.stun.twilio.com:3478",
          ],
        },
      ],
    });
    setPeer(newPeer);
  }, [peer]);

  return (
    <PeerContext.Provider
      value={{
        peer,
        createOffer,
        createAnswer,
        setRemoteAnswer,
        sendStream,
        resetPeer,
      }}
    >
      {children}
    </PeerContext.Provider>
  );
};

export const usePeer = () => {
  const context = useContext(PeerContext);
  if (!context) throw new Error("usePeer must be used inside PeerProvider");
  return context;
};
