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
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-md p-6 sm:p-8 rounded-sm bg-[#0A1124] border border-[#1E293B] border-t-2 border-t-[#205CA5] shadow-2xl space-y-6 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xs bg-[#070D18] border border-[#1E293B] text-[#38BDF8]">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white uppercase font-mono tracking-tight">Staff & Admin Access</h3>
              <p className="text-xs text-[#94A3B8] font-mono uppercase tracking-wider">Role-Based Security Portal</p>
            </div>
          </div>
          <button
            onClick={() => setIsLoginModalOpen(false)}
            className="p-1 rounded-xs text-[#94A3B8] hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xs bg-rose-950/50 border border-rose-800 text-xs text-rose-300 flex items-center space-x-2 font-mono">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
          <div className="space-y-1">
            <label className="block text-[#94A3B8] uppercase">Username / Staff ID</label>
            <div className="relative">
              <User className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. admin or operator"
                className="w-full pl-9 pr-3 py-2.5 rounded-xs bg-[#070D18] border border-[#1E293B] text-white focus:outline-none focus:border-[#205CA5]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-[#94A3B8] uppercase">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 rounded-xs bg-[#070D18] border border-[#1E293B] text-white focus:outline-none focus:border-[#205CA5]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xs bg-[#205CA5] hover:bg-[#2B68B8] text-white font-bold text-xs uppercase font-mono tracking-wider cursor-pointer transition-all shadow-[0_0_18px_rgba(32,92,165,0.4)] disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In to Operations Portal'}
          </button>
        </form>

        {/* Quick Demo Logins for Instant Evaluation */}
        <div className="pt-3 border-t border-[#1E293B] space-y-2 text-xs">
          <div className="text-[11px] font-mono text-[#94A3B8] text-center uppercase tracking-wider">Quick Switch Credentials:</div>
          <div className="grid grid-cols-3 gap-2 font-mono">
            <button
              onClick={() => handleQuickDemoLogin('admin', 'admin123')}
              className="p-2 rounded-xs bg-[#070D18] hover:bg-[#0F172A] border border-[#1E293B] text-[#38BDF8] hover:border-[#205CA5]/60 text-center cursor-pointer"
            >
              <div className="font-bold uppercase">Admin</div>
              <div className="text-[9px] text-[#64748B]">admin / admin123</div>
            </button>
            <button
              onClick={() => handleQuickDemoLogin('operator', 'operator123')}
              className="p-2 rounded-xs bg-[#070D18] hover:bg-[#0F172A] border border-[#1E293B] text-sky-300 hover:border-sky-500/60 text-center cursor-pointer"
            >
              <div className="font-bold uppercase">Operator</div>
              <div className="text-[9px] text-[#64748B]">operator / op123</div>
            </button>
            <button
              onClick={() => handleQuickDemoLogin('viewer', 'viewer123')}
              className="p-2 rounded-xs bg-[#070D18] hover:bg-[#0F172A] border border-[#1E293B] text-[#94A3B8] hover:border-[#38BDF8]/40 text-center cursor-pointer"
            >
              <div className="font-bold uppercase">Viewer</div>
              <div className="text-[9px] text-[#64748B]">viewer / view123</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
