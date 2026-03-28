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
  Loader2,
  Moon,
  Sun
} from 'lucide-react';

import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { UserProfile } from '../types';
import { userService } from '../services/userService';
import { useNavigate, useLocation, Link } from 'react-router-dom';

interface NavbarProps {
  user: UserProfile | null;
  unreadNotifications?: number;
  friends: UserProfile[];
  onMessage: (user: UserProfile) => void;
  onStartCall?: (user: UserProfile, type: 'audio' | 'video') => void;
  onNavigate?: (page: string) => void;
  onViewProfile?: (userId: string) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}


export const Navbar: React.FC<NavbarProps> = ({ 
  user, 
  unreadNotifications = 0,
  friends,
  onMessage,
  onStartCall,
  theme,
  onToggleTheme
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const activePage = location.pathname === '/' ? 'home' : location.pathname.substring(1);

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
    <>
    <nav className="fixed top-0 left-0 right-0 h-16 md:h-18 glass-card rounded-none! border-b border-(--glass-border) z-50 px-3 md:px-6 flex items-center justify-between backdrop-blur-3xl shadow-xl shadow-black/5 transition-all duration-500">
      
      {/* Left Section */}
      <div className={`flex items-center gap-4 ${isSearchOpen ? 'flex-1' : 'flex-none md:flex-1'}`}>
        {!isSearchOpen && (
          <div 
            className="w-11 h-11 bg-(--brand-gradient) rounded-2xl flex items-center justify-center cursor-pointer shadow-lg shadow-blue-500/20 transform hover:scale-105 transition-all active:scale-95 shrink-0" 
            onClick={() => { navigate("/"); closeAllDropdowns(); }} 
          > 
            <span className="text-white text-3xl font-black italic tracking-tighter">S</span> 
          </div>
        )}
        
        <div ref={searchRef} className={`relative flex-1 ${isSearchOpen ? 'w-full' : 'max-w-[280px]'}`}>
          <div className={`items-center bg-(--bg-input) rounded-2xl px-3 md:px-4 py-2 md:py-2.5 gap-2 md:gap-3 w-full ${isSearchOpen ? "flex" : "hidden md:flex"} border border-transparent focus-within:border-(--brand-primary)/30 focus-within:bg-(--bg-card) focus-within:shadow-xl transition-all`}> 
            <Search size={20} className="text-(--text-primary) opacity-70 shrink-0" /> 
            <input 
              type="text" 
              placeholder="Search..." 
              className="bg-transparent border-none outline-none text-[15px] w-full min-w-0 placeholder:text-(--text-secondary) text-(--text-primary) font-medium" 
              autoFocus={isSearchOpen} 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
            /> 
            {isSearchOpen && (
              <button 
                className="md:hidden shrink-0 text-(--text-secondary) p-1 hover:bg-(--fb-hover) rounded-full"
                onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }}
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Search Results Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-3 glass-card shadow-2xl border border-(--glass-border) overflow-hidden z-70 max-h-[400px] overflow-y-auto animate-fade-in translate-y-0">
              {searchResults.map(result => (
                <button
                  key={result.uid}
                  onClick={() => {
                    navigate(`/profile/${result.uid}`);
                    setSearchQuery('');
                    setSearchResults([]);
                    setIsSearchOpen(false);
                  }}
                  className="w-full flex items-center gap-3 p-4 hover:bg-(--fb-hover) transition-colors border-b border-(--divider)/30 last:border-0 text-left"
                >
                  {result.photoURL ? (
                    <img src={result.photoURL} alt={result.displayName} className="w-10 h-10 rounded-xl object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-(--brand-primary)/10 flex items-center justify-center text-(--brand-primary)">
                      <UserIcon size={20} />
                    </div>
                  )}
                  <span className="font-bold text-[15px] text-(--text-primary)">{result.displayName}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="hidden md:flex items-center justify-center flex-1 h-full max-w-[500px] gap-2">
        <button 
          onClick={() => { navigate('/'); closeAllDropdowns(); }}
          className={`px-6 h-12 flex items-center justify-center relative group transition-all duration-300 rounded-2xl ${activePage === 'home' ? 'text-(--brand-primary) bg-(--brand-primary)/10' : 'text-(--text-secondary) hover:bg-(--fb-hover)'}`}
          title="Home"
        >
          <Home size={24} fill={activePage === 'home' ? 'currentColor' : 'none'} />
          {activePage === 'home' && <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-(--brand-primary) rounded-full shadow-lg shadow-blue-500/20" />}
        </button>
        <button 
          onClick={() => { navigate('/friends'); closeAllDropdowns(); }}
          className={`px-6 h-12 flex items-center justify-center relative group transition-all duration-300 rounded-2xl ${activePage === 'friends' ? 'text-(--brand-primary) bg-(--brand-primary)/10' : 'text-(--text-secondary) hover:bg-(--fb-hover)'}`}
          title="Friends"
        >
          <Users size={24} fill={activePage === 'friends' ? 'currentColor' : 'none'} />
          {activePage === 'friends' && <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-(--brand-primary) rounded-full shadow-lg shadow-blue-500/20" />}
        </button>
        <button 
          onClick={() => { navigate('/video'); closeAllDropdowns(); }}
          className={`px-6 h-12 flex items-center justify-center relative group transition-all duration-300 rounded-2xl ${activePage === 'video' ? 'text-(--brand-primary) bg-(--brand-primary)/10' : 'text-(--text-secondary) hover:bg-(--fb-hover)'}`}
          title="Video"
        >
          <Play size={24} fill={activePage === 'video' ? 'currentColor' : 'none'} />
          {activePage === 'video' && <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-(--brand-primary) rounded-full shadow-lg shadow-blue-500/20" />}
        </button>
      </div>

      {/* Right Section */}
      <div className={`flex items-center justify-end gap-1.5 md:gap-3 ${isSearchOpen ? 'hidden md:flex' : 'flex-1'} min-w-0`}>
        {/* Mobile Search Toggle */}
        <button 
          onClick={() => setIsSearchOpen(true)}
          className="md:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-(--bg-input) text-(--text-primary) hover:bg-(--fb-hover) transition-all"
        >
          <Search size={20} />
        </button>

        <div className="relative">
          <button 
            onClick={() => {
              const newState = !isMessengerOpen;
              closeAllDropdowns();
              setIsMessengerOpen(newState);
            }}
            className={`w-10 h-10 md:w-11 md:h-11 flex items-center justify-center rounded-xl transition-all duration-300 ${isMessengerOpen || activePage === 'messages' ? 'bg-(--brand-primary)/20 text-(--brand-primary)' : 'bg-(--bg-input) text-(--text-primary) hover:bg-(--fb-hover)'}`}
            title="Messenger"
          >
            <MessageCircle size={20} className={isMessengerOpen || activePage === 'messages' ? 'text-(--brand-primary)' : 'text-(--text-primary)'} />
          </button>

          {isMessengerOpen && (
            <div className="fixed md:absolute top-18 md:top-full left-0 md:left-auto right-0 mt-0 md:mt-3 w-full md:w-85 h-[calc(100vh-72px)] md:h-auto glass-card rounded-none! md:rounded-xl! shadow-2xl border-x-0 md:border-x border-b md:border-t border-(--glass-border) p-5 z-70 animate-fade-in overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-black text-(--text-primary) tracking-tight">Chats</h3>
                <button onClick={() => { navigate('/messages'); setIsMessengerOpen(false); }} className="text-(--brand-primary) text-sm font-bold hover:underline">See all</button>
              </div>
              <div className="space-y-3">
                {friends.slice(0, 5).map(friend => (
                  <div 
                    key={friend.uid}
                    className="w-full flex items-center gap-4 p-3 hover:bg-(--fb-hover) rounded-2xl transition-all duration-300 cursor-pointer group"
                    onClick={() => {
                      onMessage(friend);
                      setIsMessengerOpen(false);
                    }}
                  >
                    <div className="relative">
                      {friend.photoURL ? (
                        <img src={friend.photoURL} alt={friend.displayName} className="w-11 h-11 rounded-full object-cover shadow-sm" />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-(--brand-primary)/10 flex items-center justify-center text-(--brand-primary)">
                          <UserIcon size={22} />
                        </div>
                      )}
                      {friend.status === 'online' && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-(--bg-card) rounded-full shadow-sm"></div>
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <h4 className="font-bold text-[15px] text-(--text-primary) group-hover:text-(--brand-primary) transition-colors">{friend.displayName}</h4>
                      <p className="text-xs text-(--text-secondary) font-medium">Active now</p>
                    </div>
                  </div>
                ))}
                {friends.length === 0 && (
                  <div className="py-8 text-center text-(--text-secondary) italic text-sm font-medium">No recent messages</div>
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
            className={`w-10 h-10 md:w-11 md:h-11 flex items-center justify-center rounded-xl transition-all duration-300 ${isNotificationsOpen || activePage === 'notifications' ? 'bg-(--brand-primary)/20 text-(--brand-primary)' : 'bg-(--bg-input) text-(--text-primary) hover:bg-(--fb-hover)'}`}
            title="Notifications"
          >
            <Bell size={20} className={isNotificationsOpen || activePage === 'notifications' ? 'text-(--brand-primary)' : 'text-(--text-primary)'} />
            {unreadNotifications > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] w-4.5 h-4.5 flex items-center justify-center rounded-full border-2 border-(--bg-card) font-black shadow-lg">
                {unreadNotifications}
              </span>
            )}
          </button>

          {isNotificationsOpen && (
            <div className="fixed md:absolute top-18 md:top-full left-0 md:left-auto right-0 mt-0 md:mt-3 w-full md:w-85 h-[calc(100vh-72px)] md:h-auto glass-card rounded-none! md:rounded-xl! shadow-2xl border-x-0 md:border-x border-b md:border-t border-(--glass-border) p-5 z-70 animate-fade-in overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-black text-(--text-primary) tracking-tight">Alerts</h3>
                <button onClick={() => { navigate('/notifications'); setIsNotificationsOpen(false); }} className="text-(--brand-primary) text-sm font-bold hover:underline">See all</button>
              </div>
              <div className="py-8 text-center text-(--text-secondary) font-medium">No new notifications</div>
            </div>
          )}
        </div>
        
        <div className="relative ml-2">
          <button 
            onClick={() => {
              const newState = !isProfileOpen;
              closeAllDropdowns();
              setIsProfileOpen(newState);
            }}
            className="flex items-center gap-1 hover:scale-105 active:scale-95 transition-all duration-300"
          >
            {user?.photoURL ? (
              <img src={user.photoURL} alt={user.displayName} className="w-10 h-10 md:w-11 md:h-11 rounded-2xl object-cover border-2 border-(--brand-primary)/20 shadow-lg shadow-black/5" />
            ) : (
              <div className="w-10 h-10 md:w-11 md:h-11 rounded-2xl bg-(--brand-primary)/10 flex items-center justify-center text-(--brand-primary) border-2 border-(--brand-primary)/20 shadow-lg shadow-black/5">
                <UserIcon size={20} />
              </div>
            )}
          </button>

          {isProfileOpen && (
            <div className="absolute top-full right-0 mt-3 w-75 glass-card shadow-2xl border border-(--glass-border) p-3 z-70 animate-fade-in">
              <div 
                onClick={() => { navigate('/profile'); setIsProfileOpen(false); }}
                className="p-3 hover:bg-(--fb-hover) rounded-2xl cursor-pointer flex items-center gap-4 transition-all duration-300 group"
              >
                {user?.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName} className="w-14 h-14 rounded-2xl object-cover shadow-sm" />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-(--brand-primary)/10 flex items-center justify-center text-(--brand-primary)">
                    <UserIcon size={28} />
                  </div>
                )}
                <div className="flex-1">
                  <h4 className="font-black text-(--text-primary) group-hover:text-(--brand-primary) transition-colors tracking-tight">{user?.displayName}</h4>
                  <p className="text-xs text-(--text-secondary) font-medium">See your profile</p>
                </div>
              </div>
              
              <div className="h-px bg-(--divider)/30 my-3 mx-2" />

              <div className="px-3 pb-2">
                <p className="text-[10px] font-black uppercase text-(--text-secondary) mb-2 ml-1 tracking-widest">Appearance</p>
                <button 
                  onClick={() => { onToggleTheme(); }}
                  className="w-full flex items-center justify-between p-3 hover:bg-(--fb-hover) rounded-2xl transition-all duration-300 group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-(--bg-input) rounded-xl flex items-center justify-center group-hover:bg-(--brand-primary)/10 transition-colors">
                      {theme === 'light' ? <Moon size={22} className="text-(--text-primary)" /> : <Sun size={22} className="text-(--text-primary)" />}
                    </div>
                    <span className="font-bold text-[15px]">{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
                  </div>
                  <div className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${theme === 'dark' ? 'bg-(--brand-primary)' : 'bg-(--divider)'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 ${theme === 'dark' ? 'translate-x-6' : 'translate-x-0'}`} />
                  </div>
                </button>
              </div>
              
              <div className="h-px bg-(--divider)/30 my-3 mx-2" />
              
              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-4 p-3 hover:bg-red-500/10 rounded-2xl text-(--text-primary) hover:text-red-500 transition-all duration-300 group"
              >
                <div className="w-10 h-10 bg-(--bg-input) rounded-xl flex items-center justify-center group-hover:bg-red-500/10 transition-colors">
                  <LogOut size={22} />
                </div>
                <span className="font-bold text-[15px]">Sign Out</span>
              </button>
            </div>
          )}
        </div>

        {/* Removed hamburger menu as per user request */}
      </div>
    </nav>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 glass-card rounded-none! border-t border-(--glass-border) z-50 px-4 flex items-center justify-around backdrop-blur-3xl shadow-2xl">
        <button 
          onClick={() => { navigate('/'); closeAllDropdowns(); }}
          className={`flex flex-col items-center gap-1 transition-all ${activePage === 'home' ? 'text-(--brand-primary)' : 'text-(--text-secondary)'}`}
        >
          <Home size={22} fill={activePage === 'home' ? 'currentColor' : 'none'} />
          <span className="text-[10px] font-black uppercase tracking-tighter">Home</span>
        </button>
        <button 
          onClick={() => { navigate('/friends'); closeAllDropdowns(); }}
          className={`flex flex-col items-center gap-1 transition-all ${activePage === 'friends' ? 'text-(--brand-primary)' : 'text-(--text-secondary)'}`}
        >
          <Users size={22} fill={activePage === 'friends' ? 'currentColor' : 'none'} />
          <span className="text-[10px] font-black uppercase tracking-tighter">Friends</span>
        </button>
        <button 
          onClick={() => {
            const newState = !isMessengerOpen;
            closeAllDropdowns();
            setIsMessengerOpen(newState);
          }}
          className={`flex flex-col items-center gap-1 transition-all ${isMessengerOpen || activePage === 'messages' ? 'text-(--brand-primary)' : 'text-(--text-secondary)'}`}
        >
          <div className="relative">
            <MessageCircle size={22} fill={isMessengerOpen || activePage === 'messages' ? 'currentColor' : 'none'} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-tighter">Messages</span>
        </button>
        <button 
          onClick={() => { navigate('/notifications'); closeAllDropdowns(); }}
          className={`flex flex-col items-center gap-1 transition-all ${activePage === 'notifications' ? 'text-(--brand-primary)' : 'text-(--text-secondary)'}`}
        >
          <div className="relative">
            <Bell size={22} fill={activePage === 'notifications' ? 'currentColor' : 'none'} />
            {unreadNotifications > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] w-3.5 h-3.5 flex items-center justify-center rounded-full border border-(--bg-card) font-black">
                {unreadNotifications}
              </span>
            )}
          </div>
          <span className="text-[10px] font-black uppercase tracking-tighter">Alerts</span>
        </button>
        <button 
          onClick={() => { navigate('/profile'); closeAllDropdowns(); }}
          className={`flex flex-col items-center gap-1 transition-all ${activePage === 'profile' ? 'text-(--brand-primary)' : 'text-(--text-secondary)'}`}
        >
          <UserIcon size={22} fill={activePage === 'profile' ? 'currentColor' : 'none'} />
          <span className="text-[10px] font-black uppercase tracking-tighter">Profile</span>
        </button>
      </div>
    </>
  );
};
