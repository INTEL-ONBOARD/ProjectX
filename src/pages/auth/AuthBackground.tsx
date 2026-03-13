import React from 'react';
import { motion } from 'framer-motion';

export const LogoMark: React.FC<{ size?: number }> = ({ size = 48 }) => (
  <div
    style={{ width: size, height: size }}
    className="flex items-center justify-center rounded-xl bg-primary-500 shadow-card shrink-0"
  >
    <span
      style={{
        fontSize: size * 0.52,
        fontWeight: 800,
        color: '#fff',
        letterSpacing: '-0.05em',
        lineHeight: 1,
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      M
    </span>
  </div>
);

export const GlassCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <motion.div
    initial={{ opacity: 0, y: 24, scale: 0.98 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: -12, scale: 0.98 }}
    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    className={`bg-white rounded-2xl shadow-card border border-surface-200 ${className}`}
  >
    {children}
  </motion.div>
);

const AuthBackground: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center overflow-hidden"
      style={{ background: '#F5F5F5' }}
    >
      {/* Subtle purple top glow — very faint, matches app accent */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 40% at 50% -10%, rgba(80,48,229,0.06) 0%, transparent 70%)',
        }}
      />
      <div className="relative z-10 w-full h-full flex items-center justify-center p-4">
        {children}
      </div>
    </div>
  );
};

export default AuthBackground;
