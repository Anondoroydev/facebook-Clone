import React, { useState, useEffect, useRef } from 'react';
import { ThumbsUp, MessageSquare, Share2, MoreHorizontal, User as UserIcon, Trash2, Globe } from 'lucide-react';
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
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 mb-6 overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <button onClick={handleAuthorClick} className="flex-shrink-0 hover:opacity-90 transition-opacity">
            {post.authorPhoto ? (
              <img src={post.authorPhoto} alt={post.authorName} className="w-10 h-10 rounded-full object-cover border border-gray-100" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-sm">
                {post.authorName[0]}
              </div>
            )}
          </button>
          <div className="text-left flex flex-col">
            <button onClick={handleAuthorClick} className="font-semibold text-gray-900 hover:underline text-[15px]">
              {post.authorName}
            </button>
            <div className="flex items-center gap-1 text-[13px] text-gray-500">
              <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
              <span>•</span>
              <Globe size={12} />
            </div>
          </div>
        </div>
        
        <div className="relative" ref={menuRef}>
          <button 
            onClick={() => setShowMenu(!showMenu)}
            className="text-gray-500 hover:bg-gray-100 p-2 rounded-full transition-colors"
          >
            <MoreHorizontal size={20} />
          </button>
          
          {showMenu && (
            <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-10 animate-in fade-in zoom-in duration-200">
              {post.authorId === currentUser.uid && (
                <button 
                  onClick={() => {
                    handleDelete();
                    setShowMenu(false);
                  }}
                  disabled={isDeleting}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  <Trash2 size={16} />
                  <span className="font-medium">{isDeleting ? 'Deleting...' : 'Delete Post'}</span>
                </button>
              )}
              <button 
                onClick={() => {
                  handleShare();
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Share2 size={16} />
                <span className="font-medium">Share Post</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {(post.content || post.imageUrl || post.videoUrl) && (
        <div className="px-4 pb-3">
          {post.content && <p className="text-gray-900 whitespace-pre-wrap text-[15px] sm:text-[16px] leading-relaxed">{post.content}</p>}
        </div>
      )}

      {post.imageUrl && (
        <div className="w-full max-h-[600px] overflow-hidden bg-gray-100 border-y border-gray-100">
          <img 
            src={post.imageUrl} 
            alt="Post content" 
            className="w-full h-full object-contain"
            referrerPolicy="no-referrer"
          />
        </div>
      )}

      {post.videoUrl && (
        <div className="w-full max-h-[600px] overflow-hidden bg-black border-y border-gray-100">
          <video 
            src={post.videoUrl} 
            controls 
            className="w-full h-full max-h-[600px] object-contain"
          />
        </div>
      )}

      {/* Stats */}
      <div className="px-4 py-2.5 flex items-center justify-between text-gray-500 text-sm">
        <div className="flex items-center gap-1.5">
          {post.likes.length > 0 ? (
            <>
              <div className="bg-blue-500 p-1 rounded-full">
                <ThumbsUp size={12} className="text-white" fill="white" />
              </div>
              <span className="hover:underline cursor-pointer">{post.likes.length}</span>
            </>
          ) : (
            <span></span>
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
      <div className="px-2 py-1 flex items-center justify-around border-t border-gray-100">
        <button 
          onClick={handleLike}
          className={`flex-1 flex items-center justify-center gap-2 py-2 mx-1 rounded-lg transition-colors ${isLiked ? 'text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
        >
          <ThumbsUp size={20} fill={isLiked ? 'currentColor' : 'none'} className={isLiked ? "scale-110 transition-transform" : ""} />
          <span className="font-semibold text-[15px]">Like</span>
        </button>
        <button 
          onClick={() => setShowComments(!showComments)}
          className="flex-1 flex items-center justify-center gap-2 py-2 mx-1 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <MessageSquare size={20} />
          <span className="font-semibold text-[15px]">Comment</span>
        </button>
        <button 
          onClick={handleShare}
          className={`flex-1 flex items-center justify-center gap-2 py-2 mx-1 rounded-lg transition-colors ${shareStatus !== 'idle' ? 'text-green-600' : 'text-gray-600 hover:bg-gray-100'}`}
        >
          <Share2 size={20} />
          <span className="font-semibold text-[15px]">
            {shareStatus === 'copied' ? 'Copied!' : shareStatus === 'shared' ? 'Shared!' : 'Share'}
          </span>
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="bg-gray-50/50 p-4 border-t border-gray-100">
          {comments.length > 0 && (
            <div className="space-y-3 mb-4">
              {comments.map(comment => (
                <div key={comment.id} className="flex gap-2.5">
                  <button onClick={() => onViewProfile && onViewProfile(comment.authorId)} className="flex-shrink-0 mt-1">
                    {comment.authorPhoto ? (
                      <img src={comment.authorPhoto} alt={comment.authorName} className="w-8 h-8 rounded-full object-cover border border-gray-100" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                        {comment.authorName[0]}
                      </div>
                    )}
                  </button>
                  <div className="flex-1">
                    <div className="bg-gray-100 rounded-2xl px-3.5 py-2 inline-block max-w-full">
                      <button onClick={() => onViewProfile && onViewProfile(comment.authorId)} className="font-semibold text-[13px] text-gray-900 hover:underline block text-left">
                        {comment.authorName}
                      </button>
                      <p className="text-[14px] text-gray-800 mt-0.5">{comment.content}</p>
                    </div>
                    <div className="flex items-center gap-3 mt-1 ml-2 text-[11px] text-gray-500 font-medium">
                      <span>{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleAddComment} className="flex gap-2.5 items-start mt-2">
            {currentUser.photoURL ? (
              <img src={currentUser.photoURL} alt={currentUser.displayName} className="w-8 h-8 rounded-full object-cover border border-gray-100" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                {currentUser.displayName[0]}
              </div>
            )}
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Write a comment..."
                className="w-full bg-gray-100 border border-transparent rounded-full pl-4 pr-10 py-2 text-[14px] outline-none focus:bg-white focus:border-blue-300 focus:ring-2 focus:ring-blue-50 transition-all"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
              />
              <button 
                type="submit"
                disabled={!commentText.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-blue-600 hover:bg-blue-50 rounded-full disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
              >
                <Send size={16} />
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

