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
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 mb-6 overflow-hidden">
      {/* Top Section: Input */}
      <div className="p-4 flex gap-3">
        {user.photoURL ? (
          <img src={user.photoURL} alt={user.displayName} className="w-10 h-10 rounded-full object-cover border border-gray-100" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-sm">
            {user.displayName[0]}
          </div>
        )}
        <div className="flex-1">
          <textarea
            placeholder={`What's on your mind, ${user.displayName.split(' ')[0]}?`}
            className="w-full bg-gray-50 hover:bg-gray-100 focus:bg-white rounded-2xl px-4 py-3 outline-none resize-none text-gray-800 min-h-[60px] transition-all border border-transparent focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>
      </div>

      {/* Media Previews */}
      {imageUrl && (
        <div className="px-4 pb-4 relative group">
          <div className="relative rounded-xl overflow-hidden border border-gray-200">
            <img src={imageUrl} alt="Preview" className="w-full max-h-[400px] object-cover" />
            <button 
              onClick={() => setImageUrl('')}
              className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-gray-800 p-1.5 rounded-full hover:bg-white shadow-sm transition-all opacity-0 group-hover:opacity-100"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {videoUrl && (
        <div className="px-4 pb-4 relative group">
          <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-black">
            <video src={videoUrl} className="w-full max-h-[400px] object-contain" controls />
            <button 
              onClick={() => setVideoUrl('')}
              className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-gray-800 p-1.5 rounded-full hover:bg-white shadow-sm transition-all opacity-0 group-hover:opacity-100"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Input Fields for URLs */}
      {(showImageInput || showVideoInput) && (
        <div className="px-4 pb-4">
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {showImageInput ? (
                  <ImageIcon size={18} className="text-green-500" />
                ) : (
                  <Video size={18} className="text-red-500" />
                )}
                <h4 className="text-sm font-bold text-gray-700">
                  {showImageInput ? 'Add Photo' : 'Add Video'}
                </h4>
              </div>
              <button 
                onClick={() => { 
                  setShowImageInput(false); 
                  setShowVideoInput(false); 
                  setImageUrl('');
                  setVideoUrl('');
                }}
                className="p-1.5 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder={showImageInput ? "Paste image URL here..." : "Paste video URL here..."}
                className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all"
                value={showImageInput ? imageUrl : videoUrl}
                onChange={(e) => {
                  if (showImageInput) {
                    setImageUrl(e.target.value);
                    setVideoUrl('');
                  } else {
                    setVideoUrl(e.target.value);
                    setImageUrl('');
                  }
                }}
                autoFocus
              />
              {showImageInput && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm font-semibold whitespace-nowrap shadow-sm"
                >
                  <Upload size={16} className="text-blue-500" />
                  Upload
                </button>
              )}
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/jpeg,image/jpg,image/png,image/webp" 
              className="hidden" 
            />
          </div>
        </div>
      )}
      
      {/* Bottom Section: Actions */}
      <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
        <div className="flex items-center gap-1">
          <button 
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${showImageInput ? 'bg-green-50 text-green-600' : 'text-gray-600 hover:bg-gray-100'}`}
            onClick={() => {
              setShowImageInput(!showImageInput);
              setShowVideoInput(false);
            }}
          >
            <ImageIcon size={20} className={showImageInput ? "text-green-600" : "text-green-500"} />
            <span className="text-sm font-medium hidden sm:inline">Photo</span>
          </button>
          <button 
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${showVideoInput ? 'bg-red-50 text-red-600' : 'text-gray-600 hover:bg-gray-100'}`}
            onClick={() => {
              setShowVideoInput(!showVideoInput);
              setShowImageInput(false);
            }}
          >
            <Video size={20} className={showVideoInput ? "text-red-600" : "text-red-500"} />
            <span className="text-sm font-medium hidden sm:inline">Video</span>
          </button>
          <button 
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors hidden md:flex"
            onClick={() => alert('Feeling/Activity coming soon!')}
          >
            <Smile size={20} className="text-yellow-500" />
            <span className="text-sm font-medium">Feeling</span>
          </button>
        </div>

        <button
          onClick={handlePost}
          disabled={isPosting || (!content.trim() && !imageUrl.trim() && !videoUrl.trim())}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-6 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 shadow-sm active:scale-95"
        >
          {isPosting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          Post
        </button>
      </div>
    </div>
  );
};

