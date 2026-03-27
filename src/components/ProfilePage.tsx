import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, Post } from '../types';
import { postService } from '../services/postService';
import { userService } from '../services/userService';
import { friendService } from '../services/userService';
import { PostCard } from './PostCard';
import { CreatePost } from './CreatePost';
import { Camera, MapPin, Briefcase, GraduationCap, Heart, MoreHorizontal, User as UserIcon, Grid, List, Settings, Edit2, Plus, Play, Phone, Video, UserCheck, UserPlus, X, MessageCircle } from 'lucide-react';
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

export const ProfilePage: React.FC<ProfilePageProps> = ({ user, currentUser, onEditProfile, onAddStory, onStartCall, onViewProfile, onMessage }) => {
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [friendProfiles, setFriendProfiles] = useState<UserProfile[]>([]);
  const [activeTab, setActiveTab] = useState<'posts' | 'about' | 'friends' | 'photos' | 'videos'>('posts');
  const [isUploading, setIsUploading] = useState(false);
  const [friendStatus, setFriendStatus] = useState<'none' | 'pending_sent' | 'pending_received' | 'friends'>('none');
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);
  const isOwnProfile = user.uid === currentUser.uid;

  const profileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchFriends = async () => {
      if (user.friends && user.friends.length > 0) {
        const profiles = await Promise.all(
          user.friends.map(uid => userService.getUser(uid))
        );
        setFriendProfiles(profiles.filter(p => p !== null) as UserProfile[]);
      } else {
        setFriendProfiles([]);
      }
    };
    fetchFriends();
  }, [user.friends]);

  useEffect(() => {
    const unsubscribe = postService.getPosts((allPosts) => {
      const filtered = allPosts.filter(p => p.authorId === user.uid);
      setUserPosts(filtered);
    });
    return () => unsubscribe();
  }, [user.uid]);

  useEffect(() => {
    if (isOwnProfile) return;

    // Check if friends
    if (currentUser.friends?.includes(user.uid)) {
      setFriendStatus('friends');
      return;
    }

    // Check for pending requests
    const unsubSent = friendService.getSentRequests(currentUser.uid, (requests) => {
      const req = requests.find(r => r.receiverId === user.uid);
      if (req) {
        setFriendStatus('pending_sent');
        setPendingRequestId(req.id!);
      } else {
        // Only reset if it was previously pending_sent
        setFriendStatus(prev => prev === 'pending_sent' ? 'none' : prev);
      }
    });

    const unsubReceived = friendService.getRequests(currentUser.uid, (requests) => {
      const req = requests.find(r => r.senderId === user.uid);
      if (req) {
        setFriendStatus('pending_received');
        setPendingRequestId(req.id!);
      } else {
        // Only reset if it was previously pending_received
        setFriendStatus(prev => prev === 'pending_received' ? 'none' : prev);
      }
    });

    return () => {
      unsubSent();
      unsubReceived();
    };
  }, [user.uid, currentUser.uid, currentUser.friends, isOwnProfile]);

  const handleAddFriend = async () => {
    try {
      await friendService.sendRequest(currentUser.uid, currentUser.displayName, user.uid);
    } catch (error) {
      console.error('Error sending friend request:', error);
    }
  };

  const handleAcceptRequest = async () => {
    if (!pendingRequestId) return;
    try {
      await friendService.respondToRequest(pendingRequestId, 'accepted');
    } catch (error) {
      console.error('Error accepting friend request:', error);
    }
  };

  const handleDeclineRequest = async () => {
    if (!pendingRequestId) return;
    try {
      await friendService.respondToRequest(pendingRequestId, 'declined');
    } catch (error) {
      console.error('Error declining friend request:', error);
    }
  };

  const handleProfilePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && isOwnProfile) {
      setIsUploading(true);
      try {
        const compressedDataUrl = await compressImage(file, 400, 400, 0.8);
        await userService.updateProfile(user.uid, { photoURL: compressedDataUrl });
      } catch (error) {
        console.error('Error updating profile photo:', error);
        alert('Failed to update profile photo.');
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleCoverPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && isOwnProfile) {
      setIsUploading(true);
      try {
        const compressedDataUrl = await compressImage(file, 1200, 400, 0.7);
        await userService.updateProfile(user.uid, { coverPhotoURL: compressedDataUrl });
      } catch (error) {
        console.error('Error updating cover photo:', error);
        alert('Failed to update cover photo.');
      } finally {
        setIsUploading(false);
      }
    }
  };

  return (
    <div className="max-w-[1280px] mx-auto bg-(--bg-main) min-h-screen transition-colors duration-500 pb-20">
      {/* Cover Photo & Header Section */}
      <div className="glass-card shadow-2xl shadow-black/5 rounded-b-[40px] overflow-hidden border-b border-(--glass-border) mb-8">

        <div className="max-w-[1280px] mx-auto px-0 md:px-0">
          <div className="h-[250px] md:h-[450px] bg-(--brand-gradient) relative group overflow-hidden">


          {user.coverPhotoURL ? (
            <img 
              src={user.coverPhotoURL} 
              alt="Cover" 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-linear-to-r from-[#1877F2]/20 to-[#1877F2]/40" />

          )}
          
          {isOwnProfile && (
            <div className="absolute bottom-4 right-4 flex gap-2">
              <button 
                onClick={() => coverInputRef.current?.click()}
                className="bg-white px-3 py-2 rounded-lg shadow-md flex items-center gap-2 text-[15px] font-semibold hover:bg-[#F2F2F2] transition-colors text-[#050505]"
              >
                <Camera size={18} /> {user.coverPhotoURL ? 'Edit cover photo' : 'Add cover photo'}
              </button>
              <input 
                type="file" 
                ref={coverInputRef} 
                onChange={handleCoverPhotoChange} 
                accept="image/*" 
                className="hidden" 
              />
            </div>
          )}
        </div>
      </div>


        {/* Profile Info Header */}
        <div className="max-w-[1200px] mx-auto px-6 md:px-12 pb-8">
          <div className="flex flex-col md:flex-row items-center md:items-end gap-6 -mt-16 md:-mt-24 relative z-10">
            <div className="relative group/profile shrink-0">
              <div className="w-[180px] h-[180px] rounded-full border-[6px] border-(--bg-sidebar) bg-(--bg-card) shadow-2xl overflow-hidden flex items-center justify-center backdrop-blur-xl">

                {user.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt={user.displayName} 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <div className="w-full h-full bg-(--fb-hover) flex items-center justify-center text-(--fb-text-secondary)">
                    <UserIcon size={80} />
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
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    profileInputRef.current?.click();
                  }}
                  className="absolute bottom-3 right-3 bg-[#E4E6EB] p-2.5 rounded-full hover:bg-[#D8DADF] transition-colors border-2 border-white shadow-sm z-20 cursor-pointer"
                  title="Update profile picture"
                >
                  <Camera size={20} className="text-[#050505]" />
                </button>
              )}
              <input 
                type="file" 
                ref={profileInputRef} 
                onChange={handleProfilePhotoChange} 
                accept="image/*" 
                className="hidden" 
              />
            </div>
            
            <div className="text-center md:text-left flex-1 pb-4">
              <div className="flex flex-col md:flex-row md:items-baseline gap-2 md:gap-4 mb-1">
                <h1 className="text-[32px] font-black text-(--fb-text-primary) tracking-tight leading-tight">{user.displayName}</h1>
                <p className="text-(--fb-text-secondary) font-bold text-[17px] hover:underline cursor-pointer">
                  {(user.friends || []).length} friends
                </p>
              </div>

              <div className="flex -space-x-1.5 mt-2 justify-center md:justify-start">

                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                  <img 
                    key={i} 
                    src={`https://picsum.photos/seed/friend${i}/100/100`} 
                    className="w-8 h-8 rounded-full border-2 border-white object-cover" 
                    alt="Friend"
                  />
                ))}
              </div>
            </div>
            
            <div className="flex gap-2 pb-5">
              {isOwnProfile ? (
                <>
                  <button 
                    onClick={onAddStory}
                    className="bg-[#1877F2] text-white px-3 py-2 rounded-md font-semibold hover:bg-[#166FE5] transition-colors flex items-center gap-2"
                  >
                    <Plus size={20} /> Add to story
                  </button>
                  <button 
                    onClick={onEditProfile}
                    className="bg-[#E4E6EB] text-[#050505] px-3 py-2 rounded-md font-semibold hover:bg-[#D8DADF] transition-colors flex items-center gap-2"
                  >
                    <Edit2 size={18} /> Edit profile
                  </button>
                  <button className="bg-[#E4E6EB] text-[#050505] p-2 rounded-md font-bold hover:bg-[#D8DADF] transition-colors">
                    <Settings size={20} strokeWidth={2.5} />
                  </button>
                </>
              ) : (
                <>
                  {friendStatus === 'none' && (
                    <button 
                      onClick={handleAddFriend}
                      className="bg-[#1877F2] text-white px-4 py-2 rounded-md font-semibold hover:bg-[#166FE5] transition-colors flex items-center gap-2"
                    >
                      <UserPlus size={20} /> Add Friend
                    </button>
                  )}
                  {friendStatus === 'pending_sent' && (
                    <button className="bg-[#E4E6EB] text-[#050505] px-4 py-2 rounded-md font-semibold cursor-default flex items-center gap-2">
                      <UserCheck size={20} /> Request Sent
                    </button>
                  )}
                  {friendStatus === 'pending_received' && (
                    <div className="flex gap-2">
                      <button 
                        onClick={handleAcceptRequest}
                        className="bg-[#1877F2] text-white px-4 py-2 rounded-md font-semibold hover:bg-[#166FE5] transition-colors"
                      >
                        Confirm
                      </button>
                      <button 
                        onClick={handleDeclineRequest}
                        className="bg-[#E4E6EB] text-[#050505] px-4 py-2 rounded-md font-semibold hover:bg-[#D8DADF] transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                  {friendStatus === 'friends' && (
                    <div className="flex gap-2">
                      <button className="bg-[#E4E6EB] text-[#050505] px-4 py-2 rounded-md font-semibold hover:bg-[#D8DADF] transition-colors flex items-center gap-2">
                        <UserCheck size={20} /> Friends
                      </button>
                      <button 
                        onClick={() => onMessage(user)}
                        className="bg-[#1877F2] text-white px-4 py-2 rounded-md font-semibold hover:bg-[#166FE5] transition-colors flex items-center gap-2"
                      >
                        <MessageCircle size={20} /> Message
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>


          <div className="h-px bg-(--fb-divider) mx-4 md:mx-8" />
          
          {/* Tabs */}
          <div className="max-w-[1200px] mx-auto px-6 md:px-12">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-2">
              {['posts', 'about', 'friends', 'photos', 'videos', 'more'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => tab !== 'more' && setActiveTab(tab as any)}
                  className={`px-6 py-3 text-[15px] font-bold transition-all duration-300 relative whitespace-nowrap rounded-xl ${
                    activeTab === tab ? 'bg-(--brand-primary)/10 text-(--brand-primary)' : 'text-(--text-secondary) hover:bg-(--fb-hover)'
                  }`}
                >
                  {tab === 'more' ? 'More \u25BE' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                  {activeTab === tab && (
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-(--brand-primary) rounded-full shadow-lg shadow-blue-500/20" />
                  )}
                </button>
              ))}
            </div>
          </div>


        </div>
      </div>


      {/* Profile Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-4">
        {/* Left Column - Intro & Info */}
        <div className="lg:col-span-5 space-y-4">
          {activeTab === 'posts' && (
            <>
              <div className="glass-card p-6 shadow-xl shadow-black/5 animate-fade-in">
                <h3 className="text-xl font-black text-(--text-primary) mb-6 tracking-tight">Intro</h3>

                {user.bio && <p className="text-center text-(--fb-text-primary) mb-4">{user.bio}</p>}
                {isOwnProfile && !user.bio && (
                  <button className="w-full bg-(--fb-hover) hover:bg-(--fb-hover)/80 py-2 rounded-lg font-semibold text-(--fb-text-primary) transition-colors mb-4">
                    Add Bio
                  </button>
                )}
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-(--fb-text-primary)">
                    <Briefcase className="text-(--fb-text-secondary)" size={20} />
                    <span>Works at <strong>Self-Employed</strong></span>
                  </div>
                  <div className="flex items-center gap-3 text-(--fb-text-primary)">
                    <GraduationCap className="text-(--fb-text-secondary)" size={20} />
                    <span>Studied at <strong>University of Life</strong></span>
                  </div>
                  <div className="flex items-center gap-3 text-(--fb-text-primary)">
                    <MapPin className="text-(--fb-text-secondary)" size={20} />
                    <span>From <strong>Dhaka, Bangladesh</strong></span>
                  </div>
                  <div className="flex items-center gap-3 text-(--fb-text-primary)">
                    <Heart className="text-(--fb-text-secondary)" size={20} />
                    <span>Single</span>
                  </div>
                </div>

                {isOwnProfile && (
                  <button 
                    onClick={onEditProfile}
                    className="w-full bg-gray-100 hover:bg-gray-200 py-2 rounded-lg font-semibold text-gray-700 transition-colors mt-4"
                  >
                    Edit Details
                  </button>
                )}
              </div>

              <div className="bg-(--fb-card) rounded-xl shadow-sm border border-(--fb-divider)/30 p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-(--fb-text-primary)">Photos</h3>
                  <button onClick={() => setActiveTab('photos')} className="text-(--fb-blue) hover:bg-(--fb-blue)/10 px-2 py-1 rounded-lg text-sm font-semibold">See all photos</button>
                </div>
                <div className="grid grid-cols-3 gap-2 rounded-xl overflow-hidden">

                  {userPosts.filter(p => p.imageUrl).slice(0, 9).map((post, i) => (
                    <img 
                      key={post.id} 
                      src={post.imageUrl} 
                      className="aspect-square object-cover hover:opacity-90 cursor-pointer transition-opacity" 
                      alt="User Photo"
                    />
                  ))}
                  {userPosts.filter(p => p.imageUrl).length === 0 && [1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => (
                    <img 
                      key={i} 
                      src={`https://picsum.photos/seed/photo${i}/300/300`} 
                      className="aspect-square object-cover hover:opacity-90 cursor-pointer transition-opacity" 
                      alt="Placeholder"
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right Column - Content based on tab */}
        <div className="lg:col-span-7 space-y-4">
          {activeTab === 'posts' && (
            <>
              {isOwnProfile && <CreatePost user={user} />}
              
              <div className="bg-(--fb-card) rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.1)] p-4 flex items-center justify-between border border-(--fb-divider)/30">
                <h3 className="text-xl font-bold text-(--fb-text-primary)">Posts</h3>
                <div className="flex gap-2">
                  <button className="bg-(--fb-hover) p-2 rounded-md text-(--fb-text-primary) hover:bg-(--fb-hover)/80 transition-colors flex items-center gap-2 text-[15px] font-semibold">
                    <List size={18} /> Filters
                  </button>
                  <button className="bg-(--fb-hover) p-2 rounded-md text-(--fb-text-primary) hover:bg-(--fb-hover)/80 transition-colors flex items-center gap-2 text-[15px] font-semibold">
                    <Settings size={18} /> Manage posts
                  </button>
                </div>
              </div>



              <div className="space-y-4">
                {userPosts.length > 0 ? (
                  userPosts.map(post => (
                    <PostCard 
                      key={post.id} 
                      post={post} 
                      currentUser={currentUser} 
                      onViewProfile={onViewProfile}
                    />
                  ))
                ) : (
                  <div className="bg-(--fb-card) rounded-xl shadow-sm border border-(--fb-divider)/30 p-12 text-center text-(--fb-text-secondary) italic">
                    No posts yet.
                  </div>

                )}
              </div>
            </>
          )}

          {activeTab === 'videos' && (
            <div className="bg-(--fb-card) rounded-xl shadow-sm border border-(--fb-divider)/30 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-(--fb-text-primary)">Videos</h3>
                {isOwnProfile && (
                  <button 
                    onClick={onAddStory}
                    className="text-(--fb-blue) hover:bg-(--fb-blue)/10 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1.5"
                  >
                    <Plus size={16} /> Add to Story
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {userPosts.filter(p => p.videoUrl).map(post => (
                  <div key={post.id} className="relative aspect-video bg-black rounded-xl overflow-hidden group shadow-sm">
                    <video src={post.videoUrl} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors cursor-pointer">
                      <Play className="text-white drop-shadow-lg" size={48} fill="white" />
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
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                      <Play size={32} />
                    </div>
                    <p className="text-gray-500 font-medium">No videos uploaded yet.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'photos' && (
            <div className="bg-(--fb-card) rounded-xl shadow-sm border border-(--fb-divider)/30 p-4">
              <h3 className="text-xl font-bold text-(--fb-text-primary) mb-4">Photos</h3>
              <div className="grid grid-cols-3 gap-2">
                {userPosts.filter(p => p.imageUrl).map(post => (
                  <img 
                    key={post.id} 
                    src={post.imageUrl} 
                    className="aspect-square object-cover rounded-lg hover:opacity-90 cursor-pointer transition-opacity" 
                    alt="User Photo"
                  />
                ))}
                {userPosts.filter(p => p.imageUrl).length === 0 && (
                  <div className="col-span-3 py-12 text-center text-(--fb-text-secondary) italic">
                    No photos uploaded yet.
                  </div>
                )}
              </div>
            </div>
          )}


          {activeTab === 'friends' && (
            <div className="bg-(--fb-card) rounded-xl shadow-sm border border-(--fb-divider)/30 p-4">
              <h3 className="text-xl font-bold text-(--fb-text-primary) mb-4">Friends</h3>
              <div className="grid grid-cols-2 gap-4">

                {friendProfiles.map((friend) => (
                  <div 
                    key={friend.uid} 
                    onClick={() => onViewProfile(friend.uid)}
                    className="flex items-center gap-3 p-3 border border-(--fb-divider)/30 rounded-xl hover:bg-(--fb-hover) cursor-pointer transition-colors"
                  >
                    {friend.photoURL ? (
                      <img src={friend.photoURL} className="w-16 h-16 rounded-lg object-cover" alt={friend.displayName} />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-(--fb-hover) flex items-center justify-center text-(--fb-blue)">
                        <UserIcon size={32} />
                      </div>
                    )}
                    <div>
                      <h4 className="font-bold text-(--fb-text-primary)">{friend.displayName}</h4>
                      <p className="text-sm text-(--fb-text-secondary)">Friend</p>
                    </div>
                  </div>

                ))}
                {friendProfiles.length === 0 && (
                  <div className="col-span-2 py-12 text-center text-gray-500 italic">
                    No friends to show.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
