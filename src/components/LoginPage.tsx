import React, { useState } from 'react';
import { auth } from '../firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword
} from 'firebase/auth';
import { LogIn, UserPlus, Mail, Lock, Chrome, X } from 'lucide-react';

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
    <div className="min-h-screen bg-(--bg-main) flex items-center justify-center p-6 transition-colors duration-500 selection:bg-(--brand-primary)/20 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-(--brand-primary)/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-(--brand-secondary)/10 blur-[120px] rounded-full" />

      <div className="max-w-[1240px] w-full flex flex-col lg:flex-row items-center justify-between gap-16 lg:gap-24 relative z-10">

        {/* Left Side: Brand info */}
        <div className="flex-1 text-center lg:text-left">
          <div className="w-20 h-20 bg-(--brand-gradient) rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-blue-500/30 mb-8 mx-auto lg:mx-0">
            <span className="text-5xl font-black tracking-tighter italic">S</span>
          </div>
          <h1 className="text-6xl lg:text-8xl font-black mb-8 tracking-tight bg-(--brand-gradient) bg-clip-text text-transparent leading-none">
            Connect.<br />Share.<br />Enjoy.
          </h1>
          <p className="text-(--text-secondary) text-xl lg:text-2xl leading-relaxed font-medium max-w-[500px]">
            SocialConnect helps you bridge the gap with the people you care about most.
          </p>
        </div>


        {/* Right Side: Login Card */}
        <div className="flex-1 max-w-[440px] w-full">
          <div className="glass-card shadow-[0_32px_64px_-12px_rgba(0,0,0,0.15)] p-8 border border-(--glass-border) animate-fade-in">

            <form onSubmit={handleEmailAuth} className="space-y-4">
              <input
                type="email"
                placeholder="Email address"
                className="w-full premium-input h-14"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <input
                type="password"
                placeholder="Password"
                className="w-full premium-input h-14"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              {error && (
                <div className="bg-red-50/50 backdrop-blur-sm border border-red-200/50 text-red-600 px-4 py-3 rounded-xl text-sm text-center font-medium">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full premium-button text-lg h-14"
              >
                {loading ? 'Entering...' : 'Sign In'}
              </button>
              
              <div className="text-center">
                <button type="button" className="text-(--text-secondary) text-sm hover:text-(--brand-primary) transition-colors">Forgotten password?</button>
              </div>

              <div className="border-t border-(--divider) my-8 pt-8 text-center">
                <button
                  type="button"
                  onClick={() => setIsRegister(true)}
                  className="bg-(--bg-input) hover:bg-(--fb-hover) text-(--text-primary) font-bold py-4 px-10 rounded-xl text-[17px] transition-all border border-(--divider)"
                >
                  Join SocialConnect Today
                </button>
              </div>
            </form>

            <div className="mt-6">
              <button 
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 bg-white border border-(--divider) hover:bg-gray-50 text-(--text-primary) font-bold py-3.5 rounded-xl transition-all"
              >
                <Chrome size={20} className="text-blue-500" />
                Continue with Google
              </button>
            </div>
          </div>
        </div>
      </div>

      {isRegister && ( 
        <div className="fixed inset-0 bg-(--bg-main)/70 backdrop-blur-md z-[100] flex items-center justify-center p-4"> 
          <div className="max-w-[480px] w-full glass-card shadow-[0_32px_64px_-12px_rgba(0,0,0,0.15)] overflow-hidden animate-in zoom-in-95 duration-300 border border-(--glass-border) p-8"> 
            <div className="mb-8 flex items-center justify-between"> 
              <div> 
                <h2 className="text-4xl font-black text-(--text-primary) tracking-tight">Join Us</h2> 
                <p className="text-[17px] text-(--text-secondary) font-medium">Create your SocialConnect account.</p> 
              </div> 
              <button onClick={() => setIsRegister(false)} className="text-(--text-secondary) hover:bg-(--fb-hover) p-2 rounded-full transition-colors"> 
                <X size={28} /> 
              </button> 
            </div> 
            <div> 
              <form onSubmit={handleEmailAuth} className="space-y-6"> 
                <input type="email" placeholder="Email address" className="w-full premium-input py-4 px-4 text-[16px] font-medium" value={email} onChange={(e) => setEmail(e.target.value)} required /> 
                <input type="password" placeholder="New password" className="w-full premium-input py-4 px-4 text-[16px] font-medium" value={password} onChange={(e) => setPassword(e.target.value)} required /> 
                <p className="text-[13px] text-(--text-secondary) leading-relaxed">By joining, you agree to our <span className="text-(--brand-primary) font-semibold cursor-pointer">Terms</span> and <span className="text-(--brand-primary) font-semibold cursor-pointer">Privacy Policy</span>.</p> 
                <div className="pt-4"> 
                  <button type="submit" className="w-full premium-button text-lg h-14">Start Connecting</button> 
                </div> 
              </form> 
            </div> 
          </div> 
        </div> 
      )}
    </div>
  );
};
