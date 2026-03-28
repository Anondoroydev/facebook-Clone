import React, { useState, useRef } from 'react';
import { X, Image as ImageIcon, Loader2, Send, Upload } from 'lucide-react';
import { storyService } from '../services/storyService';
import { UserProfile } from '../types';
import { compressImage } from '../utils/imageUtils';

interface CreateStoryModalProps {
  user: UserProfile;
  onClose: () => void;
}

export const CreateStoryModal: React.FC<CreateStoryModalProps> = ({ user, onClose }) => {
  const [imageUrl, setImageUrl] = useState('');
  const [contentType, setContentType] = useState<'image' | 'video'>('image');
  const [isPosting, setIsPosting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith('video/')) {
        if (file.size > 1000000) { // 1MB limit for Firestore
          alert('Video file is too large. Please choose a file under 1MB.');
          return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
          setImageUrl(event.target?.result as string);
          setContentType('video');
        };
        reader.readAsDataURL(file);
        return;
      }

      setIsPosting(true);
      try {
        // Compress image for stories
        const compressedDataUrl = await compressImage(file, 1080, 1920, 0.7);
        
        // Check if the compressed size is still too large for Firestore (1MB limit)
        if (compressedDataUrl.length > 1000000) {
          alert('Even after compression, the image is too large. Please choose a smaller file.');
          return;
        }

        setImageUrl(compressedDataUrl);
        setContentType('image');
      } catch (error) {
        console.error('Error processing image:', error);
        alert('Failed to process image. Please try another one.');
      } finally {
        setIsPosting(false);
      }
    }
  };

  const handleCreate = async () => {
    if (!imageUrl.trim()) return;
    
    setIsPosting(true);
    try {
      await storyService.createStory(
        user.uid,
        user.displayName,
        user.photoURL,
        imageUrl,
        contentType
      );
      onClose();
    } catch (error) {
      console.error('Error creating story:', error);
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
      <div className="glass-card shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-(--glass-border) flex items-center justify-between">
          <h3 className="text-xl font-bold text-(--text-primary)">Create Story</h3>
          <button onClick={onClose} className="p-2 hover:bg-(--fb-hover) rounded-full transition-colors">
            <X size={20} className="text-(--text-primary)" />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-(--text-secondary)">Story Media URL</label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Paste an image or video URL here..."
                  className="w-full bg-(--bg-input) text-(--text-primary) border border-transparent rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-(--brand-primary)/50 focus:border-(--glass-border) transition-all"
                  value={imageUrl}
                  onChange={(e) => {
                    const val = e.target.value;
                    setImageUrl(val);
                    if (val.match(/\.(mp4|webm|ogg)$/) || val.includes('video')) {
                      setContentType('video');
                    } else {
                      setContentType('image');
                    }
                  }}
                  autoFocus
                />
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-(--brand-primary)/10 text-(--brand-primary) px-4 py-2 rounded-xl hover:bg-(--brand-primary)/20 transition-colors flex items-center gap-2 text-sm font-semibold whitespace-nowrap"
              >
                <Upload size={18} />
                Upload
              </button>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/*,video/*" 
              className="hidden" 
            />
            <p className="text-xs text-(--text-secondary)">Your story will be visible to your friends for 24 hours.</p>
          </div>

          {imageUrl && (
            <div className="relative aspect-[9/16] max-h-[400px] rounded-xl overflow-hidden bg-(--bg-input) border border-(--glass-border) mx-auto">
              {contentType === 'image' ? (
                <img 
                  src={imageUrl} 
                  alt="Story Preview" 
                  className="w-full h-full object-cover"
                  onError={() => {
                    alert('Invalid image URL. Please try another one.');
                    setImageUrl('');
                  }}
                />
              ) : (
                <video 
                  src={imageUrl} 
                  className="w-full h-full object-cover"
                  autoPlay
                  muted
                  loop
                  onError={() => {
                    alert('Invalid video URL. Please try another one.');
                    setImageUrl('');
                  }}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent pointer-events-none" />
              <div className="absolute top-4 left-4 flex items-center gap-2">
                <img src={user.photoURL || 'https://picsum.photos/seed/user/100/100'} className="w-8 h-8 rounded-full border-2 border-blue-500" />
                <span className="text-white text-sm font-bold drop-shadow-md">{user.displayName}</span>
              </div>
            </div>
          )}

          {!imageUrl && (
            <div className="aspect-[9/16] max-h-[400px] rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 gap-2 mx-auto">
              <ImageIcon size={48} className="opacity-20" />
              <p className="text-sm font-medium">Preview will appear here</p>
            </div>
          )}
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-100">
          <button
            onClick={handleCreate}
            disabled={isPosting || !imageUrl.trim()}
            className="w-full bg-[#1877F2] hover:bg-blue-700 disabled:bg-blue-300 text-white py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
          >
            {isPosting ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
            Share to Story
          </button>
        </div>
      </div>
    </div>
  );
};
