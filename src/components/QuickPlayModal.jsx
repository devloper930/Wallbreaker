import React, { useState, useEffect, useRef } from 'react';
import { X, Search, User, Shield, Zap, CheckCircle2 } from 'lucide-react';
import { soundManager } from '../utils/audio';
import { getTitleForRating, MATCH_PLAYERS_POOL } from '../logic/profile';

export default function QuickPlayModal({
  isOpen,
  onClose,
  userProfile,
  onMatchFound,
  socket,
  mode = 'classic',
  timeControlKey = 'BLITZ_3',
  boardSize = 9,
}) {
  const [stage, setStage] = useState('searching'); // 'searching' | 'found'
  const [matchedOpponent, setMatchedOpponent] = useState(null);
  const [searchRange, setSearchRange] = useState(50);
  const matchDataRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      setStage('searching');
      setMatchedOpponent(null);
      setSearchRange(50);
      matchDataRef.current = null;
      if (socket && socket.connected) {
        socket.emit('matchmaking:cancel');
      }
      return;
    }

    setStage('searching');
    setMatchedOpponent(null);
    matchDataRef.current = null;
    let launchTimer = null;
    let fallbackTimer = null;
    let hasMatched = false;

    // Simulate expanding rating search
    const rangeInterval = setInterval(() => {
      setSearchRange((prev) => Math.min(prev + 25, 200));
    }, 700);

    const handleMatchSuccess = (matchData) => {
      if (hasMatched) return;
      hasMatched = true;
      clearInterval(rangeInterval);
      if (fallbackTimer) clearTimeout(fallbackTimer);

      matchDataRef.current = matchData;
      const opp = matchData.opponent;
      setMatchedOpponent(opp);
      setStage('found');
      soundManager.playVictory();

      launchTimer = setTimeout(() => {
        onMatchFound(matchData, { mode, timeControlKey, boardSize });
      }, 1400);
    };

    if (socket) {
      if (!socket.connected) {
        socket.connect();
      }

      socket.on('matchmaking:matched', handleMatchSuccess);

      socket.emit('matchmaking:find', {
        mode,
        timeControlKey,
        boardSize,
        player: {
          name: userProfile?.name || 'Player',
          rating: userProfile?.rating || 400,
          avatar: userProfile?.avatar || '👤',
          title: userProfile?.title || getTitleForRating(userProfile?.rating || 400),
          country: userProfile?.country || '🌐',
        },
      });
    }

    // Safety fallback: if socket server is unavailable or delay exceeds 5.5s,
    // match locally with AI engine portrayed 100% as a real player
    fallbackTimer = setTimeout(() => {
      if (hasMatched) return;
      const baseOpp = MATCH_PLAYERS_POOL[Math.floor(Math.random() * MATCH_PLAYERS_POOL.length)];
      const ratingOffset = Math.floor(Math.random() * 80) - 40;
      const oppRating = Math.max(100, (userProfile?.rating || 400) + ratingOffset);

      const opp = {
        name: baseOpp.name,
        avatar: baseOpp.avatar,
        title: getTitleForRating(oppRating),
        country: baseOpp.country,
        rating: oppRating,
      };

      handleMatchSuccess({
        isRealPlayer: false,
        opponent: opp,
        mode,
        timeControlKey,
        boardSize,
      });
    }, 5500);

    return () => {
      clearInterval(rangeInterval);
      if (fallbackTimer) clearTimeout(fallbackTimer);
      if (launchTimer) clearTimeout(launchTimer);
      if (socket) {
        socket.off('matchmaking:matched', handleMatchSuccess);
        socket.emit('matchmaking:cancel');
      }
    };
  }, [isOpen, socket, userProfile, onMatchFound, mode, timeControlKey, boardSize]);

  if (!isOpen) return null;

  const userRating = userProfile?.rating || 400;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in select-none">
      <div className="w-full max-w-sm bg-[#21201d] border border-[#3c3934] rounded-2xl shadow-2xl overflow-hidden p-6 text-center space-y-6 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#3c3934]">
          <div className="text-left">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#81b64c]" />
              Quick Play Matchmaking
            </h3>
            <div className="text-[10px] font-mono text-[#81b64c] font-semibold mt-0.5">
              {mode === 'race' ? '⚡ Race Mode' : mode === 'quad' ? `👑 Quad Compete (${boardSize}×${boardSize})` : '🏆 Classic Barricade'}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-[#3c3934] text-[#9e9c98] hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {stage === 'searching' ? (
          /* Searching Stage with Animated Radar Pulse */
          <div className="py-4 space-y-5">
            <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-[#81b64c]/30 animate-ping opacity-60" />
              <div className="absolute inset-2 rounded-full border-2 border-[#81b64c]/60 animate-pulse" />
              <div className="w-16 h-16 rounded-full bg-[#81b64c]/20 border border-[#81b64c] flex items-center justify-center text-3xl shadow-lg shadow-[#81b64c]/20">
                {userProfile.avatar || '👤'}
              </div>
            </div>

            <div className="space-y-1">
              <h4 className="text-base font-extrabold text-white">Searching for Opponent...</h4>
              <p className="text-xs text-[#9e9c98]">Finding a rank-matched player near your skill level</p>
            </div>

            {/* Target Rating Band */}
            <div className="p-3 bg-[#272522] rounded-xl border border-[#3c3934] font-mono text-xs text-[#9e9c98]">
              <div>
                Your Rating: <strong className="text-white">{userRating}</strong>
              </div>
              <div className="mt-1 text-[#81b64c] font-semibold text-[11px]">
                Search Range: {userRating - searchRange} — {userRating + searchRange} Elo
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-[#2b2926] hover:bg-[#3c3934] text-white font-semibold text-xs border border-[#3c3934] transition-all"
            >
              Cancel Matchmaking
            </button>
          </div>
        ) : (
          /* Match Found Stage */
          <div className="py-3 space-y-5 animate-in zoom-in duration-200">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-600 text-emerald-400 text-xs font-bold animate-bounce-short">
              <CheckCircle2 className="w-4 h-4" />
              Opponent Found!
            </div>

            {/* Matchup Versus Card */}
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 p-4 bg-[#272522] rounded-2xl border border-[#3c3934]">
              {/* You */}
              <div className="space-y-1">
                <div className="w-12 h-12 mx-auto rounded-full bg-[#81b64c]/20 border-2 border-[#81b64c] flex items-center justify-center text-2xl shadow">
                  {userProfile?.avatar || '👤'}
                </div>
                <div className="text-xs font-bold text-white truncate">{userProfile?.name || 'You'}</div>
                <div className="text-[10px] text-[#9e9c98] font-mono">{userProfile?.title || 'MEMBER'}</div>
                <div className="text-[11px] font-mono text-[#81b64c] font-bold">{userRating}</div>
              </div>

              {/* VS */}
              <div className="text-xs font-extrabold text-[#9e9c98] font-mono">VS</div>

              {/* Opponent */}
              <div className="space-y-1">
                <div className="w-12 h-12 mx-auto rounded-full bg-cyan-950/50 border-2 border-cyan-400 flex items-center justify-center text-2xl shadow">
                  {matchedOpponent?.avatar}
                </div>
                <div className="text-xs font-bold text-white truncate flex items-center justify-center gap-1">
                  <span>{matchedOpponent?.name}</span>
                  {matchedOpponent?.country && <span>{matchedOpponent.country}</span>}
                </div>
                <div className="text-[10px] text-cyan-400 font-mono font-bold">{matchedOpponent?.title || 'PLAYER'}</div>
                <div className="text-[11px] font-mono text-cyan-400 font-bold">{matchedOpponent?.rating}</div>
              </div>
            </div>

            <button
              onClick={() => {
                const data = matchDataRef.current || { isRealPlayer: false, opponent: matchedOpponent };
                onMatchFound(data, { mode, timeControlKey, boardSize });
              }}
              className="w-full py-2.5 rounded-xl bg-[#81b64c] hover:bg-[#95c85d] text-black font-extrabold text-xs shadow-lg flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
            >
              <Zap className="w-3.5 h-3.5 fill-black" />
              <span>Enter Game Arena Now</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
