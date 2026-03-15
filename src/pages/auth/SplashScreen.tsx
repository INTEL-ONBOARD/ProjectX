import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

interface SplashScreenProps {
  onComplete: () => void;
  duration?: number;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete, duration = 2800 }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, duration);
    return () => clearTimeout(timer);
  }, [onComplete, duration]);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-white overflow-hidden">
      {/* Background accent */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 30%, rgba(80,48,229,0.06) 0%, transparent 70%)' }} />

      {/* Logo + wordmark */}
      <div className="flex flex-col items-center gap-6 select-none">
        {/* Animated logo mark */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.15 }}
          className="relative"
        >
          <div className="w-20 h-20 rounded-[22px] bg-primary-500 flex items-center justify-center shadow-[0_20px_60px_rgba(80,48,229,0.35)]">
            <span style={{ fontSize: 40, fontWeight: 800, color: '#fff', letterSpacing: '-0.05em', lineHeight: 1 }}>
              M
            </span>
          </div>
          {/* Pulse ring */}
          <motion.div
            className="absolute inset-0 rounded-[22px] border-2 border-primary-300"
            initial={{ scale: 1, opacity: 0.6 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{ delay: 0.5, duration: 1.0, ease: 'easeOut', repeat: 1, repeatDelay: 0.2 }}
          />
        </motion.div>

        {/* App name */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.45 }}
          className="flex flex-col items-center gap-1"
        >
          <span className="text-3xl font-bold text-gray-900 tracking-tight">
            Project M.
          </span>
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="text-sm text-gray-400 font-normal tracking-wide"
          >
            Manage smarter. Deliver faster.
          </motion.span>
        </motion.div>
      </div>

      {/* Bottom progress */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.4 }}
        className="absolute bottom-14 flex flex-col items-center gap-3"
      >
        <div className="w-48 h-[2px] rounded-full bg-gray-100 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-primary-500"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 2.0, ease: [0.16, 1, 0.3, 1], delay: 0.75 }}
          />
        </div>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0, duration: 0.4 }}
          className="text-[11px] text-gray-300 tracking-widest uppercase font-medium"
        >
          Loading workspace
        </motion.span>
      </motion.div>
    </div>
  );
};

export default SplashScreen;
