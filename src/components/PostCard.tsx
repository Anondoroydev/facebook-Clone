import React, { useState, useEffect, useRef } from 'react';
import { ThumbsUp, MessageSquare, Share2, MoreHorizontal, User as UserIcon, Trash2, Globe, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Post, Comment, UserProfile } from '../types';
import { postService } from '../services/postService';

interface PostCardProps {
  post: Post;
  currentUser: UserProfile;
  onViewProfile?: (userId: string) => void;
}

export const PostCard: React.FC<PostCardProps> = ({ post, currentUser, onViewProfile }) => {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [isLiking, setIsLiking] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isLiked = post.likes.includes(currentUser.uid);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (showComments) {
      const unsubscribe = postService.getComments(post.id, setComments);
      return () => unsubscribe();
    }
  }, [showComments, post.id]);

  const handleAuthorClick = () => {
    if (onViewProfile) {
      onViewProfile(post.authorId);
    }
  };

  const handleLike = async () => {
    if (isLiking) return;
    setIsLiking(true);
    try {
      await postService.likePost(post.id, currentUser.uid, isLiked, post.authorId, currentUser.displayName);
    } catch (error) {
      console.error('Error liking post:', error);
    } finally {
      setIsLiking(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      await postService.addComment(
        post.id,
        currentUser.uid,
        currentUser.displayName,
        currentUser.photoURL,
        commentText,
        post.authorId
      );
      setCommentText('');
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const [shareStatus, setShareStatus] = useState<'idle' | 'copied' | 'shared'>('idle');

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${post.authorName}'s Post`,
          text: post.content || 'Check out this post on SocialConnect',
          url: window.location.href,
        });
        setShareStatus('shared');
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setShareStatus('copied');
      }
      setTimeout(() => setShareStatus('idle'), 2000);
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await postService.deletePost(post.id);
    } catch (error) {
      console.error('Error deleting post:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="glass-card mb-2 md:mb-6 overflow-hidden text-(--text-primary) border-y md:border border-(--glass-border) rounded-none md:rounded-[16px] animate-fade-in shadow-sm md:shadow-xl shadow-black/5">
      {/* Header */}
      <div className="p-4 flex items-start justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={handleAuthorClick} className="shrink-0 hover:opacity-90 transition-opacity">
            {post.authorPhoto ? (
              <img src={post.authorPhoto} alt={post.authorName} className="w-10 h-10 rounded-full object-cover border border-(--divider)" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-(--brand-primary)/10 flex items-center justify-center text-(--brand-primary) font-black shadow-sm">
                {post.authorName[0]}
              </div>
            )}
          </button>
          <div className="text-left flex flex-col min-w-0">
            <button onClick={handleAuthorClick} className="font-black text-(--text-primary) hover:underline text-[15px] leading-tight text-left tracking-tight truncate max-w-[160px] sm:max-w-xs block">
              {post.authorName}
            </button>
            <div className="flex items-center gap-1 text-[12px] font-bold text-(--text-secondary) uppercase tracking-tighter">
              <span className="hover:underline cursor-pointer">{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
              <span>•</span>
              <Globe size={11} />
            </div>
          </div>
        </div>
        
        <div className="relative" ref={menuRef}>
          <button 
            onClick={() => setShowMenu(!showMenu)}
            className="text-(--text-secondary) hover:bg-(--fb-hover) p-2 rounded-full transition-colors"
          >
            <MoreHorizontal size={20} />
          </button>
          
          {showMenu && (
            <div className="absolute right-0 mt-1 w-48 bg-(--bg-card) backdrop-blur-xl rounded-xl shadow-2xl border border-(--divider) py-2 z-10 animate-in fade-in zoom-in duration-200">
              {post.authorId === currentUser.uid && (
                <button 
                  onClick={() => {
                    handleDelete();
                    setShowMenu(false);
                  }}
                  disabled={isDeleting}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                >
                  <Trash2 size={16} />
                  <span className="font-bold uppercase tracking-tight">{isDeleting ? 'Deleting...' : 'Delete Post'}</span>
                </button>
              )}
              <button 
                onClick={() => {
                  handleShare();
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-(--text-primary) hover:bg-(--fb-hover) transition-colors"
              >
                <Share2 size={16} />
                <span className="font-bold uppercase tracking-tight">Share Post</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {post.content && (
        <div className="px-4 pb-3">
          <p className="text-(--text-primary) whitespace-pre-wrap break-words text-[15px] leading-relaxed font-medium">{post.content}</p>
        </div>
      )}

      {post.imageUrl && (
        <div className="w-full bg-black/5 border-y border-(--divider)/30 relative overflow-hidden flex items-center justify-center">
          <img 
            src={post.imageUrl} 
            alt="Post content" 
            className="max-w-full max-h-[600px] object-contain relative z-10"
            referrerPolicy="no-referrer"
          />
        </div>
      )}

      {post.videoUrl && (
        <div className="w-full max-h-[600px] overflow-hidden bg-black border-y border-(--divider)/30 relative group">
          <video 
            src={post.videoUrl} 
            controls 
            className="w-full h-full max-h-[600px] object-contain"
            playsInline
          />
          {/* Fullscreen / Phone button */}
          <button
            onClick={(e) => {
              const video = (e.currentTarget.previousElementSibling as HTMLVideoElement);
              if (video) {
                if (video.requestFullscreen) video.requestFullscreen();
                else if ((video as any).webkitEnterFullscreen) (video as any).webkitEnterFullscreen();
              }
            }}
            className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 backdrop-blur-sm text-white rounded-xl px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 border border-white/10"
            title="Watch fullscreen"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
            </svg>
            Fullscreen
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="py-2.5 flex items-center justify-between text-(--text-secondary) text-[13px] border-b border-(--divider)/30 mx-4 font-bold uppercase tracking-tight">
        <div className="flex items-center gap-1.5 min-h-6">
          {post.likes.length > 0 && (
            <>
              <div className="bg-(--brand-primary) p-1 rounded-full flex items-center justify-center shadow-sm shadow-blue-500/20">
                <ThumbsUp size={10} className="text-white" fill="white" />
              </div>
              <span className="hover:underline cursor-pointer">{post.likes.length} Likes</span>
            </>
          )}
        </div>

        <div className="flex gap-3">
          {post.commentCount > 0 && (
            <button onClick={() => setShowComments(true)} className="hover:underline">
              {post.commentCount} {post.commentCount === 1 ? 'comment' : 'comments'}
            </button>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="px-1 py-1 flex items-center justify-around border-t border-(--divider)/30 mx-4">
        <button 
          onClick={handleLike}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all duration-300 ${isLiked ? 'text-(--brand-primary) bg-(--brand-primary)/10' : 'text-(--text-secondary) hover:bg-(--fb-hover)'}`}
        >
          <ThumbsUp size={18} fill={isLiked ? 'currentColor' : 'none'} className={isLiked ? "scale-110" : ""} />
          <span className="font-black text-[14px] uppercase tracking-tight">Like</span>
        </button>

        <button 
          onClick={() => setShowComments(!showComments)}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all duration-300 ${showComments ? 'text-(--brand-primary) bg-(--brand-primary)/10' : 'text-(--text-secondary) hover:bg-(--fb-hover)'}`}
        >
          <MessageSquare size={18} fill={showComments ? 'currentColor' : 'none'} />
          <span className="font-black text-[14px] uppercase tracking-tight">Comment</span>
        </button>
        <button 
          onClick={handleShare}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all duration-300 ${shareStatus !== 'idle' ? 'text-(--brand-primary) bg-(--brand-primary)/10' : 'text-(--text-secondary) hover:bg-(--fb-hover)'}`}
        >
          <Share2 size={18} />
          <span className="font-black text-[14px] uppercase tracking-tight">
            {shareStatus === 'copied' ? 'Copied' : shareStatus === 'shared' ? 'Shared' : 'Share'}
          </span>
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="bg-(--bg-input) p-4 border-t border-(--divider)/30">
          {comments.length > 0 && (
            <div className="space-y-4 mb-4">
              {comments.map(comment => (
                <div key={comment.id} className="flex gap-3">
                  <button onClick={() => onViewProfile && onViewProfile(comment.authorId)} className="shrink-0 mt-1">
                    {comment.authorPhoto ? (
                      <img src={comment.authorPhoto} alt={comment.authorName} className="w-8 h-8 rounded-xl object-cover border border-(--divider)" />
                    ) : (
                      <div className="w-8 h-8 rounded-xl bg-(--brand-primary)/10 flex items-center justify-center text-(--brand-primary) text-[10px] font-black uppercase shadow-sm">
                        {comment.authorName[0]}
                      </div>
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="bg-(--bg-card) rounded-2xl px-3.5 py-2 inline-block max-w-full shadow-sm border border-(--divider)">
                      <button onClick={() => onViewProfile && onViewProfile(comment.authorId)} className="font-black text-[12px] text-(--text-primary) hover:underline block text-left tracking-tight truncate max-w-[140px] sm:max-w-[200px]">
                        {comment.authorName}
                      </button>
                      <p className="text-[14px] text-(--text-primary) leading-snug font-medium break-words">{comment.content}</p>
                    </div>
                    <div className="flex items-center gap-3 mt-1 ml-2 text-[10px] font-bold text-(--text-secondary) uppercase tracking-tighter">
                      <span>{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleAddComment} className="flex gap-3 items-center">
            {currentUser.photoURL ? (
              <img src={currentUser.photoURL} alt={currentUser.displayName} className="w-8 h-8 rounded-xl object-cover border border-(--divider)" />
            ) : (
              <div className="w-8 h-8 rounded-xl bg-(--brand-primary)/10 flex items-center justify-center text-(--brand-primary) text-[10px] font-black uppercase shadow-sm">
                {currentUser.displayName[0]}
              </div>
            )}
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Write a comment..."
                className="w-full bg-(--bg-card) border border-(--divider) rounded-xl px-4 py-2.5 text-[14px] font-medium outline-none focus:ring-2 focus:ring-(--brand-primary)/20 transition-all placeholder:text-(--text-secondary) text-(--text-primary)"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
              />
              <button 
                type="submit"
                disabled={!commentText.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-(--brand-primary) hover:bg-(--brand-primary)/10 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-all"
              >
                <Send size={18} />
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};


