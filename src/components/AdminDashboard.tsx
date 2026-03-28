import React, { useState, useEffect } from 'react';
import { userService } from '../services/userService';
import { postService } from '../services/postService';
import { storyService, Story } from '../services/storyService';
import { UserProfile, Post } from '../types';
import {
  Trash2, ShieldAlert, Users, FileText, ChevronRight, X, Loader2,
  Image as ImageIcon, ShieldCheck, ShieldOff, Ban, CheckCircle,
  Crown, UserMinus, Clock, UserX
} from 'lucide-react';
import { auth } from '../firebase';

interface AdminDashboardProps {
  onClose: () => void;
  onViewProfile: (userId: string) => void;
}

const RESTRICTION_DAYS = [1, 2, 3, 30] as const;

function isRestricted(user: UserProfile): boolean {
  if (!user.restrictedUntil) return false;
  return new Date(user.restrictedUntil) > new Date();
}

function restrictionLabel(user: UserProfile): string {
  if (!user.restrictedUntil || !isRestricted(user)) return '';
  const until = new Date(user.restrictedUntil);
  return `Restricted until ${until.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;
}

// ── User Action Menu ─────────────────────────────────────────────────────────
interface UserActionMenuProps {
  user: UserProfile;
  currentUid: string;
  onDone: () => void;
}

function UserActionMenu({ user, currentUid, onDone }: UserActionMenuProps) {
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try { await fn(); } finally { setBusy(false); onDone(); }
  };

  const isSelf = user.uid === currentUid;

  return (
    <div className="absolute right-0 top-8 z-50 w-56 bg-(--bg-card) border border-(--glass-border) rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
      {busy && (
        <div className="absolute inset-0 bg-(--bg-card)/80 flex items-center justify-center z-10 rounded-2xl">
          <Loader2 className="animate-spin text-(--brand-primary)" size={24} />
        </div>
      )}

      {/* Block / Unblock */}
      {user.isBlocked ? (
        <button
          onClick={() => run(() => userService.unblockUser(user.uid))}
          className="w-full flex items-center gap-3 px-4 py-3 text-green-500 hover:bg-green-500/10 transition-colors text-sm font-semibold"
        >
          <CheckCircle size={16} /> Unblock User
        </button>
      ) : (
        <button
          disabled={isSelf}
          onClick={() => run(() => userService.blockUser(user.uid))}
          className="w-full flex items-center gap-3 px-4 py-3 text-orange-400 hover:bg-orange-400/10 transition-colors text-sm font-semibold disabled:opacity-40"
        >
          <Ban size={16} /> Block User
        </button>
      )}

      {/* Make / Remove admin */}
      {user.role === 'admin' ? (
        <button
          disabled={isSelf}
          onClick={() => run(() => userService.setUserRole(user.uid, 'user'))}
          className="w-full flex items-center gap-3 px-4 py-3 text-yellow-400 hover:bg-yellow-400/10 transition-colors text-sm font-semibold disabled:opacity-40"
        >
          <ShieldOff size={16} /> Remove Admin
        </button>
      ) : (
        <button
          onClick={() => run(() => userService.setUserRole(user.uid, 'admin'))}
          className="w-full flex items-center gap-3 px-4 py-3 text-purple-400 hover:bg-purple-400/10 transition-colors text-sm font-semibold"
        >
          <Crown size={16} /> Make Admin
        </button>
      )}

      {/* Restrictions */}
      <div className="px-4 pt-2 pb-1">
        <p className="text-[10px] uppercase font-bold text-(--text-secondary) tracking-widest mb-1">
          <Clock size={10} className="inline mr-1" />Restrict for…
        </p>
        <div className="flex gap-1 flex-wrap mb-1">
          {RESTRICTION_DAYS.map(d => (
            <button
              key={d}
              onClick={() => run(() => userService.restrictUser(user.uid, d))}
              className="px-2 py-1 text-[11px] font-bold rounded-lg bg-(--bg-input) hover:bg-(--brand-primary)/20 text-(--text-primary) hover:text-(--brand-primary) transition-colors border border-(--glass-border)"
            >
              {d}d
            </button>
          ))}
        </div>
        {isRestricted(user) && (
          <button
            onClick={() => run(() => userService.removeRestriction(user.uid))}
            className="w-full text-[11px] font-bold text-green-400 hover:underline text-left py-1"
          >
            ✓ Remove Restriction
          </button>
        )}
      </div>

      <div className="h-px bg-(--glass-border) mx-3" />

      {/* Hard remove */}
      <button
        disabled={isSelf}
        onClick={() => {
          if (window.confirm(`Remove "${user.displayName}" permanently? This soft-deletes the account.`)) {
            run(() => userService.deleteUser(user.uid));
          }
        }}
        className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-500/10 transition-colors text-sm font-semibold disabled:opacity-40"
      >
        <UserX size={16} /> Remove User
      </button>
    </div>
  );
}

// ── Main Dashboard ───────────────────────────────────────────────────────────
export function AdminDashboard({ onClose, onViewProfile }: AdminDashboardProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'posts' | 'stories'>('users');
  const [openMenuUid, setOpenMenuUid] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const currentUid = auth.currentUser?.uid ?? '';

  useEffect(() => {
    // Real-time listener for users so changes reflect instantly
    const unsubUsers = userService.listenToAllUsers(setUsers);
    postService.getPosts(setPosts);
    storyService.getAllStories(setStories);
    setLoading(false);
    return () => unsubUsers();
  }, []);

  const handleDeletePost = async (postId: string) => {
    if (window.confirm('Delete this post?')) {
      try { await postService.deletePost(postId); } catch (e) { console.error(e); }
    }
  };

  const handleDeleteStory = async (storyId: string) => {
    if (window.confirm('Delete this story?')) {
      try { await storyService.deleteStory(storyId); } catch (e) { console.error(e); }
    }
  };

  const filteredUsers = users.filter(u =>
    u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-100 flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="glass-card w-full max-w-5xl h-[85vh] rounded-[32px] overflow-hidden flex flex-col shadow-2xl">

        {/* Header */}
        <div className="p-6 bg-linear-to-r from-gray-900 to-gray-800 text-white flex items-center justify-between shrink-0">
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
        <div className="flex border-b border-(--glass-border) bg-(--bg-input) shrink-0">
          {([['users', Users, users.length], ['posts', FileText, posts.length], ['stories', ImageIcon, stories.length]] as const).map(([tab, Icon, count]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-4 flex items-center justify-center gap-2 font-bold transition-all capitalize ${activeTab === tab ? 'text-(--brand-primary) bg-(--bg-card) border-b-2 border-(--brand-primary)' : 'text-(--text-secondary) hover:text-(--text-primary)'}`}
            >
              <Icon size={20} /> {tab} ({count})
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide" onClick={() => setOpenMenuUid(null)}>
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center text-(--text-secondary)">
              <Loader2 className="animate-spin mb-4" size={48} />
              <p className="font-bold">Accessing Secure Records...</p>
            </div>
          ) : (
            <div className="space-y-4">

              {/* ── Users tab ── */}
              {activeTab === 'users' && (
                <>
                  {/* Search bar */}
                  <input
                    type="text"
                    placeholder="Search users by name or email…"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-(--bg-input) text-(--text-primary) rounded-xl px-4 py-2.5 text-sm outline-none border border-(--glass-border) focus:border-(--brand-primary) transition-colors"
                    onClick={e => e.stopPropagation()}
                  />

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Total Users', value: users.length, color: 'text-(--brand-primary)' },
                      { label: 'Blocked', value: users.filter(u => u.isBlocked).length, color: 'text-orange-400' },
                      { label: 'Admins', value: users.filter(u => u.role === 'admin').length, color: 'text-purple-400' }
                    ].map(stat => (
                      <div key={stat.label} className="bg-(--bg-input) rounded-2xl p-3 text-center border border-(--glass-border)">
                        <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
                        <p className="text-xs text-(--text-secondary) font-bold mt-1">{stat.label}</p>
                      </div>
                    ))}
                  </div>

                  {filteredUsers.map(u => (
                    <div
                      key={u.uid}
                      className={`flex items-center justify-between p-4 rounded-2xl border transition-colors ${u.isBlocked ? 'bg-red-500/5 border-red-500/20' : 'bg-(--bg-input) border-(--glass-border) hover:bg-(--fb-hover)'}`}
                      onClick={e => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Avatar */}
                        <div className="relative shrink-0">
                          <img
                            src={u.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.displayName)}&background=random`}
                            className="w-11 h-11 rounded-xl object-cover"
                            alt=""
                          />
                          {u.isBlocked && (
                            <div className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5">
                              <Ban size={10} className="text-white" />
                            </div>
                          )}
                          {u.role === 'admin' && !u.isBlocked && (
                            <div className="absolute -top-1 -right-1 bg-purple-500 rounded-full p-0.5">
                              <Crown size={10} className="text-white" />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-(--text-primary) truncate">{u.displayName}</h4>
                            {u.role === 'admin' && (
                              <span className="text-[10px] font-black uppercase text-purple-400 bg-purple-400/10 px-1.5 py-0.5 rounded-md">Admin</span>
                            )}
                            {u.isBlocked && (
                              <span className="text-[10px] font-black uppercase text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded-md">Blocked</span>
                            )}
                          </div>
                          <p className="text-xs text-(--text-secondary) truncate">{u.email}</p>
                          {isRestricted(u) && (
                            <p className="text-[10px] text-yellow-400 font-bold flex items-center gap-1 mt-0.5">
                              <Clock size={10} />{restrictionLabel(u)}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <button
                          onClick={() => onViewProfile(u.uid)}
                          className="p-2 text-(--text-secondary) hover:text-(--brand-primary) transition-colors"
                          title="View Profile"
                        >
                          <ChevronRight size={18} />
                        </button>

                        {/* Action menu trigger */}
                        <div className="relative">
                          <button
                            onClick={(e) => { e.stopPropagation(); setOpenMenuUid(openMenuUid === u.uid ? null : u.uid); }}
                            className="p-2 text-(--text-secondary) hover:text-white hover:bg-(--brand-primary) rounded-full transition-colors"
                            title="Actions"
                          >
                            <ShieldCheck size={18} />
                          </button>

                          {openMenuUid === u.uid && (
                            <UserActionMenu
                              user={u}
                              currentUid={currentUid}
                              onDone={() => setOpenMenuUid(null)}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* ── Posts tab ── */}
              {activeTab === 'posts' && posts.map(p => (
                <div key={p.id} className="flex items-start justify-between p-4 bg-(--bg-input) rounded-2xl border border-(--glass-border) group">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-(--brand-primary)/10 text-(--brand-primary) rounded-xl flex items-center justify-center font-bold text-xl shrink-0">
                      {p.authorName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-(--text-primary)">{p.authorName}</h4>
                      <p className="text-sm text-(--text-secondary) mt-1 line-clamp-2">{p.content}</p>
                      {p.imageUrl && <p className="text-[10px] text-blue-500 mt-1 font-bold">IMAGE ATTACHED</p>}
                    </div>
                  </div>
                  <button onClick={() => handleDeletePost(p.id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors shrink-0">
                    <Trash2 size={20} />
                  </button>
                </div>
              ))}

              {/* ── Stories tab ── */}
              {activeTab === 'stories' && stories.map(s => (
                <div key={s.id} className="flex items-start justify-between p-4 bg-(--bg-input) rounded-2xl border border-(--glass-border) group">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 relative rounded-xl overflow-hidden bg-(--bg-input) shrink-0">
                      <img src={s.imageUrl} className="w-full h-full object-cover" alt="" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-(--text-primary)">{s.userName}</h4>
                      <p className="text-[10px] text-blue-500 mt-1 font-bold uppercase">{s.type || 'image'}</p>
                    </div>
                  </div>
                  <button onClick={() => handleDeleteStory(s.id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors shrink-0">
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
