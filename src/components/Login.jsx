import { useState } from 'react';
import { login } from '../lib/pocketbase';

export function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);

    if (result.success) {
      onLoginSuccess(result.user);
    } else {
      setError(result.error || 'Login failed. Please check your credentials.');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950">
      <div className="w-full max-w-md p-8 bg-surface rounded-2xl shadow-2xl border border-border-default">
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <div className="text-white text-2xl font-black tracking-wider mb-2">
            DOCVAULT
          </div>
          <div className="text-slate-400 text-sm font-medium">
            Purchase Order Management System
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-text-primary mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              placeholder="admin@docvault.local"
              className="w-full px-4 py-3 bg-bg-app border border-border-strong rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
            />
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-text-primary mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-bg-app border border-border-strong rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-soft border border-red-mid rounded-lg">
              <p className="text-sm text-red font-medium">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-3 bg-brand text-white font-bold rounded-lg hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-[0.98]"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Logging in...
              </span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Helper Text */}
        <div className="mt-8 text-center space-y-4">
          <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-800">
            <p className="text-[11px] text-slate-500 uppercase tracking-widest font-bold mb-2">Default Credentials</p>
            <p className="text-sm text-slate-300 font-mono">admin.api@gmail.com</p>
            <p className="text-sm text-slate-300 font-mono">admin123!45</p>
          </div>
          
          <button 
            type="button"
            onClick={() => {
              localStorage.clear();
              window.pb?.authStore?.clear();
              window.location.reload();
            }}
            className="text-[10px] text-slate-600 hover:text-brand transition-colors uppercase font-bold tracking-tighter"
          >
            ⚠️ Hard Reset Browser Session
          </button>
        </div>
      </div>
    </div>
  );
}
