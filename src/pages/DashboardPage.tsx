import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { AuthUser } from '../types/auth';
import type { AuctionState, ChatMessage, Team } from '../types/auction';
import TeamsPage from './TeamsPage';
import PlayersPage from './PlayersPage';
import AuctionPage from './AuctionPage';
import { api } from '../services/api';
import useTheme from '../hooks/useTheme';

type TabKey =
  | 'home'
  | 'overview'
  | 'teams'
  | 'players'
  | 'auction'
  | 'history'
  | 'reports'
  | 'uploads'
  | 'alerts'
  | 'roles'
  | 'settings'
  | 'summary'
  | 'budget'
  | 'live-bidding'
  | 'paddle'
  | 'squad'
  | 'ai'
  | 'watchlist'
  | 'chat'
  | 'download'
  | 'profile';

interface TeamOwner {
  id: number;
  name: string;
  email: string;
}

interface AuctionHistory {
  bids: Array<{ id: number; amount: number; created_at: string; player_name: string; team_name: string }>;
  sales: Array<{ id: number; sale_status: string; sold_price: number | null; sold_at: string; player_name: string; team_name: string | null }>;
}

const DashboardPage = () => {
  const navigate = useNavigate();
  const { theme, isDark, toggleTheme } = useTheme();
  const [tab, setTab] = useState<TabKey>('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [owners, setOwners] = useState<TeamOwner[]>([]);
  const [analytics, setAnalytics] = useState<{
    soldCount: number;
    unsoldCount: number;
    teamSpend: Array<{ name: string; spent: number }>;
    recentSales?: AuctionHistory['sales'];
  } | null>(null);
  const [auctionState, setAuctionState] = useState<AuctionState | null>(null);
  const [auctionHistory, setAuctionHistory] = useState<AuctionHistory>({ bids: [], sales: [] });
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const currentUser = useMemo(() => {
    const raw = localStorage.getItem('ipl_user');
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  }, []);
  const activeUser = currentUser as AuthUser;

  const handleLogout = () => {
    localStorage.removeItem('ipl_token');
    localStorage.removeItem('ipl_user');
    navigate('/login');
  };

  useEffect(() => {
    if (currentUser?.role !== 'admin') {
      return;
    }

    api
      .get('/analytics/dashboard')
      .then(({ data }) => {
        setAnalytics(data);
      })
      .catch(() => {
        setAnalytics(null);
      });
  }, [currentUser?.role]);

  useEffect(() => {
    api
      .get('/auction/state')
      .then(({ data }) => {
        setAuctionState(data.state || null);
      })
      .catch(() => {
        setAuctionState(null);
      });

    api
      .get('/auction/history')
      .then(({ data }) => {
        setAuctionHistory({ bids: data.bids || [], sales: data.sales || [] });
      })
      .catch(() => {
        setAuctionHistory({ bids: [], sales: [] });
      });

    api
      .get('/chat/messages?roomId=auction-main')
      .then(({ data }) => {
        setChatMessages((data.messages || []).slice().reverse());
      })
      .catch(() => {
        setChatMessages([]);
      });
  }, []);

  useEffect(() => {
    api
      .get('/teams')
      .then(({ data }) => {
        setTeams(data.teams || []);
      })
      .catch(() => {
        setTeams([]);
      });

    if (currentUser?.role === 'admin') {
      api
        .get('/teams/owners')
        .then(({ data }) => {
          setOwners(data.owners || []);
        })
        .catch(() => {
          setOwners([]);
        });
    }
  }, []);

  const logoCarouselItems = useMemo(() => {
    const mapped = teams.map((team) => ({
      id: team.id,
      name: team.name,
      logo: team.logo_url || 'https://placehold.co/88x88/png',
    }));

    return [...mapped, ...mapped];
  }, [teams]);

  const ownerTeams = useMemo(() => {
    if (activeUser.role !== 'team_owner') {
      return teams;
    }

    return teams.filter((team) => Number(team.owner_user_id) === Number(activeUser.id));
  }, [teams, activeUser.id, activeUser.role]);

  const activeOwnerTeam = ownerTeams[0] || teams[0] || null;

  const filteredSales = useMemo(() => {
    if (activeUser.role !== 'team_owner' || !activeOwnerTeam) {
      return auctionHistory.sales;
    }

    return auctionHistory.sales.filter((sale) => sale.team_name === activeOwnerTeam.name);
  }, [activeOwnerTeam, auctionHistory.sales, activeUser.role]);

  const filteredBids = useMemo(() => {
    if (activeUser.role !== 'team_owner' || !activeOwnerTeam) {
      return auctionHistory.bids;
    }

    return auctionHistory.bids.filter((bid) => bid.team_name === activeOwnerTeam.name);
  }, [activeOwnerTeam, auctionHistory.bids, activeUser.role]);

  const tickerMessages = useMemo(() => {
    const base = [
      'LIVE: IPL AUCTION CONTROL ROOM ONLINE',
      'TEAM OWNERS CONNECTED FOR REAL-TIME BIDDING',
      'AUTO-BID ENGINE ACTIVE FOR ELIGIBLE TEAMS',
    ];

    if (analytics) {
      base.push(`SOLD PLAYERS: ${analytics.soldCount}`);
      base.push(`UNSOLD PLAYERS: ${analytics.unsoldCount}`);
    }

    if (auctionState) {
      base.push(`AUCTION STATUS: ${auctionState.status.toUpperCase()}`);
      base.push(`CURRENT TIMER: ${auctionState.timerSeconds}s`);
    }

    if (auctionHistory.sales.length > 0) {
      base.push(`LATEST SOLD: ${auctionHistory.sales[0].player_name}`);
    }

    return base;
  }, [analytics, auctionHistory.sales, auctionState]);

  const downloadReport = () => {
    const report = {
      user: { name: activeUser.name, role: activeUser.role },
      auctionState,
      teams: activeUser.role === 'team_owner' ? ownerTeams : teams,
      analytics,
      history: {
        bids: filteredBids.slice(0, 50),
        sales: filteredSales.slice(0, 50),
      },
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${activeUser.role}-auction-report.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const sidebarItems = activeUser.role === 'admin'
    ? [
        { key: 'home', label: 'Dashboard Overview' },
        { key: 'teams', label: 'Add/Edit Teams' },
        { key: 'players', label: 'Add/Edit Players' },
        { key: 'auction', label: 'Auction Controls' },
        { key: 'summary', label: 'Final Summary / Export' },
        { key: 'history', label: 'Auction History' },
        { key: 'reports', label: 'Analytics Reports' },
        { key: 'uploads', label: 'Uploads' },
        { key: 'alerts', label: 'Notifications / Alerts' },
        { key: 'roles', label: 'Role Management' },
        { key: 'settings', label: 'Settings' },
      ]
    : [
        { key: 'home', label: 'My Team Overview' },
        { key: 'budget', label: 'My Purse / Budget' },
        { key: 'live-bidding', label: 'Live Bidding Room' },
        { key: 'paddle', label: 'Team Paddles' },
        { key: 'squad', label: 'Squad List' },
        { key: 'ai', label: 'AI Bid Suggestions' },
        { key: 'history', label: 'Auction History' },
        { key: 'watchlist', label: 'Watchlist / Targets' },
        { key: 'chat', label: 'Chat with Auction Room' },
        { key: 'summary', label: 'Final Squad Summary' },
        { key: 'download', label: 'Download Squad Report' },
        { key: 'profile', label: 'Profile / Team Info' },
        { key: 'settings', label: 'Settings' },
      ];

  const renderPanel = () => {
    const teamSpend = analytics?.teamSpend || [];
    const statusLabel = auctionState ? auctionState.status : 'unknown';

    switch (tab) {
      case 'home':
        return activeUser.role === 'admin' ? (
          <section className="grid gap-5 md:grid-cols-3">
            <article className="rounded-2xl border border-white/20 bg-black/35 p-5 backdrop-blur">
              <h3 className="font-serif text-3xl">Auction Controls</h3>
              <p className="mt-2 text-sm text-slate-300">Start, pause, move next, and recall round from the live auction table.</p>
            </article>
            <article className="rounded-2xl border border-white/20 bg-black/35 p-5 backdrop-blur">
              <h3 className="font-serif text-3xl">Team Management</h3>
              <p className="mt-2 text-sm text-slate-300">Create teams, assign owners, upload logos, and monitor purse usage.</p>
            </article>
            <article className="rounded-2xl border border-white/20 bg-black/35 p-5 backdrop-blur">
              <h3 className="font-serif text-3xl">Player Pool</h3>
              <p className="mt-2 text-sm text-slate-300">Add players, upload photos, filter categories, and track auction readiness.</p>
            </article>
          </section>
        ) : (
          <section className="grid gap-5 md:grid-cols-3">
            <article className="rounded-2xl border border-white/20 bg-black/35 p-5 backdrop-blur">
              <h3 className="font-serif text-3xl">Your Team</h3>
              <p className="mt-2 text-sm text-slate-300">See your franchise info, purse, and current squad path.</p>
            </article>
            <article className="rounded-2xl border border-white/20 bg-black/35 p-5 backdrop-blur">
              <h3 className="font-serif text-3xl">Live Auction</h3>
              <p className="mt-2 text-sm text-slate-300">Jump into the bidding room, paddle buttons, and team chat.</p>
            </article>
            <article className="rounded-2xl border border-white/20 bg-black/35 p-5 backdrop-blur">
              <h3 className="font-serif text-3xl">Smart Suggestions</h3>
              <p className="mt-2 text-sm text-slate-300">Use AI bid suggestions and budget alerts to stay competitive.</p>
            </article>
          </section>
        );

      case 'overview':
        return activeUser.role === 'admin' ? (
          <section className="grid gap-4 md:grid-cols-3">
            <article className="rounded-2xl border border-white/20 bg-black/35 p-5 backdrop-blur">
              <h2 className="font-serif text-2xl">Auction Status</h2>
              <p className="mt-2 text-sm text-slate-300">Current state: {statusLabel}</p>
            </article>
            <article className="rounded-2xl border border-white/20 bg-black/35 p-5 backdrop-blur">
              <h2 className="font-serif text-2xl">Players Sold</h2>
              <p className="mt-2 text-sm text-slate-300">{analytics ? analytics.soldCount : '-'} sold</p>
            </article>
            <article className="rounded-2xl border border-white/20 bg-black/35 p-5 backdrop-blur">
              <h2 className="font-serif text-2xl">Players Unsold</h2>
              <p className="mt-2 text-sm text-slate-300">{analytics ? analytics.unsoldCount : '-'} unsold</p>
            </article>
            {teamSpend.length ? (
              <article className="rounded-2xl border border-white/20 bg-black/35 p-5 backdrop-blur md:col-span-3">
                <h2 className="font-serif text-2xl">Team-wise Spending</h2>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  {teamSpend.map((team) => (
                    <div key={team.name} className="rounded-xl border border-white/20 bg-white/10 p-3">
                      <p className="font-semibold">{team.name}</p>
                      <p className="text-sm text-slate-300">Spent: {Number(team.spent).toFixed(2)} Cr</p>
                    </div>
                  ))}
                </div>
              </article>
            ) : null}
          </section>
        ) : (
          <section className="grid gap-4 md:grid-cols-3">
            <article className="rounded-2xl border border-white/20 bg-black/35 p-5 backdrop-blur">
              <h2 className="font-serif text-2xl">My Team</h2>
              <p className="mt-2 text-sm text-slate-300">{activeOwnerTeam ? activeOwnerTeam.name : 'No team assigned'}</p>
            </article>
            <article className="rounded-2xl border border-white/20 bg-black/35 p-5 backdrop-blur">
              <h2 className="font-serif text-2xl">Budget</h2>
              <p className="mt-2 text-sm text-slate-300">{activeOwnerTeam ? `${Number(activeOwnerTeam.purse_remaining).toFixed(2)} Cr remaining` : '-'}</p>
            </article>
            <article className="rounded-2xl border border-white/20 bg-black/35 p-5 backdrop-blur">
              <h2 className="font-serif text-2xl">Squad</h2>
              <p className="mt-2 text-sm text-slate-300">{activeOwnerTeam ? `${Number(activeOwnerTeam.squad_count || 0)} players` : '-'}</p>
            </article>
          </section>
        );

      case 'teams':
        return <TeamsPage />;
      case 'players':
        return <PlayersPage />;
      case 'auction':
      case 'live-bidding':
        return <AuctionPage />;

      case 'history':
        return (
          <section className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-2xl border border-white/20 bg-black/35 p-5 backdrop-blur">
              <h2 className="font-serif text-2xl">Recent Sales</h2>
              <div className="mt-3 space-y-2">
                {filteredSales.length === 0 ? <p className="text-sm text-slate-300">No sales yet.</p> : null}
                {filteredSales.slice(0, 10).map((sale) => (
                  <div key={sale.id} className="rounded-xl border border-white/15 bg-white/5 p-3 text-sm">
                    <p className="font-semibold text-white">{sale.player_name}</p>
                    <p className="text-slate-300">{sale.team_name || 'Unsold'} · {sale.sale_status}</p>
                    <p className="text-slate-400">{sale.sold_price ? `${Number(sale.sold_price).toFixed(2)} Cr` : '-'}</p>
                  </div>
                ))}
              </div>
            </article>
            <article className="rounded-2xl border border-white/20 bg-black/35 p-5 backdrop-blur">
              <h2 className="font-serif text-2xl">Recent Bids</h2>
              <div className="mt-3 space-y-2">
                {filteredBids.length === 0 ? <p className="text-sm text-slate-300">No bids yet.</p> : null}
                {filteredBids.slice(0, 10).map((bid) => (
                  <div key={bid.id} className="rounded-xl border border-white/15 bg-white/5 p-3 text-sm">
                    <p className="font-semibold text-white">{bid.player_name}</p>
                    <p className="text-slate-300">{bid.team_name}</p>
                    <p className="text-slate-400">{Number(bid.amount).toFixed(2)} Cr</p>
                  </div>
                ))}
              </div>
            </article>
          </section>
        );

      case 'reports':
        return (
          <section className="grid gap-4 md:grid-cols-3">
            <article className="rounded-2xl border border-white/20 bg-black/35 p-5 backdrop-blur">
              <h2 className="font-serif text-2xl">Analytics</h2>
              <p className="mt-2 text-sm text-slate-300">Sold: {analytics?.soldCount ?? '-'}</p>
              <p className="text-sm text-slate-300">Unsold: {analytics?.unsoldCount ?? '-'}</p>
            </article>
            <article className="rounded-2xl border border-white/20 bg-black/35 p-5 backdrop-blur md:col-span-2">
              <h2 className="font-serif text-2xl">Team Spend</h2>
              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {(analytics?.teamSpend || []).map((team) => (
                  <div key={team.name} className="rounded-xl border border-white/15 bg-white/5 p-3 text-sm">
                    <p className="font-semibold text-white">{team.name}</p>
                    <p className="text-slate-300">Spent: {Number(team.spent).toFixed(2)} Cr</p>
                  </div>
                ))}
              </div>
            </article>
            <article className="rounded-2xl border border-white/20 bg-black/35 p-5 backdrop-blur md:col-span-3">
              <h2 className="font-serif text-2xl">Latest Sales Report</h2>
              <p className="mt-2 text-sm text-slate-300">Recent sale entries pulled from the auction history API.</p>
            </article>
          </section>
        );

      case 'uploads':
        return (
          <section className="grid gap-4 md:grid-cols-2">
            <article className="rounded-2xl border border-white/20 bg-black/35 p-5 backdrop-blur">
              <h2 className="font-serif text-2xl">Player Photos</h2>
              <p className="mt-2 text-sm text-slate-300">Use the Players tab to add players and upload player images.</p>
              <button className="mt-4 rounded-lg bg-powerplay px-4 py-2 font-bold text-navy" onClick={() => setTab('players')}>
                Open Players Uploads
              </button>
            </article>
            <article className="rounded-2xl border border-white/20 bg-black/35 p-5 backdrop-blur">
              <h2 className="font-serif text-2xl">Team Logos</h2>
              <p className="mt-2 text-sm text-slate-300">Use the Teams tab to create teams and upload logos.</p>
              <button className="mt-4 rounded-lg bg-powerplay px-4 py-2 font-bold text-navy" onClick={() => setTab('teams')}>
                Open Team Logo Uploads
              </button>
            </article>
          </section>
        );

      case 'alerts':
        return (
          <section className="grid gap-4 md:grid-cols-3">
            <article className="rounded-2xl border border-white/20 bg-black/35 p-5 backdrop-blur md:col-span-2">
              <h2 className="font-serif text-2xl">Live Alerts</h2>
              <div className="mt-3 space-y-2 text-sm text-slate-200">
                <p>Auction status: {statusLabel}</p>
                <p>Current timer: {auctionState ? `${auctionState.timerSeconds}s` : '-'}</p>
                <p>Current player: {auctionState?.currentPlayer?.name || 'No player active'}</p>
                <p>Highest bid: {auctionState?.highestBid ? `${auctionState.highestBid.teamName} · ${Number(auctionState.highestBid.amount).toFixed(2)} Cr` : 'No bid yet'}</p>
              </div>
            </article>
            <article className="rounded-2xl border border-white/20 bg-black/35 p-5 backdrop-blur">
              <h2 className="font-serif text-2xl">Notifications</h2>
              <p className="mt-2 text-sm text-slate-300">Recent sales and bids from history reflect here.</p>
            </article>
          </section>
        );

      case 'roles':
        return activeUser.role === 'admin' ? (
          <section className="grid gap-4 md:grid-cols-2">
            {owners.map((owner) => {
              const assignedTeams = teams.filter((team) => Number(team.owner_user_id) === Number(owner.id));
              return (
                <article key={owner.id} className="rounded-2xl border border-white/20 bg-black/35 p-5 backdrop-blur">
                  <h2 className="font-serif text-2xl">{owner.name}</h2>
                  <p className="mt-2 text-sm text-slate-300">{owner.email}</p>
                  <p className="mt-2 text-sm text-slate-300">Assigned teams: {assignedTeams.length ? assignedTeams.map((team) => team.name).join(', ') : 'None'}</p>
                </article>
              );
            })}
          </section>
        ) : (
          <section className="rounded-2xl border border-white/20 bg-black/35 p-5 backdrop-blur">
            <h2 className="font-serif text-2xl">Profile & Team Info</h2>
            <p className="mt-2 text-sm text-slate-300">User: {activeUser.name}</p>
            <p className="text-sm text-slate-300">Role: Team Owner</p>
            <p className="text-sm text-slate-300">Team: {activeOwnerTeam ? activeOwnerTeam.name : 'No team assigned'}</p>
          </section>
        );

      case 'budget':
        return (
          <section className="grid gap-4 md:grid-cols-3">
            <article className="rounded-2xl border border-white/20 bg-black/35 p-5 backdrop-blur md:col-span-2">
              <h2 className="font-serif text-2xl">My Purse / Budget</h2>
              <p className="mt-2 text-sm text-slate-300">{activeOwnerTeam ? `${activeOwnerTeam.name} has ${Number(activeOwnerTeam.purse_remaining).toFixed(2)} Cr remaining.` : 'No active team'}</p>
            </article>
            <article className="rounded-2xl border border-white/20 bg-black/35 p-5 backdrop-blur">
              <h2 className="font-serif text-2xl">Budget Alert</h2>
              <p className="mt-2 text-sm text-slate-300">Keep bids balanced and stay below your purse ceiling.</p>
            </article>
          </section>
        );

      case 'squad':
        return (
          <section className="rounded-2xl border border-white/20 bg-black/35 p-5 backdrop-blur">
            <h2 className="font-serif text-2xl">Squad List</h2>
            <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {filteredSales.length ? filteredSales.map((sale) => (
                <div key={sale.id} className="rounded-xl border border-white/15 bg-white/5 p-3 text-sm">
                  <p className="font-semibold text-white">{sale.player_name}</p>
                  <p className="text-slate-300">{sale.team_name || 'Unsold'}</p>
                </div>
              )) : <p className="text-sm text-slate-300">No squad entries yet.</p>}
            </div>
          </section>
        );

      case 'ai':
        return (
          <section className="grid gap-4 md:grid-cols-2">
            <article className="rounded-2xl border border-white/20 bg-black/35 p-5 backdrop-blur">
              <h2 className="font-serif text-2xl">AI Bid Suggestions</h2>
              <p className="mt-2 text-sm text-slate-300">Open the Live Auction tab to use the full smart bidding assistant.</p>
            </article>
            <article className="rounded-2xl border border-white/20 bg-black/35 p-5 backdrop-blur">
              <h2 className="font-serif text-2xl">Current Read</h2>
              <p className="mt-2 text-sm text-slate-300">
                {auctionState?.currentPlayer
                  ? `${auctionState.currentPlayer.name} · ${auctionState.currentPlayer.role} · ${Number(auctionState.currentPlayer.rating).toFixed(1)}/10`
                  : 'Waiting for live player data.'}
              </p>
            </article>
          </section>
        );

      case 'watchlist':
        return (
          <section className="rounded-2xl border border-white/20 bg-black/35 p-5 backdrop-blur">
            <h2 className="font-serif text-2xl">Watchlist / Target Players</h2>
            <p className="mt-2 text-sm text-slate-300">Use the Players tab to shortlist targets and the Live Auction tab to bid on them.</p>
          </section>
        );

      case 'chat':
        return (
          <section className="rounded-2xl border border-white/20 bg-black/35 p-5 backdrop-blur">
            <h2 className="font-serif text-2xl">Chat with Auction Room</h2>
            <p className="mt-2 text-sm text-slate-300">Live room chat is available in the Auction tab. Recent messages are shown below.</p>
            <div className="mt-4 max-h-72 space-y-2 overflow-y-auto rounded-xl border border-white/15 bg-white/5 p-3">
              {chatMessages.length === 0 ? <p className="text-sm text-slate-300">No messages yet.</p> : null}
              {chatMessages.slice(-10).map((message, index) => (
                <div key={`${message.createdAt || message.created_at || index}`} className="rounded-lg border border-white/15 bg-black/20 p-2 text-sm">
                  <p className="text-xs text-powerplay">{message.userName || message.user_name || 'Auction Room'}</p>
                  <p>{message.message}</p>
                </div>
              ))}
            </div>
          </section>
        );

      case 'summary':
        return activeUser.role === 'admin' ? (
          <section className="grid gap-4 md:grid-cols-3">
            <article className="rounded-2xl border border-white/20 bg-black/35 p-5 backdrop-blur">
              <h2 className="font-serif text-2xl">Final Summary</h2>
              <p className="mt-2 text-sm text-slate-300">Sold: {analytics?.soldCount ?? '-'}</p>
              <p className="text-sm text-slate-300">Unsold: {analytics?.unsoldCount ?? '-'}</p>
            </article>
            <article className="rounded-2xl border border-white/20 bg-black/35 p-5 backdrop-blur md:col-span-2">
              <h2 className="font-serif text-2xl">Export Report</h2>
              <p className="mt-2 text-sm text-slate-300">Download a JSON export of the current auction summary and history.</p>
              <button className="mt-4 rounded-lg bg-powerplay px-4 py-2 font-bold text-navy" onClick={downloadReport}>Download Export</button>
            </article>
          </section>
        ) : (
          <section className="rounded-2xl border border-white/20 bg-black/35 p-5 backdrop-blur">
            <h2 className="font-serif text-2xl">Final Squad Summary</h2>
            <p className="mt-2 text-sm text-slate-300">Your sold players will appear here after the auction ends.</p>
          </section>
        );

      case 'download':
        return (
          <section className="rounded-2xl border border-white/20 bg-black/35 p-5 backdrop-blur">
            <h2 className="font-serif text-2xl">Download Squad Report</h2>
            <p className="mt-2 text-sm text-slate-300">Export the current team and history snapshot as JSON.</p>
            <button className="mt-4 rounded-lg bg-powerplay px-4 py-2 font-bold text-navy" onClick={downloadReport}>Download Report</button>
          </section>
        );

      case 'profile':
        return (
          <section className="rounded-2xl border border-white/20 bg-black/35 p-5 backdrop-blur">
            <h2 className="font-serif text-2xl">Profile / Team Info</h2>
            <p className="mt-2 text-sm text-slate-300">Name: {activeUser.name}</p>
            <p className="text-sm text-slate-300">Role: {activeUser.role === 'admin' ? 'Admin' : 'Team Owner'}</p>
            <p className="text-sm text-slate-300">Active team: {activeOwnerTeam ? activeOwnerTeam.name : 'No team assigned'}</p>
          </section>
        );

      case 'settings':
        return (
          <section className="grid gap-4 md:grid-cols-3">
            <article className="rounded-2xl border border-white/20 bg-black/35 p-5 backdrop-blur md:col-span-2">
              <h2 className="font-serif text-2xl">Settings</h2>
              <p className="mt-2 text-sm text-slate-300">Theme, sidebar, and session controls are available here.</p>
            </article>
            <article className="rounded-2xl border border-white/20 bg-black/35 p-5 backdrop-blur">
              <h2 className="font-serif text-2xl">Theme</h2>
              <button className="mt-3 w-full rounded-xl border border-powerplay/60 px-4 py-3 text-left text-sm font-semibold text-powerplay hover:bg-white/10" onClick={toggleTheme}>
                Theme: {theme === 'light' ? 'Light' : 'Dark'} (Switch)
              </button>
            </article>
          </section>
        );

      default:
        return null;
    }
  };

  if (!currentUser) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-stadium p-6 text-slate-100">
        <section className="rounded-2xl border border-white/20 bg-black/30 p-8">
          <p>Session expired. Please login again.</p>
          <Link className="mt-4 inline-block text-powerplay" to="/login">
            Go to Login
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen overflow-x-hidden bg-cover bg-center bg-no-repeat text-slate-100"
      style={{
        backgroundImage:
          isDark
            ? "linear-gradient(rgba(4, 12, 28, 0.82), rgba(7, 32, 20, 0.9)), url('https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?auto=format&fit=crop&w=1800&q=80')"
            : "linear-gradient(rgba(255, 255, 255, 0.88), rgba(245, 249, 255, 0.9)), url('https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1800&q=80')",
      }}
    >
      <button
        type="button"
        aria-label="Open navigation"
        className="fixed left-4 top-4 z-50 rounded-xl border border-white/30 bg-black/45 px-3 py-2 text-2xl leading-none backdrop-blur"
        onClick={() => setSidebarOpen((prev) => !prev)}
      >
        ☰
      </button>

      <aside
        className={`fixed left-0 top-0 z-40 flex h-full w-[86vw] max-w-72 flex-col border-r border-white/10 bg-slate-950/95 p-5 backdrop-blur transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="mt-12 space-y-4">
          <h2 className="font-serif text-4xl text-powerplay">IPL Auction</h2>
          <p className="text-xs uppercase tracking-[0.25em] text-slate-300">Team Strategy Panel</p>
        </div>

        <nav className="mt-8 flex-1 space-y-2 overflow-y-auto pr-1">
          {sidebarItems.map((item) => (
            <button
              key={item.key}
              className={`w-full rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${
                tab === item.key ? 'bg-powerplay text-navy' : 'bg-white/5 hover:bg-white/15'
              }`}
              onClick={() => {
                setTab(item.key as TabKey);
                setSidebarOpen(false);
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="mt-4 border-t border-white/10 pt-4">
          <button
            className="w-full rounded-xl border border-white/30 px-4 py-3 text-left text-sm font-semibold hover:bg-white/10"
            onClick={handleLogout}
          >
            Logout
          </button>

          <button
            className="mt-3 w-full rounded-xl border border-powerplay/60 px-4 py-3 text-left text-sm font-semibold text-powerplay hover:bg-white/10"
            onClick={toggleTheme}
          >
            Theme: {theme === 'light' ? 'Light' : 'Dark'} (Switch)
          </button>
        </div>
      </aside>

      <div className="px-4 pb-8 pt-20 sm:px-6 md:px-10 lg:pl-24">
        <div className="mx-auto max-w-7xl space-y-8">
          <section className="broadcast-ticker overflow-hidden rounded-xl border border-powerplay/40 bg-black/60 p-2">
            <div className="ticker-track flex min-w-max items-center gap-8">
              {tickerMessages.map((message, idx) => (
                <p key={`${message}-${idx}`} className="whitespace-nowrap text-xs font-semibold tracking-[0.18em] text-powerplay">
                  {message}
                </p>
              ))}
              {tickerMessages.map((message, idx) => (
                <p key={`${message}-loop-${idx}`} className="whitespace-nowrap text-xs font-semibold tracking-[0.18em] text-powerplay">
                  {message}
                </p>
              ))}
            </div>
          </section>

          {tab === 'home' ? (
            <header className="rounded-3xl border border-white/15 bg-black/35 p-6 backdrop-blur md:p-8">
              <p className="text-sm uppercase tracking-[0.2em] text-powerplay">Official IPL Auction Room</p>
              <h1 className="mt-2 font-serif text-4xl font-bold leading-none sm:text-5xl md:text-6xl">Welcome, {currentUser.name}</h1>
              <p className="mt-2 text-slate-200">Role: {currentUser.role === 'admin' ? 'Admin' : 'Team Owner'}</p>
            </header>
          ) : null}

          <section className="overflow-hidden rounded-2xl border border-white/20 bg-black/35 p-4 backdrop-blur">
            <p className="mb-3 text-xs uppercase tracking-[0.2em] text-slate-300">Team Logo Carousel</p>
            <div className="logo-carousel-track flex min-w-max items-center gap-6">
              {logoCarouselItems.map((team, idx) => (
                <div key={`${team.id}-${idx}`} className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/5 px-3 py-2">
                  <img src={team.logo} alt={team.name} className="h-10 w-10 rounded-full border border-white/20 object-cover" />
                  <span className="whitespace-nowrap text-sm font-semibold text-slate-100">{team.name}</span>
                </div>
              ))}
            </div>
          </section>

          {renderPanel()}
        </div>
      </div>
    </main>
  );
};

export default DashboardPage;
