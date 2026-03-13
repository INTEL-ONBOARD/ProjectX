import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 2500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center"
      style={{ background: '#ffffff' }}
    >
      {/* Logo mark */}
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 22, delay: 0.1 }}
        className="w-16 h-16 rounded-2xl bg-primary-500 flex items-center justify-center shadow-card"
      >
        <span style={{ fontSize: 32, fontWeight: 800, color: '#fff', letterSpacing: '-0.05em', lineHeight: 1 }}>
          M
        </span>
      </motion.div>

      {/* App name */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut', delay: 0.38 }}
        className="mt-5 flex flex-col items-center gap-1"
      >
        <span className="font-bold text-2xl text-gray-900 tracking-tight">
          Project M.
        </span>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="text-sm text-gray-400 font-normal"
        >
          Manage smarter. Deliver faster.
        </motion.span>
      </motion.div>

      {/* Progress bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.55, duration: 0.3 }}
        className="absolute bottom-12 w-36 h-0.5 rounded-full overflow-hidden"
        style={{ background: '#EBEBEB' }}
      >
        <motion.div
          className="h-full rounded-full bg-primary-500"
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: 1.9, ease: 'linear', delay: 0.6 }}
        />
      </motion.div>
    </div>
  );
};

export default SplashScreen;
