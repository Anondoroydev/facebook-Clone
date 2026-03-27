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

interface NavbarProps {
  user: UserProfile | null;
  onNavigate: (page: string) => void;
  onViewProfile: (userId: string) => void;
  activePage: string;
  unreadNotifications?: number;
  friends: UserProfile[];
  onMessage: (user: UserProfile) => void;
  onStartCall?: (user: UserProfile, type: 'audio' | 'video') => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}


export const Navbar: React.FC<NavbarProps> = ({ 
  user, 
  onNavigate, 
  onViewProfile, 
  activePage, 
  unreadNotifications = 0,
  friends,
  onMessage,
  onStartCall,
  theme,
  onToggleTheme
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
    <nav className="fixed top-0 left-0 right-0 h-18 glass-card rounded-none! border-b border-(--glass-border) z-50 px-6 flex items-center justify-between backdrop-blur-3xl shadow-xl shadow-black/5 transition-all duration-500">
      
      {/* Left Section */}
      <div className={`flex items-center gap-4 ${isSearchOpen ? 'flex-1' : 'flex-none md:flex-1'}`}>
        {!isSearchOpen && (
          <div 
            className="w-11 h-11 bg-(--brand-gradient) rounded-2xl flex items-center justify-center cursor-pointer shadow-lg shadow-blue-500/20 transform hover:scale-105 transition-all active:scale-95 shrink-0" 
            onClick={() => { onNavigate("home"); closeAllDropdowns(); }} 
          > 
            <span className="text-white text-3xl font-black italic tracking-tighter">S</span> 
          </div>
        )}
        
        <div ref={searchRef} className="relative w-full max-w-[280px]">
          <div className={`flex items-center bg-(--bg-input) rounded-2xl px-4 py-2.5 gap-3 w-full ${isSearchOpen ? "flex" : "hidden md:flex"} border border-transparent focus-within:border-(--brand-primary)/30 focus-within:bg-(--bg-card) focus-within:shadow-xl transition-all`}> 
            {!isSearchOpen && <Search size={22} className="text-(--text-secondary)" />} 
            <input 
              type="text" 
              placeholder="Search SocialConnect" 
              className="bg-transparent border-none outline-none text-[15px] w-full placeholder:text-(--text-secondary) text-(--text-primary) font-medium" 
              autoFocus={isSearchOpen} 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
            /> 
          </div>

          {/* Search Results Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-3 glass-card shadow-2xl border border-(--glass-border) overflow-hidden z-70 max-h-[400px] overflow-y-auto animate-fade-in translate-y-0">
              {searchResults.map(result => (
                <button
                  key={result.uid}
                  onClick={() => {
                    onViewProfile(result.uid);
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

      {/* Center Section - Desktop */}
      <div className="hidden md:flex items-center justify-center flex-1 h-full max-w-[500px] gap-2">
        <button 
          onClick={() => { onNavigate('home'); closeAllDropdowns(); }}
          className={`px-6 h-12 flex items-center justify-center relative group transition-all duration-300 rounded-2xl ${activePage === 'home' ? 'text-(--brand-primary) bg-(--brand-primary)/10' : 'text-(--text-secondary) hover:bg-(--fb-hover)'}`}
          title="Home"
        >
          <Home size={24} fill={activePage === 'home' ? 'currentColor' : 'none'} />
          {activePage === 'home' && <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-(--brand-primary) rounded-full shadow-lg shadow-blue-500/20" />}
        </button>
        <button 
          onClick={() => { onNavigate('friends'); closeAllDropdowns(); }}
          className={`px-6 h-12 flex items-center justify-center relative group transition-all duration-300 rounded-2xl ${activePage === 'friends' ? 'text-(--brand-primary) bg-(--brand-primary)/10' : 'text-(--text-secondary) hover:bg-(--fb-hover)'}`}
          title="Friends"
        >
          <Users size={24} fill={activePage === 'friends' ? 'currentColor' : 'none'} />
          {activePage === 'friends' && <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-(--brand-primary) rounded-full shadow-lg shadow-blue-500/20" />}
        </button>
        <button 
          onClick={() => { onNavigate('video'); closeAllDropdowns(); }}
          className={`px-6 h-12 flex items-center justify-center relative group transition-all duration-300 rounded-2xl ${activePage === 'video' ? 'text-(--brand-primary) bg-(--brand-primary)/10' : 'text-(--text-secondary) hover:bg-(--fb-hover)'}`}
          title="Video"
        >
          <Play size={24} fill={activePage === 'video' ? 'currentColor' : 'none'} />
          {activePage === 'video' && <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-(--brand-primary) rounded-full shadow-lg shadow-blue-500/20" />}
        </button>
      </div>

      {/* Right Section */}
      <div className="flex items-center justify-end gap-3 flex-1">
        <button
          onClick={onToggleTheme}
          className="w-11 h-11 flex items-center justify-center rounded-xl bg-(--bg-input) text-(--text-primary) hover:bg-(--fb-hover) transition-all duration-300"
          title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
        >
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>

        <div className="relative">
          <button 
            onClick={() => {
              const newState = !isMessengerOpen;
              closeAllDropdowns();
              setIsMessengerOpen(newState);
            }}
            className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all duration-300 ${isMessengerOpen || activePage === 'messages' ? 'bg-(--brand-primary)/20 text-(--brand-primary)' : 'bg-(--bg-input) text-(--text-primary) hover:bg-(--fb-hover)'}`}
            title="Messenger"
          >
            <MessageCircle size={22} />
          </button>

          {isMessengerOpen && (
            <div className="absolute top-full right-0 mt-3 w-85 glass-card shadow-2xl border border-(--glass-border) p-5 z-70 animate-fade-in">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-black text-(--text-primary) tracking-tight">Chats</h3>
                <button onClick={() => { onNavigate('messages'); setIsMessengerOpen(false); }} className="text-(--brand-primary) text-sm font-bold hover:underline">See all</button>
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
            className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all duration-300 ${isNotificationsOpen || activePage === 'notifications' ? 'bg-(--brand-primary)/20 text-(--brand-primary)' : 'bg-(--bg-input) text-(--text-primary) hover:bg-(--fb-hover)'}`}
            title="Notifications"
          >
            <Bell size={22} />
            {unreadNotifications > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-(--bg-card) font-black shadow-lg">
                {unreadNotifications}
              </span>
            )}
          </button>

          {isNotificationsOpen && (
            <div className="absolute top-full right-0 mt-3 w-85 glass-card shadow-2xl border border-(--glass-border) p-5 z-70 animate-fade-in">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-black text-(--text-primary) tracking-tight">Alerts</h3>
                <button onClick={() => { onNavigate('notifications'); setIsNotificationsOpen(false); }} className="text-(--brand-primary) text-sm font-bold hover:underline">See all</button>
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
              <img src={user.photoURL} alt={user.displayName} className="w-11 h-11 rounded-2xl object-cover border-2 border-(--brand-primary)/20 shadow-lg shadow-black/5" />
            ) : (
              <div className="w-11 h-11 rounded-2xl bg-(--brand-primary)/10 flex items-center justify-center text-(--brand-primary) border-2 border-(--brand-primary)/20 shadow-lg shadow-black/5">
                <UserIcon size={22} />
              </div>
            )}
          </button>

          {isProfileOpen && (
            <div className="absolute top-full right-0 mt-3 w-75 glass-card shadow-2xl border border-(--glass-border) p-3 z-70 animate-fade-in">
              <div 
                onClick={() => { onNavigate('profile'); setIsProfileOpen(false); }}
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

        <button 
          className="md:hidden w-11 h-11 flex items-center justify-center bg-(--bg-input) rounded-xl text-(--text-primary) hover:bg-(--fb-hover) transition-all"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="absolute top-full left-0 right-0 glass-card mx-6 mt-3 p-4 flex flex-col gap-2 shadow-2xl animate-in slide-in-from-top-4 duration-300 md:hidden z-60">
          <button onClick={() => { onNavigate('home'); setIsMenuOpen(false); }} className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${activePage === 'home' ? 'bg-(--brand-primary)/10 text-(--brand-primary)' : 'text-(--text-secondary) hover:bg-(--fb-hover)'}`}>
            <Home size={24} /> <span className="font-bold">Home</span>
          </button>
          <button onClick={() => { onNavigate('friends'); setIsMenuOpen(false); }} className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${activePage === 'friends' ? 'bg-(--brand-primary)/10 text-(--brand-primary)' : 'text-(--text-secondary) hover:bg-(--fb-hover)'}`}>
            <Users size={24} /> <span className="font-bold">Friends</span>
          </button>
        </div>
      )}
    </nav>
  );
};
