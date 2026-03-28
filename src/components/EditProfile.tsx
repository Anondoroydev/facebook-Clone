import React, { useState } from 'react';
import { UserProfile } from '../types';
import { userService } from '../services/userService';
import { X, Camera, Loader2, User as UserIcon } from 'lucide-react';
import { compressImage } from '../utils/imageUtils';

interface EditProfileProps {
  user: UserProfile;
  onClose: () => void;
  onUpdate: (updatedUser: UserProfile) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export function EditProfile({ user, onClose, onUpdate, theme, onToggleTheme }: EditProfileProps) {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [bio, setBio] = useState(user.bio || '');
  const [photoURL, setPhotoURL] = useState(user.photoURL || '');
  const [coverPhotoURL, setCoverPhotoURL] = useState(user.coverPhotoURL || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updatedData = { displayName, bio, photoURL, coverPhotoURL };
      await userService.updateProfile(user.uid, updatedData);
      onUpdate({ ...user, ...updatedData });
      onClose();
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="glass-card shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-4 border-b border-(--glass-border) flex items-center justify-between">
          <h2 className="text-xl font-bold text-(--text-primary)">Settings</h2>
          <button onClick={onClose} className="p-2 hover:bg-(--fb-hover) rounded-full transition-colors">
            <X size={20} className="text-(--text-secondary)" />
          </button>
        </div>

        <div className="p-4 bg-(--bg-input) border-b border-(--glass-border)">
           <div className="flex items-center justify-between px-2">
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-(--brand-primary)/10 rounded-xl shadow-sm flex items-center justify-center text-(--brand-primary)">
                 {theme === 'light' ? <Camera size={20} /> : <Camera size={20} />} 
               </div>
               <div>
                  <p className="font-bold text-sm text-(--text-primary)">Dark Mode</p>
                  <p className="text-[10px] text-(--text-secondary) font-medium">Adjust appearance</p>
               </div>
             </div>
             <button 
               onClick={onToggleTheme}
               className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${theme === 'dark' ? 'bg-(--brand-primary)' : 'bg-(--divider)'}`}
             >
               <div className={`w-4 h-4 rounded-full transition-transform duration-300 ${theme === 'dark' ? 'translate-x-6 bg-(--text-primary)' : 'translate-x-0 bg-white'}`} />
             </button>
           </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Profile Photo Upload */}
          <div className="flex flex-col items-center">
            <div 
              onClick={() => document.getElementById('settings-profile-upload')?.click()}
              className="relative group cursor-pointer"
            >
              {photoURL ? (
                <img src={photoURL} alt="Profile" className="w-28 h-28 rounded-full object-cover border-4 border-(--bg-card) shadow-xl group-hover:opacity-90 transition-opacity" />
              ) : (
                <div className="w-28 h-28 rounded-full bg-(--brand-primary)/10 flex items-center justify-center text-(--brand-primary) border-4 border-(--bg-card) shadow-xl">
                  <UserIcon size={40} />
                </div>
              )}
              <div className="absolute bottom-1 right-1 bg-(--brand-primary) p-2 rounded-full text-white shadow-lg border-2 border-(--bg-card)">
                <Camera size={16} />
              </div>
              <input 
                id="settings-profile-upload"
                type="file" 
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const dataUrl = await compressImage(file, 400, 400, 0.8);
                    setPhotoURL(dataUrl);
                  }
                }}
              />
            </div>
            <p className="mt-2 text-xs font-bold text-(--text-secondary) opacity-70 uppercase tracking-widest">Profile Photo</p>
          </div>

          {/* Cover Photo Upload */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-(--text-secondary) uppercase tracking-wider mb-1">Cover Photo</label>
            <div 
              onClick={() => document.getElementById('settings-cover-upload')?.click()}
              className="h-32 w-full bg-(--bg-input) rounded-2xl overflow-hidden relative group cursor-pointer border-2 border-dashed border-(--glass-border) hover:border-(--brand-primary) transition-all"
            >
              {coverPhotoURL ? (
                <img src={coverPhotoURL} alt="Cover" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-(--text-secondary) opacity-70 gap-1">
                  <Camera size={24} />
                  <span className="text-xs font-semibold">Click to upload cover photo</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
              <input 
                id="settings-cover-upload"
                type="file" 
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const dataUrl = await compressImage(file, 1200, 400, 0.7);
                    setCoverPhotoURL(dataUrl);
                  }
                }}
              />
            </div>
          </div>

          <div className="h-px bg-(--glass-border) my-2" />

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-(--text-secondary) uppercase tracking-wider mb-1">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-2 bg-(--bg-input) border border-transparent text-(--text-primary) rounded-xl focus:ring-2 focus:ring-(--brand-primary)/50 focus:border-(--glass-border) outline-none transition-all font-semibold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-(--text-secondary) uppercase tracking-wider mb-1">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full px-4 py-2 bg-(--bg-input) border border-transparent text-(--text-primary) rounded-xl focus:ring-2 focus:ring-(--brand-primary)/50 focus:border-(--glass-border) outline-none transition-all resize-none h-20 font-medium"
                placeholder="Tell us about yourself..."
              />
            </div>

            <div className="hidden">
              <label className="block text-xs font-bold text-(--text-secondary) uppercase tracking-wider mb-1">Manual URLs (Advanced)</label>
              <input type="url" value={photoURL} onChange={(e) => setPhotoURL(e.target.value)} />
              <input type="url" value={coverPhotoURL} onChange={(e) => setCoverPhotoURL(e.target.value)} />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-(--brand-gradient) text-white font-black rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 mt-4 shadow-lg shadow-blue-500/30 uppercase tracking-wider text-sm"
          >
            {loading && <Loader2 className="animate-spin" size={20} />}
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>

  );
}
