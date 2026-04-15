import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { AuthResponse, UserRole } from '../types/auth';

const RegisterPage = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('team_owner');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await api.post<AuthResponse>('/auth/register', {
        name,
        email,
        password,
        role,
      });
      localStorage.setItem('ipl_token', data.token);
      localStorage.setItem('ipl_user', JSON.stringify(data.user));
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-stadium p-6 text-slate-100">
      <section className="w-full max-w-xl rounded-3xl border border-white/15 bg-black/30 p-8 backdrop-blur">
        <h1 className="font-serif text-3xl font-bold">Register for IPL Auction</h1>
        <p className="mt-2 text-sm text-slate-300">Create account as Team Owner or Admin.</p>

        <form className="mt-8 grid gap-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="name">
              Full Name
            </label>
            <input
              id="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 outline-none ring-powerplay placeholder:text-slate-300 focus:ring"
              placeholder="Rohit Sharma"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 outline-none ring-powerplay placeholder:text-slate-300 focus:ring"
                placeholder="admin@ipl.com"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={6}
                required
                className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 outline-none ring-powerplay placeholder:text-slate-300 focus:ring"
                placeholder="min 6 characters"
              />
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Select Role</p>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/20 bg-white/10 px-4 py-3">
                <input
                  type="radio"
                  name="role"
                  checked={role === 'team_owner'}
                  onChange={() => setRole('team_owner')}
                />
                Team Owner
              </label>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/20 bg-white/10 px-4 py-3">
                <input type="radio" name="role" checked={role === 'admin'} onChange={() => setRole('admin')} />
                Admin
              </label>
            </div>
          </div>

          {error ? <p className="text-sm font-medium text-red-300">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-xl bg-powerplay px-5 py-3 font-bold text-navy disabled:opacity-70"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-300">
          Already registered?{' '}
          <Link className="font-semibold text-powerplay" to="/login">
            Login
          </Link>
        </p>
      </section>
    </main>
  );
};

export default RegisterPage;
