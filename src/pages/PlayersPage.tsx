import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../services/api';
import type { Player } from '../types/auction';
import type { AuthUser } from '../types/auth';

type PlayerRoleFilter = 'all' | Player['role'];

const PlayersPage = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [name, setName] = useState('');
  const [role, setRole] = useState<Player['role']>('batsman');
  const [basePrice, setBasePrice] = useState(2);
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [activeFilter, setActiveFilter] = useState<PlayerRoleFilter>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const user = useMemo(() => {
    const raw = localStorage.getItem('ipl_user');
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  }, []);

  const fetchPlayers = async () => {
    setLoading(true);
    setError('');
    try {
      const endpoint = activeFilter === 'all' ? '/players' : `/players?role=${activeFilter}`;
      const { data } = await api.get(endpoint);
      setPlayers(data.players || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load players.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlayers();
  }, [activeFilter]);

  const createPlayer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    try {
      await api.post('/players', {
        name,
        role,
        basePrice,
        photoUrl,
      });
      setName('');
      setRole('batsman');
      setBasePrice(2);
      setPhotoUrl('');
      fetchPlayers();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create player.');
    }
  };

  const uploadPlayerPhoto = async () => {
    if (!photoFile) {
      return;
    }

    setUploadingImage(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('image', photoFile);

      const { data } = await api.post('/uploads/player-photo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setPhotoUrl(data.url || '');
      setPhotoFile(null);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Image upload failed.');
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <section className="space-y-5">
      <header>
        <h2 className="font-serif text-3xl">Players & Base Price</h2>
        <p className="text-sm text-slate-300">Manage auction pool with category and starting amount.</p>
      </header>

      <div className="flex flex-wrap gap-2">
        {[
          { key: 'all', label: 'All' },
          { key: 'batsman', label: 'Batsman' },
          { key: 'bowler', label: 'Bowler' },
          { key: 'all_rounder', label: 'All-rounder' },
          { key: 'wicket_keeper', label: 'Wicket Keeper' },
        ].map((filter) => (
          <button
            key={filter.key}
            type="button"
            className={`rounded-full px-4 py-1 text-xs font-semibold ${
              activeFilter === filter.key ? 'bg-powerplay text-navy' : 'border border-white/30'
            }`}
            onClick={() => setActiveFilter(filter.key as PlayerRoleFilter)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {user?.role === 'admin' ? (
        <form className="grid gap-3 rounded-2xl border border-white/20 bg-black/30 p-4 md:grid-cols-5" onSubmit={createPlayer}>
          <input
            className="rounded-lg border border-white/20 bg-white/10 px-3 py-2"
            placeholder="Player Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
          <select
            className="rounded-lg border border-white/20 bg-white/10 px-3 py-2"
            value={role}
            onChange={(event) => setRole(event.target.value as Player['role'])}
          >
            <option value="batsman">Batsman</option>
            <option value="bowler">Bowler</option>
            <option value="all_rounder">All-rounder</option>
            <option value="wicket_keeper">Wicket keeper</option>
          </select>
          <input
            className="rounded-lg border border-white/20 bg-white/10 px-3 py-2"
            type="number"
            min={0.1}
            step={0.1}
            value={basePrice}
            onChange={(event) => setBasePrice(Number(event.target.value))}
            required
          />
          <input
            className="rounded-lg border border-white/20 bg-white/10 px-3 py-2"
            placeholder="Photo URL"
            value={photoUrl}
            onChange={(event) => setPhotoUrl(event.target.value)}
          />
          <div className="flex items-center gap-2 md:col-span-2">
            <input
              className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm"
              type="file"
              accept="image/*"
              onChange={(event) => setPhotoFile(event.target.files?.[0] || null)}
            />
            <button
              className="rounded-lg border border-white/30 px-3 py-2 text-xs"
              type="button"
              disabled={!photoFile || uploadingImage}
              onClick={uploadPlayerPhoto}
            >
              {uploadingImage ? 'Uploading...' : 'Upload'}
            </button>
          </div>
          <button className="rounded-lg bg-powerplay px-4 py-2 font-bold text-navy" type="submit">
            Add Player
          </button>
        </form>
      ) : null}

      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {loading ? <p>Loading players...</p> : null}

      <div className="grid gap-3 md:grid-cols-2">
        {players.map((player) => (
          <article key={player.id} className="rounded-2xl border border-white/20 bg-black/30 p-4">
            <div className="flex items-start gap-3">
              <img
                src={player.photo_url || 'https://placehold.co/96x96/png'}
                alt={player.name}
                className="h-16 w-16 rounded-lg object-cover"
              />
              <div>
                <h3 className="text-2xl leading-none">{player.name}</h3>
                <p className="text-sm text-slate-300">{player.role}</p>
                <p className="mt-2 text-sm">Base: {Number(player.base_price).toFixed(2)} Cr</p>
                <p className="text-sm text-slate-300">Status: {player.status}</p>
                <p className="text-xs text-slate-400">Added by: {player.added_by_name || 'System'}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

export default PlayersPage;
