import { getTitleForRating } from './profile.js';
import { supabase } from '../lib/supabaseClient.js';
import { mergeLeaderboardWithPersonas } from './personaLeaderboard.js';

let cachedPlayers = [];

/**
 * Fetch real Top 100 Global Competitive Leaderboard from database/server
 * Combines real players from `players` table with 300 competitive AI personas.
 * Real players naturally take their places based on rating.
 */
export async function fetchGlobalLeaderboard(userProfile) {
  let playersList = [];

  try {
    // 1. Primary: Fetch from server API endpoint
    const response = await fetch('/api/leaderboard');
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data.players) && data.players.length > 0) {
        playersList = data.players;
      }
    }
  } catch (fetchErr) {
    console.warn('[Leaderboard] API fetch failed, falling back to direct Supabase client query:', fetchErr);
  }

  // 2. Fallback: Direct public Supabase SELECT
  if (playersList.length === 0) {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('id, display_name, avatar, country, rating, peak_rating, wins, losses, draws, games_played')
        .order('rating', { ascending: false })
        .limit(100);

      if (!error && Array.isArray(data)) {
        playersList = mergeLeaderboardWithPersonas(data);
      }
    } catch (clientErr) {
      console.error('[Leaderboard] Direct Supabase fetch error:', clientErr);
    }
  }

  // 3. Fallback: If both fail or empty, use persona pool
  if (playersList.length === 0) {
    playersList = mergeLeaderboardWithPersonas([]);
  }

  cachedPlayers = playersList;
  return processLeaderboardData(playersList, userProfile);
}

/**
 * Synchronous getter using cached or fallback data
 */
export function getGlobalLeaderboard(userProfile) {
  if (cachedPlayers.length === 0) {
    cachedPlayers = mergeLeaderboardWithPersonas([]);
  }
  return processLeaderboardData(cachedPlayers, userProfile);
}

/**
 * Process raw players into ranked leaderboard structures (top 3, top 100, user standing)
 */
export function processLeaderboardData(playersList = [], userProfile = null) {
  const currentUserId = userProfile?.id;
  const currentRating = userProfile?.rating || 400;
  const currentName = userProfile?.name && userProfile.name !== 'Player' ? userProfile.name : 'You (Player)';
  const currentAvatar = userProfile?.avatar || '👤';
  const currentTitle = getTitleForRating(currentRating);
  const currentWins = userProfile?.wins || 0;
  const currentLosses = userProfile?.losses || 0;
  const currentDraws = userProfile?.draws || 0;
  const currentCountry = userProfile?.country || '🌍';

  const userInList = currentUserId
    ? playersList.some((p) => p.id === currentUserId)
    : false;

  const formattedPlayers = playersList.map((p) => {
    const isUser = Boolean(currentUserId && p.id === currentUserId);
    const wins = p.wins || 0;
    const losses = p.losses || 0;
    const draws = p.draws || 0;
    const total = p.games_played || wins + losses + draws;
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

    return {
      id: p.id,
      name: p.display_name || p.name || 'Player',
      avatar: p.avatar || '👤',
      country: p.country || '🌍',
      rating: p.rating || 400,
      title: getTitleForRating(p.rating || 400),
      wins,
      losses,
      draws,
      totalGames: total,
      winRate,
      isCurrentUser: isUser,
    };
  });

  // If user is not yet in the list (or unranked/anonymous), create virtual user entry for standing calculation
  let combined = [...formattedPlayers];
  if (!userInList) {
    const totalUserGames = currentWins + currentLosses + currentDraws;
    const userEntry = {
      id: currentUserId || 'user_active',
      name: currentName,
      avatar: currentAvatar,
      country: currentCountry,
      rating: currentRating,
      title: currentTitle,
      wins: currentWins,
      losses: currentLosses,
      draws: currentDraws,
      totalGames: totalUserGames,
      winRate: totalUserGames > 0 ? Math.round((currentWins / totalUserGames) * 100) : 0,
      isCurrentUser: true,
    };
    combined.push(userEntry);
  }

  // Sort by rating descending
  combined.sort((a, b) => b.rating - a.rating);

  // Assign 1-based ranks
  const ranked = combined.map((player, idx) => ({
    ...player,
    rank: idx + 1,
  }));

  const userRankIndex = ranked.findIndex((p) => p.isCurrentUser);
  const userRank = userRankIndex !== -1 ? userRankIndex + 1 : 1;
  const userStandingEntry = userRankIndex !== -1 ? ranked[userRankIndex] : ranked[0] || {
    id: 'user_active',
    name: currentName,
    avatar: currentAvatar,
    country: currentCountry,
    rating: currentRating,
    title: currentTitle,
    wins: currentWins,
    losses: currentLosses,
    draws: currentDraws,
    rank: 1,
    isCurrentUser: true,
  };

  const top3 = ranked.slice(0, 3);
  const top100 = ranked.slice(0, 100);

  const minTop100Rating = ranked[99]?.rating || 400;
  const pointsToTop100 = Math.max(0, minTop100Rating - currentRating + 1);

  return {
    top3,
    top100,
    userStanding: {
      ...userStandingEntry,
      rank: userRank,
      isInTop100: userRank <= 100,
      pointsToTop100,
      minTop100Rating,
    },
  };
}
