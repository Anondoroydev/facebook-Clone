import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, Message } from '../types';
import { chatService } from '../services/chatService';
import { Send, User as UserIcon, Phone, Video, X } from 'lucide-react';
import { format } from 'date-fns';

interface ChatWindowProps {
  currentUser: UserProfile;
  otherUser: UserProfile;
  onClose: () => void;
  onStartCall?: (type: 'audio' | 'video') => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ currentUser, otherUser, onClose, onStartCall }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);


  useEffect(() => {
    console.log('ChatWindow useEffect called with:', { currentUserUid: currentUser.uid, otherUserUid: otherUser.uid });
    const unsubscribeMessages = chatService.getMessages(currentUser.uid, otherUser.uid, (messages) => {
      console.log('Messages received:', messages);
      setMessages(messages);
      // Mark incoming messages as read
      messages.forEach(msg => {
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
    
    // Set typing status to true
    chatService.setTypingStatus(currentUser.uid, otherUser.uid, true);
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set timeout to clear typing status after 2 seconds
    typingTimeoutRef.current = setTimeout(() => {
      chatService.setTypingStatus(currentUser.uid, otherUser.uid, false);
    }, 2000);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    try {
      await chatService.sendMessage(currentUser.uid, otherUser.uid, inputText);
      setInputText('');
      // Immediately clear typing status on send
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      chatService.setTypingStatus(currentUser.uid, otherUser.uid, false);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <div className="fixed bottom-18 md:bottom-0 right-2 md:right-4 w-[calc(100%-16px)] md:w-96 glass-card rounded-xl md:rounded-t-xl md:rounded-b-none shadow-2xl border border-(--glass-border) flex flex-col h-[500px] md:h-[450px] z-60 animate-in slide-in-from-bottom-4 duration-300">

      {/* Header */}
      <div className="p-3 border-b border-(--glass-border) flex items-center justify-between bg-(--brand-primary) text-white rounded-t-xl">
        <div className="flex items-center gap-2">
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
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => onStartCall?.('audio')}
            className="p-2 md:p-1.5 hover:bg-white/10 rounded-full transition-colors"
          >
            <Phone size={20} />
          </button>
          <button 
            onClick={() => onStartCall?.('video')}
            className="p-2 md:p-1.5 hover:bg-white/10 rounded-full transition-colors"
          >
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
              <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                isMe ? 'bg-(--brand-primary) text-white rounded-br-none' : 'bg-(--bg-input) text-(--text-primary) rounded-bl-none'
              }`}>
                <p>{msg.content}</p>
                <div className={`flex items-center gap-1 mt-1 ${isMe ? 'text-blue-100' : 'text-(--text-secondary)'}`}>
                  <p className="text-[9px]">
                    {format(new Date(msg.createdAt), 'HH:mm')}
                  </p>
                  {isMe && (
                    <span className="text-[9px]">{msg.read ? '✓✓' : '✓'}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>


      {/* Input */}
      <form onSubmit={handleSend} className="p-3 border-t border-(--glass-border) flex items-center gap-2">
        <input
          type="text"
          placeholder="Type a message..."
          className="flex-1 bg-(--bg-input) text-(--text-primary) rounded-full px-4 py-2 text-sm outline-none focus:bg-(--fb-hover) transition-colors border border-transparent focus:border-(--glass-border)"
          value={inputText}
          onChange={handleInputChange}
        />
        <button 
          type="submit"
          disabled={!inputText.trim()}
          className="p-2 text-(--brand-primary) hover:bg-(--brand-primary)/10 rounded-full transition-colors disabled:text-(--text-secondary) disabled:opacity-50"
        >
          <Send size={20} />
        </button>
      </form>
    </div>
  );
};
