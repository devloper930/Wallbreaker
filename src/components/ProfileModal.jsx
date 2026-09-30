import React, { useState, useEffect } from 'react';
import {
  AVAILABLE_AVATARS,
  AVAILABLE_FLAGS,
  RATING_TIERS,
  getTitleTierForRating,
  getNextTitleTier,
  getTitleForRating,
  saveUserProfile,
  resetUserProfileStats,
} from '../logic/profile';
import { supabase } from '../lib/supabaseClient';
import { X, Check, User, RotateCcw, Globe, Award, ShieldCheck, ChevronRight, Lock, LogIn, LogOut } from 'lucide-react';

export default function ProfileModal({ isOpen, onClose, profile, onProfileUpdated, onOpenAuthModal, onSignOut }) {
  const [name, setName] = useState(profile?.name || 'Player');
  const [selectedAvatar, setSelectedAvatar] = useState(profile?.avatar || '👤');
  const [selectedCountry, setSelectedCountry] = useState(profile?.country || '🌍');
  const [showAllTiers, setShowAllTiers] = useState(true);

  useEffect(() => {
    if (profile && isOpen) {
      setName(profile.name || 'Player');
      setSelectedAvatar(profile.avatar || '👤');
      setSelectedCountry(profile.country || '🌍');
    }
  }, [profile, isOpen]);

  if (!isOpen) return null;

  const currentRating = profile?.rating || 400;
  const currentTier = getTitleTierForRating(currentRating);
  const nextTier = getNextTitleTier(currentRating);

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    const cleanName = (name.trim() || 'Player').slice(0, 20);
    const updated = {
      ...profile,
      name: cleanName,
      avatar: selectedAvatar,
      country: selectedCountry,
      rating: currentRating,
      title: getTitleForRating(currentRating),
    };

    if (profile?.id) {
      try {
        await supabase
          .from('players')
          .update({
            display_name: cleanName,
            avatar: selectedAvatar,
            country: selectedCountry,
            updated_at: new Date().toISOString(),
          })
          .eq('id', profile.id);
      } catch (err) {
        console.error('Failed to update Supabase profile:', err);
      }
    } else {
      saveUserProfile(updated);
    }

    onProfileUpdated(updated);
    onClose();
  };

  const handleResetCareer = () => {
    if (window.confirm('Are you sure you want to reset your career, match history, and rating back to 400 Elo?')) {
      const reset = resetUserProfileStats();
      onProfileUpdated(reset);
    }
  };

  const totalGames = (profile.wins || 0) + (profile.losses || 0) + (profile.draws || 0);
  const winRate = totalGames > 0 ? Math.round(((profile.wins || 0) / totalGames) * 100) : 0;

  // Calculate progress toward next tier
  let progressPct = 100;
  let pointsNeeded = 0;
  if (nextTier) {
    const range = nextTier.minRating - currentTier.minRating;
    const currentOverMin = Math.max(0, currentRating - currentTier.minRating);
    progressPct = Math.min(100, Math.round((currentOverMin / range) * 100));
    pointsNeeded = Math.max(0, nextTier.minRating - currentRating);
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-[#21201d] border border-[#3c3934] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-5 py-4 bg-[#272522] border-b border-[#3c3934] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-[#81b64c]" />
            <h3 className="text-base font-bold text-white tracking-wide">PROFILE & CUSTOMIZATION</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-[#3c3934] text-[#9e9c98] hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Account Status / Cloud Sync Banner */}
          <div className="p-3 bg-[#1b1a17] border border-[#3c3934] rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className={`w-4 h-4 ${profile?.id ? 'text-[#81b64c]' : 'text-[#9e9c98]'}`} />
              <div>
                <span className="font-bold text-white block text-[11px]">
                  {profile?.id ? 'Supabase Account Active' : 'Guest Account'}
                </span>
                <span className="text-[10px] text-[#9e9c98]">
                  {profile?.email || (profile?.id ? 'Signed in' : 'Sign in to sync rating across devices')}
                </span>
              </div>
            </div>
            {profile?.id ? (
              onSignOut && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onSignOut();
                  }}
                  className="px-2.5 py-1 rounded-lg bg-[#272522] hover:bg-[#322f2b] text-red-400 hover:text-red-300 border border-[#3c3934] text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Sign Out</span>
                </button>
              )
            ) : (
              onOpenAuthModal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAuthModal();
                  }}
                  className="px-2.5 py-1 rounded-lg bg-[#81b64c] hover:bg-[#95c85d] text-black text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <LogIn className="w-3 h-3" />
                  <span>Sign In</span>
                </button>
              )
            )}
          </div>

          {/* Avatar Preview & Stats Card */}
          <div className="flex items-center gap-4 p-3.5 bg-[#272522] rounded-xl border border-[#3c3934]">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#81b64c] to-emerald-400 flex items-center justify-center text-3xl shadow-lg border-2 border-white/20 flex-shrink-0">
              {selectedAvatar}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base font-extrabold text-white truncate">{name || 'Player'}</span>
                <span>{selectedCountry}</span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold flex items-center gap-1 ${currentTier.bgBadge}`}
                >
                  <span>{currentTier.icon}</span>
                  <span>{currentTier.title}</span>
                </span>
              </div>
              <div className="text-xs text-[#9e9c98] font-mono mt-1 flex items-center gap-2">
                <span>Rating: <strong className="text-amber-400 font-bold text-sm">{currentRating}</strong> Elo</span>
                <span>•</span>
                <span className="text-emerald-400 font-semibold">{currentTier.name}</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] text-[#666461] mt-1 font-mono flex-wrap">
                <span>W: <strong className="text-emerald-400">{profile.wins || 0}</strong></span>
                <span>•</span>
                <span>L: <strong className="text-red-400">{profile.losses || 0}</strong></span>
                <span>•</span>
                <span>D: <strong className="text-amber-400">{profile.draws || 0}</strong></span>
                <span>•</span>
                <span>Rate: <strong className="text-white">{winRate}%</strong></span>
              </div>
            </div>
          </div>

          {/* Edit Display Name */}
          <div className="p-3.5 rounded-xl bg-[#1b1a17] border border-[#3c3934] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-white">
                Edit Player Name
              </span>
              <span className="text-[10px] font-mono text-[#81b64c] bg-[#272522] px-2 py-0.5 rounded border border-[#3c3934]">
                Display Name
              </span>
            </div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              maxLength={18}
              className="w-full px-3.5 py-2.5 bg-[#161512] border border-[#3c3934] focus:border-[#81b64c] rounded-xl text-white font-medium text-sm outline-none transition-colors"
            />
          </div>

          {/* Select Avatar */}
          <div className="p-3.5 rounded-xl bg-[#1b1a17] border border-[#3c3934] space-y-2.5">
            <label className="text-xs font-bold uppercase tracking-wider text-white block">
              Choose Avatar Icon
            </label>
            <div className="grid grid-cols-6 gap-2">
              {AVAILABLE_AVATARS.map((av) => (
                <button
                  type="button"
                  key={av.id}
                  onClick={() => setSelectedAvatar(av.icon)}
                  title={av.label}
                  className={`w-11 h-11 rounded-xl text-xl flex items-center justify-center transition-all ${
                    selectedAvatar === av.icon
                      ? 'bg-[#81b64c]/20 border-2 border-[#81b64c] scale-105 shadow-md shadow-[#81b64c]/20'
                      : 'bg-[#272522] border border-[#3c3934] hover:bg-[#3c3934]'
                  }`}
                >
                  {av.icon}
                </button>
              ))}
            </div>
          </div>

          {/* Select Country / Region */}
          <div className="p-3.5 rounded-xl bg-[#1b1a17] border border-[#3c3934] space-y-2.5">
            <label className="text-xs font-bold uppercase tracking-wider text-white block flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              <span>Country / Regional Flag</span>
            </label>
            <div className="grid grid-cols-6 gap-1.5">
              {AVAILABLE_FLAGS.map((f) => (
                <button
                  type="button"
                  key={f.code}
                  onClick={() => setSelectedCountry(f.flag)}
                  title={f.label}
                  className={`py-1.5 rounded-lg text-lg flex items-center justify-center transition-all ${
                    selectedCountry === f.flag
                      ? 'bg-[#2b2926] border-2 border-cyan-400 scale-105 shadow'
                      : 'bg-[#272522] border border-[#3c3934] hover:bg-[#3c3934]'
                  }`}
                >
                  {f.flag}
                </button>
              ))}
            </div>
          </div>

          {/* Title Badge Progression & Ranks Card (Automatic, Not User Selectable) */}
          <div className="p-3.5 rounded-xl bg-[#1b1a17] border border-[#3c3934] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-white">Title Badge & Rating Rank</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-mono font-bold px-2 py-0.5 rounded bg-[#272522] border border-[#3c3934]">
                Auto-Awarded
              </span>
            </div>

            <p className="text-[11px] text-[#9e9c98] leading-tight">
              Title badges are awarded automatically based on your competitive rating. Badges cannot be chosen manually—win matches to climb higher and maintain your rank!
            </p>

            {/* Next Tier Progression Gauge */}
            {nextTier ? (
              <div className="p-2.5 rounded-lg bg-[#272522] border border-[#3c3934] space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#9e9c98] flex items-center gap-1">
                    <span>Next Rank:</span>
                    <strong className="text-white font-bold">{nextTier.icon} {nextTier.title}</strong>
                    <span className="text-[10px] text-[#666461]">({nextTier.name})</span>
                  </span>
                  <span className="text-amber-400 font-mono font-bold text-[11px]">
                    {pointsNeeded} Elo needed
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-[#161512] overflow-hidden flex">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-amber-400 transition-all duration-500 rounded-full"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-[#666461]">
                  <span>{currentTier.title} ({currentTier.minRating})</span>
                  <span>{currentRating} Elo</span>
                  <span>{nextTier.title} ({nextTier.minRating})</span>
                </div>
              </div>
            ) : (
              <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-600/40 text-rose-300 text-xs font-bold flex items-center gap-2">
                <span>🏆</span>
                <span>You have attained the supreme rank of World Champion ({currentRating} Elo)!</span>
              </div>
            )}

            {/* Ranked Tier List */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[11px] font-bold text-[#9e9c98] px-1">
                <span>ALL COMPETITIVE TITLE TIERS</span>
                <span>REQ. RATING</span>
              </div>
              <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
                {RATING_TIERS.map((tier) => {
                  const isCurrent = currentTier.title === tier.title;
                  const isUnlocked = currentRating >= tier.minRating;

                  return (
                    <div
                      key={tier.title}
                      className={`p-2 rounded-lg border flex items-center justify-between transition-all ${
                        isCurrent
                          ? 'bg-[#2b2926] border-emerald-500/80 shadow-md ring-1 ring-emerald-400/50'
                          : isUnlocked
                          ? 'bg-[#21201d] border-[#3c3934] text-[#9e9c98]'
                          : 'bg-[#1b1a17]/60 border-[#2d2b27] text-[#666461] opacity-70'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base flex-shrink-0">{tier.icon}</span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-xs font-mono font-bold ${isCurrent ? 'text-emerald-400 font-extrabold' : 'text-white'}`}>
                              {tier.title}
                            </span>
                            <span className="text-[10px] text-[#9e9c98] truncate">
                              ({tier.name})
                            </span>
                            {isCurrent && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-600 font-bold uppercase font-sans">
                                Active Badge
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-[#666461] truncate">
                            {tier.description}
                          </div>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0 ml-2 font-mono">
                        <span className={`text-xs font-bold ${isCurrent ? 'text-amber-400' : isUnlocked ? 'text-white' : 'text-[#666461]'}`}>
                          {tier.maxRating === Infinity ? `${tier.minRating}+` : `${tier.minRating} - ${tier.maxRating}`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Action Buttons: Save & Reset */}
          <div className="pt-2 space-y-2">
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-[#81b64c] hover:bg-[#95c85d] text-black font-extrabold text-sm shadow-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Save Changes</span>
            </button>

            <button
              type="button"
              onClick={handleResetCareer}
              className="w-full py-2 text-[11px] text-[#9e9c98] hover:text-red-400 transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Career (Back to 400 Elo & 0 Stats)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
