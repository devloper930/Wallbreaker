/**
 * User Profile & Dynamic Rating-Based Title Management
 * LocalStorage Persistence with Competitive Elo Progression
 */

export const RATING_TIERS = [
  {
    title: 'NOVICE',
    name: 'Novice',
    minRating: 400,
    maxRating: 699,
    icon: '🌱',
    color: '#9e9c98',
    bgBadge: 'bg-zinc-800 text-zinc-300 border-zinc-600',
    description: 'Starting tier for all new Wallbreaker players (400 - 699 Elo).',
  },
  {
    title: 'APPRENTICE',
    name: 'Apprentice',
    minRating: 700,
    maxRating: 999,
    icon: '🛡️',
    color: '#4ade80',
    bgBadge: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/70',
    description: 'Developing spatial navigation and defensive barricades (700 - 999 Elo).',
  },
  {
    title: 'TACTICIAN',
    name: 'Tactician',
    minRating: 1000,
    maxRating: 1299,
    icon: '⚡',
    color: '#38bdf8',
    bgBadge: 'bg-cyan-950/80 text-cyan-300 border-cyan-600/70',
    description: 'Skilled in counter-wall traps and corridor tempo control (1000 - 1299 Elo).',
  },
  {
    title: 'CM',
    name: 'Candidate Master',
    minRating: 1300,
    maxRating: 1499,
    icon: '🎯',
    color: '#a78bfa',
    bgBadge: 'bg-purple-950/80 text-purple-300 border-purple-600/70',
    description: 'Formidable competitor with strong endgame path calculation (1300 - 1499 Elo).',
  },
  {
    title: 'NM',
    name: 'National Master',
    minRating: 1500,
    maxRating: 1699,
    icon: '⚔️',
    color: '#f59e0b',
    bgBadge: 'bg-amber-950/80 text-amber-300 border-amber-600/70',
    description: 'Mastery over Quoridor barricade parity and corridor traps (1500 - 1699 Elo).',
  },
  {
    title: 'FM',
    name: 'FIDE Master',
    minRating: 1700,
    maxRating: 1999,
    icon: '🔮',
    color: '#ec4899',
    bgBadge: 'bg-pink-950/80 text-pink-300 border-pink-600/70',
    description: 'Elite strategist dominating intermediate and hard AI engines (1700 - 1999 Elo).',
  },
  {
    title: 'IM',
    name: 'International Master',
    minRating: 2000,
    maxRating: 2299,
    icon: '💎',
    color: '#06b6d4',
    bgBadge: 'bg-teal-950/80 text-teal-300 border-teal-500/70',
    description: 'International caliber with near-flawless path calculation (2000 - 2299 Elo).',
  },
  {
    title: 'GM',
    name: 'Grandmaster',
    minRating: 2300,
    maxRating: 2599,
    icon: '👑',
    color: '#eab308',
    bgBadge: 'bg-yellow-950/90 text-yellow-300 border-yellow-500 shadow-sm shadow-yellow-500/30',
    description: 'Top-tier Grandmaster commanding the arena with mastery (2300 - 2599 Elo).',
  },
  {
    title: 'CHAMPION',
    name: 'World Champion',
    minRating: 2600,
    maxRating: Infinity,
    icon: '🏆',
    color: '#f43f5e',
    bgBadge: 'bg-rose-950 text-rose-300 border-rose-500 shadow-md shadow-rose-500/40 font-black',
    description: 'The pinnacle of Wallbreaker excellence. Supreme champion (2600+ Elo).',
  },
];

import { HUMAN_PERSONAS_POOL } from './personas.js';
export { HUMAN_PERSONAS_POOL };
export const MATCH_PLAYERS_POOL = HUMAN_PERSONAS_POOL;

/**
 * Returns full Tier object for a given rating.
 */
export function getTitleTierForRating(rating = 400) {
  const r = typeof rating === 'number' ? rating : parseInt(rating, 10) || 400;
  for (let i = RATING_TIERS.length - 1; i >= 0; i--) {
    if (r >= RATING_TIERS[i].minRating) {
      return RATING_TIERS[i];
    }
  }
  return RATING_TIERS[0];
}

/**
 * Returns badge title string (e.g. 'NOVICE', 'TACTICIAN', 'GM') for a given rating.
 */
export function getTitleForRating(rating = 400) {
  return getTitleTierForRating(rating).title;
}

/**
 * Returns the next achievable Tier object for progression display, or null if top tier.
 */
