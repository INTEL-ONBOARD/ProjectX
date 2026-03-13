import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AuthBackground, { GlassCard, LogoMark } from './AuthBackground';

// Clean SVG icons for each step
const ProjectsIcon = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="6" width="32" height="28" rx="4" stroke="#5030E5" strokeWidth="2" fill="none"/>
    <rect x="4" y="6" width="32" height="8" rx="4" fill="#5030E5" fillOpacity="0.1" stroke="#5030E5" strokeWidth="2"/>
    <line x1="11" y1="22" x2="29" y2="22" stroke="#5030E5" strokeWidth="2" strokeLinecap="round"/>
    <line x1="11" y1="28" x2="22" y2="28" stroke="#5030E5" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="8.5" cy="10" r="1.5" fill="#5030E5"/>
    <circle cx="13" cy="10" r="1.5" fill="#5030E5"/>
  </svg>
);

const TeamIcon = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="20" cy="14" r="6" stroke="#5030E5" strokeWidth="2" fill="none"/>
    <path d="M8 34c0-6.627 5.373-12 12-12s12 5.373 12 12" stroke="#5030E5" strokeWidth="2" strokeLinecap="round" fill="none"/>
    <circle cx="32" cy="13" r="4" stroke="#5030E5" strokeWidth="1.5" fill="none" strokeOpacity="0.5"/>
    <path d="M36 28c0-4.418-1.79-8-4-8" stroke="#5030E5" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.5" fill="none"/>
  </svg>
);

const TasksIcon = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="6" y="4" width="28" height="32" rx="4" stroke="#5030E5" strokeWidth="2" fill="none"/>
    <path d="M13 14l3 3 7-7" stroke="#5030E5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="13" y1="22" x2="27" y2="22" stroke="#5030E5" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.4"/>
    <line x1="13" y1="28" x2="27" y2="28" stroke="#5030E5" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.4"/>
  </svg>
);

const steps = [
  {
    Icon: ProjectsIcon,
    title: 'Manage Projects',
    body: 'Create boards, assign tasks, and track progress — all in one clean workspace.',
  },
  {
    Icon: TeamIcon,
    title: 'Track Your Team',
    body: 'Monitor attendance, roles, and performance across your entire organization.',
  },
  {
    Icon: TasksIcon,
    title: 'Stay on Top of Tasks',
    body: 'Filter, prioritize, and never miss a deadline. Everything is always in view.',
  },
];

interface WalkthroughScreenProps {
  onComplete: () => void;
}

const WalkthroughScreen: React.FC<WalkthroughScreenProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);

  const goNext = () => {
    if (step < steps.length - 1) { setDir(1); setStep(s => s + 1); }
    else onComplete();
  };
  const goBack = () => {
    if (step > 0) { setDir(-1); setStep(s => s - 1); }
  };

  const { Icon, title, body } = steps[step];

  return (
    <AuthBackground>
      <div className="w-full max-w-sm px-4">
        {/* Logo header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="flex justify-center mb-8"
        >
          <div className="flex items-center gap-2.5">
            <LogoMark size={32} />
            <span className="font-bold text-lg text-gray-900 tracking-tight">Project M.</span>
          </div>
        </motion.div>

        <GlassCard className="p-8">
          {/* Icon + content */}
          <div className="min-h-[200px] flex flex-col items-center justify-center text-center">
            <AnimatePresence mode="wait" custom={dir}>
              <motion.div
                key={step}
                custom={dir}
                initial={{ opacity: 0, x: dir * 48 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: dir * -48 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="flex flex-col items-center gap-5"
              >
                {/* Icon container */}
                <div className="w-20 h-20 rounded-2xl bg-primary-50 flex items-center justify-center border border-primary-100">
                  <Icon />
                </div>
                <div className="flex flex-col gap-2">
                  <h2 className="text-xl font-bold text-gray-900 tracking-tight">{title}</h2>
                  <p className="text-sm text-gray-500 leading-relaxed max-w-[26ch] mx-auto">{body}</p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Dot indicators */}
          <div className="flex justify-center gap-1.5 mt-6 mb-7">
            {steps.map((_, i) => (
              <motion.button
                key={i}
                onClick={() => { setDir(i > step ? 1 : -1); setStep(i); }}
                animate={{ width: i === step ? 20 : 6 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="h-1.5 rounded-full"
                style={{ background: i === step ? '#5030E5' : '#D9D9D9' }}
              />
            ))}
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-3">
            {step > 0 ? (
              <button
                onClick={goBack}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-500 bg-surface-100 hover:bg-surface-200 transition-colors border border-surface-200"
              >
                Back
              </button>
            ) : (
              <button
                onClick={onComplete}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors"
              >
                Skip
              </button>
            )}
            <motion.button
              onClick={goNext}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 transition-colors shadow-card"
            >
              {step === steps.length - 1 ? 'Get Started' : 'Next'}
            </motion.button>
          </div>

          <p className="text-center mt-4 text-xs text-gray-300">
            {step + 1} of {steps.length}
          </p>
        </GlassCard>
      </div>
    </AuthBackground>
  );
};

export default WalkthroughScreen;
