import React, { useState, useEffect } from 'react';
import { userService } from '../services/userService';
import { postService } from '../services/postService';
import { storyService, Story } from '../services/storyService';
import { UserProfile, Post } from '../types';
import { Trash2, ShieldAlert, Users, FileText, ChevronRight, X, Loader2, Image as ImageIcon } from 'lucide-react';

interface AdminDashboardProps {
  onClose: () => void;
  onViewProfile: (userId: string) => void;
}

export function AdminDashboard({ onClose, onViewProfile }: AdminDashboardProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'posts' | 'stories'>('users');


  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const usersList = await userService.searchUsers(''); // Empty search returns all (limited by security/logic)
        setUsers(usersList);
        
        postService.getPosts(setPosts);
        storyService.getAllStories(setStories);
      } catch (error) {
        console.error('Error fetching admin data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleDeletePost = async (postId: string) => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      try {
        await postService.deletePost(postId);
      } catch (error) {
        console.error('Error deleting post:', error);
      }
    }
  };

  const handleDeleteStory = async (storyId: string) => {
    if (window.confirm('Are you sure you want to delete this story?')) {
      try {
        await storyService.deleteStory(storyId);
      } catch (error) {
        console.error('Error deleting story:', error);
      }
    }
  };


  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-100 flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-5xl h-[80vh] rounded-[32px] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-6 bg-linear-to-r from-gray-900 to-gray-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-red-500/20 p-2 rounded-xl">
              <ShieldAlert size={28} className="text-red-500" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">Admin Control Panel</h2>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Confidential / System Overview</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 bg-gray-50/50">
          <button 
            onClick={() => setActiveTab('users')}
            className={`flex-1 py-4 flex items-center justify-center gap-2 font-bold transition-all ${activeTab === 'users' ? 'text-blue-600 bg-white border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Users size={20} /> Users ({users.length})
          </button>
          <button 
            onClick={() => setActiveTab('posts')}
            className={`flex-1 py-4 flex items-center justify-center gap-2 font-bold transition-all ${activeTab === 'posts' ? 'text-blue-600 bg-white border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <FileText size={20} /> Posts ({posts.length})
          </button>
          <button 
            onClick={() => setActiveTab('stories')}
            className={`flex-1 py-4 flex items-center justify-center gap-2 font-bold transition-all ${activeTab === 'stories' ? 'text-blue-600 bg-white border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <ImageIcon size={20} /> Stories ({stories.length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <Loader2 className="animate-spin mb-4" size={48} />
              <p className="font-bold">Accessing Secure Records...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeTab === 'users' && users.map(u => (
                <div key={u.uid} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors border border-gray-100">
                  <div className="flex items-center gap-4">
                    <img src={u.photoURL || 'https://via.placeholder.com/150'} className="w-12 h-12 rounded-xl object-cover" alt="" />
                    <div>
                      <h4 className="font-bold text-gray-900">{u.displayName}</h4>
                      <p className="text-xs text-gray-500">{u.email} • <span className="uppercase font-bold text-blue-600">{u.role}</span></p>
                    </div>
                  </div>
                  <button onClick={() => onViewProfile(u.uid)} className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
                    <ChevronRight size={20} />
                  </button>
                </div>
              ))}

              {activeTab === 'posts' && posts.map(p => (
                <div key={p.id} className="flex items-start justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 group">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center font-bold text-xl">
                      {p.authorName[0]}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900">{p.authorName}</h4>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{p.content}</p>
                      {p.imageUrl && <p className="text-[10px] text-blue-500 mt-1 font-bold">IMAGE ATTACHED</p>}
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDeletePost(p.id)}
                    className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              ))}

              {activeTab === 'stories' && stories.map(s => (
                <div key={s.id} className="flex items-start justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 group">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 relative rounded-xl overflow-hidden bg-black/5">
                      <img src={s.imageUrl} className="w-full h-full object-cover" alt="" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900">{s.userName}</h4>
                      <p className="text-[10px] text-blue-500 mt-1 font-bold uppercase">{s.type || 'image'}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDeleteStory(s.id)}
                    className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
