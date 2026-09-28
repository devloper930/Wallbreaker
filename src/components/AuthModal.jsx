import React, { useState, useEffect } from 'react';
import { X, User, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { soundManager } from '../utils/audio';
import { getTitleTierForRating } from '../logic/profile';

export default function AuthModal({
  isOpen,
  onClose,
  userProfile,
  onLoginSuccess,
}) {
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setDisplayName(userProfile?.name && userProfile.name !== 'Player' ? userProfile.name : '');
      setError('');
      setSuccessMsg('');
    }
  }, [isOpen, userProfile]);

  if (!isOpen) return null;

  const currentRating = userProfile?.rating || 400;
  const currentTier = getTitleTierForRating(currentRating);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const trimmed = displayName.trim();
    if (!trimmed) {
      setError('Please enter a display name.');
      return;
    }

    if (trimmed.length < 2) {
      setError('Display name must be at least 2 characters.');
      return;
    }

    if (trimmed.length > 20) {
      setError('Display name cannot exceed 20 characters.');
      return;
    }

    // Strip HTML/script-like characters
    const sanitized = trimmed.replace(/[<>{}[\]\\\/]/g, '');
    if (!sanitized) {
      setError('Please use valid alphanumeric characters for your name.');
      return;
    }

    const updated = {
      ...userProfile,
      name: sanitized,
      isLoggedIn: true,
      authProvider: 'local',
      v: 2,
    };

    setSuccessMsg(`Display name set to "${sanitized}"!`);
    soundManager.playVictory();

    if (onLoginSuccess) {
      onLoginSuccess(updated);
    }

    setTimeout(() => {
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in select-none">
      <div className="relative w-full max-w-md bg-[#21201d] border border-[#3c3934] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#3c3934] flex items-center justify-between bg-[#272522]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#81b64c]/20 border border-[#81b64c]/40 flex items-center justify-center text-[#81b64c]">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">
                Choose Display Name
              </h2>
              <p className="text-[11px] text-[#9e9c98]">Local profile for matches & stats</p>
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
          {/* Honest Local Profile Banner */}
          <div className="p-3 rounded-xl bg-[#1b1a17] border border-[#3c3934] flex items-start gap-2.5 text-xs text-[#b8b6b2]">
            <span className="text-base leading-none mt-0.5">💾</span>
            <div className="space-y-1">
              <span className="font-bold text-white block">Device-Local Profile</span>
              <p className="text-[11px] text-[#9e9c98] leading-relaxed">
                This name and your stats are saved on <strong>this device only</strong>. No account or password is created, and no personal data is sent to a server.
              </p>
            </div>
          </div>

          {/* Notification Messages */}
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
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[11px] font-bold text-[#9e9c98] block mb-1">
                Display Name (Max 20 chars)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#9e9c98]">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  autoFocus
                  maxLength={20}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Tactician_99"
                  className="w-full pl-9 pr-3 py-2.5 bg-[#1b1a17] border border-[#3c3934] focus:border-[#81b64c] rounded-xl text-sm text-white placeholder-[#666461] outline-none transition-colors"
                />
              </div>
            </div>

            {/* Live Profile Preview */}
            <div className="p-3 bg-[#1b1a17] border border-[#3c3934] rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#81b64c] to-emerald-500 flex items-center justify-center text-xl shadow">
                  {userProfile?.avatar || '👤'}
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>{displayName.trim() || 'Player'}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold bg-[#272522] border border-[#3c3934] text-[#81b64c]">
                      {currentTier.badge}
                    </span>
                  </div>
                  <div className="text-[10px] text-[#9e9c98]">
                    Rating: <span className="font-mono text-white font-bold">{currentRating}</span> • {currentTier.name}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl bg-[#272522] hover:bg-[#322f2b] text-[#9e9c98] hover:text-white border border-[#3c3934] font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-[#81b64c] hover:bg-[#95c85d] text-black font-extrabold text-xs shadow-lg flex items-center justify-center gap-1.5 transition-all active:scale-[0.99] cursor-pointer"
              >
                <span>Save Profile</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#1b1a17] border-t border-[#3c3934] text-center text-[10px] text-[#9e9c98]">
          Saved in browser localStorage • Play online or offline anytime
        </div>
      </div>
    </div>
  );
}
