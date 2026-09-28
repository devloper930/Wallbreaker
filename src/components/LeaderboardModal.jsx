import React, { useState, useMemo } from 'react';
import {
  Trophy,
  X,
  Search,
  Sparkles,
  TrendingUp,
  Award,
  ChevronRight,
  Shield,
  Zap,
} from 'lucide-react';
import { getGlobalLeaderboard } from '../logic/leaderboard';
import { getTitleTierForRating } from '../logic/profile';

export default function LeaderboardModal({
  isOpen,
  onClose,
  userProfile,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all'); // 'all' | 'champion' | 'gm' | 'master'

  const { top3, top100, userStanding } = useMemo(
    () => getGlobalLeaderboard(userProfile),
    [userProfile]
  );

  const filteredRankings = useMemo(() => {
    return top100.filter((player) => {
      const matchesSearch = player.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
      if (!matchesSearch) return false;

      if (selectedFilter === 'gm') return player.rating >= 2300;
      if (selectedFilter === 'im') return player.rating >= 2000 && player.rating < 2300;
      if (selectedFilter === 'fm') return player.rating >= 1700 && player.rating < 2000;
      if (selectedFilter === 'nm') return player.rating >= 1500 && player.rating < 1700;
      if (selectedFilter === 'cm') return player.rating >= 1300 && player.rating < 1500;

      return true;
    });
  }, [top100, searchQuery, selectedFilter]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in select-none">
      <div className="relative w-full max-w-3xl bg-[#21201d] border border-[#3c3934] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#3c3934] flex items-center justify-between bg-[#272522]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-slate-900 shadow-md flex-shrink-0">
              <Trophy className="w-5 h-5 fill-slate-900" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white tracking-wide flex items-center gap-2">
                <span>Top 100 Global Rankings</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold">
                  Play Online Elo
                </span>
              </h2>
              <p className="text-xs text-[#9e9c98]">Rankings updated dynamically from competitive matches</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#1b1a17] hover:bg-[#3c3934] text-[#9e9c98] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User Standing Sticky Highlight Bar */}
        <div className="p-3.5 bg-gradient-to-r from-[#2b2926] via-[#24221f] to-[#2b2926] border-b border-[#3c3934] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative">
              <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#81b64c] to-emerald-400 flex items-center justify-center text-xl shadow border border-white/20">
                {userStanding.avatar}
              </div>
              <span className="absolute -bottom-1 -right-1 text-xs">{userStanding.country}</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white truncate">{userStanding.name}</span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#1b1a17] text-[#81b64c] font-bold border border-[#3c3934]">
                  {userStanding.title}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-[#81b64c]/20 text-[#81b64c] border border-[#81b64c]/40">
                  YOU
                </span>
              </div>
              <div className="text-[11px] text-[#9e9c98] mt-0.5 flex items-center gap-2 font-mono">
                <span>Rating: <strong className="text-white">{userStanding.rating}</strong></span>
                <span>•</span>
                <span>W: <strong className="text-emerald-400">{userStanding.wins}</strong></span>
                <span>•</span>
                <span>L: <strong className="text-red-400">{userStanding.losses}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <div className="text-right font-mono">
              <div className="text-[10px] uppercase font-bold text-[#9e9c98]">Your Global Rank</div>
              <div className="text-base font-extrabold text-amber-400">
                #{userStanding.rank}
              </div>
            </div>
            {!userStanding.isInTop100 && (
              <div className="text-[11px] px-2.5 py-1 rounded-lg bg-[#1b1a17] border border-[#3c3934] text-[#9e9c98] font-mono">
                <span className="text-amber-400 font-bold">+{userStanding.pointsToTop100} Elo</span> to Top 100
              </div>
            )}
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="px-5 py-3 border-b border-[#3c3934] flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#1b1a17]">
          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#9e9c98]">
              <Search className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search player name..."
              className="w-full pl-8 pr-3 py-1.5 bg-[#21201d] border border-[#3c3934] focus:border-[#81b64c] rounded-xl text-xs text-white placeholder-[#666461] outline-none transition-colors"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto text-[11px]">
            {[
              { id: 'all', label: 'All Top 100' },
              { id: 'gm', label: '👑 GM (2300+)' },
              { id: 'im', label: '💎 IM (2000+)' },
              { id: 'fm', label: '🔮 FM (1700+)' },
              { id: 'nm', label: '⚔️ NM (1500+)' },
              { id: 'cm', label: '🎯 CM (1300+)' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedFilter(f.id)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                  selectedFilter === f.id
                    ? 'bg-[#81b64c] text-black shadow'
                    : 'bg-[#272522] text-[#9e9c98] hover:text-white border border-[#3c3934]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Top 100 Rankings Table */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-2">
          {filteredRankings.length === 0 ? (
            <div className="p-8 text-center text-[#9e9c98] text-xs">
              No players found matching your search.
            </div>
          ) : (
            filteredRankings.map((player) => {
              const tier = getTitleTierForRating(player.rating);
              const isFirst = player.rank === 1;
              const isSecond = player.rank === 2;
              const isThird = player.rank === 3;
              const isPodium = player.rank <= 3;

              return (
                <div
                  key={player.id}
                  className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                    player.isCurrentUser
                      ? 'bg-[#81b64c]/10 border-[#81b64c] shadow-lg shadow-[#81b64c]/10'
                      : isFirst
                      ? 'bg-gradient-to-r from-amber-500/10 via-[#272522] to-[#21201d] border-amber-500/40 hover:border-amber-400'
                      : isSecond
                      ? 'bg-gradient-to-r from-slate-300/10 via-[#272522] to-[#21201d] border-slate-400/40 hover:border-slate-300'
                      : isThird
                      ? 'bg-gradient-to-r from-amber-700/10 via-[#272522] to-[#21201d] border-amber-700/40 hover:border-amber-600'
                      : 'bg-[#272522] border-[#3c3934] hover:border-[#504c45]'
                  }`}
                >
                  {/* Left: Rank & Player info */}
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Rank Badge */}
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs font-mono flex-shrink-0 ${
                        isFirst
                          ? 'bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 shadow-md shadow-amber-500/30'
                          : isSecond
                          ? 'bg-gradient-to-tr from-slate-300 to-slate-100 text-slate-950 shadow-md'
                          : isThird
                          ? 'bg-gradient-to-tr from-amber-700 to-amber-500 text-white shadow-md'
                          : 'bg-[#1b1a17] text-[#9e9c98] border border-[#3c3934]'
                      }`}
                    >
                      {isFirst ? '🥇' : isSecond ? '🥈' : isThird ? '🥉' : `#${player.rank}`}
                    </div>

                    {/* Avatar & Flag */}
                    <div className="relative flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#2b2926] to-[#3c3934] flex items-center justify-center text-lg border border-[#504c45]">
                        {player.avatar}
                      </div>
                      <span className="absolute -bottom-1 -right-1 text-xs">
                        {player.country}
                      </span>
                    </div>

                    {/* Name & Title */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-xs font-bold text-white truncate">
                          {player.name}
                        </span>
                        <span
                          className={`text-[9px] font-mono px-1 rounded border font-bold flex items-center gap-0.5 ${tier.bgBadge}`}
                        >
                          <span>{tier.icon}</span>
                          <span>{tier.title}</span>
                        </span>
                        {player.isCurrentUser && (
                          <span className="text-[9px] px-1 py-0.2 rounded font-mono font-bold bg-[#81b64c] text-black">
                            YOU
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#9e9c98] mt-0.5 flex items-center gap-2 font-mono">
                        <span className="text-emerald-400 font-semibold">{player.winRate}% Win</span>
                        <span>•</span>
                        <span>{player.wins}W / {player.losses}L</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Elo Rating */}
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm sm:text-base font-black font-mono text-amber-400">
                      {player.rating}
                    </div>
                    <div className="text-[10px] text-[#666461] uppercase tracking-wider font-mono">
                      Rating
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#1b1a17] border-t border-[#3c3934] flex items-center justify-between text-xs text-[#9e9c98]">
          <span>Play Online ranked matches to earn Elo and climb the Top 100!</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-[#272522] hover:bg-[#3c3934] text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
