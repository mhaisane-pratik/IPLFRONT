import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../services/api';
import type { Team } from '../types/auction';
import type { AuthUser } from '../types/auth';

interface TeamOwner {
  id: number;
  name: string;
  email: string;
}

const TeamsPage = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<number | ''>('');
  const [owners, setOwners] = useState<TeamOwner[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [shortCode, setShortCode] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [ownerUserId, setOwnerUserId] = useState<number | ''>('');
  const [purseTotal, setPurseTotal] = useState(90);

  const user = useMemo(() => {
    const raw = localStorage.getItem('ipl_user');
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  }, []);

  const fetchTeams = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/teams');
      const fetchedTeams = data.teams || [];
      setTeams(fetchedTeams);

      if (user?.role === 'team_owner') {
        const ownerTeams = fetchedTeams.filter((team: Team) => Number(team.owner_user_id) === Number(user.id));
        if (ownerTeams.length > 0 && !selectedTeamId) {
          setSelectedTeamId(Number(ownerTeams[0].id));
        }
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load teams.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();

    if (user?.role === 'admin') {
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

  const createTeam = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    try {
      await api.post('/teams', {
        name,
        shortCode,
        logoUrl,
        ownerUserId: ownerUserId || undefined,
        purseTotal,
      });
      setName('');
      setShortCode('');
      setLogoUrl('');
      setLogoFile(null);
      setOwnerUserId('');
      setPurseTotal(90);
      fetchTeams();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create team.');
    }
  };

  const visibleTeams = useMemo(() => {
    if (user?.role === 'team_owner') {
      const ownerTeams = teams.filter((team) => Number(team.owner_user_id) === Number(user.id));
      if (!selectedTeamId) {
        return ownerTeams;
      }
      return ownerTeams.filter((team) => Number(team.id) === Number(selectedTeamId));
    }

    return teams;
  }, [selectedTeamId, teams, user?.id, user?.role]);

  const uploadTeamLogo = async () => {
    if (!logoFile) {
      return;
    }

    setUploadingLogo(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('image', logoFile);

      const { data } = await api.post('/uploads/team-logo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setLogoUrl(data.url || '');
      setLogoFile(null);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Team logo upload failed.');
    } finally {
      setUploadingLogo(false);
    }
  };

  return (
    <section className="space-y-5">
      <header>
        <h2 className="font-serif text-3xl">Teams & Budgets</h2>
        <p className="text-sm text-slate-300">Create franchises and track purse + squad count.</p>
      </header>

      {user?.role === 'admin' ? (
        <form className="grid gap-3 rounded-2xl border border-white/20 bg-black/30 p-4 md:grid-cols-6" onSubmit={createTeam}>
          <input
            className="rounded-lg border border-white/20 bg-white/10 px-3 py-2"
            placeholder="Team Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
          <input
            className="rounded-lg border border-white/20 bg-white/10 px-3 py-2"
            placeholder="Short Code"
            value={shortCode}
            onChange={(event) => setShortCode(event.target.value)}
            required
          />
          <input
            className="rounded-lg border border-white/20 bg-white/10 px-3 py-2"
            placeholder="Logo URL"
            value={logoUrl}
            onChange={(event) => setLogoUrl(event.target.value)}
          />
          <select
            className="rounded-lg border border-white/20 bg-white/10 px-3 py-2"
            value={ownerUserId}
            onChange={(event) => setOwnerUserId(event.target.value ? Number(event.target.value) : '')}
          >
            <option value="">Assign Team Owner</option>
            {owners.map((owner) => (
              <option key={owner.id} value={owner.id}>
                {owner.name}
              </option>
            ))}
          </select>
          <input
            className="rounded-lg border border-white/20 bg-white/10 px-3 py-2"
            type="number"
            min={1}
            max={200}
            step={0.1}
            value={purseTotal}
            onChange={(event) => setPurseTotal(Number(event.target.value))}
            required
          />
          <div className="flex items-center gap-2 md:col-span-2">
            <input
              className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm"
              type="file"
              accept="image/*"
              onChange={(event) => setLogoFile(event.target.files?.[0] || null)}
            />
            <button
              className="rounded-lg border border-white/30 px-3 py-2 text-xs"
              type="button"
              disabled={!logoFile || uploadingLogo}
              onClick={uploadTeamLogo}
            >
              {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
            </button>
          </div>
          <button className="rounded-lg bg-powerplay px-4 py-2 font-bold text-navy" type="submit">
            Create Team
          </button>
        </form>
      ) : null}

      {user?.role === 'team_owner' ? (
        <div className="rounded-2xl border border-white/20 bg-black/30 p-4">
          <label className="mb-2 block text-sm text-slate-300">Select Your Team</label>
          <select
            className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 md:w-80"
            value={selectedTeamId}
            onChange={(event) => setSelectedTeamId(event.target.value ? Number(event.target.value) : '')}
          >
            {teams
              .filter((team) => Number(team.owner_user_id) === Number(user.id))
              .map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
          </select>
        </div>
      ) : null}

      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {loading ? <p>Loading teams...</p> : null}

      <div className="grid gap-3 md:grid-cols-2">
        {visibleTeams.map((team) => (
          <article key={team.id} className="rounded-2xl border border-white/20 bg-black/30 p-4">
            <div className="flex items-start gap-3">
              <img
                src={team.logo_url || 'https://placehold.co/96x96/png'}
                alt={team.name}
                className="h-14 w-14 rounded-lg border border-white/20 object-cover"
              />
              <div>
                <h3 className="text-2xl">{team.name}</h3>
                <p className="text-sm text-slate-300">{team.short_code}</p>
              </div>
            </div>
            <p className="text-sm text-slate-300">Owner: {team.owner_name || 'Unassigned'}</p>
            <p className="mt-2 text-sm">Purse: {Number(team.purse_remaining).toFixed(2)} Cr / {Number(team.purse_total).toFixed(2)} Cr</p>
            <p className="text-sm text-slate-300">Squad Count: {team.squad_count}</p>
          </article>
        ))}
      </div>
    </section>
  );
};

export default TeamsPage;
