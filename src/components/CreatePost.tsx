import React, { useState, useRef } from 'react';
import { Image as ImageIcon, Send, Loader2, Video, Smile, X, Upload, MapPin, Tag } from 'lucide-react';
import { postService } from '../services/postService';
import { UserProfile } from '../types';
import { compressImage } from '../utils/imageUtils';

interface CreatePostProps {
  user: UserProfile;
}

export const CreatePost: React.FC<CreatePostProps> = ({ user }) => {
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  const [showImageInput, setShowImageInput] = useState(false);
  const [showVideoInput, setShowVideoInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsPosting(true);
      try {
        const compressedDataUrl = await compressImage(file, 1200, 1200, 0.7);
        if (compressedDataUrl.length > 1000000) {
          alert('Even after compression, the image is too large. Please choose a smaller file.');
          return;
        }
        setImageUrl(compressedDataUrl);
        setVideoUrl('');
        setShowImageInput(false);
      } catch (error) {
        console.error('Error processing image:', error);
        alert('Failed to process image. Please try another one.');
      } finally {
        setIsPosting(false);
      }
    }
  };

  const handlePost = async () => {
    if (!content.trim() && !imageUrl.trim() && !videoUrl.trim()) return;
    
    setIsPosting(true);
    try {
      await postService.createPost(
        user.uid,
        user.displayName,
        user.photoURL,
        content,
        imageUrl,
        videoUrl
      );
      setContent('');
      setImageUrl('');
      setVideoUrl('');
      setShowImageInput(false);
      setShowVideoInput(false);
    } catch (error) {
      console.error('Error creating post:', error);
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="glass-card mb-6 overflow-hidden border border-(--glass-border) text-(--text-primary) shadow-xl shadow-black/5 p-2">





      {/* Top Section: Input */}
      <div className="p-4 flex gap-3">
        {user.photoURL ? (
          <img src={user.photoURL} alt={user.displayName} className="w-10 h-10 rounded-full object-cover border border-gray-100" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-linear-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-sm">

            {user.displayName[0]}
          </div>
        )}
        <div className="flex-1">
          <div 
            className="w-full bg-(--fb-input-bg) hover:bg-(--fb-hover) rounded-full px-4 py-2.5 text-(--fb-text-secondary) text-[17px] cursor-pointer transition-colors"
            onClick={() => setShowImageInput(true)}
          >
            What's on your mind, {user.displayName.split(' ')[0]}?
          </div>
        </div>


      </div>

      {/* Media Previews */}
      {imageUrl && (
        <div className="px-4 pb-4 relative group">
          <div className="relative rounded-xl overflow-hidden border border-(--divider) bg-black/5">
            <img src={imageUrl} alt="Preview" className="w-full max-h-[400px] object-contain" />
            <button 
              onClick={() => setImageUrl('')}
              className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white p-1.5 rounded-full hover:bg-black/80 shadow-sm transition-all opacity-0 group-hover:opacity-100"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {videoUrl && (
        <div className="px-4 pb-4 relative group">
          <div className="relative rounded-xl overflow-hidden border border-(--divider) bg-black">
            <video src={videoUrl} className="w-full max-h-[400px] object-contain" controls />
            <button 
              onClick={() => setVideoUrl('')}
              className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white p-1.5 rounded-full hover:bg-black/80 shadow-sm transition-all opacity-0 group-hover:opacity-100"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {(showImageInput || showVideoInput || content) && (
        <div className="px-4 pb-3">
          <textarea
            autoFocus
            placeholder={`What's on your mind, ${user.displayName.split(' ')[0]}?`}
            className="w-full bg-transparent text-(--text-primary) text-[18px] outline-none resize-none min-h-[100px] py-2"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />

          
          {(showImageInput || showVideoInput) && (
            <div className="mt-4 p-4 bg-(--bg-input) border border-(--divider) rounded-xl relative group">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-full ${showImageInput ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                    {showImageInput ? <ImageIcon size={20} /> : <Video size={20} />}
                  </div>
                  <h4 className="font-black text-[15px] text-(--text-primary)">
                    {showImageInput ? 'Add Photos' : 'Add Videos'}
                  </h4>
                </div>
                <button 
                  onClick={() => { setShowImageInput(false); setShowVideoInput(false); }}
                  className="p-1.5 hover:bg-(--fb-hover) rounded-full text-(--text-secondary) transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              
              {!imageUrl && !videoUrl ? (
                <div 
                  onClick={() => showImageInput ? fileInputRef.current?.click() : setShowVideoInput(true)}
                  className="bg-(--fb-hover) hover:bg-(--fb-hover)/80 transition-colors rounded-xl h-48 flex flex-col items-center justify-center cursor-pointer border-2 border-dashed border-(--divider)"
                >
                  <div className="w-12 h-12 bg-(--bg-card) rounded-2xl flex items-center justify-center mb-3 shadow-sm">
                    <Upload size={24} className="text-(--brand-primary)" />
                  </div>
                  <span className="font-black text-[15px] text-(--text-primary)">Add Photos/Videos</span>
                  <span className="text-[12px] font-bold text-(--text-secondary) uppercase tracking-tighter">or drag and drop</span>
                </div>

              ) : (
                <div className="relative rounded-xl overflow-hidden border border-(--divider) bg-black/5">
                  {imageUrl ? (
                    <img src={imageUrl} alt="Preview" className="w-full max-h-[300px] object-contain" />
                  ) : (
                    <video src={videoUrl} className="w-full max-h-[300px] object-contain bg-black" controls />
                  )}
                  <button 
                    onClick={() => { setImageUrl(''); setVideoUrl(''); }}
                    className="absolute top-2 right-2 bg-black/60 text-white p-1.5 rounded-full shadow-md hover:bg-black/80"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                className="hidden" 
              />
            </div>
          )}
        </div>
      )}

      
      {/* Bottom Section: Actions */}
      <div className="py-2 border-t border-(--fb-divider) flex items-center justify-between bg-transparent mx-4">

        <div className="flex items-center gap-1 flex-1">
          <button 
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-(--fb-text-secondary) hover:bg-(--fb-hover) transition-colors"
            onClick={() => {
              setShowImageInput(true);
              setShowVideoInput(false);
            }}
          >
            <Video size={24} className="text-[#F3425F]" fill="currentColor" />
            <span className="text-[15px] font-semibold text-(--fb-text-secondary)">Live video</span>
          </button>
          <button 
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-(--fb-text-secondary) hover:bg-(--fb-hover) transition-colors"
            onClick={() => {
              setShowImageInput(true);
              setShowVideoInput(false);
            }}
          >
            <ImageIcon size={24} className="text-[#45BD62]" fill="currentColor" />
            <span className="text-[15px] font-semibold text-(--fb-text-secondary)">Photo/video</span>
          </button>
          <button 
            className="flex-1 items-center justify-center gap-2 py-2 rounded-lg text-(--fb-text-secondary) hover:bg-(--fb-hover) transition-colors hidden sm:flex"
            onClick={() => alert('Feeling/Activity coming soon!')}
          >
            <Smile size={24} className="text-[#F7B928]" fill="currentColor" />
            <span className="text-[15px] font-semibold text-(--fb-text-secondary)">Feeling/activity</span>
          </button>
        </div>
      </div>

      
      {/* Post Button (Visible when focused or content exists) */}
      {(showImageInput || showVideoInput || content) && (
        <div className="px-4 pb-4">
          <button
            onClick={handlePost}
            disabled={isPosting || (!content.trim() && !imageUrl.trim() && !videoUrl.trim())}
            className="w-full premium-button rounded-xl!"
          >
            {isPosting ? 'Posting...' : 'Create Post'}
          </button>

        </div>
      )}

    </div>
  );
};

