import React, { useState, useEffect, useRef } from 'react';
import { 
  Home, 
  Users, 
  Play,
  Store,
  LayoutGrid,
  Bell, 
  Search, 
  LogOut, 
  User as UserIcon,
  MessageCircle,
  Phone,
  Video,
  Grid,
  Menu,
  X,
  Loader2
} from 'lucide-react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { UserProfile } from '../types';
import { userService } from '../services/userService';

interface NavbarProps {
  user: UserProfile | null;
  onNavigate: (page: string) => void;
  onViewProfile: (userId: string) => void;
  activePage: string;
  unreadNotifications?: number;
  friends: UserProfile[];
  onMessage: (user: UserProfile) => void;
  onStartCall?: (user: UserProfile, type: 'audio' | 'video') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  user, 
  onNavigate, 
  onViewProfile, 
  activePage, 
  unreadNotifications = 0,
  friends,
  onMessage,
  onStartCall
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMessengerOpen, setIsMessengerOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isGridMenuOpen, setIsGridMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchResults([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const search = async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const results = await userService.searchUsers(searchQuery);
        setSearchResults(results.filter(u => u.uid !== user?.uid));
      } catch (error) {
        console.error('Error searching users:', error);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(search, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, user?.uid]);

  const handleLogout = async () => {
    if (user) {
      try {
        await userService.updateProfile(user.uid, { status: 'offline' });
      } catch (error) {
        console.error('Error updating status on logout:', error);
      }
    }
    await signOut(auth);
  };

  const closeAllDropdowns = () => {
    setIsProfileOpen(false);
    setIsMessengerOpen(false);
    setIsNotificationsOpen(false);
    setIsGridMenuOpen(false);
    setSearchResults([]);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white shadow-sm z-50 px-4 h-14 flex items-center justify-between border-b border-gray-200">
      {/* Left Section */}
      <div className={`flex items-center gap-2 ${isSearchOpen ? 'flex-1' : 'flex-none md:flex-1'}`}>
        {!isSearchOpen && (
          <div 
            className="w-10 h-10 bg-[#1877F2] rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-700 transition-colors flex-shrink-0"
            onClick={() => { onNavigate('home'); closeAllDropdowns(); }}
          >
            <span className="text-white text-3xl font-black italic -mb-1">f</span>
          </div>
        )}
        
        <div ref={searchRef} className="relative w-full max-w-[240px]">
          <div className={`flex items-center bg-gray-100 rounded-full px-3 py-2 gap-2 w-full ${isSearchOpen ? 'flex' : 'hidden sm:flex'} focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500`}>
            {!isSearchOpen && <Search size={18} className="text-gray-500" />}
            <input 
              type="text" 
              placeholder="Search Facebook" 
              className="bg-transparent border-none outline-none text-[15px] w-full placeholder:text-gray-500"
              autoFocus={isSearchOpen}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Search Results Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-[70] max-h-[400px] overflow-y-auto">
              {searchResults.map(result => (
                <button
                  key={result.uid}
                  onClick={() => {
                    onViewProfile(result.uid);
                    setSearchQuery('');
                    setSearchResults([]);
                    setIsSearchOpen(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                >
                  {result.photoURL ? (
                    <img src={result.photoURL} alt={result.displayName} className="w-9 h-9 rounded-full object-cover" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                      <UserIcon size={18} />
                    </div>
                  )}
                  <span className="font-semibold text-sm text-gray-900">{result.displayName}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        
        {!isSearchOpen && (
          <button 
            onClick={() => setIsSearchOpen(true)}
            className="sm:hidden p-2 bg-gray-100 rounded-full text-gray-600"
          >
            <Search size={20} />
          </button>
        )}
      </div>

      {/* Center Section - Desktop */}
      <div className="hidden md:flex items-center justify-center flex-1 h-full max-w-[600px]">
        <button 
          onClick={() => { onNavigate('home'); closeAllDropdowns(); }}
          className={`flex-1 h-[52px] flex items-center justify-center relative group transition-colors ${activePage === 'home' ? 'text-[#1877F2]' : 'text-[#65676B] hover:bg-gray-100 rounded-lg mx-1'}`}
          title="Home"
        >
          <Home size={28} fill={activePage === 'home' ? 'currentColor' : 'none'} strokeWidth={activePage === 'home' ? 2.5 : 2} />
          {activePage === 'home' && <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#1877F2] rounded-t-full" />}
        </button>
        <button 
          onClick={() => { onNavigate('friends'); closeAllDropdowns(); }}
          className={`flex-1 h-[52px] flex items-center justify-center relative group transition-colors ${activePage === 'friends' ? 'text-[#1877F2]' : 'text-[#65676B] hover:bg-gray-100 rounded-lg mx-1'}`}
          title="Friends"
        >
          <Users size={28} fill={activePage === 'friends' ? 'currentColor' : 'none'} strokeWidth={activePage === 'friends' ? 2.5 : 2} />
          {activePage === 'friends' && <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#1877F2] rounded-t-full" />}
        </button>
        <button 
          onClick={() => { onNavigate('video'); closeAllDropdowns(); }}
          className={`flex-1 h-[52px] flex items-center justify-center relative group transition-colors ${activePage === 'video' ? 'text-[#1877F2]' : 'text-[#65676B] hover:bg-gray-100 rounded-lg mx-1'}`}
          title="Video"
        >
          <Play size={28} fill={activePage === 'video' ? 'currentColor' : 'none'} />
          {activePage === 'video' && <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#1877F2] rounded-t-full" />}
        </button>
        <button 
          onClick={() => { onNavigate('marketplace'); closeAllDropdowns(); }}
          className={`flex-1 h-[52px] flex items-center justify-center relative group transition-colors ${activePage === 'marketplace' ? 'text-[#1877F2]' : 'text-[#65676B] hover:bg-gray-100 rounded-lg mx-1'}`}
          title="Marketplace"
        >
          <Store size={28} fill={activePage === 'marketplace' ? 'currentColor' : 'none'} />
          {activePage === 'marketplace' && <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#1877F2] rounded-t-full" />}
        </button>
        <button 
          onClick={() => { onNavigate('groups'); closeAllDropdowns(); }}
          className={`flex-1 h-[52px] flex items-center justify-center relative group transition-colors ${activePage === 'groups' ? 'text-[#1877F2]' : 'text-[#65676B] hover:bg-gray-100 rounded-lg mx-1'}`}
          title="Groups"
        >
          <LayoutGrid size={28} fill={activePage === 'groups' ? 'currentColor' : 'none'} />
          {activePage === 'groups' && <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#1877F2] rounded-t-full" />}
        </button>
      </div>

      {/* Right Section */}
      <div className="flex items-center justify-end gap-2 flex-1">
        <div className="relative hidden lg:flex">
          <button 
            onClick={() => {
              const newState = !isGridMenuOpen;
              closeAllDropdowns();
              setIsGridMenuOpen(newState);
            }}
            className={`p-2.5 rounded-full transition-colors ${isGridMenuOpen ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 hover:bg-gray-200 text-gray-900'}`}
            title="Menu"
          >
            <Grid size={20} />
          </button>
          {isGridMenuOpen && (
            <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 p-4 z-[60]">
              <h3 className="text-2xl font-bold mb-4">Menu</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors">
                  <div className="w-9 h-9 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-1">
                    <Users size={20} />
                  </div>
                  <span className="font-medium text-sm">Friends</span>
                </div>
                <div className="p-3 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors">
                  <div className="w-9 h-9 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-1">
                    <LayoutGrid size={20} />
                  </div>
                  <span className="font-medium text-sm">Groups</span>
                </div>
                <div className="p-3 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors">
                  <div className="w-9 h-9 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-1">
                    <Store size={20} />
                  </div>
                  <span className="font-medium text-sm">Marketplace</span>
                </div>
                <div className="p-3 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors">
                  <div className="w-9 h-9 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-1">
                    <Play size={20} />
                  </div>
                  <span className="font-medium text-sm">Video</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="relative">
          <button 
            onClick={() => {
              const newState = !isMessengerOpen;
              closeAllDropdowns();
              setIsMessengerOpen(newState);
            }}
            className={`p-2.5 rounded-full transition-colors ${isMessengerOpen || activePage === 'messages' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 hover:bg-gray-200 text-gray-900'}`}
            title="Messenger"
          >
            <MessageCircle size={20} />
          </button>
          {isMessengerOpen && (
            <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 p-4 z-[60]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold">Chats</h3>
                <button onClick={() => { onNavigate('messages'); setIsMessengerOpen(false); }} className="text-blue-600 text-sm hover:underline">See all in Messenger</button>
              </div>
              <div className="space-y-2">
                {friends.slice(0, 5).map(friend => (
                  <div 
                    key={friend.uid}
                    className="w-full flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <div className="relative">
                      {friend.photoURL ? (
                        <img src={friend.photoURL} alt={friend.displayName} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                          <UserIcon size={20} />
                        </div>
                      )}
                      {friend.status === 'online' && (
                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>
                      )}
                    </div>
                    <div 
                      onClick={() => {
                        onMessage(friend);
                        setIsMessengerOpen(false);
                      }}
                      className="flex-1 text-left cursor-pointer"
                    >
                      <h4 className="font-bold text-sm text-gray-900">{friend.displayName}</h4>
                      <p className="text-xs text-gray-500">Active now</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onStartCall?.(friend, 'audio');
                          setIsMessengerOpen(false);
                        }}
                        className="p-1.5 hover:bg-gray-100 rounded-full text-blue-600 transition-colors"
                        title="Audio Call"
                      >
                        <Phone size={16} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onStartCall?.(friend, 'video');
                          setIsMessengerOpen(false);
                        }}
                        className="p-1.5 hover:bg-gray-100 rounded-full text-blue-600 transition-colors"
                        title="Video Call"
                      >
                        <Video size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                {friends.length === 0 && (
                  <div className="p-2 text-center text-gray-500 italic text-sm">No recent messages</div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="relative">
          <button 
            onClick={() => {
              const newState = !isNotificationsOpen;
              closeAllDropdowns();
              setIsNotificationsOpen(newState);
            }}
            className={`p-2.5 rounded-full transition-colors ${isNotificationsOpen || activePage === 'notifications' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 hover:bg-gray-200 text-gray-900'}`}
            title="Notifications"
          >
            <Bell size={20} />
            {unreadNotifications > 0 && (
              <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full border-2 border-white">
                {unreadNotifications}
              </span>
            )}
          </button>
          {isNotificationsOpen && (
            <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 p-4 z-[60]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold">Notifications</h3>
                <button onClick={() => { onNavigate('notifications'); setIsNotificationsOpen(false); }} className="text-blue-600 text-sm hover:underline">See all</button>
              </div>
              <div className="space-y-2">
                <div className="p-2 text-center text-gray-500 italic text-sm">No new notifications</div>
              </div>
            </div>
          )}
        </div>
        
        <div className="relative">
          <button 
            onClick={() => {
              const newState = !isProfileOpen;
              closeAllDropdowns();
              setIsProfileOpen(newState);
            }}
            className="flex items-center gap-1 hover:bg-gray-100 p-0.5 rounded-full transition-colors"
          >
            {user?.photoURL ? (
              <img src={user.photoURL} alt={user.displayName} className="w-10 h-10 rounded-full object-cover border border-gray-200" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 border border-gray-200">
                <UserIcon size={20} />
              </div>
            )}
          </button>

          {isProfileOpen && (
            <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-200 p-2 z-[60]">
              <div 
                onClick={() => { onNavigate('profile'); setIsProfileOpen(false); }}
                className="p-2 hover:bg-gray-50 rounded-lg cursor-pointer flex items-center gap-3 mb-2"
              >
                {user?.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName} className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    <UserIcon size={24} />
                  </div>
                )}
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900">{user?.displayName}</h4>
                  <p className="text-sm text-gray-500">See your profile</p>
                </div>
              </div>
              <div className="h-px bg-gray-200 my-2" />
              
              {/* Status Toggle */}
              <div className="px-2 py-1">
                <div className="flex items-center justify-between p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center ${user?.status === 'online' ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-600'}`}>
                      <div className={`w-3 h-3 rounded-full ${user?.status === 'online' ? 'bg-green-500' : 'bg-gray-400'}`} />
                    </div>
                    <span className="font-medium text-gray-700">Status: <span className="capitalize">{user?.status || 'online'}</span></span>
                  </div>
                  <button 
                    onClick={async () => {
                      if (!user) return;
                      const newStatus = user.status === 'online' ? 'offline' : 'online';
                      await userService.updateProfile(user.uid, { status: newStatus });
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${user?.status === 'online' ? 'bg-blue-600' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${user?.status === 'online' ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>

              <div className="h-px bg-gray-200 my-2" />
              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-3 p-2 hover:bg-gray-100 rounded-lg text-gray-700 transition-colors"
              >
                <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center">
                  <LogOut size={20} />
                </div>
                <span className="font-medium">Log Out</span>
              </button>
            </div>
          )}
        </div>

        <button 
          className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-full"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-white border-b border-gray-200 md:hidden p-4 flex flex-col gap-2 shadow-xl animate-in slide-in-from-top duration-200">
          <button onClick={() => { onNavigate('home'); setIsMenuOpen(false); }} className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${activePage === 'home' ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-100'}`}>
            <Home size={24} /> <span className="font-medium">Home</span>
          </button>
          <button onClick={() => { onNavigate('friends'); setIsMenuOpen(false); }} className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${activePage === 'friends' ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-100'}`}>
            <Users size={24} /> <span className="font-medium">Friends</span>
          </button>
          <button onClick={() => { onNavigate('messages'); setIsMenuOpen(false); }} className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${activePage === 'messages' ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-100'}`}>
            <MessageCircle size={24} /> <span className="font-medium">Messages</span>
          </button>
          <button onClick={() => { onNavigate('notifications'); setIsMenuOpen(false); }} className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${activePage === 'notifications' ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-100'}`}>
            <Bell size={24} /> <span className="font-medium">Notifications</span>
          </button>
        </div>
      )}
      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden flex items-center justify-around h-12 z-50">
        <button 
          onClick={() => onNavigate('home')}
          className={`flex-1 flex flex-col items-center justify-center ${activePage === 'home' ? 'text-[#1877F2]' : 'text-gray-500'}`}
        >
          <Home size={24} fill={activePage === 'home' ? 'currentColor' : 'none'} />
        </button>
        <button 
          onClick={() => onNavigate('friends')}
          className={`flex-1 flex flex-col items-center justify-center ${activePage === 'friends' ? 'text-[#1877F2]' : 'text-gray-500'}`}
        >
          <Users size={24} fill={activePage === 'friends' ? 'currentColor' : 'none'} />
        </button>
        <button 
          onClick={() => onNavigate('video')}
          className={`flex-1 flex flex-col items-center justify-center ${activePage === 'video' ? 'text-[#1877F2]' : 'text-gray-500'}`}
        >
          <Play size={24} fill={activePage === 'video' ? 'currentColor' : 'none'} />
        </button>
        <button 
          onClick={() => onNavigate('marketplace')}
          className={`flex-1 flex flex-col items-center justify-center ${activePage === 'marketplace' ? 'text-[#1877F2]' : 'text-gray-500'}`}
        >
          <Store size={24} fill={activePage === 'marketplace' ? 'currentColor' : 'none'} />
        </button>
        <button 
          onClick={() => onNavigate('notifications')}
          className={`flex-1 flex flex-col items-center justify-center relative ${activePage === 'notifications' ? 'text-[#1877F2]' : 'text-gray-500'}`}
        >
          <Bell size={24} fill={activePage === 'notifications' ? 'currentColor' : 'none'} />
          {unreadNotifications > 0 && (
            <span className="absolute top-1 right-1/4 bg-red-500 text-white text-[8px] w-4 h-4 flex items-center justify-center rounded-full border border-white">
              {unreadNotifications}
            </span>
          )}
        </button>
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className={`flex-1 flex flex-col items-center justify-center ${isMenuOpen ? 'text-[#1877F2]' : 'text-gray-500'}`}
        >
          <Menu size={24} />
        </button>
      </div>
    </nav>
  );
};

