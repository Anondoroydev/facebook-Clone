import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, User as UserIcon } from 'lucide-react';
import { Story } from '../services/storyService';

interface StoryViewerProps {
  stories: Story[];
  initialIndex: number;
  onClose: () => void;
}

export const StoryViewer: React.FC<StoryViewerProps> = ({ stories, initialIndex, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);

  const story = stories[currentIndex];

  useEffect(() => {
    setProgress(0);
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + 1;
      });
    }, 50); // 5 seconds per story (50ms * 100)

    return () => clearInterval(timer);
  }, [currentIndex]);

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  if (!story) return null;

  return (
    <div className="fixed inset-0 bg-black z-[200] flex items-center justify-center">
      <div className="relative w-full max-w-lg h-full md:h-[90vh] md:rounded-2xl overflow-hidden bg-gray-900 flex flex-col">
        {/* Progress Bars */}
        <div className="absolute top-4 left-4 right-4 flex gap-1 z-20">
          {stories.map((_, index) => (
            <div key={index} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white transition-all duration-50 ease-linear"
                style={{ 
                  width: index === currentIndex ? `${progress}%` : index < currentIndex ? '100%' : '0%' 
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-8 left-4 right-4 flex items-center justify-between z-20">
          <div className="flex items-center gap-3">
            {story.userPhoto ? (
              <img src={story.userPhoto} alt={story.userName} className="w-10 h-10 rounded-full border-2 border-white object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 border-2 border-white">
                <UserIcon size={20} />
              </div>
            )}
            <div className="text-white">
              <p className="font-bold text-sm drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">{story.userName}</p>
              <p className="text-[10px] opacity-90 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">24h Story</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-white hover:bg-white/10 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Story Content */}
        <div className="flex-1 relative flex items-center justify-center">
          {story.type === 'video' || story.imageUrl.match(/\.(mp4|webm|ogg)$/) || story.imageUrl.includes('video') ? (
            <video 
              src={story.imageUrl} 
              className="w-full h-full object-contain"
              autoPlay
              muted
              playsInline
              onEnded={handleNext}
            />
          ) : (
            <img 
              src={story.imageUrl} 
              alt="Story" 
              className="w-full h-full object-contain"
            />
          )}
          
          {/* Navigation Controls */}
          <button 
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors hidden md:block"
            disabled={currentIndex === 0}
          >
            <ChevronLeft size={32} />
          </button>
          <button 
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors hidden md:block"
          >
            <ChevronRight size={32} />
          </button>

          {/* Touch areas for mobile */}
          <div className="absolute inset-y-0 left-0 w-1/3 md:hidden" onClick={handlePrev} />
          <div className="absolute inset-y-0 right-0 w-1/3 md:hidden" onClick={handleNext} />
        </div>
      </div>
    </div>
  );
};
