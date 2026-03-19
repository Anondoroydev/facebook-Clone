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
    <div className="max-w-5xl mx-auto">
      {/* Cover Photo Section */}
      <div className="bg-white rounded-b-xl shadow-sm overflow-hidden border border-gray-200">
        <div className="h-48 md:h-80 bg-gray-200 relative group">
          {user.coverPhotoURL ? (
            <img 
              src={user.coverPhotoURL} 
              alt="Cover" 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-blue-400 to-blue-600" />
          )}
          
          {isOwnProfile && (
            <div className="absolute bottom-4 right-4 flex gap-2">
              <button 
                onClick={() => coverInputRef.current?.click()}
                className="bg-white px-3 py-2 rounded-lg shadow-md flex items-center gap-2 text-sm font-semibold hover:bg-gray-50 transition-colors"
              >
                <Camera size={18} /> {user.coverPhotoURL ? 'Edit Cover Photo' : 'Add Cover Photo'}
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

        {/* Profile Info Header */}
        <div className="px-4 md:px-8 pb-4">
          <div className="relative flex flex-col md:flex-row items-center md:items-end gap-4 -mt-12 md:-mt-16 mb-4">
            <div className="relative group/profile">
              <div className="w-32 h-32 md:w-42 md:h-42 rounded-full border-4 border-white bg-white shadow-lg overflow-hidden flex items-center justify-center">
                {user.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt={user.displayName} 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <div className="w-full h-full bg-blue-100 flex items-center justify-center text-blue-600">
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
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Profile camera clicked');
                    profileInputRef.current?.click();
                  }}
                  className="absolute bottom-2 right-2 bg-gray-200 p-2.5 rounded-full hover:bg-gray-300 transition-colors border-2 border-white shadow-md z-20 cursor-pointer"
                  title="Update profile picture"
                >
                  <Camera size={20} className="text-gray-700" />
                </button>
              )}
              <input 
                type="file" 
                ref={profileInputRef} 
                onChange={handleProfilePhotoChange} 
                accept="image/*" 
                className="hidden" 
                aria-hidden="true"
              />
            </div>
            <div className="text-center md:text-left flex-1 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{user.displayName}</h1>
              <p className="text-gray-500 font-semibold">{(user.friends || []).length} friends</p>
              <div className="flex -space-x-2 mt-2 justify-center md:justify-start">
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
            <div className="flex gap-2 mb-2">
              {isOwnProfile ? (
                <>
                  <button 
                    onClick={onAddStory}
                    className="bg-[#1877F2] text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Plus size={20} /> Add to Story
                  </button>
                  <button 
                    onClick={onEditProfile}
                    className="bg-gray-200 text-gray-900 px-4 py-2 rounded-lg font-bold hover:bg-gray-300 transition-colors flex items-center gap-2"
                  >
                    <Edit2 size={18} /> Edit Profile
                  </button>
                </>
              ) : (
                <>
                  {friendStatus === 'none' && (
                    <button 
                      onClick={handleAddFriend}
                      className="bg-[#1877F2] text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <UserPlus size={20} /> Add Friend
                    </button>
                  )}
                  {friendStatus === 'pending_sent' && (
                    <button className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold cursor-default flex items-center gap-2">
                      <UserCheck size={20} /> Request Sent
                    </button>
                  )}
                  {friendStatus === 'pending_received' && (
                    <div className="flex gap-2">
                      <button 
                        onClick={handleAcceptRequest}
                        className="bg-[#1877F2] text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors"
                      >
                        Confirm
                      </button>
                      <button 
                        onClick={handleDeclineRequest}
                        className="bg-gray-200 text-gray-900 px-4 py-2 rounded-lg font-bold hover:bg-gray-300 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                  {friendStatus === 'friends' && (
                    <button 
                      onClick={() => onMessage(user)}
                      className="bg-[#1877F2] text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <MessageCircle size={20} /> Message
                    </button>
                  )}
                  
                  <button 
                    onClick={() => onMessage(user)}
                    className="bg-gray-200 text-gray-900 px-4 py-2 rounded-lg font-bold hover:bg-gray-300 transition-colors flex items-center gap-2"
                  >
                    <MessageCircle size={18} /> Message
                  </button>
                  <button 
                    onClick={() => onStartCall('audio')}
                    className="bg-gray-200 text-gray-900 px-4 py-2 rounded-lg font-bold hover:bg-gray-300 transition-colors flex items-center gap-2"
                  >
                    <Phone size={18} /> Audio Call
                  </button>
                </>
              )}
              <button className="bg-gray-200 text-gray-900 p-2 rounded-lg font-bold hover:bg-gray-300 transition-colors">
                <MoreHorizontal size={20} />
              </button>
            </div>
          </div>

          <div className="h-px bg-gray-200 my-4" />

          {/* Tabs */}
          <div className="flex items-center gap-1 md:gap-4 overflow-x-auto scrollbar-hide">
            {['posts', 'about', 'friends', 'photos', 'videos'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-4 py-3 text-[15px] font-semibold transition-colors relative whitespace-nowrap ${
                  activeTab === tab ? 'text-[#1877F2]' : 'text-gray-500 hover:bg-gray-100 rounded-lg'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#1877F2] rounded-t-full" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Profile Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-4">
        {/* Left Column - Intro & Info */}
        <div className="lg:col-span-5 space-y-4">
          {activeTab === 'posts' && (
            <>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Intro</h3>
                {user.bio && <p className="text-center text-gray-800 mb-4">{user.bio}</p>}
                {isOwnProfile && !user.bio && (
                  <button className="w-full bg-gray-100 hover:bg-gray-200 py-2 rounded-lg font-semibold text-gray-700 transition-colors mb-4">
                    Add Bio
                  </button>
                )}
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-gray-700">
                    <Briefcase className="text-gray-400" size={20} />
                    <span>Works at <strong>Self-Employed</strong></span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-700">
                    <GraduationCap className="text-gray-400" size={20} />
                    <span>Studied at <strong>University of Life</strong></span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-700">
                    <MapPin className="text-gray-400" size={20} />
                    <span>From <strong>Dhaka, Bangladesh</strong></span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-700">
                    <Heart className="text-gray-400" size={20} />
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

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900">Photos</h3>
                  <button onClick={() => setActiveTab('photos')} className="text-[#1877F2] hover:bg-blue-50 px-2 py-1 rounded-lg text-sm font-semibold">See all photos</button>
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
              
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Posts</h3>
                <div className="flex gap-2">
                  <button className="bg-gray-100 p-2 rounded-lg text-gray-700 hover:bg-gray-200 transition-colors flex items-center gap-2 text-sm font-semibold">
                    <List size={18} /> Filters
                  </button>
                  <button className="bg-gray-100 p-2 rounded-lg text-gray-700 hover:bg-gray-200 transition-colors flex items-center gap-2 text-sm font-semibold">
                    <Settings size={18} /> Manage Posts
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
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-500 italic">
                    No posts yet.
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'videos' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Videos</h3>
                {isOwnProfile && (
                  <button 
                    onClick={onAddStory}
                    className="text-[#1877F2] hover:bg-blue-50 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1.5"
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
                      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
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
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Photos</h3>
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
                  <div className="col-span-3 py-12 text-center text-gray-500 italic">
                    No photos uploaded yet.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'friends' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Friends</h3>
              <div className="grid grid-cols-2 gap-4">
                {friendProfiles.map((friend) => (
                  <div 
                    key={friend.uid} 
                    onClick={() => onViewProfile(friend.uid)}
                    className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    {friend.photoURL ? (
                      <img src={friend.photoURL} className="w-16 h-16 rounded-lg object-cover" alt={friend.displayName} />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                        <UserIcon size={32} />
                      </div>
                    )}
                    <div>
                      <h4 className="font-bold text-gray-900">{friend.displayName}</h4>
                      <p className="text-sm text-gray-500">Friend</p>
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
