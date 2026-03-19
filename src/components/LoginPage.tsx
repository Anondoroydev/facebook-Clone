import React, { useState } from 'react';
import { auth } from '../firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  getAuth
} from 'firebase/auth';
import { LogIn, UserPlus, Mail, Lock, Chrome } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    if (loading) {
      console.log('Login already in progress, ignoring click.');
      return;
    }

    console.log('Starting Google Login...');
    setLoading(true);
    setError('');

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });

      console.log('Attempting signInWithPopup...');
      // Use the stable auth instance from the import
      const result = await signInWithPopup(auth, provider);
      console.log('Google Login Success:', result.user.uid);
    } catch (err: any) {
      console.error('Google Login Error:', err);
      
      // Handle specific Firebase Auth errors
      if (err.code === 'auth/unauthorized-domain') {
        setError(`Unauthorized Domain: Please add "${window.location.hostname}" to your Firebase Console.`);
      } else if (err.code === 'auth/popup-blocked') {
        setError('The login popup was blocked by your browser. Please allow popups for this site.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('The login window was closed. Please try again.');
      } else if (err.code === 'auth/cancelled-popup-request') {
        setError('A login request was already in progress. Please wait a moment.');
      } else if (err.message?.includes('Pending promise was never set')) {
        setError('A technical error occurred with the login popup. Please refresh the page and try again.');
      } else {
        setError(err.message || 'Google login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Starting Email Auth...', isRegister ? 'Register' : 'Login');
    setLoading(true);
    setError('');
    try {
      if (isRegister) {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        console.log('Register Success:', result.user.uid);
      } else {
        const result = await signInWithEmailAndPassword(auth, email, password);
        console.log('Login Success:', result.user.uid);
      }
    } catch (err: any) {
      console.error('Email Auth Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-blue-600 mb-2">SocialConnect</h1>
            <p className="text-gray-500">Connect with friends and the world around you.</p>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="email"
                placeholder="Email address"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-11 pr-4 outline-none focus:border-blue-400 transition-colors"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="password"
                placeholder="Password"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-11 pr-4 outline-none focus:border-blue-400 transition-colors"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm mb-4">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {isRegister ? <UserPlus size={20} /> : <LogIn size={20} />}
              {loading ? 'Processing...' : isRegister ? 'Create Account' : 'Log In'}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500 uppercase">Or continue with</span>
            </div>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white border border-gray-200 hover:bg-gray-50 disabled:bg-gray-100 text-gray-700 font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <Chrome size={20} className="text-red-500" />
            Google
          </button>

          <div className="mt-8 text-center">
            <button
              onClick={() => setIsRegister(!isRegister)}
              className="text-blue-600 font-semibold hover:underline"
            >
              {isRegister ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
