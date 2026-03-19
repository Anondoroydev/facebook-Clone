import { useState, useEffect, useRef } from 'react';
import { auth } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { userService, friendService } from './services/userService';
import { postService } from './services/postService';
import { notificationService } from './services/notificationService';
import { callService, CallData } from './services/callService';
import { UserProfile, Post, FriendRequest, Notification } from './types';
import { Navbar } from './components/Navbar';
import { LoginPage } from './components/LoginPage';
import { CreatePost } from './components/CreatePost';
import { PostCard } from './components/PostCard';
import { FriendRequestList } from './components/FriendRequestList';
import { ChatWindow } from './components/ChatWindow';
import { NotificationList } from './components/NotificationList';
import { UserSearch } from './components/UserSearch';
import { EditProfile } from './components/EditProfile';
import { CallModal } from './components/CallModal';
import { ProfilePage } from './components/ProfilePage';
import { CreateStoryModal } from './components/CreateStoryModal';
import { StoryViewer } from './components/StoryViewer';
import { storyService, Story } from './services/storyService';
import { Loader2, Users, MessageSquare, Bell, User as UserIcon, Home, Trash2, Settings, Phone, Video, Play, Store, LayoutGrid, Plus } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState('home');
  const [posts, setPosts] = useState<Post[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [showCreateStory, setShowCreateStory] = useState(false);
  const [viewingStoryIndex, setViewingStoryIndex] = useState<number | null>(null);
  const [activeChat, setActiveChat] = useState<UserProfile | null>(null);
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [incomingCall, setIncomingCall] = useState<CallData | null>(null);
  const [activeCall, setActiveCall] = useState<{ otherUser: UserProfile; type: 'audio' | 'video'; isIncoming: boolean } | null>(null);
  const [viewingUser, setViewingUser] = useState<UserProfile | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const isJustLoggedInRef = useRef(true);

  const handleSendRequest = async (targetUserId: string, targetName: string) => {
    try {
      await friendService.sendRequest(profile!.uid, profile!.displayName, targetUserId);
      setSentRequests(prev => [...prev, { 
        id: Date.now().toString(), 
        senderId: profile!.uid, 
        receiverId: targetUserId, 
        status: 'pending', 
        createdAt: new Date().toISOString() 
      }]);
    } catch (error) {
      console.error('Error sending friend request:', error);
    }
  };

  useEffect(() => {
    if (profile) {
      isJustLoggedInRef.current = true;
      const timer = setTimeout(() => {
        isJustLoggedInRef.current = false;
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [profile]);

  useEffect(() => {
    if (profile) {
      console.log('Profile loaded, friends:', profile.friends);
    }
  }, [profile, friends]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (user) {
        userService.setStatus(user.uid, document.visibilityState === 'hidden' ? 'offline' : 'online');
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        setLoading(true);
        setAuthError(null);
        setUser(firebaseUser);
        
        if (firebaseUser) {
          console.log('User logged in:', firebaseUser.uid);
          // First sync to ensure user exists
          await userService.syncUser(firebaseUser);
          
          // Then listen for changes
          unsubscribeProfile = userService.listenToUser(firebaseUser.uid, async (userProfile) => {
            try {
              console.log('Profile updated:', userProfile);
              setProfile(userProfile);
              if (userProfile && userProfile.friends) {
                // Fetch friends when profile changes
                const friendProfiles = await Promise.all(
                  userProfile.friends.map(uid => userService.getUser(uid))
                );
                const validFriends = friendProfiles.filter(p => p !== null) as UserProfile[];
                console.log('Fetched friends:', validFriends);
                setFriends(validFriends);
              } else {
                setFriends([]);
              }
            } catch (error) {
              console.error('Error in profile listener:', error);
            }
          });
        } else {
          if (user) {
            await userService.setStatus(user.uid, 'offline');
          }
          console.log('User logged out');
          setProfile(null);
          setFriends([]);
          if (unsubscribeProfile) unsubscribeProfile();
        }
      } catch (error: any) {
        console.error('Error in auth state change:', error);
        let message = 'Failed to load profile. Please try again.';
        try {
          const parsed = JSON.parse(error.message);
          if (parsed.error) message = `Auth Error: ${parsed.error}`;
        } catch (e) {
          message = error.message || message;
        }
        setAuthError(message);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  useEffect(() => {
    if (profile && activePage === 'home') {
      const unsubscribe = postService.getPosts(setPosts);
      return () => unsubscribe();
    }
  }, [profile, activePage]);

  useEffect(() => {
    if (profile) {
      const unsubscribeReq = friendService.getRequests(profile.uid, setFriendRequests);
      const unsubscribeSent = friendService.getSentRequests(profile.uid, setSentRequests);
      const unsubscribeNotif = notificationService.getNotifications(profile.uid, setNotifications);
      const unsubscribeStories = storyService.getStories(profile.uid, profile.friends || [], setStories);
      const unsubscribeCalls = callService.listenForCalls(profile.uid, (call) => {
        // If user is offline, don't show the call
        if (profile.status === 'offline' || isJustLoggedInRef.current) {
          console.log('User is offline or just logged in, ignoring incoming call:', call.id);
          callService.respondToCall(call.id!, 'rejected');
          return;
        }
        
        setIncomingCall(call);
        userService.getUser(call.callerId).then(caller => {
          if (caller) {
            setActiveCall({ otherUser: caller, type: call.type, isIncoming: true });
          }
        });
      });

      return () => {
        unsubscribeReq();
        unsubscribeSent();
        unsubscribeNotif();
        unsubscribeStories();
        unsubscribeCalls();
      };
    }
  }, [profile]);

  const handleRemoveFriend = async (friendId: string) => {
    if (!profile) return;
    
    try {
      await userService.removeFriend(profile.uid, friendId);
      setFriends(prev => prev.filter(f => f.uid !== friendId));
    } catch (error) {
      console.error('Error removing friend:', error);
    }
  };

  const handleNavigate = (page: string) => {
    setActivePage(page);
    if (page !== 'profile') {
      setViewingUser(null);
    }
    window.scrollTo(0, 0);
  };

  const handleViewProfile = async (userId: string) => {
    if (userId === profile?.uid) {
      setViewingUser(null);
    } else {
      const userToView = await userService.getUser(userId);
      setViewingUser(userToView);
    }
    setActivePage('profile');
    window.scrollTo(0, 0);
  };

  console.log('App rendering, user:', user?.uid, 'profile:', profile?.uid, 'loading:', loading);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
        <p className="text-gray-500 font-medium">Loading SocialConnect...</p>
        <button 
          onClick={() => auth.signOut()}
          className="mt-8 text-sm text-gray-400 hover:text-gray-600 underline"
        >
          Sign Out
        </button>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Settings size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Error</h2>
          <p className="text-gray-600 mb-6">{authError}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors"
          >
            Retry Login
          </button>
        </div>
      </div>
    );
  }

  if (user && !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
        <p className="text-gray-500 font-medium">Setting up your profile...</p>
        <button 
          onClick={() => auth.signOut()}
          className="mt-8 text-sm text-gray-400 hover:text-gray-600 underline"
        >
          Sign Out
        </button>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const unreadNotifications = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <Navbar 
        user={profile} 
        onNavigate={handleNavigate} 
        onViewProfile={handleViewProfile}
        activePage={activePage} 
        unreadNotifications={unreadNotifications}
        friends={friends}
        onMessage={(user) => setActiveChat(user)}
        onStartCall={(user, type) => setActiveCall({ otherUser: user, type, isIncoming: false })}
      />

      <main className="w-full max-w-[1920px] mx-auto px-4 xl:px-8 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Sidebar - Profile & Navigation */}
        <div className="hidden lg:block lg:col-span-3 xl:col-span-3 space-y-2 overflow-y-auto sticky top-20 h-[calc(100vh-5rem)] pr-2 scrollbar-hide">
          {/* Profile Link */}
          <button 
            onClick={() => handleViewProfile(profile.uid)} 
            className="w-full flex items-center gap-3 p-2 hover:bg-gray-200 rounded-lg transition-colors group"
          >
            {profile.photoURL ? (
              <img src={profile.photoURL} alt={profile.displayName} className="w-9 h-9 rounded-full object-cover" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                <UserIcon size={20} />
              </div>
            )}
            <span className="font-semibold text-[15px] text-gray-900">{profile.displayName}</span>
          </button>

          {/* Navigation Items */}
          <button onClick={() => handleNavigate('home')} className={`w-full flex items-center gap-3 p-2 hover:bg-gray-200 rounded-lg transition-colors ${activePage === 'home' ? 'bg-gray-200' : ''}`}>
            <div className="w-9 h-9 flex items-center justify-center text-blue-600">
              <Home size={24} fill={activePage === 'home' ? 'currentColor' : 'none'} />
            </div>
            <span className="font-semibold text-[15px] text-gray-900">Feed</span>
          </button>

          <button onClick={() => handleNavigate('friends')} className={`w-full flex items-center gap-3 p-2 hover:bg-gray-200 rounded-lg transition-colors ${activePage === 'friends' ? 'bg-gray-200' : ''}`}>
            <div className="w-9 h-9 flex items-center justify-center text-blue-500">
              <Users size={24} fill={activePage === 'friends' ? 'currentColor' : 'none'} />
            </div>
            <span className="font-semibold text-[15px] text-gray-900">Friends</span>
          </button>

          <button onClick={() => handleNavigate('groups')} className={`w-full flex items-center gap-3 p-2 hover:bg-gray-200 rounded-lg transition-colors ${activePage === 'groups' ? 'bg-gray-200' : ''}`}>
            <div className="w-9 h-9 flex items-center justify-center text-blue-600">
              <LayoutGrid size={24} fill={activePage === 'groups' ? 'currentColor' : 'none'} />
            </div>
            <span className="font-semibold text-[15px] text-gray-900">Groups</span>
          </button>

          <button onClick={() => handleNavigate('marketplace')} className={`w-full flex items-center gap-3 p-2 hover:bg-gray-200 rounded-lg transition-colors ${activePage === 'marketplace' ? 'bg-gray-200' : ''}`}>
            <div className="w-9 h-9 flex items-center justify-center text-blue-600">
              <Store size={24} fill={activePage === 'marketplace' ? 'currentColor' : 'none'} />
            </div>
            <span className="font-semibold text-[15px] text-gray-900">Marketplace</span>
          </button>

          <button onClick={() => handleNavigate('video')} className={`w-full flex items-center gap-3 p-2 hover:bg-gray-200 rounded-lg transition-colors ${activePage === 'video' ? 'bg-gray-200' : ''}`}>
            <div className="w-9 h-9 flex items-center justify-center text-blue-600">
              <Play size={24} fill={activePage === 'video' ? 'currentColor' : 'none'} />
            </div>
            <span className="font-semibold text-[15px] text-gray-900">Video</span>
          </button>

          <button onClick={() => handleNavigate('messages')} className={`w-full flex items-center gap-3 p-2 hover:bg-gray-200 rounded-lg transition-colors ${activePage === 'messages' ? 'bg-gray-200' : ''}`}>
            <div className="w-9 h-9 flex items-center justify-center text-blue-600">
              <MessageSquare size={24} fill={activePage === 'messages' ? 'currentColor' : 'none'} />
            </div>
            <span className="font-semibold text-[15px] text-gray-900">Messenger</span>
          </button>

          <button onClick={() => handleNavigate('notifications')} className={`w-full flex items-center gap-3 p-2 hover:bg-gray-200 rounded-lg transition-colors ${activePage === 'notifications' ? 'bg-gray-200' : ''}`}>
            <div className="w-9 h-9 flex items-center justify-center text-red-500">
              <Bell size={24} fill={activePage === 'notifications' ? 'currentColor' : 'none'} />
            </div>
            <span className="font-semibold text-[15px] text-gray-900">Notifications</span>
          </button>

          <div className="h-px bg-gray-300 my-2 mx-2" />

          <button 
            onClick={() => setShowEditProfile(true)}
            className="w-full flex items-center gap-3 p-2 hover:bg-gray-200 rounded-lg transition-colors text-gray-700"
          >
            <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center">
              <Settings size={20} />
            </div>
            <span className="font-semibold text-[15px]">Settings</span>
          </button>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-9 xl:col-span-9 space-y-6 max-w-[900px] w-full mx-auto">
          {activePage === 'home' && (
            <>
              {/* Stories Section */}
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <div 
                  onClick={() => setShowCreateStory(true)}
                  className="flex-shrink-0 w-28 h-48 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative group cursor-pointer"
                >
                  <img src={profile.photoURL || 'https://picsum.photos/seed/user/200/300'} alt="Your Story" className="w-full h-3/4 object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute bottom-0 left-0 right-0 h-1/4 bg-white flex flex-col items-center justify-center">
                    <div className="w-8 h-8 bg-[#1877F2] rounded-full border-4 border-white flex items-center justify-center text-white -mt-8 z-10">
                      <Plus size={20} strokeWidth={3} />
                    </div>
                    <span className="text-[11px] font-bold text-gray-900 mt-1">Create story</span>
                  </div>
                </div>
                
                {stories.map((story, index) => (
                  <div 
                    key={story.id} 
                    onClick={() => setViewingStoryIndex(index)}
                    className="flex-shrink-0 w-28 h-48 bg-gray-200 rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative group cursor-pointer"
                  >
                    <img src={story.imageUrl} alt={story.userName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <div className="absolute top-2 left-2 w-8 h-8 rounded-full border-2 border-[#1877F2] overflow-hidden bg-white">
                      {story.userPhoto ? (
                        <img src={story.userPhoto} alt={story.userName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-blue-600 bg-blue-50">
                          <UserIcon size={14} />
                        </div>
                      )}
                    </div>
                    <div className="absolute bottom-2 left-2 right-2">
                      <span className="text-white text-[11px] font-bold drop-shadow-md truncate block">{story.userName}</span>
                    </div>
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
                  </div>
                ))}

                {stories.length === 0 && [1, 2, 3].map((i) => (
                  <div key={i} className="flex-shrink-0 w-28 h-48 bg-gray-100 rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative animate-pulse">
                    <div className="w-full h-full bg-gray-200" />
                  </div>
                ))}
              </div>

              {/* People You May Know (Friend Suggestions) */}
              {/* Removed as per user request */}

              <CreatePost user={profile} />
              <div className="space-y-6">
                {posts.map(post => (
                  <PostCard 
                    key={post.id} 
                    post={post} 
                    currentUser={profile} 
                    onViewProfile={handleViewProfile}
                  />
                ))}
              </div>
            </>
          )}

          {activePage === 'friends' && (
            <div className="space-y-8">
              <UserSearch currentUser={profile} />
              
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Friend Requests</h2>
                <FriendRequestList 
                  requests={friendRequests} 
                  onRespond={(status, sender) => {
                    if (status === 'accepted' && sender) {
                      setActiveChat(sender);
                      // Don't manually add to friends here, the onSnapshot listener will handle it
                      // and prevent duplicates
                    }
                  }} 
                />
              </div>

              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Friends</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {friends.map(friend => (
                    <div key={friend.uid} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        {friend.photoURL ? (
                          <img src={friend.photoURL} alt={friend.displayName} className="w-12 h-12 rounded-full object-cover" />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                            <UserIcon size={24} />
                          </div>
                        )}
                        <div>
                          <h4 className="font-bold text-gray-900">{friend.displayName}</h4>
                          <p className="text-xs text-gray-500">Friend</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => {
                            setActiveChat(friend);
                            setActivePage('messages');
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                          title="Message"
                        >
                          <MessageSquare size={18} />
                        </button>
                        <button 
                          onClick={() => setActiveCall({ otherUser: friend, type: 'audio', isIncoming: false })}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors"
                          title="Audio Call"
                        >
                          <Phone size={18} />
                        </button>
                        <button 
                          onClick={() => setActiveCall({ otherUser: friend, type: 'video', isIncoming: false })}
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-full transition-colors"
                          title="Video Call"
                        >
                          <Video size={18} />
                        </button>
                        <button 
                          onClick={() => handleRemoveFriend(friend.uid)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                          title="Remove Friend"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {friends.length === 0 && (
                    <div className="col-span-full bg-white p-12 text-center rounded-xl border border-gray-100 italic text-gray-400">
                      You haven't added any friends yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activePage === 'messages' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 h-[600px] flex overflow-hidden">
              <div className="w-1/3 border-r border-gray-100 flex flex-col">
                <div className="p-4 border-b border-gray-100">
                  <h2 className="font-bold text-xl">Chats</h2>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {friends.map(friend => (
                    <button 
                      key={friend.uid}
                      onClick={() => setActiveChat(friend)}
                      className={`w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors ${activeChat?.uid === friend.uid ? 'bg-blue-50' : ''}`}
                    >
                      {friend.photoURL ? (
                        <img src={friend.photoURL} alt={friend.displayName} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                          <UserIcon size={20} />
                        </div>
                      )}
                      <div className="text-left">
                        <h4 className="font-bold text-sm text-gray-900">{friend.displayName}</h4>
                        <p className="text-xs text-gray-500 truncate">Click to chat</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1 flex flex-col relative">
                {activeChat ? (
                  <ChatWindow 
                    currentUser={profile} 
                    otherUser={activeChat} 
                    onClose={() => setActiveChat(null)}
                    onStartCall={(type) => setActiveCall({ otherUser: activeChat, type, isIncoming: false })}
                  />
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                    <MessageSquare size={64} className="mb-4 opacity-20" />
                    <h3 className="text-lg font-medium">Select a friend to start chatting</h3>
                  </div>
                )}
              </div>
            </div>
          )}

          {activePage === 'profile' && (
            <ProfilePage 
              user={viewingUser || profile} 
              currentUser={profile} 
              onEditProfile={() => setShowEditProfile(true)} 
              onAddStory={() => setShowCreateStory(true)}
              onStartCall={(type) => setActiveCall({ otherUser: viewingUser || profile, type, isIncoming: false })}
              onViewProfile={handleViewProfile}
              onMessage={(user) => setActiveChat(user)}
            />
          )}

          {activePage === 'notifications' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Notifications</h2>
              <NotificationList notifications={notifications} />
            </div>
          )}

          {['video', 'marketplace', 'groups'].includes(activePage) && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <div className="w-20 h-20 bg-blue-50 text-[#1877F2] rounded-full flex items-center justify-center mx-auto mb-4">
                {activePage === 'video' && <Play size={40} fill="currentColor" />}
                {activePage === 'marketplace' && <Store size={40} fill="currentColor" />}
                {activePage === 'groups' && <LayoutGrid size={40} fill="currentColor" />}
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2 capitalize">{activePage}</h2>
              <p className="text-gray-500">This feature is coming soon to SocialConnect!</p>
              <button 
                onClick={() => handleNavigate('home')}
                className="mt-6 px-6 py-2 bg-[#1877F2] text-white font-bold rounded-lg hover:bg-blue-700 transition-colors"
              >
                Back to Feed
              </button>
            </div>
          )}
        </div>

        {/* Modals */}
        {showEditProfile && (
          <EditProfile 
            user={profile} 
            onClose={() => setShowEditProfile(false)} 
            onUpdate={(updated) => setProfile(updated)} 
          />
        )}

        {showCreateStory && (
          <CreateStoryModal 
            user={profile} 
            onClose={() => setShowCreateStory(false)} 
          />
        )}

        {viewingStoryIndex !== null && (
          <StoryViewer 
            stories={stories}
            initialIndex={viewingStoryIndex}
            onClose={() => setViewingStoryIndex(null)}
          />
        )}

        {activeCall && (
          <CallModal
            currentUser={profile}
            otherUser={activeCall.otherUser}
            callType={activeCall.type}
            isIncoming={activeCall.isIncoming}
            incomingCallData={incomingCall || undefined}
            onClose={() => {
              setActiveCall(null);
              setIncomingCall(null);
            }}
          />
        )}

        {/* Right Sidebar - Contacts & Suggestions */}
        <div className="hidden lg:block lg:col-span-3 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h3 className="font-bold text-gray-500 text-sm uppercase mb-4">Contacts</h3>
            <div className="space-y-3">
              {friends.map(friend => (
                <button 
                  key={friend.uid}
                  onClick={() => setActiveChat(friend)}
                  className="w-full flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors group"
                >
                  <div className="relative">
                    {friend.photoURL ? (
                      <img src={friend.photoURL} alt={friend.displayName} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                        <UserIcon size={16} />
                      </div>
                    )}
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>
                  </div>
                  <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600">{friend.displayName}</span>
                </button>
              ))}
              {friends.length === 0 && (
                <p className="text-xs text-gray-400 italic">No friends yet. Add some!</p>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Floating Chat Windows */}
      {activeChat && activePage !== 'messages' && (
        <ChatWindow 
          currentUser={profile} 
          otherUser={activeChat} 
          onClose={() => setActiveChat(null)} 
          onStartCall={(type) => setActiveCall({ otherUser: activeChat, type, isIncoming: false })}
        />
      )}
    </div>
  );
}
