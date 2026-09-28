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
import { getUserProfile, saveUserProfile, recordMatchResult, MATCH_PLAYERS_POOL, getTitleForRating } from './logic/profile';
import { calculateEloChange } from './logic/elo';
import { soundManager } from './utils/audio';

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
import { Users, Copy, Check } from 'lucide-react';

export default function App() {
  // Navigation View: 'home' | 'game'
  const [view, setView] = useState('home');

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

  // UI Modals
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showQuickPlay, setShowQuickPlay] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

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

  // Socket.io initialization
  useEffect(() => {
    const s = io({
      autoConnect: false,
    });
    setSocket(s);

    s.on('connect', () => {
      console.log('Connected to multiplayer server');
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

    return () => {
      s.disconnect();
    };
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
        setShowRules(false);
        setShowProfileModal(false);
        setShowQuickPlay(false);
        setShowSettingsModal(false);
        setShowStatsModal(false);
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

  // Handle Game End & Elo Rating Update (Strictly Play Online Ranked matches only)
  useEffect(() => {
    if (gameState.status === 'ended') {
      setShowGameOverModal(true);

      // In career stats ONLY include play online matches (both real human and simulated human opponents).
      // Do NOT include any other matches like vs computer, private room, or offline mode.
      const isPlayOnlineMatch = gameType === 'online' && Boolean(matchedOpponent);

      if (!hasRecordedMatchRef.current && isPlayOnlineMatch) {
        hasRecordedMatchRef.current = true;
        try {
          const userIdx = (onlinePlayerIndex !== null && onlinePlayerIndex !== undefined) ? onlinePlayerIndex : 0;
          const isUserWinner = gameState.winner === userIdx;
          const isOpponentWinner = gameState.winner !== null && gameState.winner !== userIdx;
          const score = isUserWinner ? 1 : isOpponentWinner ? 0 : 0.5;

          const oppRating = matchedOpponent.rating;
          const oppName = matchedOpponent.name;
          const oppAvatar = matchedOpponent.avatar;

          const eloResult = calculateEloChange(userProfile.rating, oppRating, score);
          const change = eloResult.change;
          setMatchRatingChange(change);

          const updated = recordMatchResult(isUserWinner, isOpponentWinner, change, {
            matchType: 'online',
            opponent: oppName,
            opponentRating: oppRating,
            opponentAvatar: oppAvatar,
            mode: gameMode === MODES.CLASSIC ? 'Classic Barricade' : gameMode === MODES.RACE ? 'Race Mode' : 'Quad Compete',
            movesCount: gameState.history ? gameState.history.length : 0,
            history: gameState.history || [],
          });
          setUserProfile(updated);
        } catch (err) {
          console.error('Error recording match result:', err);
        }
      } else if (!isPlayOnlineMatch) {
        // Clear rating delta for unranked matches (vs computer, room, offline mode)
        setMatchRatingChange(null);
      }
    }
  }, [gameState.status, gameState.winner, gameType, userProfile.rating, matchedOpponent, onlineRoomCode, onlinePlayerIndex, gameMode]);

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

    setGameMode(mode);
    setGameType('bot');
    setGameState(newState);
    setMatchRatingChange(null);
    setShowGameOverModal(false);
    setFlipped(false);
    setView('game');
  };

  // Quick Play Match Found (Play Online: Real Player or AI Engine Portrayed as Real Player)
  const handleQuickPlayMatchFound = (matchData, config) => {
    setShowQuickPlay(false);
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
      setShowGameOverModal(false);
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
    setShowGameOverModal(false);
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
    setGameMode(mode);
    setGameType('local');
    setGameState(newState);
    setMatchRatingChange(null);
    setShowGameOverModal(false);
    setFlipped(false);
    setView('game');
  };

  // Create Online Room
  const handleCreateOnlineRoom = ({ mode, timeControlKey, boardSize = 9 }) => {
    if (!socket) return;
    setOnlineConnecting(true);
    setOnlineError(null);

    if (!socket.connected) socket.connect();

    socket.emit('room:create', { mode, timeControlKey, boardSize, playerName: `${userProfile.name} (${userProfile.rating})` }, (res) => {
      setOnlineConnecting(false);
      if (res.success) {
        setMatchedOpponent(null);
        hasRecordedMatchRef.current = false;
        setGameMode(mode);
        setGameType('online');
        setGameState(res.gameState);
        setOnlineRoomCode(res.roomCode);
        setOnlinePlayerIndex(res.playerIndex);
        setMatchRatingChange(null);
        setShowGameOverModal(false);
        setView('game');
      } else {
        setOnlineError(res.error || 'Failed to create room');
      }
    });
  };

  // Join Online Room
  const handleJoinOnlineRoom = ({ roomCode }) => {
    if (!socket) return;
    setOnlineConnecting(true);
    setOnlineError(null);

    if (!socket.connected) socket.connect();

    socket.emit('room:join', { roomCode, playerName: `${userProfile.name} (${userProfile.rating})` }, (res) => {
      setOnlineConnecting(false);
      if (res.success) {
        setMatchedOpponent(null);
        hasRecordedMatchRef.current = false;
        setGameMode(res.gameState.mode);
        setGameType('online');
        setGameState(res.gameState);
        setOnlineRoomCode(res.roomCode);
        setOnlinePlayerIndex(res.playerIndex);
        setMatchRatingChange(null);
        setShowGameOverModal(false);
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

  // Navigate to Home Page (completely closes game over modal and returns to main view)
  const handleNavigateHome = () => {
    setShowGameOverModal(false);
    setMatchRatingChange(null);
    setMatchedOpponent(null);
    hasRecordedMatchRef.current = false;
    setView('home');
    setGameState(createInitialGameState(gameMode));
  };

  // Sign out handler
  const handleSignOut = () => {
    const updated = {
      ...userProfile,
      isLoggedIn: false,
      email: null,
      authProvider: null,
    };
    setUserProfile(updated);
    saveUserProfile(updated);
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

  // Draw Offer
  const handleOfferDraw = () => {
    if (gameState.status !== 'playing') return;
    setGameState((prev) => ({
      ...prev,
      status: 'ended',
      winner: null,
      winReason: 'Game drawn by mutual agreement.',
    }));
  };

  // Rematch
  const handleRematch = () => {
    setShowGameOverModal(false);
    setMatchRatingChange(null);
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
        onNavigateHome={handleNavigateHome}
        onQuickPlay={() => setShowQuickPlay(true)}
        onOpenProfile={() => setShowProfileModal(true)}
        onOpenRules={() => setShowRules(true)}
        onOpenSettings={() => setShowSettingsModal(true)}
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
              if (config) setQuickPlayConfig(config);
              setShowQuickPlay(true);
            }}
            onOpenProfile={() => setShowProfileModal(true)}
            onOpenStatsAnalysis={() => setShowStatsModal(true)}
            onlineConnecting={onlineConnecting}
            onlineError={onlineError}
            onOpenRules={() => setShowRules(true)}
          />
        </main>
      ) : (
        /* GAME ARENA VIEW */
        <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 py-4 flex flex-col lg:flex-row items-center lg:items-start justify-center gap-6 animate-in fade-in duration-150">
          {/* Left / Center: Board & Player Panels */}
          <div className="w-full max-w-[560px] sm:max-w-[600px] flex flex-col gap-3">
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
              canResign={gameType !== 'bot'}
              canDraw={gameMode !== MODES.QUAD}
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

      {/* Modals */}
      <GameOverModal
        isOpen={view === 'game' && gameState.status === 'ended' && showGameOverModal}
        winner={gameState.winner}
        winReason={gameState.winReason}
        gameState={gameState}
        ratingChange={matchRatingChange}
        currentRating={userProfile.rating}
        onRematch={handleRematch}
        onNewGame={handleNavigateHome}
      />

      <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />

      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        profile={userProfile}
        onProfileUpdated={(updated) => setUserProfile(updated)}
      />

      <QuickPlayModal
        isOpen={showQuickPlay}
        onClose={() => setShowQuickPlay(false)}
        userProfile={userProfile}
        onMatchFound={handleQuickPlayMatchFound}
        socket={socket}
        mode={quickPlayConfig.mode}
        timeControlKey={quickPlayConfig.timeControlKey}
        boardSize={quickPlayConfig.boardSize}
      />

      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
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
        onOpenAuthModal={() => setShowAuthModal(true)}
        onSignOut={handleSignOut}
        onResetDefaults={handleResetDefaults}
      />

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        userProfile={userProfile}
        onLoginSuccess={(updated) => {
          setUserProfile(updated);
          saveUserProfile(updated);
        }}
      />

      <StatsAnalysisModal
        isOpen={showStatsModal}
        onClose={() => setShowStatsModal(false)}
        userProfile={userProfile}
        pieceTheme={pieceTheme}
        boardTheme={theme}
      />
    </div>
  );
}
