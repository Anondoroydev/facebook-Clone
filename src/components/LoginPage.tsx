import React, { useState } from 'react';
import { auth } from '../firebase';
import {
  signInWithPopup,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { Mail, Lock, X, Loader2, Zap, Users, Heart, Globe } from 'lucide-react';

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const features = [
  { icon: Users, text: 'Connect with friends & family' },
  { icon: Heart, text: 'Share your life moments' },
  { icon: Zap, text: 'Real-time chat & calls' },
  { icon: Globe, text: 'Discover new communities' },
];

export const LoginPage: React.FC = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      setError(err.message || 'Google login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isRegister) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex overflow-hidden relative select-none">
      {/* Animated blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-600/20 blur-[160px] rounded-full animate-pulse" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-purple-600/20 blur-[160px] rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-indigo-500/10 blur-[100px] rounded-full" />

      {/* Grid overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
        backgroundSize: '60px 60px'
      }} />

      <div className="relative z-10 flex flex-col lg:flex-row w-full min-h-screen">

        {/* Left Panel */}
        <div className="hidden lg:flex flex-1 flex-col justify-center px-16 xl:px-24">
          {/* Logo */}
          <div className="flex items-center gap-4 mb-16">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-blue-500/40">
              <span className="text-white text-2xl font-black italic">S</span>
            </div>
            <span className="text-white text-2xl font-black tracking-tight">SocialConnect</span>
          </div>

          {/* Headline */}
          <h1 className="text-7xl xl:text-8xl font-black text-white leading-[1.05] tracking-tight mb-8">
            Connect.<br />
            <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Share.</span><br />
            Belong.
          </h1>

          <p className="text-white/50 text-xl leading-relaxed font-medium mb-16 max-w-[460px]">
            Join millions of people who use SocialConnect to stay in touch with the people they love.
          </p>

          {/* Feature pills */}
          <div className="space-y-4">
            {features.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-4 group">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-blue-500/20 group-hover:border-blue-500/30 transition-all">
                  <Icon size={18} className="text-blue-400" />
                </div>
                <span className="text-white/60 font-medium">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel: Auth Card */}
        <div className="flex flex-1 items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-[420px]">

            {/* Mobile logo */}
            <div className="flex items-center gap-3 mb-10 lg:hidden justify-center">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-xl">
                <span className="text-white text-xl font-black italic">S</span>
              </div>
              <span className="text-white text-xl font-black tracking-tight">SocialConnect</span>
            </div>

            {/* Card */}
            <div className="bg-white/[0.05] backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-[0_32px_80px_-12px_rgba(0,0,0,0.6)]">
              <h2 className="text-3xl font-black text-white mb-1">Welcome back</h2>
              <p className="text-white/40 text-sm mb-8 font-medium">Sign in to continue your journey</p>

              {/* Google button */}
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-800 font-bold py-4 rounded-2xl transition-all duration-200 mb-6 shadow-lg hover:shadow-xl active:scale-[0.99] disabled:opacity-70"
              >
                {loading ? <Loader2 size={20} className="animate-spin text-blue-500" /> : <GoogleIcon />}
                <span>Continue with Google</span>
              </button>

              {/* Divider */}
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-white/30 text-sm font-medium">or</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              {/* Email form */}
              <form onSubmit={handleEmailAuth} className="space-y-4">
                <div className="relative">
                  <Mail size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                  <input
                    type="email"
                    placeholder="Email address"
                    className="w-full bg-white/[0.07] border border-white/10 text-white placeholder-white/25 rounded-2xl py-4 pl-11 pr-4 outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all text-sm font-medium"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="relative">
                  <Lock size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                  <input
                    type="password"
                    placeholder="Password"
                    className="w-full bg-white/[0.07] border border-white/10 text-white placeholder-white/25 rounded-2xl py-4 pl-11 pr-4 outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all text-sm font-medium"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm text-center font-medium">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-black py-4 rounded-2xl transition-all duration-200 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 active:scale-[0.99] disabled:opacity-70 text-base mt-2"
                >
                  {loading ? <Loader2 size={20} className="animate-spin mx-auto" /> : 'Sign In'}
                </button>
              </form>

              {/* Register */}
              <div className="mt-6 text-center">
                <span className="text-white/30 text-sm">Don't have an account? </span>
                <button
                  type="button"
                  onClick={() => setIsRegister(true)}
                  className="text-blue-400 text-sm font-bold hover:text-blue-300 transition-colors"
                >
                  Create one
                </button>
              </div>
            </div>

            <p className="text-center text-white/20 text-xs mt-6 font-medium">
              By signing in, you agree to our Terms & Privacy Policy.
            </p>
          </div>
        </div>
      </div>

      {/* Register Modal */}
      {isRegister && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="w-full max-w-[420px] bg-[#0f172a] border border-white/10 rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-black text-white">Join Us</h2>
                <p className="text-white/40 text-sm font-medium mt-1">Create your free account</p>
              </div>
              <button
                onClick={() => setIsRegister(false)}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-white/50 transition-colors border border-white/10"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div className="relative">
                <Mail size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="email"
                  placeholder="Email address"
                  className="w-full bg-white/[0.07] border border-white/10 text-white placeholder-white/25 rounded-2xl py-4 pl-11 pr-4 outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all text-sm font-medium"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="relative">
                <Lock size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="password"
                  placeholder="Choose a strong password"
                  className="w-full bg-white/[0.07] border border-white/10 text-white placeholder-white/25 rounded-2xl py-4 pl-11 pr-4 outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all text-sm font-medium"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm text-center font-medium">
                  {error}
                </div>
              )}

              <p className="text-white/25 text-xs leading-relaxed pt-1">
                By joining, you agree to our <span className="text-blue-400 cursor-pointer">Terms</span> and <span className="text-blue-400 cursor-pointer">Privacy Policy</span>.
              </p>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-black py-4 rounded-2xl transition-all duration-200 shadow-lg shadow-blue-500/30 active:scale-[0.99] disabled:opacity-70 text-base"
              >
                {loading ? <Loader2 size={20} className="animate-spin mx-auto" /> : 'Start Connecting ✨'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
