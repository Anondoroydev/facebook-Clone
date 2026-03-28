import React, { useState } from 'react';
import { Search, UserPlus, Loader2, User as UserIcon, Check } from 'lucide-react';
import { userService, friendService } from '../services/userService';
import { UserProfile } from '../types';

interface UserSearchProps {
  currentUser: UserProfile;
}

export const UserSearch: React.FC<UserSearchProps> = ({ currentUser }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [sentRequests, setSentRequests] = useState<string[]>([]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setIsSearching(true);
    try {
      const users = await userService.searchUsers(searchTerm);
      // Filter out current user and existing friends
      const friends = currentUser.friends || [];
      setResults(users.filter(u => u.uid !== currentUser.uid && !friends.includes(u.uid)));
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddFriend = async (userId: string) => {
    try {
      await friendService.sendRequest(currentUser.uid, currentUser.displayName, userId);
      setSentRequests(prev => [...prev, userId]);
    } catch (error) {
      console.error('Error sending friend request:', error);
    }
  };

  return (
    <div className="bg-(--fb-card) rounded-xl shadow-sm border border-(--fb-divider)/30 p-4 mb-6">

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-(--text-secondary)" size={18} />
          <input
            type="text"
            placeholder="Search for people to add..."
            className="w-full bg-(--bg-input) text-(--text-primary) border border-transparent rounded-lg py-2 pl-10 pr-4 outline-none focus:ring-2 focus:ring-(--brand-primary)/50 focus:border-(--glass-border) transition-all text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={isSearching}
          className="bg-(--brand-gradient) text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 transition-all shadow-sm"
        >
          {isSearching ? <Loader2 size={18} className="animate-spin" /> : 'Search'}
        </button>
      </form>

      {results.length > 0 && (
        <div className="mt-4 space-y-3">
          {results.map(user => (
            <div key={user.uid} className="flex items-center justify-between p-2 hover:bg-(--fb-hover) rounded-lg transition-colors border border-transparent hover:border-(--glass-border)">
              <div className="flex items-center gap-3">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName} className="w-10 h-10 rounded-full object-cover shadow-sm" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-(--brand-primary)/10 flex items-center justify-center text-(--brand-primary)">
                    <UserIcon size={18} />
                  </div>
                )}
                <div>
                  <h4 className="font-bold text-sm text-(--text-primary)">{user.displayName}</h4>
                  <p className="text-[10px] text-(--text-secondary)">{user.email}</p>
                </div>
              </div>
              
              {sentRequests.includes(user.uid) ? (
                <button disabled className="flex items-center gap-1 text-green-600 text-xs font-bold bg-green-500/10 px-3 py-1.5 rounded-full">
                  <Check size={14} /> Sent
                </button>
              ) : (
                <button
                  onClick={() => handleAddFriend(user.uid)}
                  className="flex items-center gap-1 text-(--brand-primary) text-xs font-bold bg-(--brand-primary)/10 hover:bg-(--brand-primary) hover:text-white px-3 py-1.5 rounded-full transition-colors"
                >
                  <UserPlus size={14} /> Add Friend
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      
      {searchTerm && results.length === 0 && !isSearching && (
        <p className="mt-4 text-center text-gray-400 text-xs italic">No users found matching "{searchTerm}"</p>
      )}
    </div>
  );
};
