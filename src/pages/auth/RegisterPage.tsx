import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { BrandPanel, FormPanel, LogoMark } from './AuthBackground';

interface RegisterPageProps {
  onNavigateLogin: () => void;
}

const fi = (i: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: i * 0.055 + 0.08, duration: 0.36, ease: 'easeOut' as const },
});

interface OrgOption { id: string; name: string; }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dbApi = () => (window as any).electronAPI.db;

/** Strip Electron's "Error invoking remote method '...': Error: " prefix. */
const cleanIpcError = (err: unknown, fallback: string): string => {
  const msg = err instanceof Error ? err.message : String(err);
  // "Error invoking remote method 'db:auth:register': Error: <actual message>"
  const match = msg.match(/Error invoking remote method '[^']+': Error: (.+)/);
  if (match) return match[1].trim();
  // Plain "Error: <message>" without the IPC prefix
  const plain = msg.replace(/^Error:\s*/i, '').trim();
  return plain || fallback;
};

const RegisterPage: React.FC<RegisterPageProps> = ({ onNavigateLogin }) => {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [orgId, setOrgId] = useState('');
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState('');
  const [focus, setFocus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    dbApi().listOrgs().then((list: OrgOption[]) => {
      setOrgs(list);
      if (list.length > 0) setOrgId(list[0].id);
    }).catch(() => {});
  }, []);

  const sf = (f: string, v: boolean) => setFocus(p => ({ ...p, [f]: v }));
  const inputCls = 'w-full px-4 py-3 rounded-xl text-sm text-gray-800 border outline-none transition-all duration-200 placeholder-gray-400';
  const inputStyle = (f: string) => ({
    borderColor: errors[f] ? '#EF4444' : focus[f] ? '#5030E5' : '#D1D5DB',
    boxShadow: errors[f] ? '0 0 0 3px rgba(239,68,68,0.08)' : focus[f] ? '0 0 0 3px rgba(80,48,229,0.1)' : 'none',
    background: focus[f] ? 'var(--bg-card)' : 'var(--bg-input)',
  });

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Full name is required.';
    if (!email.trim()) e.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email.';
    if (!password) e.password = 'Password is required.';
    else if (password.length < 6) e.password = 'At least 6 characters.';
    if (!confirm) e.confirm = 'Please confirm your password.';
    else if (confirm !== password) e.confirm = 'Passwords do not match.';
    if (!orgId) e.org = 'Please select an organization.';
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
      await register(name.trim(), email.trim(), password, 'member', orgId);
    } catch (err: unknown) {
      setGlobalError(cleanIpcError(err, 'Registration failed.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex overflow-hidden" style={{ background: 'var(--bg-app)' }}>
      <BrandPanel />
      <FormPanel>
        <motion.div {...fi(0)} className="mb-2">
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <LogoMark size={32} />
            <span className="font-bold text-base text-gray-900 tracking-tight">Project M.</span>
          </div>
          <h1 className="text-[1.75rem] font-bold text-gray-900 tracking-tight leading-tight">Create your account</h1>
          <p className="text-gray-500 text-sm mt-1.5">Join your team on Project M. It only takes a minute.</p>
        </motion.div>

        <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-3.5">
          <motion.div {...fi(1)}>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Full Name</label>
            <input type="text" className={inputCls} style={inputStyle('name')} placeholder="Jane Smith"
              value={name} onChange={e => setName(e.target.value)} onFocus={() => sf('name', true)} onBlur={() => sf('name', false)} disabled={loading} />
            {errors.name && <p className="text-xs text-red-500 mt-1.5">{errors.name}</p>}
          </motion.div>

          <motion.div {...fi(2)}>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Email</label>
            <input type="email" className={inputCls} style={inputStyle('email')} placeholder="you@company.com"
              value={email} onChange={e => setEmail(e.target.value)} onFocus={() => sf('email', true)} onBlur={() => sf('email', false)} disabled={loading} />
            {errors.email && <p className="text-xs text-red-500 mt-1.5">{errors.email}</p>}
          </motion.div>

          <motion.div {...fi(3)}>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Organization</label>
            <select
              className={inputCls}
              style={inputStyle('org')}
              value={orgId}
              onChange={e => setOrgId(e.target.value)}
              onFocus={() => sf('org', true)}
              onBlur={() => sf('org', false)}
              disabled={loading}
            >
              {orgs.length === 0 && <option value="">Loading organizations…</option>}
              {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
            {errors.org && <p className="text-xs text-red-500 mt-1.5">{errors.org}</p>}
          </motion.div>

          <motion.div {...fi(4)}>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Password</label>
            <div className="relative">
              <input type={showPass ? 'text' : 'password'} className={inputCls} style={{ ...inputStyle('password'), paddingRight: '2.75rem' }}
                placeholder="Min. 6 characters" value={password} onChange={e => setPassword(e.target.value)}
                onFocus={() => sf('password', true)} onBlur={() => sf('password', false)} disabled={loading} />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors" tabIndex={-1}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-500 mt-1.5">{errors.password}</p>}
          </motion.div>

          <motion.div {...fi(5)}>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Confirm Password</label>
            <input type="password" className={inputCls} style={inputStyle('confirm')} placeholder="Re-enter password"
              value={confirm} onChange={e => setConfirm(e.target.value)} onFocus={() => sf('confirm', true)} onBlur={() => sf('confirm', false)} disabled={loading} />
            {errors.confirm && <p className="text-xs text-red-500 mt-1.5">{errors.confirm}</p>}
          </motion.div>

          <AnimatePresence>
            {globalError && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm text-red-600 bg-red-50 border border-red-100">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {globalError}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div {...fi(6)} className="pt-1">
            <motion.button type="submit" disabled={loading}
              whileHover={!loading ? { scale: 1.015, boxShadow: '0 8px 28px rgba(80,48,229,0.35)' } : {}}
              whileTap={!loading ? { scale: 0.985 } : {}}
              className="w-full py-3.5 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all"
              style={{ background: loading ? '#856FFB' : 'linear-gradient(135deg, #5030E5 0%, #6B44F8 100%)', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : '0 4px 20px rgba(80,48,229,0.3)' }}>
              {loading ? (
                <><svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/>
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="#fff" strokeWidth="3" strokeLinecap="round"/>
                </svg>Creating account...</>
              ) : 'Create account'}
            </motion.button>
          </motion.div>
        </form>

        <motion.p {...fi(7)} className="text-center mt-5 text-sm text-gray-500">
          Already have an account?{' '}
          <button onClick={onNavigateLogin} className="font-semibold text-primary-500 hover:text-primary-600 transition-colors">Sign in</button>
        </motion.p>
      </FormPanel>
    </div>
  );
};

export default RegisterPage;
