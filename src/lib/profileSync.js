import { supabase } from './supabaseClient';
import { getTitleForRating, DEFAULT_PROFILE } from '../logic/profile';

const LOCAL_STORAGE_KEY = 'wallbreaker_user_profile';
const LOCAL_RATING_KEY = 'wallbreaker_player_rating';

/**
 * Format a raw database row from the `players` table into the app's userProfile shape
 */
export function formatPlayerProfile(row, user) {
  if (!row && !user) return null;
  const legacy = getLegacyLocalProfile();
  const rating = row?.rating ?? legacy?.rating ?? 400;
  const name =
    row?.display_name ||
    user?.user_metadata?.display_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    legacy?.name ||
    user?.email?.split('@')[0] ||
    'Player';

  return {
    id: row?.id || user?.id,
    email: user?.email || '',
    name,
    rating,
    peakRating: row?.peak_rating || legacy?.peakRating || rating,
    wins: row?.wins ?? legacy?.wins ?? 0,
    losses: row?.losses ?? legacy?.losses ?? 0,
    draws: row?.draws ?? legacy?.draws ?? 0,
    gamesPlayed:
      row?.games_played ??
      legacy?.gamesPlayed ??
      ((row?.wins ?? 0) + (row?.losses ?? 0) + (row?.draws ?? 0)),
    avatar: row?.avatar || legacy?.avatar || '👤',
    country: row?.country || legacy?.country || '🌍',
    title: getTitleForRating(rating),
    isLoggedIn: true,
    authProvider: user?.app_metadata?.provider || 'email',
  };
}

/**
 * Read any legacy localStorage profile data
 */
export function getLegacyLocalProfile() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const hasCustomData =
      (parsed.name && parsed.name !== 'Player' && parsed.name !== 'You (Player)') ||
      (parsed.rating && parsed.rating !== 400) ||
      (parsed.wins && parsed.wins > 0) ||
      (parsed.losses && parsed.losses > 0) ||
      (parsed.draws && parsed.draws > 0);
    return hasCustomData ? parsed : null;
  } catch (err) {
    console.error('Error reading legacy local profile:', err);
    return null;
  }
}

/**
 * Clear legacy local progress keys after successful migration
 */
export function clearLegacyLocalStorage() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    localStorage.removeItem(LOCAL_RATING_KEY);
    console.log('[ProfileSync] Legacy localStorage profile cleared successfully.');
  } catch (err) {
    console.error('Failed to clear legacy local storage:', err);
  }
}

/**
 * Fetch or provision the player's profile in Supabase upon authentication.
 * Handles one-time migration from localStorage if the account is fresh.
 */
export async function syncOrProvisionProfile(user, session, preferredDisplayName = null) {
  if (!user) return null;

  try {
    // 1. Check if a row already exists in `players`
    let { data: playerRow, error: fetchErr } = await supabase
      .from('players')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (fetchErr) {
      console.error('[ProfileSync] Error fetching player row:', fetchErr);
    }

    const legacy = getLegacyLocalProfile();

    // 2. If row doesn't exist, create it
    if (!playerRow) {
      let displayName =
        preferredDisplayName?.trim() ||
        user.user_metadata?.display_name ||
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split('@')[0] ||
        'Player';

      displayName = displayName.replace(/[<>{}[\]\\\/]/g, '').trim().slice(0, 20);
      if (displayName.length < 2) displayName = `Player_${user.id.slice(0, 4)}`;

      // Check if legacy profile has data to seed on initial insert
      const initialRating = legacy?.rating || 400;
      const initialWins = legacy?.wins || 0;
      const initialLosses = legacy?.losses || 0;
      const initialDraws = legacy?.draws || 0;
      const initialGames = initialWins + initialLosses + initialDraws;
      const initialAvatar = legacy?.avatar || '👤';
      const initialCountry = legacy?.country || '🌍';

      const insertPayload = {
        id: user.id,
        display_name: displayName,
        avatar: initialAvatar,
        country: initialCountry,
        rating: initialRating,
        peak_rating: initialRating,
        wins: initialWins,
        losses: initialLosses,
        draws: initialDraws,
        games_played: initialGames,
      };

      const { data: inserted, error: insertErr } = await supabase
        .from('players')
        .insert(insertPayload)
        .select()
        .single();

      if (insertErr) {
        // If display name was taken, append a 4-char suffix
        if (insertErr.code === '23505') {
          insertPayload.display_name = `${displayName.slice(0, 15)}_${user.id.slice(0, 4)}`;
          const { data: retryData } = await supabase
            .from('players')
            .insert(insertPayload)
            .select()
            .single();
          playerRow = retryData;
        } else {
          console.error('[ProfileSync] Error inserting player profile:', insertErr);
        }
      } else {
        playerRow = inserted;
      }

      if (legacy) {
        clearLegacyLocalStorage();
      }
    } else {
      // 3. Row exists: Check if it's fresh and eligible for migration
      const isFreshAccount =
        playerRow.rating === 400 &&
        (playerRow.games_played || 0) === 0 &&
        (playerRow.wins || 0) === 0 &&
        (playerRow.losses || 0) === 0;

      if (isFreshAccount && legacy && session?.access_token) {
        // Trigger server-side authorized migration
        try {
          const resp = await fetch('/api/profile/migrate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              rating: legacy.rating,
              wins: legacy.wins,
              losses: legacy.losses,
              draws: legacy.draws || 0,
              displayName: legacy.name && legacy.name !== 'Player' ? legacy.name : undefined,
              avatar: legacy.avatar,
              country: legacy.country,
            }),
          });
          if (resp.ok) {
            const result = await resp.json();
            if (result.profile) {
              playerRow = result.profile;
            }
            clearLegacyLocalStorage();
          }
        } catch (migErr) {
          console.error('[ProfileSync] Migration API failed:', migErr);
        }
      }
    }

    return formatPlayerProfile(playerRow, user);
  } catch (err) {
    console.error('[ProfileSync] Unexpected error during sync:', err);
    return formatPlayerProfile(null, user);
  }
}
