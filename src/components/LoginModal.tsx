import React, { useState } from 'react';
import { Shield, Lock, User, X, CheckCircle2, AlertTriangle, Key } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginModal: React.FC = () => {
  const { isLoginModalOpen, setIsLoginModalOpen, login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isLoginModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await login(username, password);
    setLoading(false);
    if (result.success) {
      setIsLoginModalOpen(false);
      setUsername('');
      setPassword('');
    } else {
      setError(result.error || 'Invalid username or password. Please verify credentials.');
    }
  };

  const handleQuickDemoLogin = async (u: string, p: string) => {
    setError(null);
    setUsername(u);
    setPassword(p);
    setLoading(true);
    const result = await login(u, p);
    setLoading(false);
    if (result.success) {
      setIsLoginModalOpen(false);
    } else {
      setError(result.error || 'Authentication error.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md p-6 sm:p-8 rounded-2xl bg-white border border-slate-200 shadow-2xl space-y-6 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-100 text-[#0284C7]">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 uppercase font-mono tracking-tight">Staff & Admin Access</h3>
              <p className="text-xs text-slate-500 font-mono uppercase tracking-wider font-semibold">Role-Based Security Portal</p>
            </div>
          </div>
          <button
            onClick={() => setIsLoginModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-300 text-xs text-rose-800 flex items-center space-x-2 font-mono shadow-xs">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
          <div className="space-y-1">
            <label className="block text-slate-700 uppercase font-semibold">Username / Staff ID</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. admin or operator"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-[#0284C7] shadow-xs"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-slate-700 uppercase font-semibold">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-[#0284C7] shadow-xs"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] text-white font-bold text-xs uppercase font-mono tracking-wider cursor-pointer transition-all shadow-sm disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In to Operations Portal'}
          </button>
        </form>

        {/* Quick Demo Logins for Instant Evaluation */}
        <div className="pt-3 border-t border-slate-200 space-y-2 text-xs">
          <div className="text-[11px] font-mono text-slate-500 text-center uppercase tracking-wider font-semibold">Quick Switch Credentials:</div>
          <div className="grid grid-cols-3 gap-2 font-mono">
            <button
              onClick={() => handleQuickDemoLogin('admin', 'admin123')}
              className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[#0284C7] text-center cursor-pointer shadow-xs transition-colors"
            >
              <div className="font-bold uppercase">Admin</div>
              <div className="text-[9px] text-slate-500">admin / admin123</div>
            </button>
            <button
              onClick={() => handleQuickDemoLogin('operator', 'operator123')}
              className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-sky-700 text-center cursor-pointer shadow-xs transition-colors"
            >
              <div className="font-bold uppercase">Operator</div>
              <div className="text-[9px] text-slate-500">operator / op123</div>
            </button>
            <button
              onClick={() => handleQuickDemoLogin('viewer', 'viewer123')}
              className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-center cursor-pointer shadow-xs transition-colors"
            >
              <div className="font-bold uppercase">Viewer</div>
              <div className="text-[9px] text-slate-500">viewer / view123</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
