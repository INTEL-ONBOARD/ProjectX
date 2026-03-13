import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AuthBackground, { GlassCard, LogoMark } from './AuthBackground';

interface LoginPageProps {
  onNavigateRegister: () => void;
  onNavigateForgot: () => void;
}

const fi = (i: number) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: i * 0.07 + 0.1, duration: 0.38, ease: 'easeOut' as const },
});

const LoginPage: React.FC<LoginPageProps> = ({ onNavigateRegister, onNavigateForgot }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailFocus, setEmailFocus] = useState(false);
  const [passFocus, setPassFocus] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const inputBase = 'w-full px-3.5 py-2.5 rounded-xl text-sm text-gray-800 outline-none transition-all duration-200 bg-white border placeholder-gray-400';
  const inputStyle = (focused: boolean) => ({
    borderColor: focused ? '#5030E5' : '#EBEBEB',
    boxShadow: focused ? '0 0 0 3px rgba(80,48,229,0.08)' : 'none',
  });

  return (
    <AuthBackground>
      <div className="w-full max-w-sm px-4">
        <GlassCard className="p-8">
          {/* Logo + heading */}
          <motion.div {...fi(0)} className="flex flex-col items-center gap-3 mb-7">
            <LogoMark size={48} />
            <div className="text-center">
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">Welcome back</h1>
              <p className="text-sm text-gray-400 mt-1">Sign in to your workspace</p>
            </div>
          </motion.div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Email */}
            <motion.div {...fi(1)}>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email address</label>
              <input
                type="email"
                className={inputBase}
                style={inputStyle(emailFocus)}
                placeholder="you@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onFocus={() => setEmailFocus(true)}
                onBlur={() => setEmailFocus(false)}
                disabled={loading}
                autoComplete="email"
              />
            </motion.div>

            {/* Password */}
            <motion.div {...fi(2)}>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={inputBase}
                  style={{ ...inputStyle(passFocus), paddingRight: '2.75rem' }}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setPassFocus(true)}
                  onBlur={() => setPassFocus(false)}
                  disabled={loading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </motion.div>

            {/* Remember + Forgot */}
            <motion.div {...fi(3)} className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <div
                  onClick={() => setRemember(!remember)}
                  className="w-4 h-4 rounded flex items-center justify-center transition-all cursor-pointer border"
                  style={{
                    background: remember ? '#5030E5' : '#fff',
                    borderColor: remember ? '#5030E5' : '#D9D9D9',
                  }}
                >
                  {remember && (
                    <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5l2.5 2.5 4-4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <span className="text-xs text-gray-500">Remember me</span>
              </label>
              <button
                type="button"
                onClick={onNavigateForgot}
                className="text-xs font-semibold text-primary-500 hover:text-primary-600 transition-colors"
              >
                Forgot password?
              </button>
            </motion.div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="px-3.5 py-2.5 rounded-xl text-xs text-red-600 bg-red-50 border border-red-100 flex items-center gap-2"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </motion.div>
            )}

            {/* Submit */}
            <motion.div {...fi(4)} className="mt-1">
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={!loading ? { scale: 1.01 } : {}}
                whileTap={!loading ? { scale: 0.99 } : {}}
                className="w-full py-2.5 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition-colors"
                style={{ background: loading ? '#856FFB' : '#5030E5', cursor: loading ? 'not-allowed' : 'pointer' }}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin" width="15" height="15" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/>
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="#fff" strokeWidth="3" strokeLinecap="round"/>
                    </svg>
                    Signing in...
                  </>
                ) : 'Sign In'}
              </motion.button>
            </motion.div>
          </form>

          {/* Divider */}
          <motion.div {...fi(5)} className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-surface-200"/>
            <span className="text-xs text-gray-300 font-medium">or</span>
            <div className="flex-1 h-px bg-surface-200"/>
          </motion.div>

          {/* Register link */}
          <motion.p {...fi(6)} className="text-center text-sm text-gray-500">
            Don't have an account?{' '}
            <button
              onClick={onNavigateRegister}
              className="font-semibold text-primary-500 hover:text-primary-600 transition-colors"
            >
              Create account
            </button>
          </motion.p>

          {/* Demo hint */}
          <motion.p {...fi(7)} className="text-center mt-3 text-xs text-gray-300">
            Demo: admin@projectm.com / password123
          </motion.p>
        </GlassCard>
      </div>
    </AuthBackground>
  );
};

export default LoginPage;
