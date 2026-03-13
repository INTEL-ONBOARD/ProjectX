import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { BrandPanel, FormPanel, LogoMark } from './AuthBackground';

interface LoginPageProps {
  onNavigateRegister: () => void;
  onNavigateForgot: () => void;
}

const fi = (i: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: i * 0.06 + 0.08, duration: 0.36, ease: 'easeOut' as const },
});

const LoginPage: React.FC<LoginPageProps> = ({ onNavigateRegister, onNavigateForgot }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focus, setFocus] = useState<Record<string, boolean>>({});

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

  const inputCls = 'w-full px-4 py-3 rounded-xl text-sm text-gray-800 bg-gray-50 border outline-none transition-all duration-200 placeholder-gray-400';
  const inputStyle = (f: string) => ({
    borderColor: focus[f] ? '#5030E5' : 'transparent',
    boxShadow: focus[f] ? '0 0 0 3px rgba(80,48,229,0.1)' : 'none',
    background: focus[f] ? '#fff' : '#F5F5F5',
  });
  const sf = (f: string, v: boolean) => setFocus(p => ({ ...p, [f]: v }));

  return (
    <div className="fixed inset-0 flex overflow-hidden bg-white">
      <BrandPanel />
      <FormPanel>
        {/* Header */}
        <motion.div {...fi(0)} className="mb-2">
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <LogoMark size={32} />
            <span className="font-bold text-base text-gray-900 tracking-tight">Project M.</span>
          </div>
          <h1 className="text-[1.75rem] font-bold text-gray-900 tracking-tight leading-tight">Welcome back</h1>
          <p className="text-gray-500 text-sm mt-1.5">Sign in to continue to your workspace.</p>
        </motion.div>

        <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-4">
          {/* Email */}
          <motion.div {...fi(1)}>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Email</label>
            <input
              type="email"
              className={inputCls}
              style={inputStyle('email')}
              placeholder="you@company.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onFocus={() => sf('email', true)}
              onBlur={() => sf('email', false)}
              disabled={loading}
              autoComplete="email"
            />
          </motion.div>

          {/* Password */}
          <motion.div {...fi(2)}>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Password</label>
              <button
                type="button"
                onClick={onNavigateForgot}
                className="text-xs font-semibold text-primary-500 hover:text-primary-600 transition-colors"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className={inputCls}
                style={{ ...inputStyle('password'), paddingRight: '2.75rem' }}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onFocus={() => sf('password', true)}
                onBlur={() => sf('password', false)}
                disabled={loading}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </motion.div>

          {/* Remember me */}
          <motion.div {...fi(3)}>
            <label className="flex items-center gap-2.5 cursor-pointer select-none w-fit">
              <div
                onClick={() => setRemember(!remember)}
                className="w-4.5 h-4.5 w-[18px] h-[18px] rounded-[5px] flex items-center justify-center transition-all cursor-pointer border-2 shrink-0"
                style={{
                  background: remember ? '#5030E5' : '#fff',
                  borderColor: remember ? '#5030E5' : '#D9D9D9',
                }}
              >
                {remember && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5l2.5 2.5 4-4" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <span className="text-sm text-gray-600">Keep me signed in</span>
            </label>
          </motion.div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -4 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm text-red-600 bg-red-50 border border-red-100"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit */}
          <motion.div {...fi(4)} className="pt-1">
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={!loading ? { scale: 1.015, boxShadow: '0 8px 28px rgba(80,48,229,0.35)' } : {}}
              whileTap={!loading ? { scale: 0.985 } : {}}
              className="w-full py-3.5 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all"
              style={{
                background: loading ? '#856FFB' : 'linear-gradient(135deg, #5030E5 0%, #6B44F8 100%)',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(80,48,229,0.3)',
              }}
            >
              {loading ? (
                <>
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/>
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="#fff" strokeWidth="3" strokeLinecap="round"/>
                  </svg>
                  Signing in...
                </>
              ) : 'Sign in to workspace'}
            </motion.button>
          </motion.div>
        </form>

        {/* Register link */}
        <motion.p {...fi(5)} className="text-center mt-6 text-sm text-gray-500">
          New to Project M.?{' '}
          <button
            onClick={onNavigateRegister}
            className="font-semibold text-primary-500 hover:text-primary-600 transition-colors"
          >
            Create an account
          </button>
        </motion.p>

        {/* Demo credentials */}
        <motion.div
          {...fi(6)}
          className="mt-8 px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 flex items-start gap-3"
        >
          <div className="w-6 h-6 rounded-lg bg-primary-100 flex items-center justify-center shrink-0 mt-0.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#5030E5" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-600">Demo credentials</p>
            <p className="text-xs text-gray-400 mt-0.5">admin@projectm.com · password123</p>
          </div>
        </motion.div>
      </FormPanel>
    </div>
  );
};

export default LoginPage;
