import { HUMAN_PERSONAS_POOL } from './personas.js';
import { getTitleForRating } from './profile.js';

const TITLE_PRESTIGE = {
  GM: 1,
  WGM: 2,
  IM: 3,
  WIM: 4,
  FM: 5,
  WFM: 6,
  NM: 7,
  CM: 8,
  WCM: 9,
  TACTICIAN: 10,
  APPRENTICE: 11,
  NOVICE: 12,
};

// Deterministically generate competitive ratings & stats for all 300 human personas
let cachedPersonaEntries = null;

export function getPersonaLeaderboardEntries() {
  if (cachedPersonaEntries) return cachedPersonaEntries;

  // 1. Sort personas by title prestige and alphabetical tie-break
  const sorted = [...HUMAN_PERSONAS_POOL].sort((a, b) => {
    const pA = TITLE_PRESTIGE[a.title] || 10;
    const pB = TITLE_PRESTIGE[b.title] || 10;
    if (pA !== pB) return pA - pB;
    return a.name.localeCompare(b.name);
  });

  const count = sorted.length;

  cachedPersonaEntries = sorted.map((p, idx) => {
    const t = count > 1 ? idx / (count - 1) : 0;
    // Rating curve: Rank 1 is ~2640 (Grandmaster), down to ~820 for Novice/Apprentice
    const rating = Math.round(2640 - Math.pow(t, 0.75) * 1820);
    const totalGames = Math.round(140 + (1 - t) * 160 + ((idx * 31) % 35));
    const winRate = 0.52 + (1 - t) * 0.25;
    const wins = Math.round(totalGames * winRate);
    const draws = Math.round(totalGames * 0.05);
    const losses = totalGames - wins - draws;

    return {
      id: `persona_${p.name.toLowerCase()}`,
      display_name: p.name,
      name: p.name,
      avatar: p.avatar,
      country: p.country,
      title: p.title || getTitleForRating(rating),
      rating,
      peak_rating: rating + Math.round((idx * 13) % 45),
      wins,
      losses,
      draws,
      games_played: totalGames,
      isPersona: true,
    };
  });

  return cachedPersonaEntries;
}

/**
 * Seamlessly merges real human players from database with the 300 AI personas.
 * Real players naturally slot into their exact ranking based on rating.
 * Real player names/IDs supersede any identically named personas.
 */
export function mergeLeaderboardWithPersonas(realPlayers = []) {
  const personas = getPersonaLeaderboardEntries();

  const realPlayerNames = new Set(
    (realPlayers || []).map((p) => (p.display_name || p.name || '').trim().toLowerCase())
  );

  const eligiblePersonas = personas.filter(
    (p) => !realPlayerNames.has(p.name.toLowerCase())
  );

  const combined = [...(realPlayers || []), ...eligiblePersonas];

  // Strictly order by rating descending
  combined.sort((a, b) => (b.rating || 0) - (a.rating || 0));

  // Return the top 100 players for the competitive leaderboard
  return combined.slice(0, 100);
}
