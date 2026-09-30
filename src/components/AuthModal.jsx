import React, { useState, useEffect } from 'react';
import { X, Mail, Lock, User, AlertCircle, CheckCircle2, ArrowRight, Loader2, Sparkles, KeyRound } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { syncOrProvisionProfile } from '../lib/profileSync';
import { soundManager } from '../utils/audio';

export default function AuthModal({
  isOpen,
  onClose,
  userProfile,
  onLoginSuccess,
}) {
  // Modes: 'signin' | 'signup' | 'forgot'
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setError('');
      setSuccessMsg('');
      setLoading(false);
      setGoogleLoading(false);
      if (mode === 'signup' && userProfile?.name && userProfile.name !== 'Player') {
        setDisplayName(userProfile.name);
      }
    }
  }, [isOpen, mode, userProfile]);

  if (!isOpen) return null;

  // 1. Google OAuth
  const handleGoogleSignIn = async () => {
    try {
      setError('');
      setSuccessMsg('');
      setGoogleLoading(true);

      const { data, error: oauthErr } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (oauthErr) {
        throw oauthErr;
      }
    } catch (err) {
      console.error('Google Sign In Error:', err);
      setError(err.message || 'Failed to initiate Google sign in.');
      setGoogleLoading(false);
    }
  };

  // 2. Email + Password (Sign In / Sign Up / Forgot)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }

    // Forgot Password Flow
    if (mode === 'forgot') {
      try {
        setLoading(true);
        const { error: resetErr } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: `${window.location.origin}/#reset-password`,
        });

        if (resetErr) throw resetErr;

        setSuccessMsg('Password reset link sent! Please check your email inbox.');
        soundManager.playVictory();
      } catch (err) {
        setError(err.message || 'Failed to send password reset email.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    // Sign Up Flow
    if (mode === 'signup') {
      const cleanName = displayName.trim();
      if (!cleanName || cleanName.length < 2) {
        setError('Display name must be at least 2 characters long.');
        return;
      }
      if (cleanName.length > 20) {
        setError('Display name cannot exceed 20 characters.');
        return;
      }

      try {
        setLoading(true);
        const { data, error: signUpErr } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              display_name: cleanName,
            },
          },
        });

        if (signUpErr) throw signUpErr;

        if (data?.user) {
          const profile = await syncOrProvisionProfile(data.user, data.session, cleanName);
          if (profile && onLoginSuccess) {
            onLoginSuccess(profile);
          }

          if (data.session) {
            setSuccessMsg(`Welcome to Wallbreaker, ${cleanName}!`);
            soundManager.playVictory();
            setTimeout(() => {
              onClose();
            }, 800);
          } else {
            setSuccessMsg('Account created! Please check your email to confirm registration.');
          }
        }
      } catch (err) {
        setError(err.message || 'Failed to create account.');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Sign In Flow
    if (mode === 'signin') {
      try {
        setLoading(true);
        const { data, error: signInErr } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (signInErr) throw signInErr;

        if (data?.user) {
          const profile = await syncOrProvisionProfile(data.user, data.session);
          if (profile && onLoginSuccess) {
            onLoginSuccess(profile);
          }

          setSuccessMsg(`Welcome back, ${profile?.name || 'Player'}!`);
          soundManager.playVictory();
          setTimeout(() => {
            onClose();
          }, 600);
        }
      } catch (err) {
        setError(err.message || 'Invalid email or password.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in select-none">
      <div className="relative w-full max-w-md bg-[#21201d] border border-[#3c3934] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#3c3934] flex items-center justify-between bg-[#272522]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">
                {mode === 'signin'
                  ? 'Sign in to Wallbreaker'
                  : mode === 'signup'
                  ? 'Create Free Account'
                  : 'Reset Password'}
              </h2>
              <p className="text-[11px] text-[#9e9c98]">Cross-device rating, stats & competitive matchmaking</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#1b1a17] hover:bg-[#3c3934] text-[#9e9c98] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Tabs: Sign In vs Sign Up */}
          {mode !== 'forgot' && (
            <div className="flex bg-[#181715] p-1 rounded-xl border border-[#3c3934]">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setError('');
                  setSuccessMsg('');
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  mode === 'signin'
                    ? 'bg-[#2b2926] text-white shadow-sm border border-[#48453f]'
                    : 'text-[#9e9c98] hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setError('');
                  setSuccessMsg('');
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  mode === 'signup'
                    ? 'bg-[#2b2926] text-white shadow-sm border border-[#48453f]'
                    : 'text-[#9e9c98] hover:text-white'
                }`}
              >
                Create Account
              </button>
            </div>
          )}

          {/* Google OAuth Button */}
          {mode !== 'forgot' && (
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading || loading}
              className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs shadow-md flex items-center justify-center gap-2.5 transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              {googleLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-800" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24">
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
              )}
              <span>Continue with Google</span>
            </button>
          )}

          {mode !== 'forgot' && (
            <div className="relative flex items-center justify-center">
              <div className="border-t border-[#3c3934] w-full" />
              <span className="bg-[#21201d] px-2.5 text-[10px] text-[#787571] uppercase tracking-wider font-semibold">
                or email
              </span>
            </div>
          )}

          {/* Feedback alerts */}
          {error && (
            <div className="p-3 rounded-xl bg-red-950/80 border border-red-800 text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'signup' && (
              <div>
                <label className="text-[11px] font-bold text-[#9e9c98] block mb-1">
                  Display Name (Max 20 chars)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#787571]">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={20}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Tactician_99"
                    className="w-full pl-9 pr-3 py-2.5 bg-[#181715] border border-[#3c3934] focus:border-[#81b64c] rounded-xl text-xs text-white placeholder-[#5a5753] outline-none transition-colors"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-[11px] font-bold text-[#9e9c98] block mb-1">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#787571]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-9 pr-3 py-2.5 bg-[#181715] border border-[#3c3934] focus:border-[#81b64c] rounded-xl text-xs text-white placeholder-[#5a5753] outline-none transition-colors"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-[#9e9c98]">Password</label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot');
                        setError('');
                        setSuccessMsg('');
                      }}
                      className="text-[10px] text-[#81b64c] hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#787571]">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full pl-9 pr-3 py-2.5 bg-[#181715] border border-[#3c3934] focus:border-[#81b64c] rounded-xl text-xs text-white placeholder-[#5a5753] outline-none transition-colors"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              {mode === 'forgot' ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signin');
                      setError('');
                      setSuccessMsg('');
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-[#272522] hover:bg-[#322f2b] text-[#9e9c98] hover:text-white border border-[#3c3934] font-bold text-xs transition-colors cursor-pointer"
                  >
                    Back to Sign In
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs shadow-lg flex items-center justify-center gap-1.5 transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                    <span>Send Reset Link</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-2.5 rounded-xl bg-[#272522] hover:bg-[#322f2b] text-[#9e9c98] hover:text-white border border-[#3c3934] font-bold text-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || googleLoading}
                    className="flex-1 py-2.5 rounded-xl bg-[#81b64c] hover:bg-[#95c85d] text-black font-extrabold text-xs shadow-lg flex items-center justify-center gap-1.5 transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-black" />
                    ) : (
                      <>
                        <span>{mode === 'signin' ? 'Sign In' : 'Create Account'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#181715] border-t border-[#3c3934] text-center text-[10px] text-[#787571]">
          Protected by Supabase Authentication • Competitive ratings encrypted
        </div>
      </div>
    </div>
  );
}
