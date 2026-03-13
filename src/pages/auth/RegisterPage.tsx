import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AuthBackground, { GlassCard, LogoMark } from './AuthBackground';

interface RegisterPageProps {
  onNavigateLogin: () => void;
}

const fi = (i: number) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: i * 0.06 + 0.1, duration: 0.38, ease: 'easeOut' as const },
});

type Role = 'admin' | 'manager' | 'member';
const roles: { value: Role; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'member', label: 'Member' },
];

const RegisterPage: React.FC<RegisterPageProps> = ({ onNavigateLogin }) => {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [role, setRole] = useState<Role>('member');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState('');
  const [focus, setFocus] = useState<Record<string, boolean>>({});

  const setF = (f: string, v: boolean) => setFocus(p => ({ ...p, [f]: v }));
  const inputBase = 'w-full px-3.5 py-2.5 rounded-xl text-sm text-gray-800 outline-none transition-all duration-200 bg-white border placeholder-gray-400';
  const inputStyle = (field: string) => ({
    borderColor: focus[field] ? '#5030E5' : '#EBEBEB',
    boxShadow: focus[field] ? '0 0 0 3px rgba(80,48,229,0.08)' : 'none',
  });

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Full name is required.';
    if (!email.trim()) e.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email.';
    if (!password) e.password = 'Password is required.';
    else if (password.length < 6) e.password = 'At least 6 characters required.';
    if (!confirm) e.confirm = 'Please confirm your password.';
    else if (confirm !== password) e.confirm = 'Passwords do not match.';
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setGlobalError('');
    setLoading(true);
    try {
      await register(name.trim(), email.trim(), password, role);
    } catch (err: unknown) {
      setGlobalError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthBackground>
      <div className="w-full max-w-sm px-4 py-4 overflow-y-auto max-h-screen">
        <GlassCard className="p-8">
          {/* Logo + heading */}
          <motion.div {...fi(0)} className="flex flex-col items-center gap-3 mb-7">
            <LogoMark size={48} />
            <div className="text-center">
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">Create account</h1>
              <p className="text-sm text-gray-400 mt-1">Join your team on Project M.</p>
            </div>
          </motion.div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            {/* Full Name */}
            <motion.div {...fi(1)}>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Full Name</label>
              <input
                type="text"
                className={inputBase}
                style={inputStyle('name')}
                placeholder="Jane Smith"
                value={name}
                onChange={e => setName(e.target.value)}
                onFocus={() => setF('name', true)}
                onBlur={() => setF('name', false)}
                disabled={loading}
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </motion.div>

            {/* Email */}
            <motion.div {...fi(2)}>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email address</label>
              <input
                type="email"
                className={inputBase}
                style={inputStyle('email')}
                placeholder="you@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onFocus={() => setF('email', true)}
                onBlur={() => setF('email', false)}
                disabled={loading}
              />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
            </motion.div>

            {/* Password */}
            <motion.div {...fi(3)}>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  className={inputBase}
                  style={{ ...inputStyle('password'), paddingRight: '2.75rem' }}
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setF('password', true)}
                  onBlur={() => setF('password', false)}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
            </motion.div>

            {/* Confirm Password */}
            <motion.div {...fi(4)}>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Confirm Password</label>
              <input
                type="password"
                className={inputBase}
                style={inputStyle('confirm')}
                placeholder="Re-enter password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                onFocus={() => setF('confirm', true)}
                onBlur={() => setF('confirm', false)}
                disabled={loading}
              />
              {errors.confirm && <p className="text-xs text-red-500 mt-1">{errors.confirm}</p>}
            </motion.div>

            {/* Role selector */}
            <motion.div {...fi(5)}>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Role</label>
              <div className="flex gap-2">
                {roles.map(r => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRole(r.value)}
                    className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all border"
                    style={{
                      background: role === r.value ? '#5030E5' : '#fff',
                      color: role === r.value ? '#fff' : '#6B7280',
                      borderColor: role === r.value ? '#5030E5' : '#EBEBEB',
                    }}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Global error */}
            {globalError && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="px-3.5 py-2.5 rounded-xl text-xs text-red-600 bg-red-50 border border-red-100 flex items-center gap-2"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {globalError}
              </motion.div>
            )}

            {/* Submit */}
            <motion.div {...fi(6)} className="mt-1">
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
                    Creating account...
                  </>
                ) : 'Create Account'}
              </motion.button>
            </motion.div>
          </form>

          {/* Login link */}
          <motion.p {...fi(7)} className="text-center mt-5 text-sm text-gray-500">
            Already have an account?{' '}
            <button
              onClick={onNavigateLogin}
              className="font-semibold text-primary-500 hover:text-primary-600 transition-colors"
            >
              Sign in
            </button>
          </motion.p>
        </GlassCard>
      </div>
    </AuthBackground>
  );
};

export default RegisterPage;
