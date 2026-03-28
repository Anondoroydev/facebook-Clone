import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, Message } from '../types';
import { chatService } from '../services/chatService';
import { Send, User as UserIcon, Phone, Video, X, ImagePlus, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface ChatWindowProps {
  currentUser: UserProfile;
  otherUser: UserProfile;
  onClose: () => void;
  onStartCall?: (type: 'audio' | 'video') => void;
  onViewProfile?: (userId: string) => void;
  /** When true, renders as a flex-filling inline panel instead of fixed overlay */
  inline?: boolean;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ currentUser, otherUser, onClose, onStartCall, onViewProfile, inline = false }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<'image' | 'video' | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isSending, setIsSending] = useState(false);

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    console.log('ChatWindow useEffect called with:', { currentUserUid: currentUser.uid, otherUserUid: otherUser.uid });
    const unsubscribeMessages = chatService.getMessages(currentUser.uid, otherUser.uid, (msgs) => {
      console.log('Messages received:', msgs);
      setMessages(msgs);
      msgs.forEach(msg => {
        if (msg.senderId === otherUser.uid && !msg.read) {
          chatService.markAsRead(msg.id);
        }
      });
    });
    const unsubscribeTyping = chatService.listenForTypingStatus(otherUser.uid, setIsOtherUserTyping);
    return () => {
      unsubscribeMessages();
      unsubscribeTyping();
    };
  }, [currentUser.uid, otherUser.uid]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    chatService.setTypingStatus(currentUser.uid, otherUser.uid, true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      chatService.setTypingStatus(currentUser.uid, otherUser.uid, false);
    }, 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const type: 'image' | 'video' = file.type.startsWith('video/') ? 'video' : 'image';
    setSelectedFile(file);
    setPreviewType(type);
    setPreviewUrl(URL.createObjectURL(file));

    // reset the input so same file can be picked again
    e.target.value = '';
  };

  const clearMedia = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    setPreviewType(null);
    setUploadProgress(null);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const hasText = inputText.trim();
    if (!hasText && !selectedFile) return;

    setIsSending(true);
    try {
      let mediaUrl: string | undefined;
      let mediaType: 'image' | 'video' | undefined;

      if (selectedFile) {
        const result = await chatService.uploadChatMedia(
          selectedFile,
          currentUser.uid,
          (progress) => setUploadProgress(progress)
        );
        mediaUrl = result.url;
        mediaType = result.mediaType;
      }

      await chatService.sendMessage(
        currentUser.uid,
        otherUser.uid,
        hasText || '',
        mediaUrl,
        mediaType
      );

      setInputText('');
      clearMedia();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      chatService.setTypingStatus(currentUser.uid, otherUser.uid, false);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
      setUploadProgress(null);
    }
  };

  return (
    <div
      className={inline
        ? 'flex flex-col h-full w-full bg-(--bg-card) border-0'
        : 'fixed bottom-18 md:bottom-0 right-2 md:right-4 w-[calc(100%-16px)] md:w-96 bg-(--bg-card) md:glass-card rounded-xl md:rounded-t-xl md:rounded-b-none shadow-2xl border border-(--glass-border) flex flex-col h-[500px] md:h-[450px] z-60 animate-in slide-in-from-bottom-4 duration-300'
      }
      style={inline ? {} : { backdropFilter: 'none' }}
    >
      {/* Header */}
      <div className="p-3 border-b border-(--glass-border) flex items-center justify-between bg-(--brand-primary) text-white rounded-t-xl shrink-0">
        <button 
          onClick={() => onViewProfile?.(otherUser.uid)}
          className="flex items-center gap-2 hover:bg-white/10 p-1.5 -ml-1.5 rounded-lg transition-colors text-left"
        >
          <div className="relative">
            {otherUser.photoURL ? (
              <img src={otherUser.photoURL} alt={otherUser.displayName} className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <UserIcon size={16} />
              </div>
            )}
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-blue-600 rounded-full"></div>
          </div>
          <div>
            <h4 className="text-sm font-bold truncate max-w-[120px]">{otherUser.displayName}</h4>
            <p className="text-[10px] opacity-80">
              {isOtherUserTyping ? 'Typing...' : 'Active now'}
            </p>
          </div>
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => onStartCall?.('audio')} className="p-2 md:p-1.5 hover:bg-white/10 rounded-full transition-colors">
            <Phone size={20} />
          </button>
          <button onClick={() => onStartCall?.('video')} className="p-2 md:p-1.5 hover:bg-white/10 rounded-full transition-colors">
            <Video size={20} />
          </button>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-transparent">
        {messages.map(msg => {
          const isMe = msg.senderId === currentUser.uid;
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl text-sm shadow-sm overflow-hidden ${
                isMe
                  ? 'bg-(--brand-primary) text-white rounded-br-none'
                  : 'bg-(--bg-input) text-(--text-primary) rounded-bl-none'
              }`}>
                {/* Media content */}
                {msg.mediaUrl && msg.mediaType === 'image' && (
                  <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer">
                    <img
                      src={msg.mediaUrl}
                      alt="shared image"
                      className="w-full max-h-56 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                      loading="lazy"
                    />
                  </a>
                )}
                {msg.mediaUrl && msg.mediaType === 'video' && (
                  <video
                    src={msg.mediaUrl}
                    controls
                    className="w-full max-h-56 bg-black"
                  />
                )}

                {/* Text content */}
                {msg.content && (
                  <p className="px-4 py-2">{msg.content}</p>
                )}

                {/* Timestamp & read receipt */}
                <div className={`flex items-center gap-1 px-4 pb-2 ${msg.content ? 'pt-0' : 'pt-2'} ${isMe ? 'text-blue-100 justify-end' : 'text-(--text-secondary)'}`}>
                  <p className="text-[9px]">{format(new Date(msg.createdAt), 'HH:mm')}</p>
                  {isMe && <span className="text-[9px]">{msg.read ? '✓✓' : '✓'}</span>}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Media Preview before sending */}
      {previewUrl && (
        <div className="px-3 pb-1">
          <div className="relative inline-block max-w-[180px]">
            {previewType === 'image' ? (
              <img src={previewUrl} alt="preview" className="rounded-lg max-h-28 object-cover border border-(--glass-border)" />
            ) : (
              <video src={previewUrl} className="rounded-lg max-h-28 border border-(--glass-border)" />
            )}
            <button
              onClick={clearMedia}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow"
            >
              <X size={12} />
            </button>
          </div>
          {uploadProgress !== null && (
            <div className="mt-1 w-full bg-(--bg-input) rounded-full h-1.5">
              <div
                className="bg-(--brand-primary) h-1.5 rounded-full transition-all duration-200"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 border-t border-(--glass-border) flex items-center gap-2">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Media picker button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isSending}
          className="p-2 text-(--brand-primary) hover:bg-(--brand-primary)/10 rounded-full transition-colors disabled:opacity-40 shrink-0"
          title="Send image or video"
        >
          <ImagePlus size={20} />
        </button>

        <input
          type="text"
          placeholder="Type a message..."
          className="flex-1 min-w-0 bg-(--bg-input) text-(--text-primary) rounded-full px-4 py-2 text-sm outline-none focus:bg-(--fb-hover) transition-colors border border-transparent focus:border-(--glass-border)"
          value={inputText}
          onChange={handleInputChange}
          disabled={isSending}
        />

        <button
          type="submit"
          disabled={isSending || (!inputText.trim() && !selectedFile)}
          className="p-2 text-(--brand-primary) hover:bg-(--brand-primary)/10 rounded-full transition-colors disabled:text-(--text-secondary) disabled:opacity-50 shrink-0"
        >
          {isSending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
        </button>
      </form>
    </div>
  );
};
