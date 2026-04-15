import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { api, getToken } from '../services/api';
import { socket } from '../services/socket';
import type { AuctionState, Team, ChatMessage, AutoBidRule } from '../types/auction';
import type { AuthUser } from '../types/auth';

const initialState: AuctionState = {
  sessionId: null,
  status: 'idle',
  currentPlayer: null,
  highestBid: null,
  timerSeconds: 30,
};

const TEAM_COLOR_PALETTE = ['#1E3A8A', '#1D4ED8', '#B91C1C', '#0E7490', '#7C3AED', '#15803D', '#C2410C', '#BE185D'];

const AuctionPage = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [state, setState] = useState<AuctionState>(initialState);
  const [selectedTeamId, setSelectedTeamId] = useState<number>(0);
  const [bidAmount, setBidAmount] = useState<number>(0);
  const [auctioneerMicOn, setAuctioneerMicOn] = useState(false);
  const [commentaryLine, setCommentaryLine] = useState('Auction desk ready. Waiting for first call...');
  const [notification, setNotification] = useState('');
  const [feed, setFeed] = useState<string[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatRoomId] = useState('auction-main');
  const [autoBidRules, setAutoBidRules] = useState<AutoBidRule[]>([]);
  const [ruleTeamId, setRuleTeamId] = useState<number>(0);
  const [ruleEnabled, setRuleEnabled] = useState(true);
  const [ruleMaxBid, setRuleMaxBid] = useState(10);
  const [ruleIncrementBy, setRuleIncrementBy] = useState(0.1);
  const [summary, setSummary] = useState<{
    soldCount: number;
    unsoldCount: number;
    teamSpend: Array<{ name: string; spent: number }>;
  } | null>(null);
  const [playerIntroKey, setPlayerIntroKey] = useState(0);
  const [soldFlash, setSoldFlash] = useState<{
    visible: boolean;
    playerName: string;
    playerRole: string;
    playerNationality: string;
    playerRating: number;
    playerBasePrice: number;
    playerPhotoUrl: string | null;
    teamName: string;
    amount: number;
    color: string;
  }>({
    visible: false,
    playerName: '',
    playerRole: 'batsman',
    playerNationality: 'India',
    playerRating: 0,
    playerBasePrice: 0,
    playerPhotoUrl: null,
    teamName: '',
    amount: 0,
    color: '#B91C1C',
  });
  const [error, setError] = useState('');

  const audioContextRef = useRef<AudioContext | null>(null);
  const lastTickRef = useRef<number | null>(null);
  const currentPlayerRef = useRef<AuctionState['currentPlayer']>(null);

  const user = useMemo(() => {
    const raw = localStorage.getItem('ipl_user');
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  }, []);

  const isAdmin = user?.role === 'admin';
  const isTimerCritical = state.timerSeconds > 0 && state.timerSeconds <= 10;
  const isLastFiveSeconds = state.timerSeconds > 0 && state.timerSeconds <= 5;

  const getTeamColor = (teamId?: number, teamName?: string) => {
    if (teamId) {
      return TEAM_COLOR_PALETTE[Math.abs(teamId) % TEAM_COLOR_PALETTE.length];
    }

    const hash = (teamName || '')
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return TEAM_COLOR_PALETTE[hash % TEAM_COLOR_PALETTE.length];
  };

  const playTone = (frequency: number, durationMs: number, type: OscillatorType, gainValue: number) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) {
        return;
      }

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }

      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.value = frequency;
      gain.gain.value = gainValue;

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + durationMs / 1000);
    } catch {
      // Ignore sound API failures silently.
    }
  };

  const playBidSound = () => {
    playTone(740, 120, 'square', 0.04);
  };

  const playHammerSound = () => {
    playTone(170, 260, 'triangle', 0.06);
  };

  const playTickSound = () => {
    playTone(1200, 70, 'sine', 0.03);
  };

  const loadTeams = async () => {
    const { data } = await api.get('/teams');
    const allTeams = data.teams || [];
    const list = user?.role === 'team_owner' ? allTeams.filter((team: Team) => Number(team.owner_user_id) === Number(user.id)) : allTeams;
    setTeams(list);
    if (list.length > 0 && !selectedTeamId) {
      setSelectedTeamId(Number(list[0].id));
    }
    if (list.length > 0 && !ruleTeamId) {
      setRuleTeamId(Number(list[0].id));
    }
  };

  const loadAuctionState = async () => {
    const { data } = await api.get('/auction/state');
    setState(data.state || initialState);
  };

  const loadChatHistory = async () => {
    const { data } = await api.get(`/chat/messages?roomId=${chatRoomId}`);
    setChatMessages((data.messages || []).reverse());
  };

  const loadAutoBidRules = async () => {
    const { data } = await api.get('/auto-bid/rules');
    setAutoBidRules(data.rules || []);
  };

  const loadSummary = async () => {
    try {
      const { data } = await api.get('/analytics/dashboard');
      setSummary(data);
    } catch {
      setSummary(null);
    }
  };

  useEffect(() => {
    loadTeams().catch(() => undefined);
    loadAuctionState().catch(() => undefined);
    loadChatHistory().catch(() => undefined);
    loadAutoBidRules().catch(() => undefined);

    socket.connect();
    socket.emit('chat:join', { roomId: chatRoomId, token: getToken() || undefined });

    socket.on('auction:state', (nextState: AuctionState) => {
      setState(nextState);
    });
    socket.on('auction:notification', (payload: { message: string; sound?: string; type?: string; teamId?: number; teamName?: string; amount?: number }) => {
      setNotification(payload.message);
      setFeed((prev) => [payload.message, ...prev].slice(0, 12));

      if (payload.type === 'sold') {
        const soldPlayer = currentPlayerRef.current;
        const soldTeamName = payload.teamName || 'Winning Team';
        const soldAmount = Number(payload.amount || 0);
        setSoldFlash({
          visible: true,
          playerName: soldPlayer?.name || 'Player',
          playerRole: soldPlayer?.role || 'batsman',
          playerNationality: soldPlayer?.nationality || 'India',
          playerRating: Number(soldPlayer?.rating || 0),
          playerBasePrice: Number(soldPlayer?.basePrice || 0),
          playerPhotoUrl: soldPlayer?.photoUrl || null,
          teamName: soldTeamName,
          amount: soldAmount,
          color: getTeamColor(payload.teamId, soldTeamName),
        });

        setTimeout(() => {
          setSoldFlash((prev) => ({ ...prev, visible: false }));
        }, 1800);

        setCommentaryLine(`Hammer down! ${soldTeamName} wins at ${soldAmount.toFixed(2)} Cr.`);
        playHammerSound();
        loadTeams().catch(() => undefined);
      }

      if (payload.type === 'bid' || payload.type === 'auto_bid') {
        setCommentaryLine(payload.message);
        playBidSound();
      }

      if (payload.type === 'unsold') {
        setCommentaryLine(payload.message);
        loadTeams().catch(() => undefined);
      }

      if (payload.sound) {
        const audio = new Audio('/notification.mp3');
        audio.play().catch(() => undefined);
      }
    });
    socket.on('auction:error', (payload: { message: string }) => {
      setError(payload.message);
    });
    socket.on('chat:message', (payload: ChatMessage) => {
      setChatMessages((prev) => [...prev, payload].slice(-100));
    });
    socket.on('chat:error', (payload: { message: string }) => {
      setError(payload.message);
    });

    return () => {
      socket.off('auction:state');
      socket.off('auction:notification');
      socket.off('auction:error');
      socket.off('chat:message');
      socket.off('chat:error');
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!state.currentPlayer) {
      return;
    }

    const minBid = state.highestBid ? Number(state.highestBid.amount) + 0.1 : Number(state.currentPlayer.basePrice);
    setBidAmount(Number(minBid.toFixed(2)));
  }, [state.currentPlayer, state.highestBid]);

  useEffect(() => {
    if (state.status === 'completed') {
      setCommentaryLine('Auction completed. Generating final summary...');
      loadSummary().catch(() => undefined);
    }
  }, [state.status]);

  useEffect(() => {
    if (!isLastFiveSeconds || state.status !== 'running') {
      lastTickRef.current = null;
      return;
    }

    if (lastTickRef.current !== state.timerSeconds) {
      playTickSound();
      lastTickRef.current = state.timerSeconds;
    }
  }, [isLastFiveSeconds, state.status, state.timerSeconds]);

  useEffect(() => {
    if (!state.currentPlayer?.id) {
      return;
    }

    setPlayerIntroKey((prev) => prev + 1);
  }, [state.currentPlayer?.id]);

  useEffect(() => {
    currentPlayerRef.current = state.currentPlayer;
  }, [state.currentPlayer]);

  const adminAction = async (action: 'start' | 'pause' | 'resume' | 'next' | 'sold' | 'recall-round') => {
    setError('');
    try {
      await api.post(`/auction/${action}`);
    } catch (err: any) {
      setError(err?.response?.data?.message || `Failed to ${action} auction.`);
    }
  };

  const placeBid = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    const token = getToken();
    socket.emit('auction:bid', {
      teamId: selectedTeamId,
      amount: bidAmount,
      token,
    });
  };

  const sendChatMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    const message = chatInput.trim();
    if (!message) {
      return;
    }

    socket.emit('chat:send', {
      roomId: chatRoomId,
      message,
      token: getToken() || undefined,
    });
    setChatInput('');
  };

  const saveAutoBidRule = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    try {
      await api.post('/auto-bid/rules', {
        teamId: ruleTeamId,
        isEnabled: ruleEnabled,
        maxBid: ruleMaxBid,
        incrementBy: ruleIncrementBy,
      });
      loadAutoBidRules();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save auto-bid rule.');
    }
  };

  const placePaddleBid = (teamId: number) => {
    const nextAmount = Number(
      (
        state.highestBid ? Number(state.highestBid.amount) + 0.2 : Number(state.currentPlayer?.basePrice || 0) + 0.2
      ).toFixed(2),
    );

    setSelectedTeamId(teamId);
    setBidAmount(nextAmount);

    socket.emit('auction:bid', {
      teamId,
      amount: nextAmount,
      token: getToken() || undefined,
    });
  };

  const ownerTeams = useMemo(() => {
    if (user?.role !== 'team_owner') {
      return teams;
    }

    return teams.filter((team) => Number(team.owner_user_id) === Number(user.id));
  }, [teams, user?.id, user?.role]);

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'wicket_keeper':
        return 'Wicket Keeper';
      case 'all_rounder':
        return 'All Rounder';
      case 'bowler':
        return 'Bowler';
      case 'batsman':
      default:
        return 'Batsman';
    }
  };

  const visibleTeams = user?.role === 'team_owner' ? ownerTeams : teams;
  const activeTeam = visibleTeams.find((team) => Number(team.id) === Number(selectedTeamId)) || visibleTeams[0] || null;

  const smartBidAssistant = useMemo(() => {
    if (!state.currentPlayer || !activeTeam) {
      return {
        title: 'AI Smart Bidding Assistant',
        message: 'Select a live player to get a smart bid suggestion.',
        reason: 'The assistant waits for an active player and a visible team.',
        action: 'No suggestion yet',
        bidCeiling: 0,
        confidence: 0,
        signals: [] as Array<{ teamId: number; label: string; confidence: number; tone: 'caution' | 'balanced' | 'positive' }>,
        tone: 'neutral' as const,
      };
    }

    const purseRemaining = Number(activeTeam.purse_remaining || 0);
    const purseTotal = Number(activeTeam.purse_total || 0);
    const squadCount = Number(activeTeam.squad_count || 0);
    const budgetRatio = purseTotal > 0 ? purseRemaining / purseTotal : 0;
    const currentRole = String(state.currentPlayer.role || '').toLowerCase();
    const currentRating = Number(state.currentPlayer.rating || 0);
    const basePrice = Number(state.currentPlayer.basePrice || 0);
    const pricePressure = purseRemaining > 0 ? basePrice / purseRemaining : 1;
    const teamLabel = activeTeam.name;

    const signals = visibleTeams.map((team) => {
      const teamPurse = Number(team.purse_remaining || 0);
      const teamSquad = Number(team.squad_count || 0);
      const teamPurseRatio = Number(team.purse_total || 0) > 0 ? teamPurse / Number(team.purse_total || 0) : 0;
      const teamNeedsCurrentRole = teamSquad < 18 || (currentRole === 'all_rounder' && teamSquad < 21) || (currentRole === 'wicket_keeper' && teamSquad < 2);
      const confidence = Math.min(98, Math.max(28, Math.round((teamNeedsCurrentRole ? 82 : 55) + teamPurseRatio * 18 - teamSquad * 0.6)));

      let label = 'Balanced fit';
      let tone: 'caution' | 'balanced' | 'positive' = 'balanced';

      if (teamPurseRatio < 0.25) {
        label = 'Budget tight';
        tone = 'caution';
      } else if (teamNeedsCurrentRole) {
        label = currentRole === 'all_rounder' ? 'Needs all-rounder' : currentRole === 'wicket_keeper' ? 'Needs wicket keeper' : 'Needs this role';
        tone = 'positive';
      } else if (teamSquad >= 22) {
        label = 'Squad nearly full';
        tone = 'caution';
      }

      return {
        teamId: Number(team.id),
        label,
        confidence,
        tone,
      };
    });

    const getBidCeiling = (multiplier: number, minimumExtra: number) => {
      const ceiling = Math.max(basePrice * multiplier, basePrice + minimumExtra);
      return Number(Math.min(ceiling, purseRemaining).toFixed(2));
    };

    if (budgetRatio < 0.28 || pricePressure > 0.45) {
      const ceiling = getBidCeiling(1.25, 0.15);

      return {
        title: 'AI Smart Bidding Assistant',
        message: `${teamLabel} budget low hai -> cheap player lo`,
        reason: `Purse ${purseRemaining.toFixed(2)} Cr hai, isliye ${ceiling.toFixed(2)} Cr ke under safe bid rakho.`,
        action: `Recommended max bid: ${ceiling.toFixed(2)} Cr`,
        bidCeiling: ceiling,
        confidence: Math.min(92, Math.max(66, Math.round(budgetRatio * 120))),
        signals,
        tone: 'caution' as const,
      };
    }

    if (currentRole === 'all_rounder' || currentRating >= 8.2) {
      const ceiling = getBidCeiling(1.75, 0.5);

      return {
        title: 'AI Smart Bidding Assistant',
        message: `${teamLabel} ko all-rounder chahiye`,
        reason: `Player rating ${currentRating.toFixed(1)} hai aur ${squadCount < 18 ? 'squad balance' : 'auction depth'} ko strengthen kar sakta hai.`,
        action: `Push for a balanced pickup at ${ceiling.toFixed(2)} Cr`,
        bidCeiling: ceiling,
        confidence: Math.min(97, Math.round(78 + currentRating * 2 + (budgetRatio * 10))),
        signals,
        tone: 'positive' as const,
      };
    }

    if (squadCount < 18) {
      const ceiling = getBidCeiling(1.45, 0.4);

      return {
        title: 'AI Smart Bidding Assistant',
        message: `${teamLabel} ko squad balance chahiye`,
        reason: `Current squad size ${squadCount} hai, so flexible roles pe focus karo.`,
        action: `Strong bid zone: ${ceiling.toFixed(2)} Cr`,
        bidCeiling: ceiling,
        confidence: Math.min(90, Math.round(62 + (18 - squadCount) * 1.8)),
        signals,
        tone: 'balanced' as const,
      };
    }

    const ceiling = getBidCeiling(1.6, 0.6);

    return {
      title: 'AI Smart Bidding Assistant',
      message: `${teamLabel} ko premium wicket/scoring boost chahiye`,
      reason: `Budget ${purseRemaining.toFixed(2)} Cr hai aur player stats solid hain.`,
      action: `Recommended max bid: ${ceiling.toFixed(2)} Cr`,
      bidCeiling: ceiling,
      confidence: Math.min(94, Math.round(70 + budgetRatio * 18 + currentRating)),
      signals,
      tone: 'positive' as const,
    };
  }, [activeTeam, state.currentPlayer]);

  useEffect(() => {
    if (!smartBidAssistant.bidCeiling || !state.currentPlayer) {
      return;
    }

    setBidAmount(smartBidAssistant.bidCeiling);
  }, [smartBidAssistant.bidCeiling, state.currentPlayer?.id]);

  return (
    <section className="space-y-5 overflow-x-hidden">
      {soldFlash.visible ? (
        <div
          className="sold-flash-overlay fixed inset-0 z-[70] flex items-center justify-center px-3 py-4 sm:px-4"
          style={{
            background: `radial-gradient(circle at top, ${soldFlash.color}EE 0%, rgba(8, 10, 20, 0.94) 48%, rgba(5, 6, 12, 0.98) 100%)`,
          }}
        >
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:60px_60px] opacity-25" />
          <div className="relative max-h-[92vh] w-full max-w-6xl overflow-y-auto overflow-x-hidden rounded-[2rem] border border-white/20 bg-[linear-gradient(135deg,rgba(255,250,240,0.08),rgba(255,255,255,0.04))] p-4 shadow-[0_40px_120px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:p-5 md:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(212,175,55,0.20),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.08),transparent_30%)]" />
            <div className="relative grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-stretch">
              <div className="relative overflow-hidden rounded-[1.75rem] border border-white/15 bg-[linear-gradient(180deg,rgba(255,246,220,0.12),rgba(255,255,255,0.05))] p-4 sm:p-6 md:p-8">
                <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-amber-200">Auction Hammer Down</p>
                <h3 className="mt-3 font-serif text-5xl leading-none text-white sm:text-6xl md:text-8xl">SOLD</h3>
                <p className="mt-3 max-w-xl text-sm leading-7 text-slate-200 md:text-base">
                  The hammer has fallen and the spotlight now belongs to the winning team.
                </p>

                <div className="mt-6 grid gap-4 md:grid-cols-[220px_1fr] md:items-center">
                  <div className="relative mx-auto h-48 w-36 overflow-hidden rounded-[1.5rem] border border-white/20 bg-black/25 shadow-[0_18px_50px_rgba(0,0,0,0.35)] sm:h-56 sm:w-44">
                    <img
                      src={soldFlash.playerPhotoUrl || 'https://placehold.co/360x480/png'}
                      alt={soldFlash.playerName}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_35%,rgba(0,0,0,0.75)_100%)]" />
                    <div className="absolute bottom-0 left-0 right-0 p-3 text-center">
                      <p className="text-[10px] uppercase tracking-[0.24em] text-amber-200">Player Card</p>
                      <p className="mt-1 text-lg font-bold text-white">{soldFlash.playerName}</p>
                    </div>
                  </div>

                  <div className="space-y-3 text-white">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-300">Sold To</p>
                      <p className="mt-1 text-xl font-bold text-white sm:text-2xl md:text-3xl">{soldFlash.teamName}</p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Winning Bid</p>
                        <p className="mt-1 text-2xl font-bold text-amber-200">{soldFlash.amount.toFixed(2)} Cr</p>
                      </div>
                      <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Base Price</p>
                        <p className="mt-1 text-2xl font-bold text-white">{soldFlash.playerBasePrice.toFixed(2)} Cr</p>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-slate-300">Role</p>
                        <p className="mt-1 font-semibold text-white">{getRoleLabel(soldFlash.playerRole)}</p>
                      </div>
                      <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-slate-300">Nationality</p>
                        <p className="mt-1 font-semibold text-white">{soldFlash.playerNationality}</p>
                      </div>
                      <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-slate-300">Rating</p>
                        <p className="mt-1 font-semibold text-white">{Number(soldFlash.playerRating).toFixed(1)} / 10</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-[1.75rem] border border-white/15 bg-[linear-gradient(180deg,rgba(255,248,228,0.14),rgba(255,255,255,0.05))] p-4 sm:p-6 md:p-8">
                <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-amber-200">Premium Broadcast</p>
                <div className="mt-4 aspect-[4/5] overflow-hidden rounded-[1.5rem] border border-white/20 bg-black/25">
                  <div className="flex h-full flex-col justify-between bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.18),transparent_35%),linear-gradient(180deg,rgba(10,14,24,0.45),rgba(5,6,12,0.85))] p-5 text-white">
                    <div className="flex items-center justify-between text-xs uppercase tracking-[0.28em] text-slate-200">
                      <span>Live Sold</span>
                      <span>IPL Auction Pro</span>
                    </div>
                    <div className="space-y-4">
                      <p className="text-4xl font-black leading-none text-amber-200 sm:text-5xl">{soldFlash.amount.toFixed(2)}</p>
                      <p className="text-sm tracking-[0.2em] text-slate-300">Crore Final Price</p>
                      <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Winning Team</p>
                        <p className="mt-1 text-xl font-bold sm:text-2xl">{soldFlash.teamName}</p>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/15 bg-black/20 p-4 text-center">
                      <p className="text-[10px] uppercase tracking-[0.3em] text-amber-200">Auction Highlight</p>
                      <p className="mt-2 text-base text-slate-100">A marquee signing for a championship run.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <aside className="mini-stats-widget fixed right-4 top-24 z-40 hidden w-72 rounded-2xl border border-white/25 bg-black/55 p-4 shadow-2xl backdrop-blur md:block">
        <p className="text-[10px] uppercase tracking-[0.24em] text-slate-300">Live Stats</p>
        <div className="mt-3 space-y-2 text-sm">
          <p className="flex items-center justify-between"><span className="text-slate-300">Time Left</span><span className="font-bold text-powerplay">{state.timerSeconds}s</span></p>
          <p className="flex items-center justify-between"><span className="text-slate-300">Current Bid</span><span className="font-bold">{state.highestBid ? `${Number(state.highestBid.amount).toFixed(2)} Cr` : 'No bid'}</span></p>
          <p className="flex items-center justify-between"><span className="text-slate-300">Leading Team</span><span className="font-bold">{state.highestBid?.teamName || '-'}</span></p>
          <p className="flex items-center justify-between"><span className="text-slate-300">Player</span><span className="font-bold">{state.currentPlayer?.name || '-'}</span></p>
        </div>
      </aside>

      <header>
        <h2 className="font-serif text-3xl">Live Auction Engine</h2>
        <p className="text-sm text-slate-300">Socket.IO real-time bids, timer resets, sold/unsold flow.</p>
      </header>

      <section className="rounded-2xl border border-white/20 bg-black/30 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xl">Auction Table</h3>
            <p className="text-xs uppercase tracking-[0.16em] text-slate-300">Visible team owners like a live auction table</p>
          </div>
          <p className="text-sm text-slate-300">{visibleTeams.length} teams in view</p>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visibleTeams.map((team) => (
            (() => {
              const teamSignal = smartBidAssistant.signals.find((signal) => signal.teamId === team.id);
              const toneClass = teamSignal?.tone === 'caution'
                ? 'border-amber-300/50 bg-amber-300/10 text-amber-100'
                : teamSignal?.tone === 'positive'
                  ? 'border-emerald-300/50 bg-emerald-300/10 text-emerald-100'
                  : 'border-sky-300/50 bg-sky-300/10 text-sky-100';

              return (
            <div
              key={team.id}
              className={`rounded-2xl border p-4 transition-all ${Number(team.id) === Number(activeTeam?.id) ? 'border-amber-300/70 bg-amber-300/10' : 'border-white/15 bg-white/5'}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Paddle</p>
                  <p className="text-lg font-bold text-white">{team.name}</p>
                </div>
                <div className="h-11 w-11 rounded-full border border-white/20 bg-white/10" style={{ background: `linear-gradient(135deg, ${getTeamColor(team.id)}CC 0%, rgba(255,255,255,0.08) 100%)` }} />
              </div>
              <p className="mt-3 text-sm text-slate-300">Owner: {team.owner_name || 'Unassigned'}</p>
              <div className={`mt-3 inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${toneClass}`}>
                {teamSignal ? `${teamSignal.label} · ${teamSignal.confidence}%` : 'No role signal'}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-xl border border-white/10 bg-black/20 p-2">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Purse</p>
                  <p className="font-semibold text-white">{Number(team.purse_remaining).toFixed(2)} Cr</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-2">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Squad</p>
                  <p className="font-semibold text-white">{Number(team.squad_count || 0)} / 25</p>
                </div>
              </div>
            </div>
              );
            })()
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-amber-300/20 bg-[linear-gradient(135deg,rgba(255,248,225,0.16),rgba(255,255,255,0.06))] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-amber-200">AI Smart Bidding Assistant</p>
            <h3 className="mt-2 text-2xl font-bold text-white">{smartBidAssistant.message}</h3>
            <p className="mt-2 text-sm text-slate-200">{smartBidAssistant.reason}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full border border-white/20 bg-black/20 px-3 py-1 text-xs font-semibold text-white">
                Confidence: {smartBidAssistant.confidence}%
              </span>
              <span className="rounded-full border border-white/20 bg-black/20 px-3 py-1 text-xs font-semibold text-white">
                Bid ceiling: {smartBidAssistant.bidCeiling ? `${smartBidAssistant.bidCeiling.toFixed(2)} Cr` : 'Auto'}
              </span>
            </div>
          </div>
          <div className={`rounded-2xl border px-4 py-3 text-sm ${smartBidAssistant.tone === 'caution' ? 'border-amber-300/40 bg-amber-300/10 text-amber-100' : smartBidAssistant.tone === 'balanced' ? 'border-sky-300/40 bg-sky-300/10 text-sky-100' : 'border-emerald-300/40 bg-emerald-300/10 text-emerald-100'}`}>
            <p className="text-[10px] uppercase tracking-[0.24em] text-white/70">Recommended move</p>
            <p className="mt-1 font-semibold">{smartBidAssistant.action}</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-white/15 bg-black/20 p-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Team balance</p>
            <p className="mt-1 text-sm text-white">{activeTeam ? `${activeTeam.name} squad count ${Number(activeTeam.squad_count || 0)} / 25` : 'No active team'}</p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-black/20 p-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Budget check</p>
            <p className="mt-1 text-sm text-white">{activeTeam ? `${Number(activeTeam.purse_remaining).toFixed(2)} Cr remaining` : 'No team selected'}</p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-black/20 p-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Player stats</p>
            <p className="mt-1 text-sm text-white">{state.currentPlayer ? `${state.currentPlayer.role} | ${Number(state.currentPlayer.rating).toFixed(1)} / 10` : 'Waiting for player'}</p>
          </div>
        </div>
        <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Role need signals</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {smartBidAssistant.signals.map((signal) => (
              <span
                key={signal.teamId}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${signal.tone === 'caution' ? 'border-amber-300/40 bg-amber-300/10 text-amber-100' : signal.tone === 'positive' ? 'border-emerald-300/40 bg-emerald-300/10 text-emerald-100' : 'border-sky-300/40 bg-sky-300/10 text-sky-100'}`}
              >
                {visibleTeams.find((team) => team.id === signal.teamId)?.name || 'Team'}: {signal.label} ({signal.confidence}%)
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/20 bg-black/30 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className={`h-11 w-11 rounded-full border border-white/25 ${auctioneerMicOn ? 'mic-live' : 'bg-white/10'}`}
              onClick={() => setAuctioneerMicOn((prev) => !prev)}
              title="Auctioneer mic"
            >
              <span className="text-lg">🎤</span>
            </button>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Auctioneer Desk</p>
              <p className="text-sm text-slate-100">{commentaryLine}</p>
            </div>
          </div>

          {isAdmin ? (
            <div className="flex flex-wrap gap-2">
              <button className="rounded-lg bg-powerplay px-3 py-2 text-xs font-bold text-navy" onClick={() => adminAction('start')}>
                Start
              </button>
              <button className="rounded-lg border border-white/30 px-3 py-2 text-xs" onClick={() => adminAction('pause')}>
                Pause
              </button>
              <button className="rounded-lg border border-white/30 px-3 py-2 text-xs" onClick={() => adminAction('resume')}>
                Resume
              </button>
              <button className="rounded-lg border border-white/30 px-3 py-2 text-xs" onClick={() => adminAction('next')}>
                Next
              </button>
              <button className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white" onClick={() => adminAction('sold')}>
                Hammer SOLD
              </button>
              <button className="rounded-lg border border-amber-300/60 px-3 py-2 text-xs text-amber-200" onClick={() => adminAction('recall-round')}>
                Recall Round
              </button>
            </div>
          ) : null}
        </div>
      </section>

      {notification ? <p className="rounded-lg border border-powerplay/50 bg-powerplay/20 p-3 text-sm">{notification}</p> : null}
      {error ? <p className="rounded-lg border border-red-400/50 bg-red-900/30 p-3 text-sm text-red-200">{error}</p> : null}

      <article className={`rounded-2xl border border-white/20 bg-black/30 p-4 ${isTimerCritical ? 'countdown-spotlight' : ''}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-300">Status: {state.status}</p>
          <div className={`rounded-full px-4 py-2 text-sm font-bold ${isTimerCritical ? 'animate-pulse bg-red-600/80 text-white' : 'bg-white/10 text-slate-100'}`}>
            TIMER {state.timerSeconds}s
          </div>
        </div>

        <h3 className="mt-3 text-2xl">Current Player Broadcast Card</h3>
        {state.currentPlayer ? (
          <div className="mt-2 flex items-center gap-4">
            <img
              src={state.currentPlayer.photoUrl || 'https://placehold.co/140x140/png'}
              alt={state.currentPlayer.name}
              className="h-20 w-20 rounded-xl object-cover"
            />
            <div key={`player-intro-${playerIntroKey}`} className="player-intro-fly-in space-y-1 text-sm">
              <p className="text-xl font-semibold">{state.currentPlayer.name}</p>
              <p className="text-slate-300">Role: {state.currentPlayer.role}</p>
              <p className="text-slate-300">Country: {state.currentPlayer.nationality}</p>
              <p className="text-slate-300">Stats Rating: {Number(state.currentPlayer.rating).toFixed(1)} / 10</p>
              <p>Base Price: {Number(state.currentPlayer.basePrice).toFixed(2)} Cr</p>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-300">No player currently active.</p>
        )}

        <div className={`mt-4 rounded-xl border border-white/20 bg-white/10 p-3 ${state.highestBid ? 'animate-pulse' : ''}`}>
          <p className="text-sm text-slate-300">Highest Bid</p>
          {state.highestBid ? (
            <p className="text-lg font-semibold">
              {state.highestBid.teamName}: {Number(state.highestBid.amount).toFixed(2)} Cr
            </p>
          ) : (
            <p className="text-sm text-slate-300">No bids yet.</p>
          )}
        </div>
      </article>

      <form className="grid gap-3 rounded-2xl border border-white/20 bg-black/30 p-4 md:grid-cols-3" onSubmit={placeBid}>
        <div className="md:col-span-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Auto-suggested bid ceiling applied to the bid box</p>
        </div>
        <select
          className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2"
          value={selectedTeamId}
          onChange={(event) => setSelectedTeamId(Number(event.target.value))}
          required
        >
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name} ({Number(team.purse_remaining).toFixed(2)} Cr)
            </option>
          ))}
        </select>
        <input
          className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2"
          type="number"
          min={0.1}
          step={0.1}
          value={bidAmount}
          onChange={(event) => setBidAmount(Number(event.target.value))}
          required
        />
        <button className="rounded-lg bg-sunset px-4 py-2 font-bold text-white" type="submit">
          Place Live Bid
        </button>
      </form>

      <section className="rounded-2xl border border-white/20 bg-black/30 p-4">
        <h3 className="text-xl">Paddle Bidding War</h3>
        <p className="text-xs uppercase tracking-[0.16em] text-slate-300">Tap a team paddle to instantly bid +0.20 Cr</p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {ownerTeams.map((team) => (
            <button
              key={team.id}
              type="button"
              className="rounded-xl border border-white/20 px-4 py-3 text-left"
              style={{ background: `linear-gradient(140deg, ${getTeamColor(team.id)}CC 0%, rgba(2,6,23,0.85) 78%)` }}
              onClick={() => placePaddleBid(team.id)}
            >
              <p className="text-xs uppercase tracking-[0.18em] text-white/90">PADDLE</p>
              <p className="text-lg font-bold text-white">{team.name}</p>
              <p className="text-xs text-white/80">Purse: {Number(team.purse_remaining).toFixed(2)} Cr</p>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/20 bg-black/30 p-4">
        <h3 className="text-xl">Live Budget Tracker</h3>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {teams.map((team) => (
            <div key={team.id} className="rounded-lg border border-white/15 bg-white/5 p-3 text-sm">
              <p className="font-semibold">{team.name}</p>
              <p className="text-slate-300">Remaining Purse: {Number(team.purse_remaining).toFixed(2)} Cr</p>
              <p className="text-slate-300">Players Bought: {Number(team.squad_count || 0)} / 25</p>
              <p className={`text-xs ${Number(team.squad_count || 0) < 18 ? 'text-amber-300' : 'text-emerald-300'}`}>
                Minimum 18 target {Number(team.squad_count || 0) < 18 ? 'not reached yet' : 'reached'}
              </p>
            </div>
          ))}
        </div>
      </section>

      <article className="rounded-2xl border border-white/20 bg-black/30 p-4">
        <h3 className="text-xl">Live Auction Feed</h3>
        <div className="mt-3 space-y-2">
          {feed.length === 0 ? <p className="text-sm text-slate-300">No live updates yet.</p> : null}
          {feed.map((line, index) => (
            <p key={`${line}-${index}`} className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm">
              {line}
            </p>
          ))}
        </div>
      </article>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-white/20 bg-black/30 p-4">
          <h3 className="text-xl">Team Owner Live Chat</h3>
          <div className="mt-3 h-64 space-y-2 overflow-y-auto rounded-xl border border-white/15 bg-white/5 p-3">
            {chatMessages.length === 0 ? <p className="text-sm text-slate-300">No messages yet.</p> : null}
            {chatMessages.map((msg, idx) => {
              const name = msg.user_name || msg.userName || 'Unknown';
              const role = msg.user_role || msg.userRole || 'team_owner';
              return (
                <div key={`${name}-${msg.created_at || msg.createdAt || idx}`} className="rounded-lg border border-white/15 bg-black/20 p-2">
                  <p className="text-xs text-powerplay">{name} ({role})</p>
                  <p className="text-sm">{msg.message}</p>
                </div>
              );
            })}
          </div>
          <form className="mt-3 flex gap-2" onSubmit={sendChatMessage}>
            <input
              className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2"
              placeholder="Send strategy message to auction room"
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
            />
            <button className="rounded-lg bg-powerplay px-4 py-2 font-bold text-navy" type="submit">
              Send
            </button>
          </form>
        </article>

        <article className="rounded-2xl border border-white/20 bg-black/30 p-4">
          <h3 className="text-xl">Auto-Bid Rules</h3>
          <form className="mt-3 grid gap-3" onSubmit={saveAutoBidRule}>
            <select
              className="rounded-lg border border-white/20 bg-white/10 px-3 py-2"
              value={ruleTeamId}
              onChange={(event) => setRuleTeamId(Number(event.target.value))}
              required
            >
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
            <input
              className="rounded-lg border border-white/20 bg-white/10 px-3 py-2"
              type="number"
              min={0.1}
              step={0.1}
              value={ruleMaxBid}
              onChange={(event) => setRuleMaxBid(Number(event.target.value))}
              placeholder="Max auto bid (Cr)"
              required
            />
            <input
              className="rounded-lg border border-white/20 bg-white/10 px-3 py-2"
              type="number"
              min={0.1}
              max={5}
              step={0.1}
              value={ruleIncrementBy}
              onChange={(event) => setRuleIncrementBy(Number(event.target.value))}
              placeholder="Increment by (Cr)"
              required
            />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={ruleEnabled} onChange={(event) => setRuleEnabled(event.target.checked)} />
              Enable auto-bid for selected team
            </label>
            <button className="rounded-lg bg-sunset px-4 py-2 font-bold text-white" type="submit">
              Save Auto-Bid Rule
            </button>
          </form>

          <div className="mt-4 space-y-2">
            {autoBidRules.map((rule) => (
              <div key={rule.id} className="rounded-lg border border-white/15 bg-white/5 p-2 text-sm">
                <p className="font-semibold">{rule.team_name}</p>
                <p className="text-slate-300">
                  {rule.is_enabled ? 'Enabled' : 'Disabled'} | Max: {Number(rule.max_bid).toFixed(2)} Cr | Increment:{' '}
                  {Number(rule.increment_by).toFixed(2)} Cr
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>

      {state.status === 'completed' ? (
        <section className="rounded-2xl border border-white/20 bg-black/30 p-4">
          <h3 className="text-2xl">Auction Summary</h3>
          <p className="text-sm text-slate-300">Final board after hammer close.</p>

          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-white/15 bg-white/5 p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-300">Sold</p>
              <p className="text-2xl font-bold">{summary?.soldCount ?? '-'}</p>
            </div>
            <div className="rounded-lg border border-white/15 bg-white/5 p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-300">Unsold</p>
              <p className="text-2xl font-bold">{summary?.unsoldCount ?? '-'}</p>
            </div>
            <div className="rounded-lg border border-white/15 bg-white/5 p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-300">Top Spend Team</p>
              <p className="text-2xl font-bold">{summary?.teamSpend?.[0]?.name || '-'}</p>
            </div>
          </div>
        </section>
      ) : null}
    </section>
  );
};

export default AuctionPage;
