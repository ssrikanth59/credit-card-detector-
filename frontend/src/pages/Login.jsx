import React, { useState } from 'react';
import { Shield, Key, User, Lock, Mail, AlertCircle, CheckCircle } from 'lucide-react';
import { login, register } from '../utils/api';

const Login = ({ onLoginSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isSignUp) {
        const response = await register({ username, email, password });
        if (response.data.success) {
          setSuccess('Registration successful! Please log in with your email and password.');
          setIsSignUp(false);
          setPassword('');
          // Auto-fill username field with the registered email for easy login
          setUsername(email);
        }
      } else {
        const response = await login({ username, password });
        if (response.data.success) {
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('user', JSON.stringify(response.data.user));
          onLoginSuccess(response.data.user);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Connection to backend failed. Make sure the server is running.');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setError('');
    setSuccess('');
    setUsername('');
    setEmail('');
    setPassword('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-bg px-4 font-sans">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/15 via-dark-bg to-dark-bg z-0 pointer-events-none" />
      
      <div className="w-full max-w-md glass glow-card rounded-2xl border border-dark-border p-8 relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex bg-indigo-600/10 p-3.5 rounded-2xl border border-indigo-500/25 mb-4 animate-pulse-slow">
            <Shield className="h-8 w-8 text-indigo-500" />
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            {isSignUp ? 'Create Account' : 'FRAUDSHIELD Portal'}
          </h2>
          <p className="text-sm text-dark-muted mt-1.5">
            {isSignUp ? 'Register as a security system operator' : 'Machine Learning Fraud Prevention Gateway'}
          </p>
        </div>

        {error && (
          <div className="mb-5 bg-brand-danger/10 border border-brand-danger/20 text-brand-danger p-3.5 rounded-xl text-xs flex items-start space-x-2 animate-fade-in">
            <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3.5 rounded-xl text-xs flex items-start space-x-2 animate-fade-in">
            <CheckCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {isSignUp && (
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
                  placeholder="Choose a unique username"
                />
              </div>
            </div>
          )}

          {!isSignUp ? (
            <div>
              <label className="block text-xs font-semibold text-dark-muted tracking-wider uppercase mb-1.5">Username or Email</label>
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
                  placeholder="Enter username or email address"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-dark-muted tracking-wider uppercase mb-1.5">Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-dark-muted">
                  <Mail className="h-4 w-4" />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-dark-bg/80 border border-dark-border rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-dark-muted focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                  placeholder="Enter your email address"
                />
              </div>
            </div>
          )}

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
                placeholder={isSignUp ? "Create a secure password" : "Enter security password"}
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-lg shadow-indigo-600/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (isSignUp ? 'Creating Account...' : 'Authenticating...') : (isSignUp ? 'Register' : 'Sign In')}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={toggleMode}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium focus:outline-none transition-colors cursor-pointer"
          >
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
