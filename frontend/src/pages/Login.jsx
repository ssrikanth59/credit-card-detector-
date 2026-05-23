import React, { useState } from 'react';
import { Shield, Key, User, Lock, AlertCircle } from 'lucide-react';
import { login } from '../utils/api';

const Login = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await login({ username, password });
      if (response.data.success) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        onLoginSuccess(response.data.user);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Connection to backend failed. Make sure the server is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-bg px-4 font-sans">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/15 via-dark-bg to-dark-bg z-0 pointer-events-none" />
      
      <div className="w-full max-w-md glass glow-card rounded-2xl border border-dark-border p-8 relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex bg-indigo-600/10 p-3.5 rounded-2xl border border-indigo-500/25 mb-4 animate-pulse-slow">
            <Shield className="h-8 w-8 text-indigo-500" />
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">FRAUDSHIELD Portal</h2>
          <p className="text-sm text-dark-muted mt-1.5">Machine Learning Fraud Prevention Gateway</p>
        </div>

        {error && (
          <div className="mb-5 bg-brand-danger/10 border border-brand-danger/20 text-brand-danger p-3.5 rounded-xl text-xs flex items-start space-x-2">
            <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-dark-muted tracking-wider uppercase mb-1.5">Username</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-dark-muted">
                <User className="h-4 w-4" />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full bg-dark-bg/80 border border-dark-border rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-dark-muted focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                placeholder="Enter admin or operator username"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-dark-muted tracking-wider uppercase mb-1.5">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-dark-muted">
                <Lock className="h-4 w-4" />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-dark-bg/80 border border-dark-border rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-dark-muted focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                placeholder="Enter security password"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-lg shadow-indigo-600/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t border-dark-border/40 text-center">
          <p className="text-[11px] text-dark-muted font-mono bg-dark-bg/60 border border-dark-border px-3 py-1.5 rounded-lg inline-block">
            Default credentials: <span className="text-white">admin / admin123</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