export function getNextTitleTier(rating = 400) {
  const currentTier = getTitleTierForRating(rating);
  const currentIndex = RATING_TIERS.findIndex((t) => t.title === currentTier.title);
  if (currentIndex < RATING_TIERS.length - 1) {
    return RATING_TIERS[currentIndex + 1];
  }
  return null;
}

export const AVAILABLE_TITLES = RATING_TIERS.map((t) => t.title);

export const DEFAULT_PROFILE = {
  name: 'Player',
  avatar: '👤',
  country: '🌍',
  title: 'NOVICE',
  rating: 400,
  peakRating: 400,
  wins: 0,
  losses: 0,
  draws: 0,
  matches: [],
  v: 2,
};

export const AVAILABLE_AVATARS = [
  { id: 'user', icon: '👤', label: 'Default' },
  { id: 'crown', icon: '👑', label: 'Grandmaster' },
  { id: 'wizard', icon: '🧙‍♂️', label: 'Strategist' },
  { id: 'lion', icon: '🦁', label: 'Lion' },
  { id: 'wolf', icon: '🐺', label: 'Wolf' },
  { id: 'lightning', icon: '⚡', label: 'Tactician' },
  { id: 'ninja', icon: '🥷', label: 'Ninja' },
  { id: 'robot', icon: '🤖', label: 'Android' },
  { id: 'eagle', icon: '🦅', label: 'Eagle' },
  { id: 'fire', icon: '🔥', label: 'Blaze' },
  { id: 'target', icon: '🎯', label: 'Sniper' },
  { id: 'rocket', icon: '🚀', label: 'Rocket' },
];

export const AVAILABLE_FLAGS = [
  { code: 'GLOBAL', flag: '🌍', label: 'Global' },
  { code: 'US', flag: '🇺🇸', label: 'United States' },
  { code: 'IN', flag: '🇮🇳', label: 'India' },
  { code: 'GB', flag: '🇬🇧', label: 'United Kingdom' },
  { code: 'DE', flag: '🇩🇪', label: 'Germany' },
  { code: 'FR', flag: '🇫🇷', label: 'France' },
  { code: 'ES', flag: '🇪🇸', label: 'Spain' },
  { code: 'JP', flag: '🇯🇵', label: 'Japan' },
  { code: 'BR', flag: '🇧🇷', label: 'Brazil' },
  { code: 'RU', flag: '🇷🇺', label: 'Russia' },
  { code: 'CA', flag: '🇨🇦', label: 'Canada' },
  { code: 'AU', flag: '🇦🇺', label: 'Australia' },
];

export function resetUserProfileStats() {
  const current = getUserProfile();
  const reset = {
    ...current,
    rating: 400,
    peakRating: 400,
    title: getTitleForRating(400),
    wins: 0,
    losses: 0,
    draws: 0,
    matches: [],
    v: 2,
  };
  saveUserProfile(reset);
  return reset;
}

/**
 * Helper to identify whether a match was played in Play Online mode
 * (filters out vs computer bots, rooms, and local offline matches).
 */
export function isPlayOnlineMatch(match) {
  if (!match) return false;
  if (match.matchType === 'online') return true;
  if (match.matchType && match.matchType !== 'online') return false;

  const opp = (match.opponent || '').toLowerCase();
  const isBotOrLocal =
    opp.includes('martin') ||
    opp.includes('nelson') ||
    opp.includes('elena') ||
    opp.includes('magnus') ||
    opp.includes('engine') ||
    opp === 'player 2' ||
    opp === 'player 3' ||
    opp === 'player 4' ||
    opp === 'player';
  return !isBotOrLocal;
}

