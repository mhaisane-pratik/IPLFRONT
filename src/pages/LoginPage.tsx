import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { AuthResponse } from '../types/auth';

const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await api.post<AuthResponse>('/auth/login', { email, password });
      localStorage.setItem('ipl_token', data.token);
      localStorage.setItem('ipl_user', JSON.stringify(data.user));
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-stadium p-6 text-slate-100">
      <section className="w-full max-w-md rounded-3xl border border-white/15 bg-black/30 p-8 backdrop-blur">
        <h1 className="font-serif text-3xl font-bold">Owner/Admin Login</h1>
        <p className="mt-2 text-sm text-slate-300">Login to start or join IPL auction bidding.</p>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
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
              placeholder="owner@team.com"
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
              required
              className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 outline-none ring-powerplay placeholder:text-slate-300 focus:ring"
              placeholder="******"
            />
          </div>

          {error ? <p className="text-sm font-medium text-red-300">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-powerplay px-4 py-3 font-bold text-navy disabled:opacity-70"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-300">
          New user?{' '}
          <Link className="font-semibold text-powerplay" to="/register">
            Register here
          </Link>
        </p>
      </section>
    </main>
  );
};

export default LoginPage;
