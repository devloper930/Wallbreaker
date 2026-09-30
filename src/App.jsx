import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import {
  createInitialGameState,
  applyMove,
  handlePlayerResign,
  MODES,
  TIME_CONTROLS,
} from './logic/gameEngine';
import { getBotMove, CHESS_BOTS } from './logic/aiBot';
import { getUserProfile, saveUserProfile, recordMatchResult, MATCH_PLAYERS_POOL, getTitleForRating, DEFAULT_PROFILE } from './logic/profile';
import { calculateEloChange } from './logic/elo';
import { soundManager } from './utils/audio';
import { supabase } from './lib/supabaseClient';
import { syncOrProvisionProfile } from './lib/profileSync';

import Navbar from './components/Navbar';
import HomePage from './components/HomePage';
import Board from './components/Board';
import PlayerCard from './components/PlayerCard';
import MoveHistory from './components/MoveHistory';
import GameControls from './components/GameControls';
import GameOverModal from './components/GameOverModal';
import RulesModal from './components/RulesModal';
import ProfileModal from './components/ProfileModal';
import QuickPlayModal from './components/QuickPlayModal';
import SettingsModal from './components/SettingsModal';
import StatsAnalysisModal from './components/StatsAnalysisModal';
import AuthModal from './components/AuthModal';
import LeaderboardModal from './components/LeaderboardModal';
import LeaveGameModal from './components/LeaveGameModal';
import { Users, Copy, Check, Handshake, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export default function App() {
  // Navigation View: 'home' | 'game'
  const [view, setView] = useState('home');

  // Supabase Auth Session State
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Leave Game Warning Modal State
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  // Player Profile & Elo
  const [userProfile, setUserProfile] = useState(() => getUserProfile());
  const [matchRatingChange, setMatchRatingChange] = useState(null);

  // Game Config & State
  const [gameState, setGameState] = useState(() => createInitialGameState(MODES.CLASSIC, 'BLITZ_3'));
  const [gameMode, setGameMode] = useState(MODES.CLASSIC);
  const [gameType, setGameType] = useState('bot'); // 'bot' | 'local' | 'online'
  const [currentBot, setCurrentBot] = useState(CHESS_BOTS[1]); // Default to Nelson (1100)
  const [currentEngineRating, setCurrentEngineRating] = useState(1750);
  const [matchedOpponent, setMatchedOpponent] = useState(null);
  const [quickPlayConfig, setQuickPlayConfig] = useState({
    mode: MODES.CLASSIC,
    timeControlKey: 'BLITZ_3',
    boardSize: 9,
  });

  // Board, Piece & Game Settings
  const [theme, setTheme] = useState(() => localStorage.getItem('wallbreaker_board_theme') || 'classic');
  const [pieceTheme, setPieceTheme] = useState(() => localStorage.getItem('wallbreaker_piece_theme') || 'gem');
  const [flipped, setFlipped] = useState(false);
  const [wallOrientation, setWallOrientation] = useState('h');
  const [isMuted, setIsMuted] = useState(soundManager.isMuted());
  const [showCoords, setShowCoords] = useState(() => localStorage.getItem('wallbreaker_show_coords') !== 'false');
  const [confirmResign, setConfirmResign] = useState(() => localStorage.getItem('wallbreaker_confirm_resign') !== 'false');
  const [showReactions, setShowReactions] = useState(() => localStorage.getItem('wallbreaker_show_reactions') !== 'false');

  // Live In-Game Rage Reactions
  const [reactions, setReactions] = useState([]);

  useEffect(() => {
    localStorage.setItem('wallbreaker_board_theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('wallbreaker_piece_theme', pieceTheme);
  }, [pieceTheme]);

  useEffect(() => {
    localStorage.setItem('wallbreaker_show_coords', showCoords);
  }, [showCoords]);

  useEffect(() => {
    localStorage.setItem('wallbreaker_confirm_resign', confirmResign);
  }, [confirmResign]);

  useEffect(() => {
    localStorage.setItem('wallbreaker_show_reactions', showReactions);
  }, [showReactions]);

  const handleResetDefaults = () => {
    setShowCoords(true);
    setConfirmResign(true);
    setShowReactions(true);
    setTheme('classic');
    setPieceTheme('gem');
    if (isMuted) {
      soundManager.toggleMute();
      setIsMuted(false);
    }
    localStorage.setItem('wallbreaker_show_coords', 'true');
    localStorage.setItem('wallbreaker_confirm_resign', 'true');
    localStorage.setItem('wallbreaker_show_reactions', 'true');
    localStorage.setItem('wallbreaker_board_theme', 'classic');
    localStorage.setItem('wallbreaker_piece_theme', 'gem');
  };

  // Unified UI Modal State with HTML5 History & Back Button Support
  // 'rules' | 'profile' | 'quickplay' | 'settings' | 'stats' | 'auth' | 'gameover' | 'leaderboard' | null
  const [activeModal, setActiveModal] = useState(null);
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Synchronous refs to prevent stale closures in popstate and background event listeners
  const viewRef = useRef(view);
  viewRef.current = view;

  const activeModalRef = useRef(activeModal);
  activeModalRef.current = activeModal;

  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  // Ref to protect bot execution against timer cancellation
  const botThinkingRef = useRef(false);
  // Ref to prevent duplicate match recording or loops
  const hasRecordedMatchRef = useRef(false);

  // Online Multiplayer State
  const [socket, setSocket] = useState(null);
  const [onlineRoomCode, setOnlineRoomCode] = useState(null);
  const [onlinePlayerIndex, setOnlinePlayerIndex] = useState(null);
  const [onlineConnecting, setOnlineConnecting] = useState(false);
  const [onlineError, setOnlineError] = useState(null);

  // In-Game Draw System State
  const [drawPending, setDrawPending] = useState(false);
  const [drawToast, setDrawToast] = useState(null); // { type: 'pending'|'accepted'|'declined', text: string }
  const [incomingDrawOffer, setIncomingDrawOffer] = useState(null); // { fromPlayerIndex, playerName }
  const [showLocalDrawConfirm, setShowLocalDrawConfirm] = useState(false);

  // Supabase Auth Session listener and automatic profile provisioning
  useEffect(() => {
    let mounted = true;

    // Check existing active session on app load
    supabase.auth.getSession().then(({ data: { session: initSession } }) => {
      if (!mounted) return;
      setSession(initSession);
      if (initSession?.user) {
        syncOrProvisionProfile(initSession.user, initSession).then((synced) => {
          if (mounted && synced) {
            setUserProfile(synced);
            saveUserProfile(synced);
          }
          if (mounted) setAuthLoading(false);
        });
      } else {
        setAuthLoading(false);
      }
    }).catch((err) => {
      console.warn('Error reading Supabase session:', err);
      if (mounted) setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;
      setSession(newSession);

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (newSession?.user) {
          const synced = await syncOrProvisionProfile(newSession.user, newSession);
          if (mounted && synced) {
            setUserProfile(synced);
            saveUserProfile(synced);
          }
        }
      } else if (event === 'SIGNED_OUT') {
        const guest = DEFAULT_PROFILE;
        setUserProfile(guest);
        saveUserProfile(guest);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Authenticated Socket.io connection using Supabase session access_token
  useEffect(() => {
    if (!session?.access_token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const s = io({
      autoConnect: true,
      auth: {
        token: session.access_token,
      },
    });
    setSocket(s);

    s.on('connect', () => {
      console.log('Connected to multiplayer server with Supabase auth');
    });

    s.on('connect_error', (err) => {
      console.warn('Socket connection error:', err.message);
    });

    s.on('game:state_update', (updatedState) => {
      setGameState(updatedState);
      soundManager.playMove();
    });

    s.on('game:timers_update', ({ timers }) => {
      setGameState((prev) => ({
        ...prev,
        timers,
      }));
    });

    s.on('player:disconnected', ({ playerIndex }) => {
      console.log(`Player ${playerIndex + 1} disconnected`);
    });

    s.on('game:reaction', ({ reaction }) => {
      soundManager.playReaction();
      setReactions((prev) => [...prev, reaction]);
      setTimeout(() => {
        setReactions((prev) => prev.filter((r) => r.id !== reaction.id));
      }, 3200);
    });

    // Authoritative match result broadcast from server (Human vs Human ranked)
    s.on('game:match_recorded', ({ winnerIndex, winReason, results }) => {
      console.log('Match recorded on server:', { winnerIndex, results });
      const currentUserId = session?.user?.id;
      if (currentUserId && results?.[currentUserId]) {
        const myResult = results[currentUserId];
        setMatchRatingChange(myResult.change);
        setUserProfile((prev) => {
          const isWinner = winnerIndex === onlinePlayerIndex;
          const isDraw = winnerIndex === null || winnerIndex === undefined;
          const isLoser = !isWinner && !isDraw;
          const updated = {
            ...prev,
            rating: myResult.rating,
            peakRating: Math.max(prev.peakRating || myResult.rating, myResult.rating),
            wins: (prev.wins || 0) + (isWinner ? 1 : 0),
            losses: (prev.losses || 0) + (isLoser ? 1 : 0),
            draws: (prev.draws || 0) + (isDraw ? 1 : 0),
            gamesPlayed: (prev.gamesPlayed || 0) + 1,
            title: getTitleForRating(myResult.rating),
          };
          saveUserProfile(updated);
          return updated;
        });
      }
    });

    // Draw events for online room matches
    s.on('game:draw_offered', ({ fromPlayerIndex, playerName }) => {
      setIncomingDrawOffer({ fromPlayerIndex, playerName });
      soundManager.playReaction();
    });

    s.on('game:draw_accepted', () => {
      setDrawPending(false);
      setIncomingDrawOffer(null);
      setDrawToast({
        type: 'accepted',
        text: 'Draw accepted by mutual agreement!',
      });
      setTimeout(() => setDrawToast(null), 3000);
    });

    s.on('game:draw_declined', () => {
      setDrawPending(false);
      soundManager.playIllegal();
      setDrawToast({
        type: 'declined',
        text: 'Opponent declined your draw offer.',
      });
      setTimeout(() => {
        setDrawToast((curr) => (curr?.type === 'declined' ? null : curr));
      }, 3500);
    });

    return () => {
      s.disconnect();
    };
  }, [session?.access_token, session?.user?.id, onlinePlayerIndex]);

  // Modal open/close helpers with History API push/pop
  const openModal = (modalName) => {
    window.history.pushState({ type: 'modal', modal: modalName }, '');
    setActiveModal(modalName);
  };

  const closeModal = () => {
    setActiveModal(null);
    if (window.history.state?.type === 'modal') {
      window.history.replaceState({ type: viewRef.current }, '');
    }
  };

  // Browser / Mobile Hardware Back Button Navigation Handler
  useEffect(() => {
    // Ensure initial entry is always cleanly set to 'home'
    window.history.replaceState({ type: 'home' }, '');

    const handlePopState = (event) => {
      const state = event.state;

      if (!state || state.type === 'home') {
        // If an active game is currently in progress, intercept and warn the user
        if (viewRef.current === 'game' && gameStateRef.current?.status === 'playing') {
          // Re-push game state to prevent premature browser exit
          window.history.pushState({ type: 'game' }, '');
          setShowLeaveModal(true);
          return;
        }

        // Returned to home root: close all modals and exit game if in-game
        setActiveModal(null);
        if (viewRef.current === 'game') {
          handleNavigateHome(true);
        }
      } else if (state.type === 'game') {
        // Returned to active game arena
        setActiveModal(null);
        // Critical Guard: NEVER transition to game view if currently on home!
        // This stops closing a modal on home from launching into an unwanted bot match.
        if (viewRef.current !== 'game') {
          window.history.replaceState({ type: 'home' }, '');
        }
      } else if (state.type === 'modal') {
        // Transitioned between modals (e.g. going back from Auth to Settings)
        setActiveModal(state.modal);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Handle Quick Rage Reactions from user
  const handleSendReaction = (reaction) => {
    const newReaction = {
      ...reaction,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      senderName: userProfile?.name || 'You',
      left: `${42 + Math.floor(Math.random() * 20)}%`,
      top: `${35 + Math.floor(Math.random() * 25)}%`,
    };
    setReactions((prev) => [...prev, newReaction]);

    // Auto remove reaction after 3.2s
    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== newReaction.id));
    }, 3200);

    // If online, broadcast to opponent
    if (gameType === 'online' && socket && onlineRoomCode) {
      socket.emit('game:reaction', { roomCode: onlineRoomCode, reaction: newReaction });
    }

    // If vs bot, bot gives a witty/rage counter-reaction!
    if (gameType === 'bot' && currentBot) {
      const botDelay = 1200 + Math.floor(Math.random() * 800);
      setTimeout(() => {
        const botReactions = [
          { emoji: '💀', rage: `${currentBot.name}: Bro really thought 💀` },
          { emoji: '🤡', rage: `${currentBot.name}: Nice try clown 🤡` },
          { emoji: '🥱', rage: `${currentBot.name}: Too easy for me 🥱` },
          { emoji: '🧂', rage: `${currentBot.name}: Stay salty! 🧂` },
          { emoji: '🔥', rage: `${currentBot.name}: You are getting cooked 🔥` },
          { emoji: '💅', rage: `${currentBot.name}: Pure skill issue 💅` },
          { emoji: '🧠', rage: `${currentBot.name}: 0 IQ play right there 🧠` },
          { emoji: '🤫', rage: `${currentBot.name}: Shhh... watch this move 🤫` },
        ];
        const randomBotReaction = botReactions[Math.floor(Math.random() * botReactions.length)];
        const botR = {
          id: `${Date.now()}-bot`,
          emoji: randomBotReaction.emoji,
          rage: randomBotReaction.rage,
          senderName: currentBot.name,
          left: `${38 + Math.floor(Math.random() * 25)}%`,
          top: `${30 + Math.floor(Math.random() * 20)}%`,
        };
        soundManager.playReaction();
        setReactions((prev) => [...prev, botR]);
        setTimeout(() => {
          setReactions((prev) => prev.filter((r) => r.id !== botR.id));
        }, 3200);
      }, botDelay);
    }
  };

  // Keyboard Shortcuts: 'R' to toggle wall orientation, 'F' to flip board
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

      if (e.key === 'r' || e.key === 'R') {
        setWallOrientation((prev) => (prev === 'h' ? 'v' : 'h'));
      } else if (e.key === 'f' || e.key === 'F') {
        setFlipped((prev) => !prev);
      } else if (e.key === 'Escape') {
        if (activeModalRef.current) {
          closeModal();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // High-accuracy Clock Timer Interval (Local, Bot, & Play Online Quick Play)
  const lastTickTimeRef = useRef(Date.now());

  // Whenever turn changes, align sub-second tick anchor
  useEffect(() => {
    lastTickTimeRef.current = Date.now();
  }, [gameState.turn]);

  useEffect(() => {
    const isClockActive =
      view === 'game' &&
      gameState.status === 'playing' &&
      gameState.timeControl.time > 0 &&
      (!onlineRoomCode || gameType !== 'online');

    if (!isClockActive) {
      return;
    }

    lastTickTimeRef.current = Date.now();

    const timerInterval = setInterval(() => {
      const now = Date.now();
      const elapsedMs = now - lastTickTimeRef.current;

      if (elapsedMs >= 1000) {
        const wholeSeconds = Math.floor(elapsedMs / 1000);
        lastTickTimeRef.current += wholeSeconds * 1000;

        setGameState((prev) => {
          if (prev.status !== 'playing') return prev;
          const activeIdx = prev.turn;
          const currentTimer = prev.timers[activeIdx];

          if (currentTimer <= wholeSeconds) {
            // Time out!
            if (prev.mode === MODES.QUAD) {
              const timedOutState = {
                ...prev,
                timers: prev.timers.map((t, i) => (i === activeIdx ? 0 : t)),
              };
              return handlePlayerResign(
                timedOutState,
                activeIdx,
                `${prev.players[activeIdx]?.name || 'Player'} ran out of time!`
              );
            } else {
              const winnerIdx = (activeIdx + 1) % prev.players.length;
              return {
                ...prev,
                timers: prev.timers.map((t, i) => (i === activeIdx ? 0 : t)),
                status: 'ended',
                winner: winnerIdx,
                winReason: `${prev.players[activeIdx]?.name || 'Player'} ran out of time!`,
              };
            }
          }

          if (currentTimer - wholeSeconds <= 10) {
            soundManager.playTick();
          }

          return {
            ...prev,
            timers: prev.timers.map((t, i) => (i === activeIdx ? t - wholeSeconds : t)),
          };
        });
      }
    }, 200);

    return () => clearInterval(timerInterval);
  }, [view, gameType, gameState.status, gameState.timeControl.time, onlineRoomCode]);

  // Handle Game End & Modal Display
  useEffect(() => {
    if (gameState.status === 'ended') {
      if (activeModalRef.current !== 'gameover') {
        openModal('gameover');
      }

      // If this was not a server-hosted online match, rating is never modified (bot/local matches are unranked)
      if (!onlineRoomCode || gameType !== 'online') {
        setMatchRatingChange(null);
      }
    }
  }, [gameState.status, onlineRoomCode, gameType]);

  // AI Bot & Online Rank-Matched Opponent Turn Execution (Supports 2-Player & Quad Players 2, 3, 4)
  useEffect(() => {
    if (view !== 'game' || gameState.status !== 'playing') {
      return;
    }

    const isSimulatedOpponent = gameType === 'bot' || (gameType === 'online' && matchedOpponent && !onlineRoomCode);
    if (!isSimulatedOpponent) {
      return;
    }

    const humanIndex = (gameType === 'online' && onlinePlayerIndex !== null && onlinePlayerIndex !== undefined)
      ? onlinePlayerIndex
      : 0;

    const isOpponentTurn = gameState.turn !== humanIndex;
    if (!isOpponentTurn || botThinkingRef.current) {
      return;
    }

    const activePlayer = gameState.players[gameState.turn];
    if (!activePlayer || activePlayer.isResigned || activePlayer.isFrozen) {
      return;
    }

    botThinkingRef.current = true;
    setIsBotThinking(true);

    const thinkingDelay = (gameType === 'online' || matchedOpponent)
      ? 800 + Math.floor(Math.random() * 1100)
      : currentBot.id === 'martin' ? 450 : currentBot.id === 'nelson' ? 600 : 750;

    const currentTurnToMove = gameState.turn;

    const timerId = setTimeout(() => {
      setGameState((currentState) => {
        if (currentState.status !== 'playing' || currentState.turn !== currentTurnToMove) {
          return currentState;
        }

        const currPlayer = currentState.players[currentTurnToMove];
        if (currPlayer?.isResigned || currPlayer?.isFrozen) {
          return currentState;
        }

        let botId = 'martin';
        let botRating = 1000;

        if (currPlayer?.botId) {
          botId = currPlayer.botId;
          botRating = currPlayer.rating || 1000;
        } else if (matchedOpponent) {
          botId = 'engine';
          botRating = currPlayer?.rating || matchedOpponent.rating || 1200;
        } else if (currentTurnToMove === 1) {
          botId = currentBot.id;
          botRating = currentBot.isCustom ? currentEngineRating : currentBot.rating;
        } else {
          botId = currentBot.id;
          botRating = currPlayer?.rating || (currentBot.isCustom ? currentEngineRating : currentBot.rating);
        }

        const oppMove = getBotMove(
          currentState,
          currentTurnToMove,
          botId,
          botRating
        );

        if (oppMove) {
          if (oppMove.type === 'pawn') {
            soundManager.playMove();
          } else {
            soundManager.playWall();
          }
          const res = applyMove(currentState, oppMove);
          if (res.success) {
            return res.state;
          }
        }
        return currentState;
      });

      botThinkingRef.current = false;
      setIsBotThinking(false);
    }, thinkingDelay);

    return () => {
      clearTimeout(timerId);
      botThinkingRef.current = false;
      setIsBotThinking(false);
    };
  }, [view, gameState.turn, gameState.status, gameType, currentBot, currentEngineRating, matchedOpponent, onlineRoomCode, onlinePlayerIndex]);

  // Player Move Handler
  const handleMakeMove = (action) => {
    if (gameState.status !== 'playing') return;

    if (gameType === 'online' && onlineRoomCode) {
      if (!socket) return;
      socket.emit(
        'game:move',
        {
          roomCode: onlineRoomCode,
          action,
          playerIndex: onlinePlayerIndex,
        },
        (response) => {
          if (!response?.success) {
            soundManager.playIllegal();
          }
        }
      );
    } else {
      const res = applyMove(gameState, action);
      if (res.success) {
        if (action.type === 'pawn') soundManager.playMove();
        else soundManager.playWall();
        setGameState(res.state);
      } else {
        soundManager.playIllegal();
      }
    }
  };

  // Start vs AI Bot (Standard or Custom Engine)
  const handleStartBotGame = ({ botId, mode, timeControlKey, boardSize = 9, customRating }) => {
    const bot = CHESS_BOTS.find(b => b.id === botId) || CHESS_BOTS[1];
    setCurrentBot(bot);
    if (customRating) {
      setCurrentEngineRating(customRating);
    }
    setMatchedOpponent(null);
    setOnlineRoomCode(null);
    setOnlinePlayerIndex(null);
    hasRecordedMatchRef.current = false;

    const oppRating = bot.isCustom ? (customRating || 1750) : bot.rating;
    const newState = createInitialGameState(mode, timeControlKey, boardSize);
    newState.players[0].name = `${userProfile.name} (${userProfile.rating})`;
    newState.players[0].rating = userProfile.rating;
    newState.players[0].avatar = userProfile?.avatar || '👤';

    newState.players[1].name = `${bot.name} (${oppRating})`;
    newState.players[1].rating = oppRating;
    newState.players[1].avatar = bot.avatar;
    newState.players[1].botId = bot.id;

    if (mode === MODES.QUAD) {
      const otherBots = CHESS_BOTS.filter(b => b.id !== bot.id && !b.isCustom);
      const b2 = otherBots[0] || CHESS_BOTS[0];
      const b3 = otherBots[1] || CHESS_BOTS[2];

      newState.players[2].name = `${b2.name} (${b2.rating})`;
      newState.players[2].rating = b2.rating;
      newState.players[2].avatar = b2.avatar;
      newState.players[2].botId = b2.id;

      newState.players[3].name = `${b3.name} (${b3.rating})`;
      newState.players[3].rating = b3.rating;
      newState.players[3].avatar = b3.avatar;
      newState.players[3].botId = b3.id;
    }

    if (window.history.state?.type !== 'game') {
      window.history.pushState({ type: 'game' }, '');
    }
    setActiveModal(null);
    setGameMode(mode);
    setGameType('bot');
    setGameState(newState);
    setMatchRatingChange(null);
    setFlipped(false);
    setView('game');
  };

  // Quick Play Match Found (Play Online: Real Player or AI Engine Portrayed as Real Player)
  const handleQuickPlayMatchFound = (matchData, config) => {
    // Transition history directly from matchmaking modal to game
    window.history.replaceState({ type: 'game' }, '');
    setActiveModal(null);
    hasRecordedMatchRef.current = false;

    const chosenMode = config?.mode || quickPlayConfig.mode || MODES.CLASSIC;
    const chosenTc = config?.timeControlKey || quickPlayConfig.timeControlKey || 'BLITZ_3';
    const chosenSize = config?.boardSize || quickPlayConfig.boardSize || 9;

    // 1. Real human player matched via server
    if (matchData?.isRealPlayer && matchData?.roomCode) {
      setMatchedOpponent(matchData.opponent);
      setGameMode(chosenMode);
      setGameType('online');
      setOnlineRoomCode(matchData.roomCode);
      setOnlinePlayerIndex(matchData.playerIndex);
      setGameState(matchData.gameState);
      setMatchRatingChange(null);
      if (chosenMode !== MODES.RACE && matchData.playerIndex === 1) {
        setFlipped(true);
      } else {
        setFlipped(false);
      }
      setView('game');
      return;
    }

    // 2. Fallback: No real human waiting in queue -> AI engine portrayed 100% as real human
    const opponent = matchData?.opponent || matchData;
    setMatchedOpponent(opponent);

    const newState = createInitialGameState(chosenMode, chosenTc, chosenSize);
    newState.players[0].name = `${userProfile.name} (${userProfile.rating})`;
    newState.players[0].rating = userProfile.rating;
    newState.players[0].avatar = userProfile?.avatar || '👤';

    newState.players[1].name = `${opponent.name} (${opponent.rating})`;
    newState.players[1].rating = opponent.rating;
    newState.players[1].avatar = opponent.avatar;
    newState.players[1].country = opponent.country;
    newState.players[1].title = opponent.title;

    if (chosenMode === MODES.QUAD) {
      // In Quad mode, generate distinct realistic human personas for players 3 & 4 as well
      const pool = MATCH_PLAYERS_POOL.filter(p => p.name !== opponent.name);
      const shuffled = pool.length > 2 ? [...pool].sort(() => Math.random() - 0.5) : pool;
      const p2Persona = shuffled[0] || MATCH_PLAYERS_POOL[1];
      const p3Persona = shuffled[1] || MATCH_PLAYERS_POOL[2];

      const r2 = Math.max(100, userProfile.rating + Math.floor(Math.random() * 60) - 30);
      const r3 = Math.max(100, userProfile.rating + Math.floor(Math.random() * 60) - 30);

      newState.players[2].name = `${p2Persona.name} (${r2})`;
      newState.players[2].rating = r2;
      newState.players[2].avatar = p2Persona.avatar;
      newState.players[2].country = p2Persona.country;
      newState.players[2].title = getTitleForRating(r2);

      newState.players[3].name = `${p3Persona.name} (${r3})`;
      newState.players[3].rating = r3;
      newState.players[3].avatar = p3Persona.avatar;
      newState.players[3].country = p3Persona.country;
      newState.players[3].title = getTitleForRating(r3);
    }

    setCurrentBot({
      id: 'quick_opp',
      name: opponent.name,
      rating: opponent.rating,
      difficulty: opponent.rating < 800 ? 'easy' : opponent.rating < 1500 ? 'medium' : opponent.rating < 2200 ? 'hard' : 'master',
      avatar: opponent.avatar,
    });
    setCurrentEngineRating(opponent.rating);

    setGameMode(chosenMode);
    setGameType('online'); // Strictly Play Online
    setOnlineRoomCode(null);
    setOnlinePlayerIndex(0);
    setGameState(newState);
    setMatchRatingChange(null);
    setFlipped(false);
    setView('game');
  };

  // Start Local Pass & Play
  const handleStartLocalGame = ({ mode, timeControlKey, boardSize = 9 }) => {
    const newState = createInitialGameState(mode, timeControlKey, boardSize);
    newState.players[0].name = `${userProfile.name} (P1)`;
    newState.players[1].name = 'Player 2';
    if (mode === MODES.QUAD) {
      newState.players[2].name = 'Player 3';
      newState.players[3].name = 'Player 4';
    }

    setMatchedOpponent(null);
    setOnlineRoomCode(null);
    hasRecordedMatchRef.current = false;
    if (window.history.state?.type !== 'game') {
      window.history.pushState({ type: 'game' }, '');
    }
    setActiveModal(null);
    setGameMode(mode);
    setGameType('local');
    setGameState(newState);
    setMatchRatingChange(null);
    setFlipped(false);
    setView('game');
  };

  // Create Online Room
  const handleCreateOnlineRoom = ({ mode, timeControlKey, boardSize = 9 }) => {
    if (!session?.access_token) {
      openModal('auth');
      return;
    }
    if (!socket) return;
    setOnlineConnecting(true);
    setOnlineError(null);

    if (!socket.connected) socket.connect();

    socket.emit('room:create', { mode, timeControlKey, boardSize, playerName: `${userProfile.name} (${userProfile.rating})` }, (res) => {
      setOnlineConnecting(false);
      if (res.success) {
        if (window.history.state?.type !== 'game') {
          window.history.pushState({ type: 'game' }, '');
        }
        setActiveModal(null);
        setMatchedOpponent(null);
        hasRecordedMatchRef.current = false;
        setGameMode(mode);
        setGameType('online');
        setGameState(res.gameState);
        setOnlineRoomCode(res.roomCode);
        setOnlinePlayerIndex(res.playerIndex);
        setMatchRatingChange(null);
        setView('game');
      } else {
        setOnlineError(res.error || 'Failed to create room');
      }
    });
  };

  // Join Online Room
  const handleJoinOnlineRoom = ({ roomCode }) => {
    if (!session?.access_token) {
      openModal('auth');
      return;
    }
    if (!socket) return;
    setOnlineConnecting(true);
    setOnlineError(null);

    if (!socket.connected) socket.connect();

    socket.emit('room:join', { roomCode, playerName: `${userProfile.name} (${userProfile.rating})` }, (res) => {
      setOnlineConnecting(false);
      if (res.success) {
        if (window.history.state?.type !== 'game') {
          window.history.pushState({ type: 'game' }, '');
        }
        setActiveModal(null);
        setMatchedOpponent(null);
        hasRecordedMatchRef.current = false;
        setGameMode(res.gameState.mode);
        setGameType('online');
        setGameState(res.gameState);
        setOnlineRoomCode(res.roomCode);
        setOnlinePlayerIndex(res.playerIndex);
        setMatchRatingChange(null);
        // In Race Mode both players race in same direction, never flip perspective
        if (res.gameState.mode !== MODES.RACE && res.playerIndex === 1) {
          setFlipped(true);
        } else {
          setFlipped(false);
        }
        setView('game');
      } else {
        setOnlineError(res.error || 'Room not found');
      }
    });
  };

  // Request Navigate Home (shows warning popup if match in progress)
  const requestNavigateHome = () => {
    if (view === 'game' && gameState.status === 'playing') {
      setShowLeaveModal(true);
    } else {
      handleNavigateHome();
    }
  };

  const handleCancelLeaveGame = () => {
    setShowLeaveModal(false);
    if (window.history.state?.type !== 'game') {
      window.history.pushState({ type: 'game' }, '');
    }
  };

  const handleConfirmLeaveGame = () => {
    setShowLeaveModal(false);

    // If leaving an active match in online room, resign via authoritative socket
    if (gameState.status === 'playing') {
      if (onlineRoomCode && socket) {
        socket.emit('game:resign', {
          roomCode: onlineRoomCode,
          playerIndex: onlinePlayerIndex,
        });
      }
    }

    handleNavigateHome(true);
  };

  // Navigate to Home Page (closes all modals and returns to main view with history synchronization)
  const handleNavigateHome = (fromPopState = false) => {
    setActiveModal(null);
    setMatchRatingChange(null);
    setMatchedOpponent(null);
    setDrawPending(false);
    setDrawToast(null);
    setIncomingDrawOffer(null);
    setShowLocalDrawConfirm(false);
    hasRecordedMatchRef.current = false;
    setView('home');
    setGameState(createInitialGameState(gameMode));
    window.history.replaceState({ type: 'home' }, '');
  };

  // Sign out handler
  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error during sign out:', err);
    }
    setSession(null);
    const guest = DEFAULT_PROFILE;
    setUserProfile(guest);
    saveUserProfile(guest);
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
  };

  // Resign Handler (Supports instant win in 2P, or freeze pawn & skip turn in Quads)
  const handleResign = () => {
    if (gameState.status !== 'playing') return;

    if (gameType === 'online' && onlineRoomCode) {
      if (socket) {
        socket.emit('game:resign', {
          roomCode: onlineRoomCode,
          playerIndex: onlinePlayerIndex,
        });
      }
    } else {
      const activeIdx = gameState.turn;
      const nextState = handlePlayerResign(gameState, activeIdx);
      setGameState(nextState);
    }
  };

  // Draw Offer System
  const handleOfferDraw = () => {
    if (gameState.status !== 'playing' || drawPending) return;

    // 1. Online Real Room with Socket
    if (gameType === 'online' && onlineRoomCode) {
      if (socket) {
        setDrawPending(true);
        setDrawToast({
          type: 'pending',
          text: 'Draw offer sent to opponent... waiting for response.',
        });
        socket.emit('game:draw_offer', {
          roomCode: onlineRoomCode,
          fromPlayerIndex: onlinePlayerIndex,
          playerName: userProfile?.name || 'Player',
        });
      }
      return;
    }

    // 2. Local Pass & Play Mode
    if (gameType === 'local') {
      setShowLocalDrawConfirm(true);
      return;
    }

    // 3. Play Online with AI Human Personas OR Vs Computer Bots
    const oppName = matchedOpponent?.name || currentBot?.name || 'Opponent';
    setDrawPending(true);
    setDrawToast({
      type: 'pending',
      text: `Draw offer sent to ${oppName}... waiting for response.`,
    });

    // Realistic human deliberation delay (1.4s to 2.2s)
    const deliberationTime = 1400 + Math.floor(Math.random() * 800);

    setTimeout(() => {
      // 30% chance of acceptance, 70% chance of rejection
      const isAccepted = Math.random() < 0.30;

      if (isAccepted) {
        setDrawPending(false);
        setDrawToast({
          type: 'accepted',
          text: `${oppName} accepted the draw offer!`,
        });
        setTimeout(() => {
          setGameState((prev) => ({
            ...prev,
            status: 'ended',
            winner: null,
            winReason: 'Game drawn by mutual agreement.',
          }));
          setDrawToast(null);
        }, 600);
      } else {
        setDrawPending(false);
        soundManager.playIllegal();
        setDrawToast({
          type: 'declined',
          text: `${oppName} declined the draw offer.`,
        });
        setTimeout(() => {
          setDrawToast((curr) => (curr?.type === 'declined' ? null : curr));
        }, 3500);
      }
    }, deliberationTime);
  };

  const handleConfirmLocalDraw = () => {
    setShowLocalDrawConfirm(false);
    setGameState((prev) => ({
      ...prev,
      status: 'ended',
      winner: null,
      winReason: 'Game drawn by mutual agreement.',
    }));
  };

  const handleAcceptIncomingDraw = () => {
    if (!socket || !onlineRoomCode) return;
    socket.emit('game:draw_accept', { roomCode: onlineRoomCode });
    setIncomingDrawOffer(null);
  };

  const handleDeclineIncomingDraw = () => {
    if (!socket || !onlineRoomCode) return;
    socket.emit('game:draw_decline', { roomCode: onlineRoomCode });
    setIncomingDrawOffer(null);
  };

  // Rematch
  const handleRematch = () => {
    closeModal();
    setMatchRatingChange(null);
    setDrawPending(false);
    setDrawToast(null);
    setIncomingDrawOffer(null);
    setShowLocalDrawConfirm(false);
    hasRecordedMatchRef.current = false;
    if (gameType === 'online' && onlineRoomCode) {
      if (socket) {
        socket.emit('game:rematch', { roomCode: onlineRoomCode });
      }
    } else {
      const tcKey = Object.keys(TIME_CONTROLS).find(k => TIME_CONTROLS[k].time === gameState.timeControl.time) || 'BLITZ_3';
      const boardSize = gameState.boardSize || 9;
      const newState = createInitialGameState(gameState.mode, tcKey, boardSize);
      if (gameType === 'bot') {
        const oppRating = currentBot.isCustom ? currentEngineRating : currentBot.rating;
        newState.players[0].name = `${userProfile.name} (${userProfile.rating})`;
        newState.players[1].name = `${currentBot.name} (${oppRating})`;
      } else if (matchedOpponent) {
        newState.players[0].name = `${userProfile.name} (${userProfile.rating})`;
        newState.players[1].name = `${matchedOpponent.name} (${matchedOpponent.rating})`;
      } else {
        newState.players[0].name = gameState.players[0].name;
        newState.players[1].name = gameState.players[1].name;
        if (gameState.mode === MODES.QUAD && newState.players.length === 4) {
          newState.players[2].name = gameState.players[2]?.name || 'Player 3';
          newState.players[3].name = gameState.players[3]?.name || 'Player 4';
        }
      }
      setGameState(newState);
    }
  };

  // Copy room link / code
  const copyRoomCode = () => {
    if (!onlineRoomCode) return;
    navigator.clipboard.writeText(onlineRoomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Determine if it is the current user's turn
  const isMyTurn =
    gameType === 'online'
      ? (onlinePlayerIndex !== null ? gameState.turn === onlinePlayerIndex : gameState.turn === 0)
      : gameType === 'bot'
      ? gameState.turn === 0
      : true;

  const isQuad = gameMode === MODES.QUAD && gameState.players.length === 4;
  const p1 = gameState.players[0];
  const p2 = gameState.players[1];
  const p3 = isQuad ? gameState.players[2] : null;
  const p4 = isQuad ? gameState.players[3] : null;

  return (
    <div className="min-h-screen bg-[#161512] text-white flex flex-col justify-between selection:bg-[#81b64c] selection:text-black">
      {/* Navbar */}
      <Navbar
        view={view}
        mode={gameMode}
        gameType={gameType}
        theme={theme}
        setTheme={setTheme}
        pieceTheme={pieceTheme}
        setPieceTheme={setPieceTheme}
        isMuted={isMuted}
        setIsMuted={setIsMuted}
        userProfile={userProfile}
        onNavigateHome={requestNavigateHome}
        onQuickPlay={() => {
          if (!session?.access_token) {
            openModal('auth');
            return;
          }
          if (view === 'game' && gameState.status === 'playing') {
            setShowLeaveModal(true);
          } else {
            openModal('quickplay');
          }
        }}
        onOpenProfile={() => openModal('profile')}
        onOpenRules={() => openModal('rules')}
        onOpenSettings={() => openModal('settings')}
        roomCode={onlineRoomCode}
      />

      {/* Main Container: HOME PAGE vs GAME ARENA */}
      {view === 'home' ? (
        <main className="flex-1 flex items-center justify-center">
          <HomePage
            userProfile={userProfile}
            theme={theme}
            pieceTheme={pieceTheme}
            onStartBotGame={handleStartBotGame}
            onStartLocalGame={handleStartLocalGame}
            onCreateOnlineRoom={handleCreateOnlineRoom}
            onJoinOnlineRoom={handleJoinOnlineRoom}
            onQuickPlay={(config) => {
              if (!session?.access_token) {
                openModal('auth');
                return;
              }
              if (config) setQuickPlayConfig(config);
              openModal('quickplay');
            }}
            onOpenProfile={() => openModal('profile')}
            onOpenStatsAnalysis={() => openModal('stats')}
            onlineConnecting={onlineConnecting}
            onlineError={onlineError}
            onOpenRules={() => openModal('rules')}
            onOpenLeaderboard={() => openModal('leaderboard')}
          />
        </main>
      ) : (
        /* GAME ARENA VIEW */
        <main className="flex-1 w-full max-w-7xl mx-auto px-0.5 sm:px-6 py-1 sm:py-4 flex flex-col lg:flex-row items-center lg:items-start justify-center gap-2 sm:gap-6 animate-in fade-in duration-150">
          {/* Left / Center: Board & Player Panels */}
          <div className="w-full max-w-full sm:max-w-[600px] flex flex-col gap-1.5 sm:gap-3">
            {/* Top Player Card (Opponent or Bot) */}
            <div className="w-full">
              <PlayerCard
                player={isQuad ? p3 : p2}
                playerIndex={isQuad ? 2 : 1}
                isActive={gameState.turn === (isQuad ? 2 : 1) && gameState.status === 'playing'}
                timer={gameState.timers[isQuad ? 2 : 1]}
                hasTimer={gameState.timeControl.time > 0}
                isBot={gameType === 'bot'}
                isSelf={gameType === 'online' ? (onlinePlayerIndex !== null && onlinePlayerIndex === (isQuad ? 2 : 1)) : false}
                rating={
                  (isQuad ? p3 : p2)?.rating ||
                  (matchedOpponent
                    ? matchedOpponent.rating
                    : gameType === 'bot'
                    ? currentBot.isCustom
                      ? currentEngineRating
                      : currentBot.rating
                    : 400)
                }
                avatar={
                  (isQuad ? p3 : p2)?.avatar ||
                  (matchedOpponent
                    ? matchedOpponent.avatar
                    : gameType === 'bot'
                    ? currentBot.avatar
                    : null)
                }
                showWallButtons={gameType === 'local'}
                activeWallOrientation={wallOrientation}
                onSelectWallOrientation={setWallOrientation}
                onDragStartWall={setWallOrientation}
                pieceTheme={pieceTheme}
                isMyTurn={isMyTurn}
                showReactions={showReactions}
              />
            </div>

            {/* Quad Lateral Players if in Quad mode */}
            {isQuad && (
              <div className="grid grid-cols-2 gap-2">
                <PlayerCard
                  player={p2}
                  playerIndex={1}
                  isActive={gameState.turn === 1 && gameState.status === 'playing'}
                  timer={gameState.timers[1]}
                  hasTimer={gameState.timeControl.time > 0}
                  isBot={gameType === 'bot'}
                  isSelf={gameType === 'online' ? (onlinePlayerIndex !== null && onlinePlayerIndex === 1) : false}
                  rating={p2?.rating || 400}
                  avatar={p2?.avatar || null}
                  pieceTheme={pieceTheme}
                  showReactions={showReactions}
                  compact
                />
                <PlayerCard
                  player={p4}
                  playerIndex={3}
                  isActive={gameState.turn === 3 && gameState.status === 'playing'}
                  timer={gameState.timers[3]}
                  hasTimer={gameState.timeControl.time > 0}
                  isBot={gameType === 'bot'}
                  isSelf={gameType === 'online' ? (onlinePlayerIndex !== null && onlinePlayerIndex === 3) : false}
                  rating={p4?.rating || 400}
                  avatar={p4?.avatar || null}
                  pieceTheme={pieceTheme}
                  showReactions={showReactions}
                  compact
                />
              </div>
            )}

            {/* In-Game Draw Offer Feedback Toast */}
            {drawToast && (
              <div
                className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs shadow-lg animate-in fade-in duration-200 ${
                  drawToast.type === 'accepted'
                    ? 'bg-emerald-950/90 border-emerald-600 text-emerald-200'
                    : drawToast.type === 'declined'
                    ? 'bg-rose-950/90 border-rose-600 text-rose-200'
                    : 'bg-sky-950/90 border-sky-600 text-sky-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  {drawToast.type === 'accepted' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : drawToast.type === 'declined' ? (
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  ) : (
                    <Loader2 className="w-4 h-4 text-sky-400 animate-spin shrink-0" />
                  )}
                  <span className="font-semibold">{drawToast.text}</span>
                </div>
                {drawToast.type !== 'pending' && (
                  <button
                    onClick={() => setDrawToast(null)}
                    className="text-[#9e9c98] hover:text-white text-xs px-1.5 py-0.5 rounded"
                  >
                    ✕
                  </button>
                )}
              </div>
            )}

            {/* Incoming Draw Offer from Room Opponent */}
            {incomingDrawOffer && (
              <div className="p-3 bg-[#262421] border-2 border-sky-500 rounded-xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-2.5">
                  <Handshake className="w-5 h-5 text-sky-400 shrink-0" />
                  <div className="text-left">
                    <p className="text-xs font-bold text-white">Draw Offered</p>
                    <p className="text-[11px] text-[#9e9c98]">
                      {incomingDrawOffer.playerName || 'Opponent'} offered a draw. Accept?
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={handleAcceptIncomingDraw}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow transition-all active:scale-95"
                  >
                    Accept Draw
                  </button>
                  <button
                    onClick={handleDeclineIncomingDraw}
                    className="px-3 py-1.5 bg-[#3c3934] hover:bg-[#4d4942] text-white font-semibold text-xs rounded-lg transition-all active:scale-95"
                  >
                    Decline
                  </button>
                </div>
              </div>
            )}

            {/* Pass & Play Local Mutual Draw Confirmation Dialog */}
            {showLocalDrawConfirm && (
              <div className="p-3 bg-[#262421] border-2 border-amber-500 rounded-xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-2.5">
                  <Handshake className="w-5 h-5 text-amber-400 shrink-0" />
                  <div className="text-left">
                    <p className="text-xs font-bold text-white">Mutual Draw Offer</p>
                    <p className="text-[11px] text-[#9e9c98]">Do both players agree to end the game in a draw?</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={handleConfirmLocalDraw}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow transition-all active:scale-95"
                  >
                    Confirm Draw
                  </button>
                  <button
                    onClick={() => setShowLocalDrawConfirm(false)}
                    className="px-3 py-1.5 bg-[#3c3934] hover:bg-[#4d4942] text-white font-semibold text-xs rounded-lg transition-all active:scale-95"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* The Board */}
            <Board
              gameState={gameState}
              onMakeMove={handleMakeMove}
              isMyTurn={isMyTurn}
              theme={theme}
              pieceTheme={pieceTheme}
              flipped={flipped}
              wallOrientation={wallOrientation}
              onToggleOrientation={() => setWallOrientation(prev => prev === 'h' ? 'v' : 'h')}
              reactions={reactions}
              showCoords={showCoords}
              showReactions={showReactions}
            />

            {/* Bottom Player Card (User or South) */}
            <div className="w-full">
              <PlayerCard
                player={p1}
                playerIndex={0}
                isActive={gameState.turn === 0 && gameState.status === 'playing'}
                timer={gameState.timers[0]}
                hasTimer={gameState.timeControl.time > 0}
                isSelf={gameType === 'online' ? (onlinePlayerIndex !== null ? onlinePlayerIndex === 0 : true) : true}
                rating={userProfile.rating}
                avatar={userProfile?.avatar || '👤'}
                showWallButtons={true}
                activeWallOrientation={wallOrientation}
                onSelectWallOrientation={setWallOrientation}
                onDragStartWall={setWallOrientation}
                pieceTheme={pieceTheme}
                isMyTurn={isMyTurn}
                onSendReaction={handleSendReaction}
                showReactions={showReactions}
              />
            </div>

            {/* Online Room Share Bar */}
            {gameType === 'online' && onlineRoomCode && (
              <div className="p-3 bg-[#21201d] border border-[#3c3934] rounded-xl flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  <span className="text-[#9e9c98]">Share Code with Opponent:</span>
                  <span className="font-mono font-bold text-white bg-[#2b2926] px-2 py-0.5 rounded border border-[#3c3934]">
                    {onlineRoomCode}
                  </span>
                </div>
                <button
                  onClick={copyRoomCode}
                  className="px-2.5 py-1 rounded bg-[#3c3934] hover:bg-[#504c45] text-white flex items-center gap-1 transition-all"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Right Sidebar: Chess Controls & Move History */}
          <div className="w-full max-w-[560px] lg:w-[340px] flex flex-col gap-4">
            <GameControls
              wallOrientation={wallOrientation}
              onToggleOrientation={() => setWallOrientation(prev => prev === 'h' ? 'v' : 'h')}
              onResign={handleResign}
              onOfferDraw={handleOfferDraw}
              onFlipBoard={() => setFlipped(prev => !prev)}
              flipped={flipped}
              wallsLeft={gameState.players[gameState.turn]?.wallsLeft || 0}
              canResign={gameState.status === 'playing'}
              canDraw={!drawPending && gameState.status === 'playing'}
              isDrawPending={drawPending}
              status={gameState.status}
              confirmResign={confirmResign}
            />

            <div className="h-[360px] lg:h-[480px]">
              <MoveHistory history={gameState.history} mode={gameMode} />
            </div>
          </div>
        </main>
      )}

      {/* Footer */}
      <footer className="h-10 border-t border-[#3c3934] bg-[#21201d] px-4 flex items-center justify-between text-[11px] text-[#666461] select-none">
        <div className="flex items-center gap-3">
          <span>Wallbreaker Strategy Game</span>
          <span className="hidden sm:inline">•</span>
          <span className="hidden sm:inline">Tactical Quoridor Rules</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#81b64c]" />
          <span>Multiplayer Arena</span>
        </div>
      </footer>

      {/* Modals with Unified Browser History and Back Support */}
      <GameOverModal
        isOpen={view === 'game' && gameState.status === 'ended' && activeModal === 'gameover'}
        winner={gameState.winner}
        winReason={gameState.winReason}
        gameState={gameState}
        ratingChange={matchRatingChange}
        currentRating={userProfile.rating}
        onRematch={handleRematch}
        onNewGame={handleNavigateHome}
      />

      <RulesModal isOpen={activeModal === 'rules'} onClose={closeModal} />

      <ProfileModal
        isOpen={activeModal === 'profile'}
        onClose={closeModal}
        profile={userProfile}
        onProfileUpdated={(updated) => {
          setUserProfile(updated);
          saveUserProfile(updated);
        }}
        onOpenAuthModal={() => openModal('auth')}
        onSignOut={handleSignOut}
      />

      <QuickPlayModal
        isOpen={activeModal === 'quickplay'}
        onClose={closeModal}
        userProfile={userProfile}
        onMatchFound={handleQuickPlayMatchFound}
        socket={socket}
        mode={quickPlayConfig.mode}
        timeControlKey={quickPlayConfig.timeControlKey}
        boardSize={quickPlayConfig.boardSize}
      />

      <SettingsModal
        isOpen={activeModal === 'settings'}
        onClose={closeModal}
        showCoords={showCoords}
        setShowCoords={setShowCoords}
        isMuted={isMuted}
        setIsMuted={setIsMuted}
        confirmResign={confirmResign}
        setConfirmResign={setConfirmResign}
        showReactions={showReactions}
        setShowReactions={setShowReactions}
        theme={theme}
        setTheme={setTheme}
        pieceTheme={pieceTheme}
        setPieceTheme={setPieceTheme}
        userProfile={userProfile}
        onOpenAuthModal={() => openModal('auth')}
        onSignOut={handleSignOut}
        onResetDefaults={handleResetDefaults}
      />

      <AuthModal
        isOpen={activeModal === 'auth'}
        onClose={closeModal}
        userProfile={userProfile}
        onLoginSuccess={(updated) => {
          setUserProfile(updated);
          saveUserProfile(updated);
          supabase.auth.getSession().then(({ data: { session: s } }) => {
            if (s) setSession(s);
          });
        }}
      />

      <StatsAnalysisModal
        isOpen={activeModal === 'stats'}
        onClose={closeModal}
        userProfile={userProfile}
        pieceTheme={pieceTheme}
        boardTheme={theme}
      />

      <LeaderboardModal
        isOpen={activeModal === 'leaderboard'}
        onClose={closeModal}
        userProfile={userProfile}
      />

      {/* Leave In-Progress Game Forfeit Warning Confirmation Modal */}
      <LeaveGameModal
        isOpen={showLeaveModal}
        onClose={handleCancelLeaveGame}
        onConfirmLeave={handleConfirmLeaveGame}
        isRankedOnline={gameType === 'online' && Boolean(matchedOpponent)}
      />
    </div>
  );
}
