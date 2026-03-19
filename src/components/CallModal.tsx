import { useState, useEffect, useRef } from 'react';
import { UserProfile } from '../types';
import { callService, CallData } from '../services/callService';
import { userService } from '../services/userService';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, Loader2, User as UserIcon } from 'lucide-react';

interface CallModalProps {
  currentUser: UserProfile;
  otherUser: UserProfile;
  callType: 'audio' | 'video';
  isIncoming?: boolean;
  incomingCallData?: CallData;
  onClose: () => void;
}

export function CallModal({ currentUser, otherUser, callType, isIncoming, incomingCallData, onClose }: CallModalProps) {
  const [status, setStatus] = useState<'ringing' | 'connected' | 'ended' | 'error'>(isIncoming ? 'ringing' : 'ringing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(callType === 'audio');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const callId = useRef<string | null>(incomingCallData?.id || null);

  const servers = {
    iceServers: [
      { urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] },
    ],
    iceCandidatePoolSize: 10,
  };

  useEffect(() => {
    const startMedia = async () => {
      console.log('CallModal: startMedia, isIncoming:', isIncoming);
      // Check if other user is offline before starting a call
      if (!isIncoming) {
        console.log('CallModal: initiating outgoing call');
        try {
          const latestOtherUser = await userService.getUser(otherUser.uid);
          if (latestOtherUser?.status === 'offline') {
            setErrorMessage(`${otherUser.displayName} is currently offline.`);
            setStatus('error');
            setTimeout(onClose, 3000);
            return;
          }
        } catch (err) {
          console.error('Error checking user status:', err);
        }
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: callType === 'video',
          audio: true,
        });
        setLocalStream(stream);
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        if (!isIncoming) {
          await initiateCall(stream);
        } else if (incomingCallData) {
          // Wait for user to accept
        }
      } catch (err) {
        console.error('Failed to get media devices:', err);
        onClose();
      }
    };

    startMedia();

    return () => {
      localStreamRef.current?.getTracks().forEach(track => track.stop());
      peerConnection.current?.close();
    };
  }, []);

  const initiateCall = async (stream: MediaStream) => {
    const pc = new RTCPeerConnection(servers);
    peerConnection.current = pc;

    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    const offerDescription = await pc.createOffer();
    await pc.setLocalDescription(offerDescription);

    const offer = {
      sdp: offerDescription.sdp,
      type: offerDescription.type,
    };

    try {
      const id = await callService.startCall(currentUser.uid, otherUser.uid, callType, offer);
      callId.current = id;

      // Listen for answer
      callService.listenForCallStatus(id, async (data) => {
        if (data.status === 'accepted' && data.answer && !pc.currentRemoteDescription) {
          const answerDescription = new RTCSessionDescription(data.answer);
          await pc.setRemoteDescription(answerDescription);
          setStatus('connected');
        } else if (data.status === 'rejected' || data.status === 'ended') {
          handleEndCall();
        }
      });

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          callService.addIceCandidate(id, currentUser.uid, event.candidate);
        }
      };

      callService.listenForIceCandidates(id, currentUser.uid, (candidate) => {
        pc.addIceCandidate(new RTCIceCandidate(candidate));
      });
    } catch (err: any) {
      if (err.message === 'User is offline') {
        setErrorMessage(`${otherUser.displayName} is currently offline.`);
        setStatus('error');
        setTimeout(onClose, 3000);
        return;
      }
      console.error('Failed to start call:', err);
      onClose();
    }
  };

  const handleAcceptCall = async () => {
    if (!incomingCallData || !localStream) return;
    
    const pc = new RTCPeerConnection(servers);
    peerConnection.current = pc;

    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    const offerDescription = new RTCSessionDescription(incomingCallData.offer);
    await pc.setRemoteDescription(offerDescription);

    const answerDescription = await pc.createAnswer();
    await pc.setLocalDescription(answerDescription);

    const answer = {
      sdp: answerDescription.sdp,
      type: answerDescription.type,
    };

    await callService.respondToCall(incomingCallData.id!, 'accepted', answer);
    setStatus('connected');

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        callService.addIceCandidate(incomingCallData.id!, currentUser.uid, event.candidate);
      }
    };

    callService.listenForIceCandidates(incomingCallData.id!, currentUser.uid, (candidate) => {
      pc.addIceCandidate(new RTCIceCandidate(candidate));
    });

    // Listen for call end
    callService.listenForCallStatus(incomingCallData.id!, (data) => {
      if (data.status === 'ended') {
        handleEndCall();
      }
    });
  };

  const handleRejectCall = async () => {
    if (incomingCallData?.id) {
      await callService.respondToCall(incomingCallData.id, 'rejected');
    }
    onClose();
  };

  const handleEndCall = async () => {
    // Stop all tracks immediately
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    localStreamRef.current = null;
    setLocalStream(null);
    
    if (callId.current) {
      await callService.endCall(callId.current);
    }
    setStatus('ended');
    setTimeout(onClose, 1000);
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => track.enabled = !track.enabled);
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream && callType === 'video') {
      localStream.getVideoTracks().forEach(track => track.enabled = !track.enabled);
      setIsVideoOff(!isVideoOff);
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-[60] flex flex-col overflow-hidden animate-in fade-in duration-300">
      {/* Video Streams / Background */}
      <div className="flex-1 relative bg-black flex items-center justify-center">
        {callType === 'video' ? (
          <>
            {/* Remote Video - Full Screen Background */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            
            {/* Local Video - PIP */}
            <div className="absolute top-6 right-6 w-32 md:w-64 aspect-video bg-gray-800 rounded-2xl border-2 border-white/20 shadow-2xl overflow-hidden z-10 transition-all hover:scale-105">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {isVideoOff && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                  <VideoOff className="text-gray-500" size={24} />
                </div>
              )}
            </div>

            {/* Overlay Info */}
            <div className="absolute top-8 left-8 z-10">
              <h2 className="text-white text-2xl font-bold drop-shadow-lg">{otherUser.displayName}</h2>
              <p className="text-white/70 text-sm drop-shadow-md">
                {status === 'ringing' ? 'Ringing...' : 'Video Call'}
              </p>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-8">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping" />
              {otherUser.photoURL ? (
                <img src={otherUser.photoURL} alt={otherUser.displayName} className="w-48 h-48 rounded-full object-cover border-4 border-blue-500 relative z-10 shadow-2xl" />
              ) : (
                <div className="w-48 h-48 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 border-4 border-blue-500 relative z-10 shadow-2xl">
                  <UserIcon size={96} />
                </div>
              )}
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-full font-bold uppercase tracking-widest text-xs shadow-lg z-20">
                {status === 'ringing' ? 'Calling...' : 'Connected'}
              </div>
            </div>
            <div className="text-center">
              <h2 className="text-4xl font-bold text-white mb-2">{otherUser.displayName}</h2>
              <p className="text-blue-400 font-medium tracking-widest uppercase text-sm">
                {status === 'error' ? errorMessage : (status === 'ringing' ? 'Ringing...' : 'Voice Call')}
              </p>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md z-40">
            <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center mb-6 shadow-2xl shadow-red-600/50">
              <PhoneOff className="text-white" size={32} />
            </div>
            <p className="text-white text-xl font-medium">{errorMessage}</p>
            <p className="text-white/50 text-sm mt-2">Closing in a few seconds...</p>
          </div>
        )}

        {status === 'ringing' && !isIncoming && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm z-20">
            <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center animate-bounce mb-6 shadow-2xl shadow-blue-600/50">
              <Phone className="text-white" size={32} />
            </div>
            <p className="text-white text-xl font-medium">Calling {otherUser.displayName}...</p>
          </div>
        )}
      </div>

      {/* Controls Overlay */}
      <div className="absolute bottom-12 left-0 right-0 flex items-center justify-center gap-8 z-30">
        <div className="bg-white/10 backdrop-blur-xl px-8 py-4 rounded-full flex items-center gap-6 border border-white/10 shadow-2xl">
          {status === 'ringing' && isIncoming ? (
            <>
              <button
                onClick={handleAcceptCall}
                className="w-16 h-16 bg-green-500 text-white rounded-full flex items-center justify-center hover:bg-green-600 transition-all hover:scale-110 shadow-lg shadow-green-500/40"
                title="Accept"
              >
                <Phone size={28} />
              </button>
              <button
                onClick={handleRejectCall}
                className="w-16 h-16 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-all hover:scale-110 shadow-lg shadow-red-500/40"
                title="Decline"
              >
                <PhoneOff size={28} />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={toggleMute}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isMuted ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
              </button>
              
              {callType === 'video' && (
                <button
                  onClick={toggleVideo}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isVideoOff ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
                  title={isVideoOff ? "Turn Video On" : "Turn Video Off"}
                >
                  {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
                </button>
              )}

              <button
                onClick={handleEndCall}
                className="w-16 h-16 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-all hover:scale-110 shadow-lg shadow-red-500/40"
                title="End Call"
              >
                <PhoneOff size={28} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
