import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { BrandPanel, FormPanel, LogoMark } from './AuthBackground';

interface ForgotPasswordPageProps {
  onNavigateLogin: () => void;
}

const fi = (i: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: i * 0.07 + 0.08, duration: 0.36, ease: 'easeOut' as const },
});

const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ onNavigateLogin }) => {
  const [email, setEmail] = useState('');
  const [loading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error] = useState('');
  const [focused, setFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  const inputStyle = {
    borderColor: error ? '#EF4444' : focused ? '#5030E5' : 'transparent',
    boxShadow: error ? '0 0 0 3px rgba(239,68,68,0.08)' : focused ? '0 0 0 3px rgba(80,48,229,0.1)' : 'none',
    background: focused ? '#fff' : '#F5F5F5',
  };

  return (
    <div className="fixed inset-0 flex overflow-hidden bg-white">
      <BrandPanel />
      <FormPanel>
        <AnimatePresence mode="wait">
          {!sent ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              {/* Back button */}
              <motion.button
                {...fi(0)}
                onClick={onNavigateLogin}
                className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors mb-8 group"
              >
                <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
                Back to login
              </motion.button>

              {/* Header */}
              <motion.div {...fi(1)} className="mb-8">
                <div className="flex items-center gap-2.5 mb-6 lg:hidden">
                  <LogoMark size={32} />
                  <span className="font-bold text-base text-gray-900 tracking-tight">Project M.</span>
                </div>
                {/* Key icon */}
                <div className="w-14 h-14 rounded-2xl bg-primary-50 border border-primary-100 flex items-center justify-center mb-5">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#5030E5" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="7.5" cy="15.5" r="5.5"/>
                    <path d="M21 2l-9.6 9.6M15.5 7.5L19 4M17.5 9.5L21 6"/>
                  </svg>
                </div>
                <h1 className="text-[1.75rem] font-bold text-gray-900 tracking-tight leading-tight">Forgot password?</h1>
                <p className="text-gray-500 text-sm mt-1.5 leading-relaxed">
                  Enter your email and we'll show you how to get help from your workspace administrator.
                </p>
              </motion.div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <motion.div {...fi(2)}>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Email address</label>
                  <input
                    type="email"
                    className="w-full px-4 py-3 rounded-xl text-sm text-gray-800 border outline-none transition-all duration-200 placeholder-gray-400"
                    style={inputStyle}
                    placeholder="you@company.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    disabled={loading}
                    autoComplete="email"
                  />
                  {error && (
                    <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-red-500 mt-1.5">
                      {error}
                    </motion.p>
                  )}
                </motion.div>

                <motion.div {...fi(3)}>
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
                        Loading...
                      </>
                    ) : 'Continue'}
                  </motion.button>
                </motion.div>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="flex flex-col"
            >
              {/* Animated success icon */}
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.05 }}
                className="w-16 h-16 rounded-2xl bg-primary-50 border border-primary-100 flex items-center justify-center mb-6"
              >
                <motion.svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <motion.path
                    d="M6 16l7 7 13-13"
                    stroke="#5030E5"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ delay: 0.2, duration: 0.5, ease: 'easeOut' }}
                  />
                </motion.svg>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.35 }}
              >
                <h2 className="text-[1.75rem] font-bold text-gray-900 tracking-tight leading-tight mb-2">
                  Contact your admin
                </h2>
                <p className="text-gray-500 text-sm leading-relaxed mb-8">
                  Password resets are handled by your workspace administrator. Please contact them directly and ask them to reset the password for{' '}
                  <span className="font-semibold text-gray-800">{email || 'your account'}</span>.
                </p>

                <motion.button
                  onClick={onNavigateLogin}
                  whileHover={{ scale: 1.015, boxShadow: '0 8px 28px rgba(80,48,229,0.35)' }}
                  whileTap={{ scale: 0.985 }}
                  className="w-full py-3.5 rounded-xl font-semibold text-sm text-white transition-all"
                  style={{
                    background: 'linear-gradient(135deg, #5030E5 0%, #6B44F8 100%)',
                    boxShadow: '0 4px 20px rgba(80,48,229,0.3)',
                  }}
                >
                  Back to login
                </motion.button>

              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </FormPanel>
    </div>
  );
};

export default ForgotPasswordPage;
