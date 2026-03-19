import React, { useState, useEffect, useRef } from 'react';
import { X, Mic, MicOff, Video, VideoOff, PhoneOff, Maximize2, Minimize2 } from 'lucide-react';
import { UserProfile } from '../types';

interface CallWindowProps {
  targetUser: UserProfile;
  currentUser: UserProfile;
  type: 'audio' | 'video';
  onClose: () => void;
}

export const CallWindow: React.FC<CallWindowProps> = ({ targetUser, currentUser, type, onClose }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(type === 'audio');
  const [callStatus, setCallStatus] = useState<'calling' | 'connected' | 'ended'>('calling');
  const [duration, setDuration] = useState(0);
  const [isMaximized, setIsMaximized] = useState(false);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Simulate connection
    const timer = setTimeout(() => {
      setCallStatus('connected');
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let interval: any;
    if (callStatus === 'connected') {
      interval = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callStatus]);

  useEffect(() => {
    if (type === 'video' && !isVideoOff) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => {
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        })
        .catch(err => console.error('Error accessing media devices:', err));
    }
  }, [type, isVideoOff]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`fixed z-[100] transition-all duration-300 shadow-2xl overflow-hidden bg-gray-900 flex flex-col ${
      isMaximized 
        ? 'inset-0 rounded-0' 
        : 'bottom-4 right-4 w-80 md:w-96 aspect-[3/4] rounded-2xl border border-gray-700'
    }`}>
      {/* Header */}
      <div className="p-4 flex items-center justify-between bg-gradient-to-b from-black/50 to-transparent absolute top-0 left-0 right-0 z-10">
        <div className="flex items-center gap-3">
          <img src={targetUser.photoURL || `https://ui-avatars.com/api/?name=${targetUser.displayName}`} className="w-10 h-10 rounded-full border border-white/20" alt="" />
          <div>
            <h4 className="text-white font-bold text-sm">{targetUser.displayName}</h4>
            <p className="text-white/70 text-xs">
              {callStatus === 'calling' ? 'Calling...' : formatDuration(duration)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsMaximized(!isMaximized)} className="p-2 hover:bg-white/10 rounded-full text-white transition-colors">
            {isMaximized ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-white transition-colors">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative flex items-center justify-center bg-gray-800">
        {/* Remote Video (Simulated) */}
        {type === 'video' && callStatus === 'connected' ? (
          <div className="w-full h-full relative">
            <img 
              src={targetUser.photoURL || `https://picsum.photos/seed/${targetUser.uid}/800/600`} 
              className="w-full h-full object-cover opacity-50 blur-sm" 
              alt="" 
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center p-8">
              <img src={targetUser.photoURL || `https://ui-avatars.com/api/?name=${targetUser.displayName}`} className="w-24 h-24 rounded-full border-4 border-white/20 mb-4" alt="" />
              <h2 className="text-2xl font-bold mb-2">{targetUser.displayName}</h2>
              <p className="text-white/60">Video call in progress...</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center p-8">
            <div className="relative">
              <img src={targetUser.photoURL || `https://ui-avatars.com/api/?name=${targetUser.displayName}`} className="w-32 h-32 rounded-full border-4 border-blue-500/30 mb-6" alt="" />
              {callStatus === 'calling' && (
                <div className="absolute inset-0 rounded-full border-4 border-blue-500 animate-ping opacity-20" />
              )}
            </div>
            <h2 className="text-white text-2xl font-bold mb-2">{targetUser.displayName}</h2>
            <p className="text-blue-400 font-medium animate-pulse">
              {callStatus === 'calling' ? 'Calling...' : 'Connected'}
            </p>
          </div>
        )}

        {/* Local Video Preview */}
        {type === 'video' && !isVideoOff && (
          <div className="absolute bottom-24 right-4 w-24 md:w-32 aspect-[3/4] bg-black rounded-lg border border-white/20 overflow-hidden shadow-lg">
            <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-6 flex items-center justify-center gap-4 bg-gradient-to-t from-black/80 to-transparent absolute bottom-0 left-0 right-0">
        <button 
          onClick={() => setIsMuted(!isMuted)}
          className={`p-4 rounded-full transition-all ${isMuted ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
        >
          {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
        </button>
        
        <button 
          onClick={onClose}
          className="p-4 rounded-full bg-red-600 text-white hover:bg-red-700 transition-all transform hover:scale-110"
        >
          <PhoneOff size={32} />
        </button>

        {type === 'video' && (
          <button 
            onClick={() => setIsVideoOff(!isVideoOff)}
            className={`p-4 rounded-full transition-all ${isVideoOff ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
          >
            {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
          </button>
        )}
      </div>
    </div>
  );
};
