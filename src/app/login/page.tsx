'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Mail, Lock, LogIn, ArrowRight, Shield, AlertCircle, X } from 'lucide-react';

declare global {
  interface Window {
    google: any;
  }
}

const decodeJwt = (token: string) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (err) {
    return null;
  }
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'analyst'>('analyst');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Google interactive modal states
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [gmailInput, setGmailInput] = useState('');
  const [gmailError, setGmailError] = useState('');

  // Load Google Identity Services SDK
  useEffect(() => {
    const clientID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (clientID) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);

      script.onload = () => {
        if (window.google) {
          window.google.accounts.id.initialize({
            client_id: clientID,
            callback: (response: any) => {
              const payload = decodeJwt(response.credential);
              if (payload && payload.email) {
                localStorage.setItem('riskpulse_role', 'analyst');
                localStorage.setItem('riskpulse_user', payload.email);
                if (payload.picture) localStorage.setItem('riskpulse_user_picture', payload.picture);
                if (payload.name) localStorage.setItem('riskpulse_user_name', payload.name);
                router.push('/dashboard');
              }
            }
          });
        }
      };

      return () => {
        if (document.body.contains(script)) {
          document.body.removeChild(script);
        }
      };
    }
  }, [router]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setError('');

    setTimeout(() => {
      setLoading(false);
      localStorage.setItem('riskpulse_role', role);
      localStorage.setItem('riskpulse_user', email);
      router.push('/dashboard');
    }, 800);
  };

  const selectDemoUser = (demoRole: 'admin' | 'analyst') => {
    setRole(demoRole);
    if (demoRole === 'admin') {
      setEmail('admin@riskpulse.io');
      setPassword('adminPass123');
    } else {
      setEmail('analyst@riskpulse.io');
      setPassword('analystPass123');
    }
  };

  const handleGoogleClick = () => {
    const clientID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (clientID && window.google) {
      window.google.accounts.id.prompt();
    } else {
      // Fallback to interactive Gmail input modal
      setShowGoogleModal(true);
      setGmailInput('');
      setGmailError('');
    }
  };

  const handleGmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const input = gmailInput.trim();
    if (!input) {
      setGmailError('Enter an email or phone number');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(input)) {
      setGmailError('Enter a valid email address');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setShowGoogleModal(false);
      localStorage.setItem('riskpulse_role', 'analyst');
      localStorage.setItem('riskpulse_user', input);
      router.push('/dashboard');
    }, 900);
  };

  return (
    <div className="min-h-screen bg-gray-955 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-[300px] h-[300px] bg-cyan-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main card panel */}
      <div className="w-full max-w-md bg-gray-900/80 border border-gray-805 rounded-3xl p-8 glass-panel shadow-2xl z-10">
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/35 mb-3">
            <ShieldCheck size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Welcome to RiskPulse</h1>
          <p className="text-xs text-gray-405 mt-1 font-semibold text-center max-w-[280px]">
            The unified cybersecurity & financial risk monitoring SaaS platform for MSPs.
          </p>
        </div>

        {/* Credentials choice tabs for demo convenience */}
        <div className="mb-6">
          <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 text-center">
            Select Role Profile for Demo
          </span>
          <div className="grid grid-cols-2 gap-2 bg-gray-955/60 p-1 rounded-xl border border-gray-855">
            <button
              type="button"
              onClick={() => selectDemoUser('analyst')}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                role === 'analyst'
                  ? 'bg-indigo-650 text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              MSP Analyst
            </button>
            <button
              type="button"
              onClick={() => selectDemoUser('admin')}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                role === 'admin'
                  ? 'bg-indigo-650 text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              MSP Administrator
            </button>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-955/50 border border-red-900/40 rounded-xl text-red-400 text-xs flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-555">
                <Mail size={16} />
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full bg-gray-955 border border-gray-805 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-555">
                <Lock size={16} />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-gray-955 border border-gray-805 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-semibold"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-850 text-white font-black py-3 px-4 rounded-xl shadow-lg shadow-indigo-600/25 transition-all duration-200 flex items-center justify-center gap-2 mt-6 cursor-pointer"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Sign In with RiskPulse</span>
                <LogIn size={16} />
              </>
            )}
          </button>
        </form>

        {/* OAuth Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-850" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-gray-900 px-3 text-gray-550 font-bold tracking-wider">
              Or continue with
            </span>
          </div>
        </div>

        {/* Google OAuth Button */}
        <button
          onClick={handleGoogleClick}
          className="w-full bg-gray-955 hover:bg-gray-850 border border-gray-800 text-gray-200 font-black py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2.5 transition-all duration-200 cursor-pointer"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>
      </div>

      {/* Google Account Selector Dialog Popup Modal */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-sans animate-in fade-in duration-200">
          <div className="bg-white rounded-lg w-full max-w-sm p-8 shadow-2xl relative border border-gray-200 text-gray-900">
            <button
              onClick={() => setShowGoogleModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 cursor-pointer border-none bg-transparent"
            >
              <X size={18} />
            </button>
            
            {/* Google Logo */}
            <div className="flex justify-center mb-6">
              <svg className="w-12" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            </div>

            <h3 className="text-center text-xl font-bold text-gray-900">Sign in</h3>
            <p className="text-center text-xs text-gray-600 mt-1 mb-6">to continue to RiskPulse</p>

            <form onSubmit={handleGmailSubmit} className="space-y-6">
              <div className="space-y-1 text-left">
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={gmailInput}
                    onChange={(e) => {
                      setGmailInput(e.target.value);
                      setGmailError('');
                    }}
                    placeholder="Email or phone"
                    className={`w-full border rounded px-3.5 py-3 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-semibold ${
                      gmailError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 bg-white'
                    }`}
                  />
                </div>
                {gmailError && (
                  <span className="text-[10px] text-red-500 font-bold flex items-center gap-1 pl-1">
                    <AlertCircle size={12} className="shrink-0" />
                    <span>{gmailError}</span>
                  </span>
                )}
              </div>

              <div className="text-[11px] text-gray-500 leading-relaxed font-semibold text-left">
                To continue, Google will share your name, email address, language preference, and profile picture with RiskPulse.
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setGmailInput('analyst@gmail.com');
                    setGmailError('');
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700 font-black cursor-pointer bg-transparent border-none"
                >
                  Demo Account
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs px-6 py-2 rounded shadow cursor-pointer transition-all disabled:opacity-50"
                >
                  {loading ? 'Signing in...' : 'Next'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="mt-8 text-center text-xs text-gray-500 font-semibold">
        <span>Protected by bank-grade security protocols. </span>
        <a href="#" className="text-indigo-400 hover:underline">
          Security Policy
        </a>
      </div>
    </div>
  );
}