export function getUserProfile() {
  if (typeof window === 'undefined') return DEFAULT_PROFILE;
  try {
    const data = localStorage.getItem('wallbreaker_user_profile');
    if (data) {
      const parsed = JSON.parse(data);

      // Clean matches: strictly include Play Online matches
      const cleanMatches = Array.isArray(parsed.matches)
        ? parsed.matches.filter((m) => !String(m.id).startsWith('seed_') && isPlayOnlineMatch(m))
        : [];

      // If user had bot or local matches recorded previously, recalculate career stats to match
      const hadNonOnlineMatches = Array.isArray(parsed.matches) && parsed.matches.length !== cleanMatches.length;
      const onlineWins = cleanMatches.filter((m) => m.result === 'win').length;
      const onlineLosses = cleanMatches.filter((m) => m.result === 'loss').length;
      const onlineDraws = cleanMatches.filter((m) => m.result === 'draw').length;

      // Migration: Clean up old dummy data if v !== 2
      if (parsed.v !== 2 || hadNonOnlineMatches) {
        const isOldDummy =
          parsed.name === 'Grandmaster' ||
          parsed.name === 'AK' ||
          parsed.rating === 1377 ||
          parsed.rating === 1500;

        const cleanRating = isOldDummy ? 400 : (parsed.rating || 400);
        const cleanProfile = {
          ...DEFAULT_PROFILE,
          ...(isOldDummy ? {} : parsed),
          name: isOldDummy ? 'Player' : (parsed.name || 'Player'),
          avatar: isOldDummy ? '👤' : (parsed.avatar || '👤'),
          rating: cleanRating,
          peakRating: isOldDummy ? cleanRating : Math.max(cleanRating, parsed.peakRating || cleanRating),
          title: getTitleForRating(cleanRating),
          wins: hadNonOnlineMatches ? onlineWins : (isOldDummy ? 0 : (parsed.wins || 0)),
          losses: hadNonOnlineMatches ? onlineLosses : (isOldDummy ? 0 : (parsed.losses || 0)),
          draws: hadNonOnlineMatches ? onlineDraws : (isOldDummy ? 0 : (parsed.draws || 0)),
          matches: cleanMatches,
          v: 2,
        };
        saveUserProfile(cleanProfile);
        return cleanProfile;
      }

      const currentRating = parsed.rating || 400;
      return {
        ...DEFAULT_PROFILE,
        ...parsed,
        rating: currentRating,
        title: getTitleForRating(currentRating),
        matches: cleanMatches,
      };
    }
  } catch (e) {
    console.error('Failed to load profile', e);
  }
  return DEFAULT_PROFILE;
}

export function saveUserProfile(profile) {
  if (typeof window === 'undefined') return;
  try {
    const finalRating = profile.rating || 400;
    const finalProfile = {
      ...profile,
      rating: finalRating,
      title: getTitleForRating(finalRating),
      v: 2,
    };
    localStorage.setItem('wallbreaker_user_profile', JSON.stringify(finalProfile));
    localStorage.setItem('wallbreaker_player_rating', String(finalRating));
  } catch (e) {
    console.error('Failed to save profile', e);
  }
}

export function recordMatchResult(isWin, isLoss, ratingChange = 0, matchDetails = {}) {
  const profile = getUserProfile();
  const matchType = matchDetails.matchType || 'online';

  if (isWin) profile.wins = (profile.wins || 0) + 1;
  else if (isLoss) profile.losses = (profile.losses || 0) + 1;
  else profile.draws = (profile.draws || 0) + 1;

  profile.gamesPlayed = (profile.wins || 0) + (profile.losses || 0) + (profile.draws || 0);

  // Competitive Elo rating is only modified in Online matches
  if (matchType === 'online' && ratingChange) {
    profile.rating = Math.max(100, (profile.rating || 400) + ratingChange);
    profile.peakRating = Math.max(profile.peakRating || 400, profile.rating);
    profile.title = getTitleForRating(profile.rating);
  }

  if (!profile.matches) {
    profile.matches = [];
  }

  const matchRecord = {
    id: `m_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    matchType,
    date: new Date().toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    opponent: matchDetails.opponent || 'Opponent',
    opponentRating: matchDetails.opponentRating || 400,
    opponentAvatar: matchDetails.opponentAvatar || '👤',
    result: isWin ? 'win' : isLoss ? 'loss' : 'draw',
    ratingChange: ratingChange,
    ratingAfter: profile.rating,
    mode: matchDetails.mode || 'Classic Barricade',
    movesCount: matchDetails.movesCount || (matchDetails.history ? matchDetails.history.length : 0),
    accuracy: Math.floor(75 + Math.random() * 20),
    brilliant: isWin ? Math.floor(1 + Math.random() * 2) : (Math.random() > 0.5 ? 1 : 0),
    best: Math.floor(6 + Math.random() * 8),
    mistakes: isWin ? Math.floor(1 + Math.random() * 2) : Math.floor(2 + Math.random() * 3),
    coachTip: isWin
      ? 'Outstanding strategic coordination! Pinned opponent and maintained path superiority.'
      : 'Solid spatial defense, but watch out for rapid counter-wall traps on the flank.',
    history: matchDetails.history || [],
  };

  profile.matches.unshift(matchRecord);
  if (profile.matches.length > 50) {
    profile.matches = profile.matches.slice(0, 50);
  }

  saveUserProfile(profile);
  return profile;
}

export function getMatchHistory(profile) {
  if (profile?.matches && Array.isArray(profile.matches)) {
    return profile.matches.filter(isPlayOnlineMatch);
  }
  return [];
}
