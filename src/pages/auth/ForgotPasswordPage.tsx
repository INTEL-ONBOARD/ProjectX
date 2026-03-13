import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Mail } from 'lucide-react';
import AuthBackground, { GlassCard, LogoMark } from './AuthBackground';

interface ForgotPasswordPageProps {
  onNavigateLogin: () => void;
}

const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ onNavigateLogin }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [focused, setFocused] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError('Please enter your email address.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Enter a valid email address.'); return; }
    setError('');
    setLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    setLoading(false);
    setSent(true);
  };

  const inputStyle = {
    borderColor: focused ? '#5030E5' : '#EBEBEB',
    boxShadow: focused ? '0 0 0 3px rgba(80,48,229,0.08)' : 'none',
  };

  return (
    <AuthBackground>
      <div className="w-full max-w-sm px-4">
        <GlassCard className="p-8 overflow-hidden">
          <AnimatePresence mode="wait">
            {!sent ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, x: 0 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -32 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                {/* Logo + heading */}
                <div className="flex flex-col items-center gap-3 mb-7">
                  <LogoMark size={48} />
                  <div className="text-center">
                    <h1 className="text-xl font-bold text-gray-900 tracking-tight">Reset password</h1>
                    <p className="text-sm text-gray-400 mt-1 max-w-[26ch] mx-auto leading-relaxed">
                      Enter your email and we'll send you a reset link.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email address</label>
                    <input
                      type="email"
                      className="w-full px-3.5 py-2.5 rounded-xl text-sm text-gray-800 outline-none transition-all duration-200 bg-white border placeholder-gray-400"
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
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-xs text-red-500 mt-1"
                      >
                        {error}
                      </motion.p>
                    )}
                  </div>

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
                        Sending...
                      </>
                    ) : 'Send Reset Link'}
                  </motion.button>
                </form>

                <button
                  onClick={onNavigateLogin}
                  className="flex items-center gap-1.5 mx-auto mt-5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <ArrowLeft size={14} />
                  Back to Login
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="success"
                initial={{ opacity: 0, x: 32 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="flex flex-col items-center text-center py-4"
              >
                {/* Mail icon with check */}
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
                  className="w-20 h-20 rounded-2xl bg-primary-50 border border-primary-100 flex items-center justify-center mb-5"
                >
                  <Mail size={36} className="text-primary-500" strokeWidth={1.5} />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25, duration: 0.35 }}
                >
                  <h2 className="text-xl font-bold text-gray-900 tracking-tight mb-2">Check your inbox</h2>
                  <p className="text-sm text-gray-400 leading-relaxed mb-6 max-w-[26ch] mx-auto">
                    We sent a reset link to{' '}
                    <span className="font-semibold text-gray-700">{email}</span>
                  </p>

                  <motion.button
                    onClick={onNavigateLogin}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="px-8 py-2.5 rounded-xl font-semibold text-sm text-white bg-primary-500 hover:bg-primary-600 transition-colors"
                  >
                    Back to Login
                  </motion.button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </div>
    </AuthBackground>
  );
};

export default ForgotPasswordPage;
