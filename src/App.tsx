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
import { AdminDashboard } from './components/AdminDashboard';
import { storyService, Story } from './services/storyService';
import { Loader2, Users, MessageSquare, Bell, User as UserIcon, Home, Trash2, Settings, Phone, Video, Play, Store, LayoutGrid, Plus, ShieldAlert, Check, UserPlus } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [showCreateStory, setShowCreateStory] = useState(false);
  const [viewingStoryIndex, setViewingStoryIndex] = useState<number | null>(null);
  const [activeChat, setActiveChat] = useState<UserProfile | null>(null);
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [activeFriends, setActiveFriends] = useState<UserProfile[]>([]);
  const [suggestions, setSuggestions] = useState<UserProfile[]>([]);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [incomingCall, setIncomingCall] = useState<CallData | null>(null);
  const [activeCall, setActiveCall] = useState<{ otherUser: UserProfile; type: 'audio' | 'video'; isIncoming: boolean } | null>(null);
  const [viewingUser, setViewingUser] = useState<UserProfile | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;
  
  let activePage = 'home';
  if (path.startsWith('/friends')) activePage = 'friends';
  else if (path.startsWith('/messages')) activePage = 'messages';
  else if (path.startsWith('/profile')) activePage = 'profile';
  else if (path.startsWith('/notifications')) activePage = 'notifications';
  else if (path.startsWith('/video')) activePage = 'video';
  else if (path.startsWith('/marketplace')) activePage = 'marketplace';
  else if (path.startsWith('/groups')) activePage = 'groups';

  useEffect(() => {
    // Handle direct navigation to a profile
    if (path.startsWith('/profile/')) {
      const uid = path.split('/')[2];
      if (uid && profile && uid !== profile.uid && (!viewingUser || viewingUser.uid !== uid)) {
        userService.getUser(uid).then(setViewingUser);
      }
    }
  }, [path, profile]);

  const [theme, setTheme] = useState<'light' | 'dark'>(
    (localStorage.getItem('theme') as 'light' | 'dark') || 'light'
  );
  const isJustLoggedInRef = useRef(true);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);


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
      
      // Fetch suggestions
      userService.getSuggestions(profile.uid, profile.friends || []).then(setSuggestions);
      
      // Listen for active friends
      const unsubscribeActive = userService.getActiveFriends(profile.friends || [], setActiveFriends);

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
    if (page === 'home') navigate('/');
    else navigate(`/${page}`);
    if (page !== 'profile') {
      setViewingUser(null);
    }
    window.scrollTo(0, 0);
  };

  const handleViewProfile = async (userId: string) => {
    if (userId === profile?.uid) {
      setViewingUser(null);
      navigate('/profile');
    } else {
      const userToView = await userService.getUser(userId);
      setViewingUser(userToView);
      navigate(`/profile/${userId}`);
    }
    window.scrollTo(0, 0);
  };

  console.log('App rendering, user:', user?.uid, 'profile:', profile?.uid, 'loading:', loading);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#020617] relative overflow-hidden">
        {/* background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-blue-600/20 blur-[120px] rounded-full" />
        {/* Logo */}
        <div className="relative animate-pulse">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-blue-500/50">
            <span className="text-white text-5xl font-black italic">S</span>
          </div>
        </div>
        <button 
          onClick={() => auth.signOut()}
          className="mt-16 text-xs text-white/15 hover:text-white/30 transition-colors"
        >
          Sign Out
        </button>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-(--bg-main) p-4">
        <div className="max-w-md w-full glass-card p-8 text-center">
          <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Settings size={32} />
          </div>
          <h2 className="text-2xl font-bold text-(--text-primary) mb-2">Authentication Error</h2>
          <p className="text-(--text-secondary) mb-6">{authError}</p>
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
    <div className="h-screen overflow-hidden flex flex-col bg-(--bg-main) pt-[72px] pb-[80px] md:pb-0 text-(--text-primary) transition-colors duration-500 selection:bg-(--brand-primary)/20 selection:text-(--brand-primary) w-full max-w-[100vw]">


      <Navbar 
        user={profile} 
        onNavigate={handleNavigate} 
        onViewProfile={handleViewProfile}
        unreadNotifications={unreadNotifications}
        friends={friends}
        onMessage={(user) => setActiveChat(user)}
        onStartCall={(user, type) => setActiveCall({ otherUser: user, type, isIncoming: false })}
        theme={theme}
        onToggleTheme={toggleTheme}
      />


      <main className="flex-1 w-full max-w-[1920px] mx-auto px-0 md:px-4 xl:px-12 py-2 md:py-6 grid grid-cols-1 lg:grid-cols-12 gap-0 md:gap-8 h-full overflow-hidden">
        {/* Left Sidebar - Profile & Navigation */}
        <div className="hidden lg:block lg:col-span-3 xl:col-span-3 space-y-3 overflow-y-auto h-full pb-20 pr-4 scrollbar-hide glass-card bg-(--bg-sidebar)! p-4">

          {/* Profile Link */}
          <button 
            onClick={() => handleViewProfile(profile.uid)} 
            className="w-full flex items-center gap-4 p-3 hover:bg-(--fb-hover) rounded-2xl transition-all duration-300 group glass-card border border-transparent hover:border-(--glass-border) shadow-sm"
          >
            {profile.photoURL ? (
              <img src={profile.photoURL} alt={profile.displayName} className="w-11 h-11 rounded-xl object-cover shadow-sm group-hover:scale-105 transition-transform" />
            ) : (
              <div className="w-11 h-11 rounded-xl bg-(--brand-primary)/10 flex items-center justify-center text-(--brand-primary) border border-(--brand-primary)/20">
                <UserIcon size={22} />
              </div>
            )}
            <span className="font-black text-[15px] text-(--text-primary) tracking-tight">{profile.displayName}</span>
          </button>



          {/* Navigation Items */}
          <button onClick={() => handleNavigate('home')} className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all duration-300 group ${activePage === 'home' ? 'bg-(--brand-primary)/10 text-(--brand-primary)' : 'text-(--text-secondary) hover:bg-(--fb-hover)'}`}>
            <div className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all ${activePage === 'home' ? 'bg-(--brand-gradient) text-white shadow-lg shadow-blue-500/20' : 'bg-(--bg-input) text-(--text-secondary) group-hover:bg-(--fb-hover)'}`}>
              <Home size={22} fill={activePage === 'home' ? 'currentColor' : 'none'} />
            </div>
            <span className="font-black text-[15px] tracking-tight">News Feed</span>
          </button>

          <button onClick={() => handleNavigate('friends')} className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all duration-300 group ${activePage === 'friends' ? 'bg-(--brand-primary)/10 text-(--brand-primary)' : 'text-(--text-secondary) hover:bg-(--fb-hover)'}`}>
            <div className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all ${activePage === 'friends' ? 'bg-(--brand-gradient) text-white shadow-lg shadow-blue-500/30' : 'bg-(--bg-input) text-(--text-secondary) group-hover:bg-(--fb-hover)'}`}>
              <Users size={22} fill={activePage === 'friends' ? 'currentColor' : 'none'} />
            </div>
            <span className="font-black text-[15px] tracking-tight">Friends</span>
          </button>

          <button onClick={() => handleNavigate('messages')} className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all duration-300 group ${activePage === 'messages' ? 'bg-(--brand-primary)/10 text-(--brand-primary)' : 'text-(--text-secondary) hover:bg-(--fb-hover)'}`}>
            <div className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all ${activePage === 'messages' ? 'bg-(--brand-gradient) text-white shadow-lg shadow-blue-500/30' : 'bg-(--bg-input) text-(--text-secondary) group-hover:bg-(--fb-hover)'}`}>
              <MessageSquare size={22} fill={activePage === 'messages' ? 'currentColor' : 'none'} />
            </div>
            <span className="font-black text-[15px] tracking-tight">Messenger</span>
          </button>

          <div className="h-px bg-(--divider)/30 my-4 mx-4" />

          <button 
            onClick={() => setShowEditProfile(true)}
            className="w-full flex items-center gap-4 p-3 rounded-2xl transition-all duration-300 group text-(--text-secondary) hover:bg-(--fb-hover) hover:text-(--text-primary)"
          >
            <div className="w-11 h-11 bg-(--bg-input) rounded-xl flex items-center justify-center group-hover:bg-(--fb-hover) transition-colors shadow-sm">
              <Settings size={22} />
            </div>
            <span className="font-black text-[15px] tracking-tight">Settings</span>
          </button>

          {profile?.role === 'admin' && (
            <button 
              onClick={() => setShowAdminDashboard(true)}
              className="w-full flex items-center gap-4 p-3 rounded-2xl transition-all duration-300 group text-red-500/80 hover:text-red-500 hover:bg-red-500/10"
            >
              <div className="w-11 h-11 bg-red-500/10 rounded-xl flex items-center justify-center group-hover:bg-red-500/20 transition-colors shadow-sm">
                <ShieldAlert size={22} />
              </div>
              <span className="font-black text-[15px] tracking-tight">System Controls</span>
            </button>
          )}

        </div>

        {/* Main Content Area */}
        <div className="min-w-0 lg:col-span-6 xl:col-span-6 space-y-3 md:space-y-6 w-full mx-auto h-full overflow-y-auto scrollbar-hide pb-24 md:pb-8 px-1">
          {/* ... existing content ... */}
          {activePage === 'home' && (
            <>
              {/* Stories Section */}
              <div className="flex gap-2.5 overflow-x-auto pb-4 scrollbar-hide px-2 md:px-0">
                {/* Create Story Card */}
                <div 
                  onClick={() => setShowCreateStory(true)}
                  className="shrink-0 w-[140px] h-[240px] glass-card overflow-hidden relative group cursor-pointer border border-(--glass-border) bg-black"
                >
                  <div className="h-[180px] overflow-hidden flex items-center justify-center bg-black/40">
                    <img src={profile.photoURL || 'https://picsum.photos/seed/user/400/600'} alt="Your Story" className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-700 ease-out" />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-[60px] bg-(--bg-card) flex flex-col items-center justify-center pt-5">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-(--brand-gradient) rounded-2xl border-4 border-(--bg-card) flex items-center justify-center text-white z-10 shadow-lg shadow-blue-500/40">
                      <Plus size={24} strokeWidth={3} />
                    </div>
                    <span className="text-[13px] font-bold text-(--text-primary)">Create Story</span>
                  </div>
                </div>


                
                {/* User Stories */}
                {stories.map((story, index) => (
                  <div 
                    key={story.id} 
                    onClick={() => setViewingStoryIndex(index)}
                    className="shrink-0 w-32 h-56 bg-black rounded-2xl overflow-hidden relative group cursor-pointer border border-(--glass-border) shadow-xl shadow-black/20"
                  >
                    {/* Blurred Background */}
                    <div 
                      className="absolute inset-0 opacity-40 blur-2xl scale-110"
                      style={{ 
                        backgroundImage: `url(${story.imageUrl})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                      }}
                    />
                    
                    <div className="w-full h-full relative z-10 flex items-center justify-center p-1">
                      <img 
                        src={story.imageUrl} 
                        alt={story.userName} 
                        className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-700 ease-in-out" 
                      />
                    </div>
                    
                    {/* Story Profile Pic */}
                    <div className="absolute top-3 left-3 w-10 h-10 rounded-full border-4 border-(--brand-primary) overflow-hidden bg-(--bg-card) z-20 shadow-lg">


                      {story.userPhoto ? (
                        <img src={story.userPhoto} alt={story.userName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-(--brand-primary) bg-(--fb-hover)">
                          <UserIcon size={18} />
                        </div>
                      )}
                    </div>

                    
                    {/* Story Author Name */}
                    <div className="absolute bottom-3 left-3 right-3 z-10">
                      <span className="text-white text-[13px] font-semibold drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] truncate block">
                        {story.userName}
                      </span>
                    </div>
                    
                    {/* Overlay for better text readability */}
                    <div className="absolute inset-0 bg-linear-to-b from-black/20 via-transparent to-black/40 group-hover:from-black/10 group-hover:to-black/30 transition-colors" />
                  </div>
                ))}

                {stories.length === 0 && [1, 2, 3].map((i) => (
                  <div key={i} className="shrink-0 w-[112px] h-[200px] bg-gray-100 rounded-xl shadow-sm border border-[#CED0D4]/30 overflow-hidden relative animate-pulse">
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
                <h2 className="text-2xl font-bold text-(--text-primary) mb-4">Your Friends</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {friends.map(friend => (
                    <div key={friend.uid} className="glass-card p-4 flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        {friend.photoURL ? (
                          <img src={friend.photoURL} alt={friend.displayName} className="w-12 h-12 rounded-full object-cover" />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-(--brand-primary)/10 flex items-center justify-center text-(--brand-primary)">
                            <UserIcon size={24} />
                          </div>
                        )}
                        <div>
                          <h4 className="font-bold text-(--text-primary)">{friend.displayName}</h4>
                          <p className="text-xs text-(--text-secondary)">Friend</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => {
                            setActiveChat(friend);
                            navigate('/messages');
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
                    <div className="col-span-full glass-card p-12 text-center italic text-(--text-secondary)">
                      You haven't added any friends yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activePage === 'messages' && (
            <div className="glass-card h-[600px] flex overflow-hidden">
              <div className="w-1/3 border-r border-(--glass-border) flex flex-col">
                <div className="p-4 border-b border-(--glass-border)">
                  <h2 className="font-bold text-xl text-(--text-primary)">Chats</h2>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {friends.map(friend => (
                    <button 
                      key={friend.uid}
                      onClick={() => setActiveChat(friend)}
                      className={`w-full flex items-center gap-3 p-4 hover:bg-(--fb-hover) transition-colors ${activeChat?.uid === friend.uid ? 'bg-(--brand-primary)/10' : ''}`}
                    >
                      {friend.photoURL ? (
                        <img src={friend.photoURL} alt={friend.displayName} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-(--brand-primary)/10 flex items-center justify-center text-(--brand-primary)">
                          <UserIcon size={20} />
                        </div>
                      )}
                      <div className="text-left">
                        <h4 className="font-bold text-sm text-(--text-primary)">{friend.displayName}</h4>
                        <p className="text-xs text-(--text-secondary) truncate">Click to chat</p>
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
                  <div className="flex-1 flex flex-col items-center justify-center text-(--text-secondary) p-8 text-center opacity-60">
                    <MessageSquare size={64} className="mb-4 opacity-40" />
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
              <h2 className="text-2xl font-bold text-(--text-primary)">Notifications</h2>
              <NotificationList notifications={notifications} />
            </div>
          )}

          {['video', 'marketplace', 'groups'].includes(activePage) && (
            <div className="glass-card p-12 text-center">
              <div className="w-20 h-20 bg-(--brand-primary)/10 text-(--brand-primary) rounded-full flex items-center justify-center mx-auto mb-4">
                {activePage === 'video' && <Play size={40} fill="currentColor" />}
                {activePage === 'marketplace' && <Store size={40} fill="currentColor" />}
                {activePage === 'groups' && <LayoutGrid size={40} fill="currentColor" />}
              </div>
              <h2 className="text-2xl font-bold text-(--text-primary) mb-2 capitalize">{activePage}</h2>
              <p className="text-(--text-secondary)">This feature is coming soon to SocialConnect!</p>
              <button 
                onClick={() => navigate('/')}
                className="mt-6 px-6 py-2 bg-[#1877F2] text-white font-bold rounded-lg hover:bg-blue-700 transition-colors"
              >
                Back to Feed
              </button>
            </div>
          )}
        </div>

        {/* Right Sidebar - Active & Suggestions */}
        <div className="hidden xl:block xl:col-span-3 space-y-6 h-full pb-20 overflow-y-auto pl-2 pr-4 scrollbar-hide">
          {/* Active Friends */}
          <div className="glass-card p-5 border border-(--glass-border) shadow-xl shadow-black/5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-sm uppercase tracking-widest text-(--text-secondary)">Active Folks</h3>
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              </div>
            </div>
            <div className="space-y-2">
              {activeFriends.map(friend => (
                <button 
                  key={friend.uid}
                  onClick={() => {
                    setActiveChat(friend);
                    navigate('/messages');
                  }}
                  className="w-full flex items-center gap-3 p-2 hover:bg-(--fb-hover) rounded-xl transition-all duration-300 group"
                >
                  <div className="relative">
                    {friend.photoURL ? (
                      <img src={friend.photoURL} alt="" className="w-10 h-10 rounded-xl object-cover shadow-sm" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-(--brand-primary)/10 flex items-center justify-center text-(--brand-primary)">
                        <UserIcon size={20} />
                      </div>
                    )}
                    <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 border-2 border-(--bg-card) rounded-full" />
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <p className="font-black text-[14px] text-(--text-primary) truncate tracking-tight">{friend.displayName}</p>
                    <p className="text-[11px] font-bold text-green-500 uppercase tracking-tighter">Online Now</p>
                  </div>
                </button>
              ))}
              {activeFriends.length === 0 && (
                <p className="text-center py-4 text-xs font-bold text-(--text-secondary) opacity-50 uppercase tracking-widest">No folks active</p>
              )}
            </div>
          </div>

          {/* User Suggestions */}
          <div className="glass-card p-5 border border-(--glass-border) shadow-xl shadow-black/5">
             <h3 className="font-black text-sm uppercase tracking-widest text-(--text-secondary) mb-4">You Might Know</h3>
             <div className="space-y-4">
               {suggestions.map(suggested => (
                 <div key={suggested.uid} className="flex items-center gap-3">
                   {suggested.photoURL ? (
                      <img src={suggested.photoURL} alt="" className="w-10 h-10 rounded-xl object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-(--fb-hover) flex items-center justify-center text-(--text-secondary)">
                        <UserIcon size={20} />
                      </div>
                    )}
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-black text-[14px] text-(--text-primary) truncate tracking-tight mb-1">{suggested.displayName}</p>
                      <button 
                        onClick={() => handleSendRequest(suggested.uid, suggested.displayName)}
                        className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-(--brand-primary)/10 text-(--brand-primary) hover:bg-(--brand-primary) hover:text-white rounded-lg transition-all duration-300 w-full"
                      >
                        {sentRequests.some(r => r.receiverId === suggested.uid) ? (
                          <><Check size={14} /><span className="text-[11px] font-black uppercase">Sent</span></>
                        ) : (
                          <><UserPlus size={14} /><span className="text-[11px] font-black uppercase">Add</span></>
                        )}
                      </button>
                    </div>
                 </div>
               ))}
               {suggestions.length === 0 && (
                 <p className="text-center py-2 text-xs font-bold text-(--text-secondary) opacity-50 uppercase tracking-widest">Finding matches...</p>
               )}
             </div>
          </div>
        </div>

        {/* Modals */}
        {showEditProfile && (
          <EditProfile 
            user={profile} 
            onClose={() => setShowEditProfile(false)} 
            onUpdate={(updated) => setProfile(updated)} 
            theme={theme}
            onToggleTheme={toggleTheme}
          />
        )}

        {showAdminDashboard && (
          <AdminDashboard 
            onClose={() => setShowAdminDashboard(false)}
            onViewProfile={handleViewProfile}
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
            currentUser={profile!}
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
