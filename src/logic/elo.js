/**
 * Elo Rating System for Wallbreaker
 * Standard FIDE/Chess.com Elo formula with K-factor scaling.
 */

export const INITIAL_PLAYER_RATING = 400;

export function getPlayerRating() {
  if (typeof window === 'undefined') return INITIAL_PLAYER_RATING;
  const stored = localStorage.getItem('wallbreaker_player_rating');
  return stored ? parseInt(stored, 10) : INITIAL_PLAYER_RATING;
}

export function savePlayerRating(rating) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('wallbreaker_player_rating', String(rating));
}

/**
 * Calculates new rating and change.
 * @param {number} playerRating Current player rating
 * @param {number} opponentRating Opponent rating
 * @param {number} score 1 for win, 0 for loss, 0.5 for draw
 * @param {number} kFactor Rating sensitivity (default 32)
 */
export function calculateEloChange(playerRating, opponentRating, score, kFactor = 32) {
  const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
  const change = Math.round(kFactor * (score - expectedScore));
  const newRating = Math.max(100, playerRating + change);

  return {
    change,
    newRating,
    expectedScore,
  };
}
