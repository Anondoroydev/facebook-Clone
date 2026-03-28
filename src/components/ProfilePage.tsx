import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, Post } from '../types';
import { postService } from '../services/postService';
import { userService } from '../services/userService';
import { friendService } from '../services/userService';
import { PostCard } from './PostCard';
import { CreatePost } from './CreatePost';
import {
  Camera, MapPin, Briefcase, GraduationCap, Heart,
  User as UserIcon, List, Settings, Edit2, Plus, Play,
  UserCheck, UserPlus, X, MessageCircle
} from 'lucide-react';
import { FriendRequest } from '../types';
import { compressImage } from '../utils/imageUtils';

interface ProfilePageProps {
  user: UserProfile;
  currentUser: UserProfile;
  onEditProfile: () => void;
  onAddStory: () => void;
  onStartCall: (type: 'audio' | 'video') => void;
  onViewProfile: (userId: string) => void;
  onMessage: (user: UserProfile) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  user, currentUser, onEditProfile, onAddStory, onStartCall, onViewProfile, onMessage
}) => {
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [friendProfiles, setFriendProfiles] = useState<UserProfile[]>([]);
  const [activeTab, setActiveTab] = useState<'posts' | 'about' | 'friends' | 'photos' | 'videos'>('posts');
  const [isUploading, setIsUploading] = useState(false);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const [friendStatus, setFriendStatus] = useState<'none' | 'pending_sent' | 'pending_received' | 'friends'>('none');
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);
  const isOwnProfile = user.uid === currentUser.uid;

  const profileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchFriends = async () => {
      if (user.friends && user.friends.length > 0) {
        const profiles = await Promise.all(user.friends.map(uid => userService.getUser(uid)));
        setFriendProfiles(profiles.filter(p => p !== null) as UserProfile[]);
      } else {
        setFriendProfiles([]);
      }
    };
    fetchFriends();
  }, [user.friends]);

  useEffect(() => {
    const unsubscribe = postService.getPosts((allPosts) => {
      setUserPosts(allPosts.filter(p => p.authorId === user.uid));
    });
    return () => unsubscribe();
  }, [user.uid]);

  useEffect(() => {
    if (isOwnProfile) return;
    if (currentUser.friends?.includes(user.uid)) { setFriendStatus('friends'); return; }

    const unsubSent = friendService.getSentRequests(currentUser.uid, (requests) => {
      const req = requests.find(r => r.receiverId === user.uid);
      if (req) { setFriendStatus('pending_sent'); setPendingRequestId(req.id!); }
      else setFriendStatus(prev => prev === 'pending_sent' ? 'none' : prev);
    });

    const unsubReceived = friendService.getRequests(currentUser.uid, (requests) => {
      const req = requests.find(r => r.senderId === user.uid);
      if (req) { setFriendStatus('pending_received'); setPendingRequestId(req.id!); }
      else setFriendStatus(prev => prev === 'pending_received' ? 'none' : prev);
    });

    return () => { unsubSent(); unsubReceived(); };
  }, [user.uid, currentUser.uid, currentUser.friends, isOwnProfile]);

  const handleAddFriend = async () => {
    try { await friendService.sendRequest(currentUser.uid, currentUser.displayName, user.uid); }
    catch (e) { console.error(e); }
  };

  const handleAcceptRequest = async () => {
    if (!pendingRequestId) return;
    try { await friendService.respondToRequest(pendingRequestId, 'accepted'); }
    catch (e) { console.error(e); }
  };

  const handleDeclineRequest = async () => {
    if (!pendingRequestId) return;
    try { await friendService.respondToRequest(pendingRequestId, 'declined'); }
    catch (e) { console.error(e); }
  };

  const handleProfilePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && isOwnProfile) {
      setIsUploading(true);
      try {
        const url = await compressImage(file, 400, 400, 0.8);
        await userService.updateProfile(user.uid, { photoURL: url });
        await postService.createPost(
          user.uid,
          user.displayName,
          url,
          "Updated their profile picture",
          url
        );
      } catch (err) { console.error(err); }
      finally { setIsUploading(false); }
    }
  };

  const handleCoverPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && isOwnProfile) {
      setIsUploading(true);
      try {
        const url = await compressImage(file, 1200, 400, 0.7);
        await userService.updateProfile(user.uid, { coverPhotoURL: url });
        await postService.createPost(
          user.uid,
          user.displayName,
          user.photoURL,
          "Updated their cover photo",
          url
        );
      } catch (err) { console.error(err); }
      finally { setIsUploading(false); }
    }
  };

  const tabs = ['posts', 'about', 'friends', 'photos', 'videos'] as const;

  return (
    <div className="max-w-[1280px] mx-auto bg-(--bg-main) min-h-screen pb-24 md:pb-12">

      {/* ── Cover + Profile Header Card ── */}
      <div className="glass-card shadow-xl rounded-none md:rounded-b-[32px] overflow-hidden border-b border-(--glass-border) mb-3 md:mb-6">

        {/* Cover photo */}
        <div
          className={`relative h-44 sm:h-64 md:h-[380px] bg-(--brand-gradient) overflow-hidden group ${isOwnProfile ? 'cursor-pointer' : ''}`}
          onClick={() => isOwnProfile && coverInputRef.current?.click()}
        >
          {user.coverPhotoURL ? (
            <img 
              src={user.coverPhotoURL} 
              alt="Cover" 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
              onClick={(e) => { 
                if (!isOwnProfile) {
                  e.stopPropagation(); 
                  setFullScreenImage(user.coverPhotoURL!); 
                }
              }}
            />
          ) : (
            <div className="w-full h-full bg-linear-to-r from-[#1877F2]/20 to-[#1877F2]/40 flex flex-col items-center justify-center gap-2">
              <Camera size={40} className="text-(--brand-primary)/40" />
              <p className="text-(--text-secondary) font-semibold text-sm">Add a cover photo</p>
            </div>
          )}

          {/* Hover overlay */}
          {isOwnProfile && (
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-md p-3 rounded-full text-white shadow-xl scale-90 group-hover:scale-100 duration-300">
                <Camera size={28} />
              </div>
            </div>
          )}

          {/* Upload spinner */}
          {isUploading && (
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-20">
              <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Cover edit button (desktop only) */}
          {isOwnProfile && (
            <div className="absolute bottom-3 right-3 hidden sm:flex gap-2 z-10">
              <button
                onClick={(e) => { e.stopPropagation(); coverInputRef.current?.click(); }}
                className="bg-white/90 backdrop-blur-md px-3 py-2 rounded-xl shadow-lg flex items-center gap-2 text-sm font-bold hover:bg-white transition-all text-[#050505]"
              >
                <Camera size={16} /> {user.coverPhotoURL ? 'Edit Cover' : 'Add Cover'}
              </button>
            </div>
          )}
          <input type="file" ref={coverInputRef} onChange={handleCoverPhotoChange} accept="image/*" className="hidden" />
        </div>

        {/* Profile info below cover */}
        <div className="px-3 sm:px-6 md:px-10 pb-0">

          {/* Avatar + Name row */}
          <div className="flex flex-col sm:flex-row sm:items-end gap-3 -mt-12 sm:-mt-16 md:-mt-20 relative z-10">

            {/* Avatar */}
            <div className="relative self-center sm:self-auto shrink-0">
              <div className="w-28 h-28 sm:w-36 sm:h-36 md:w-44 md:h-44 rounded-full border-4 border-(--bg-sidebar) bg-(--bg-card) shadow-2xl overflow-hidden">
                {user.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt={user.displayName} 
                    className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity" 
                    onClick={() => setFullScreenImage(user.photoURL!)}
                  />
                ) : (
                  <div className="w-full h-full bg-(--fb-hover) flex items-center justify-center text-(--fb-text-secondary)">
                    <UserIcon size={64} />
                  </div>
                )}
                {isUploading && (
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              {isOwnProfile && (
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); profileInputRef.current?.click(); }}
                  className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 bg-[#E4E6EB] p-2 rounded-full hover:bg-[#D8DADF] transition-colors border-2 border-white shadow z-20"
                  title="Update profile picture"
                >
                  <Camera size={16} className="text-[#050505]" />
                </button>
              )}
              <input type="file" ref={profileInputRef} onChange={handleProfilePhotoChange} accept="image/*" className="hidden" />
            </div>

            {/* Name + friends count */}
            <div className="flex-1 min-w-0 text-center sm:text-left pb-2 sm:pb-3 md:pb-4">
              <h1 className="text-xl sm:text-2xl md:text-[30px] font-black text-(--fb-text-primary) tracking-tight leading-tight truncate">
                {user.displayName}
              </h1>
              <p className="text-(--fb-text-secondary) font-bold text-sm sm:text-base hover:underline cursor-pointer mt-0.5">
                {(user.friends || []).length} friends
              </p>
              {/* Mutual friend avatars */}
              <div className="flex -space-x-1.5 mt-2 justify-center sm:justify-start">
                {[1, 2, 3, 4, 5].map(i => (
                  <img key={i} src={`https://picsum.photos/seed/friend${i}/100/100`} className="w-7 h-7 rounded-full border-2 border-white object-cover" alt="Friend" />
                ))}
              </div>
            </div>

            {/* Action buttons — pinned to bottom-right on sm+ */}
            <div className="flex flex-wrap justify-center sm:justify-end gap-2 pb-3 shrink-0">
              {isOwnProfile ? (
                <>
                  <button
                    onClick={onAddStory}
                    className="bg-[#1877F2] text-white px-3 py-2 rounded-lg font-semibold hover:bg-[#166FE5] transition-colors flex items-center gap-1.5 text-sm"
                  >
                    <Plus size={16} /> Add Story
                  </button>
                  <button
                    onClick={onEditProfile}
                    className="bg-[#E4E6EB] text-[#050505] px-3 py-2 rounded-lg font-semibold hover:bg-[#D8DADF] transition-colors flex items-center gap-1.5 text-sm"
                  >
                    <Edit2 size={16} /> Edit
                  </button>
                </>
              ) : (
                <>
                  {friendStatus === 'none' && (
                    <button onClick={handleAddFriend} className="bg-[#1877F2] text-white px-4 py-2 rounded-lg font-semibold hover:bg-[#166FE5] transition-colors flex items-center gap-2 text-sm">
                      <UserPlus size={16} /> Add Friend
                    </button>
                  )}
                  {friendStatus === 'pending_sent' && (
                    <button className="bg-[#E4E6EB] text-[#050505] px-4 py-2 rounded-lg font-semibold cursor-default flex items-center gap-2 text-sm">
                      <UserCheck size={16} /> Requested
                    </button>
                  )}
                  {friendStatus === 'pending_received' && (
                    <div className="flex gap-2">
                      <button onClick={handleAcceptRequest} className="bg-[#1877F2] text-white px-3 py-2 rounded-lg font-semibold hover:bg-[#166FE5] transition-colors text-sm">Confirm</button>
                      <button onClick={handleDeclineRequest} className="bg-[#E4E6EB] text-[#050505] px-3 py-2 rounded-lg font-semibold hover:bg-[#D8DADF] transition-colors text-sm">Delete</button>
                    </div>
                  )}
                  {friendStatus === 'friends' && (
                    <div className="flex gap-2">
                      <button className="bg-[#E4E6EB] text-[#050505] px-3 py-2 rounded-lg font-semibold hover:bg-[#D8DADF] transition-colors flex items-center gap-1.5 text-sm">
                        <UserCheck size={16} /> Friends
                      </button>
                      <button onClick={() => onMessage(user)} className="bg-[#1877F2] text-white px-3 py-2 rounded-lg font-semibold hover:bg-[#166FE5] transition-colors flex items-center gap-1.5 text-sm">
                        <MessageCircle size={16} /> Message
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-(--fb-divider) mt-1 mx-1" />

          {/* Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-1 -mx-1 px-1">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 sm:px-5 py-2.5 text-[13px] sm:text-[15px] font-bold transition-all relative whitespace-nowrap rounded-xl ${
                  activeTab === tab
                    ? 'bg-(--brand-primary)/10 text-(--brand-primary)'
                    : 'text-(--text-secondary) hover:bg-(--fb-hover)'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {activeTab === tab && (
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-(--brand-primary) rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Profile Content ── */}
      <div className="px-2 sm:px-4 md:px-6">
        {activeTab === 'posts' && (
          /* Two-column on lg, single column stacked on mobile */
          <div className="flex flex-col lg:flex-row gap-4">

            {/* Left sidebar — Intro & Photos mini-grid */}
            <div className="lg:w-[360px] shrink-0 space-y-4">
              {/* Intro card */}
              <div className="glass-card p-5 shadow-lg animate-fade-in">
                <h3 className="text-lg font-black text-(--text-primary) mb-4">Intro</h3>
                {user.bio && <p className="text-center text-(--fb-text-primary) mb-4 text-sm">{user.bio}</p>}
                {isOwnProfile && !user.bio && (
                  <button className="w-full bg-(--fb-hover) hover:bg-(--fb-hover)/80 py-2 rounded-lg font-semibold text-(--fb-text-primary) transition-colors mb-4 text-sm">
                    Add Bio
                  </button>
                )}
                <div className="space-y-3">
                  {[
                    [Briefcase, 'Works at', 'Self-Employed'],
                    [GraduationCap, 'Studied at', 'University of Life'],
                    [MapPin, 'From', 'Dhaka, Bangladesh'],
                    [Heart, 'Status', 'Single'],
                  ].map(([Icon, label, value], i) => (
                    <div key={i} className="flex items-center gap-3 text-(--fb-text-primary) text-sm">
                      {React.createElement(Icon as any, { className: 'text-(--fb-text-secondary) shrink-0', size: 18 })}
                      <span>{label} <strong>{value}</strong></span>
                    </div>
                  ))}
                </div>
                {isOwnProfile && (
                  <button onClick={onEditProfile} className="w-full bg-gray-100 hover:bg-gray-200 py-2 rounded-lg font-semibold text-gray-700 transition-colors mt-4 text-sm">
                    Edit Details
                  </button>
                )}
              </div>

              {/* Photos mini-card */}
              <div className="bg-(--fb-card) rounded-xl shadow-sm border border-(--fb-divider)/30 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold text-(--fb-text-primary)">Photos</h3>
                  <button onClick={() => setActiveTab('photos')} className="text-(--fb-blue) hover:bg-(--fb-blue)/10 px-2 py-1 rounded-lg text-xs font-semibold">See all</button>
                </div>
                <div className="grid grid-cols-3 gap-1 rounded-lg overflow-hidden">
                  {userPosts.filter(p => p.imageUrl).slice(0, 9).map((post) => (
                    <img key={post.id} src={post.imageUrl} className="aspect-square object-cover hover:opacity-90 cursor-pointer transition-opacity" alt="Photo" />
                  ))}
                  {userPosts.filter(p => p.imageUrl).length === 0 && [1, 2, 3, 4, 5, 6].map(i => (
                    <img key={i} src={`https://picsum.photos/seed/photo${i}/300/300`} className="aspect-square object-cover" alt="Placeholder" />
                  ))}
                </div>
              </div>
            </div>

            {/* Right / Main posts column */}
            <div className="flex-1 min-w-0 space-y-4">
              {isOwnProfile && <CreatePost user={user} />}

              <div className="bg-(--fb-card) rounded-lg shadow-sm p-3 sm:p-4 flex items-center justify-between border border-(--fb-divider)/30">
                <h3 className="text-lg font-bold text-(--fb-text-primary)">Posts</h3>
                <div className="flex gap-2">
                  <button className="bg-(--fb-hover) px-3 py-1.5 rounded-md text-(--fb-text-primary) hover:bg-(--fb-hover)/80 transition-colors flex items-center gap-1 text-sm font-semibold">
                    <List size={16} /> Filters
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {userPosts.length > 0 ? (
                  userPosts.map(post => (
                    <PostCard key={post.id} post={post} currentUser={currentUser} onViewProfile={onViewProfile} />
                  ))
                ) : (
                  <div className="bg-(--fb-card) rounded-xl shadow-sm border border-(--fb-divider)/30 p-10 text-center text-(--fb-text-secondary) italic text-sm">
                    No posts yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* About tab */}
        {activeTab === 'about' && (
          <div className="max-w-2xl mx-auto glass-card p-5 sm:p-8 shadow-lg space-y-4">
            <h3 className="text-xl font-black text-(--text-primary)">About</h3>
            {user.bio && <p className="text-(--fb-text-primary)">{user.bio}</p>}
            <div className="space-y-3">
              {[
                [Briefcase, 'Works at Self-Employed'],
                [GraduationCap, 'Studied at University of Life'],
                [MapPin, 'From Dhaka, Bangladesh'],
                [Heart, 'Single'],
              ].map(([Icon, text], i) => (
                <div key={i} className="flex items-center gap-3 text-(--fb-text-primary)">
                  {React.createElement(Icon as any, { className: 'text-(--fb-text-secondary) shrink-0', size: 20 })}
                  <span>{text as string}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Friends tab */}
        {activeTab === 'friends' && (
          <div className="bg-(--fb-card) rounded-xl shadow-sm border border-(--fb-divider)/30 p-4">
            <h3 className="text-xl font-bold text-(--fb-text-primary) mb-4">Friends ({friendProfiles.length})</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {friendProfiles.map(friend => (
                <div key={friend.uid} onClick={() => onViewProfile(friend.uid)}
                  className="flex flex-col items-center p-3 border border-(--fb-divider)/30 rounded-xl hover:bg-(--fb-hover) cursor-pointer transition-colors text-center"
                >
                  {friend.photoURL ? (
                    <img src={friend.photoURL} className="w-full aspect-square rounded-xl object-cover mb-2" alt={friend.displayName} />
                  ) : (
                    <div className="w-full aspect-square rounded-xl bg-(--fb-hover) flex items-center justify-center text-(--fb-blue) mb-2">
                      <UserIcon size={32} />
                    </div>
                  )}
                  <h4 className="font-bold text-(--fb-text-primary) text-sm truncate w-full">{friend.displayName}</h4>
                  <p className="text-xs text-(--fb-text-secondary)">Friend</p>
                </div>
              ))}
              {friendProfiles.length === 0 && (
                <div className="col-span-full py-12 text-center text-gray-500 italic">No friends to show.</div>
              )}
            </div>
          </div>
        )}

        {/* Photos tab */}
        {activeTab === 'photos' && (
          <div className="bg-(--fb-card) rounded-xl shadow-sm border border-(--fb-divider)/30 p-4">
            <h3 className="text-xl font-bold text-(--fb-text-primary) mb-4">Photos</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {userPosts.filter(p => p.imageUrl).map(post => (
                <img key={post.id} src={post.imageUrl} className="aspect-square object-cover rounded-lg hover:opacity-90 cursor-pointer transition-opacity" alt="Photo" />
              ))}
              {userPosts.filter(p => p.imageUrl).length === 0 && (
                <div className="col-span-full py-12 text-center text-(--fb-text-secondary) italic">No photos yet.</div>
              )}
            </div>
          </div>
        )}

        {/* Videos tab */}
        {activeTab === 'videos' && (
          <div className="bg-(--fb-card) rounded-xl shadow-sm border border-(--fb-divider)/30 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-(--fb-text-primary)">Videos</h3>
              {isOwnProfile && (
                <button onClick={onAddStory} className="text-(--fb-blue) hover:bg-(--fb-blue)/10 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1.5">
                  <Plus size={14} /> Add Story
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {userPosts.filter(p => p.videoUrl).map(post => (
                <div key={post.id} className="relative aspect-video bg-black rounded-xl overflow-hidden group shadow-sm">
                  <video src={post.videoUrl} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors cursor-pointer">
                    <Play className="text-white drop-shadow-lg" size={44} fill="white" />
                  </div>
                  {post.content && (
                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-linear-to-t from-black/80 to-transparent">
                      <p className="text-white text-sm line-clamp-1">{post.content}</p>
                    </div>
                  )}
                </div>
              ))}
              {userPosts.filter(p => p.videoUrl).length === 0 && (
                <div className="col-span-full py-16 text-center">
                  <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-400">
                    <Play size={28} />
                  </div>
                  <p className="text-gray-500 font-medium text-sm">No videos yet.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Full Screen Image Modal */}
      {fullScreenImage && (
        <div 
          className="fixed inset-0 bg-black/90 z-100 flex items-center justify-center backdrop-blur-sm animate-in fade-in"
          onClick={() => setFullScreenImage(null)}
        >
          <button 
            className="absolute top-4 right-4 text-white hover:bg-white/20 p-2 rounded-full transition-colors"
            onClick={(e) => { e.stopPropagation(); setFullScreenImage(null); }}
          >
            <X size={28} />
          </button>
          <img 
            src={fullScreenImage} 
            alt="Full screen" 
            className="w-full h-full object-contain p-4 md:p-8 scale-in-center drop-shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

    </div>
  );
};
