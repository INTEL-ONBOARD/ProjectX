import React from 'react';
import { motion } from 'framer-motion';

// ── GlassCard ─────────────────────────────────────────────────────────────────
export const GlassCard: React.FC<{ className?: string; children?: React.ReactNode }> = ({ className = '', children }) => (
  <div className={`bg-white rounded-2xl shadow-xl border border-surface-100 ${className}`}>
    {children}
  </div>
);

// ── Logo mark ─────────────────────────────────────────────────────────────────
export const LogoMark: React.FC<{ size?: number; dark?: boolean }> = ({ size = 40, dark = false }) => (
  <div
    style={{ width: size, height: size }}
    className={`flex items-center justify-center rounded-xl shrink-0 ${dark ? 'bg-white/15 border border-white/25' : 'bg-primary-500'}`}
  >
    <span style={{
      fontSize: size * 0.5,
      fontWeight: 800,
      color: '#fff',
      letterSpacing: '-0.05em',
      lineHeight: 1,
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>M</span>
  </div>
);

// ── Glass card (right panel forms) ───────────────────────────────────────────
export const FormCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -12 }}
    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    className={`w-full ${className}`}
  >
    {children}
  </motion.div>
);

// ── Mini UI preview cards shown on the branded panel ─────────────────────────
const MiniKanbanCard: React.FC<{ label: string; tag: string; tagColor: string; delay: number; x?: number }> = ({ label, tag, tagColor, delay, x = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 24, x }}
    animate={{ opacity: 1, y: 0, x }}
    transition={{ delay, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    className="bg-white/95 rounded-2xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.18)] backdrop-blur-sm border border-white/60 w-56"
  >
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs font-semibold text-gray-700 leading-tight">{label}</span>
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tagColor}`}>{tag}</span>
    </div>
    <div className="flex items-center gap-1.5">
      <div className="flex -space-x-1.5">
        {['#5030E5','#D8727D','#68B266'].map((c, i) => (
          <div key={i} className="w-5 h-5 rounded-full border-2 border-white" style={{ background: c }} />
        ))}
      </div>
      <div className="flex-1 h-1 rounded-full bg-gray-100 ml-2">
        <div className="h-1 rounded-full bg-primary-500" style={{ width: '45%' }} />
      </div>
    </div>
  </motion.div>
);

const MiniStatCard: React.FC<{ value: string; label: string; delay: number }> = ({ value, label, delay }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    className="bg-white/95 rounded-2xl px-5 py-4 shadow-[0_8px_32px_rgba(0,0,0,0.15)] border border-white/60"
  >
    <div className="text-2xl font-bold text-gray-900 tracking-tight">{value}</div>
    <div className="text-xs text-gray-500 mt-0.5 font-medium">{label}</div>
  </motion.div>
);

// ── Animated background dots grid ────────────────────────────────────────────
const DotsGrid: React.FC = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="dots" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r="1.5" fill="rgba(255,255,255,0.12)" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#dots)" />
    </svg>
  </div>
);

// ── Brand panel (left side) ───────────────────────────────────────────────────
export const BrandPanel: React.FC = () => (
  <div className="hidden lg:flex flex-col relative overflow-hidden" style={{
    width: '52%',
    background: 'linear-gradient(145deg, #4020D4 0%, #5030E5 40%, #6B44F8 100%)',
  }}>
    <DotsGrid />

    {/* Mesh glow blobs */}
    <div className="absolute top-[-80px] right-[-60px] w-80 h-80 rounded-full pointer-events-none"
      style={{ background: 'radial-gradient(circle, rgba(139,111,240,0.45) 0%, transparent 70%)' }} />
    <div className="absolute bottom-[-60px] left-[-40px] w-64 h-64 rounded-full pointer-events-none"
      style={{ background: 'radial-gradient(circle, rgba(80,48,229,0.5) 0%, transparent 70%)' }} />

    {/* Logo */}
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="relative z-10 flex items-center gap-3 p-10 pb-0"
    >
      <LogoMark size={38} dark />
      <span className="font-bold text-xl text-white tracking-tight">Project M.</span>
    </motion.div>

    {/* Headline */}
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.25 }}
      className="relative z-10 px-10 mt-12"
    >
      <h2 className="text-4xl font-bold text-white leading-tight tracking-tight" style={{ fontFamily: 'Inter, system-ui' }}>
        Ship work<br />that matters.
      </h2>
      <p className="text-white/60 text-base mt-3 leading-relaxed font-normal" style={{ maxWidth: '28ch' }}>
        Projects, tasks, and your team — managed beautifully in one place.
      </p>
    </motion.div>

    {/* Floating UI preview */}
    <div className="relative z-10 flex-1 flex flex-col justify-center px-8 gap-3 mt-8">
      {/* Kanban cards */}
      <div className="flex gap-3 items-end">
        <MiniKanbanCard label="Redesign onboarding flow" tag="In Progress" tagColor="text-orange-600 bg-orange-50" delay={0.45} />
        <MiniKanbanCard label="API rate limiting" tag="High" tagColor="text-red-600 bg-red-50" delay={0.6} x={0} />
      </div>

      {/* Stat row */}
      <div className="flex gap-3 mt-1">
        <MiniStatCard value="24" label="Active tasks" delay={0.75} />
        <MiniStatCard value="8" label="Team members" delay={0.85} />
        <MiniStatCard value="92%" label="On-time rate" delay={0.95} />
      </div>

      {/* Progress card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.05, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="bg-white/95 rounded-2xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.15)] border border-white/60 mt-1"
        style={{ maxWidth: '22rem' }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-gray-700">Sprint 12 Progress</span>
          <span className="text-xs font-bold text-primary-500">68%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            className="h-2 rounded-full"
            style={{ background: 'linear-gradient(90deg, #5030E5, #8B6FF0)' }}
            initial={{ width: '0%' }}
            animate={{ width: '68%' }}
            transition={{ delay: 1.2, duration: 1.0, ease: 'easeOut' }}
          />
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-[10px] text-gray-400">17 of 25 tasks done</span>
          <span className="text-[10px] text-gray-400">3 days left</span>
        </div>
      </motion.div>
    </div>

    {/* Bottom tagline */}
    <motion.p
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.1, duration: 0.5 }}
      className="relative z-10 px-10 pb-10 text-white/35 text-xs"
    >
      Trusted by 2,400+ product teams worldwide
    </motion.p>
  </div>
);

// ── Right panel (form side) wrapper ──────────────────────────────────────────
export const FormPanel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex-1 flex flex-col items-center justify-center overflow-y-auto px-6 py-10 min-h-screen" style={{ background: 'var(--bg-app)' }}>
    <div className="w-full max-w-[380px]">
      {children}
    </div>
  </div>
);

// ── Root layout ───────────────────────────────────────────────────────────────
const AuthBackground: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="fixed inset-0 flex overflow-hidden" style={{ background: 'var(--bg-app)' }}>
    <BrandPanel />
    {children}
  </div>
);

export default AuthBackground;
