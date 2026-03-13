import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AuthBackground, { BrandPanel, FormPanel } from './AuthBackground';

const steps = [
  {
    step: '01',
    title: 'Manage projects with clarity',
    body: 'Create Kanban boards, set priorities, and track every task from kickoff to completion — no chaos, just clarity.',
    accent: '#5030E5',
    visual: (
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
        <rect x="4" y="8" width="56" height="48" rx="8" fill="#F0EDFF" stroke="#5030E5" strokeWidth="1.5"/>
        <rect x="4" y="8" width="56" height="14" rx="8" fill="#5030E5" fillOpacity="0.12"/>
        <rect x="12" y="28" width="10" height="20" rx="3" fill="#5030E5" fillOpacity="0.15" stroke="#5030E5" strokeWidth="1.2"/>
        <rect x="27" y="32" width="10" height="16" rx="3" fill="#5030E5" fillOpacity="0.25" stroke="#5030E5" strokeWidth="1.2"/>
        <rect x="42" y="24" width="10" height="24" rx="3" fill="#5030E5" fillOpacity="0.4" stroke="#5030E5" strokeWidth="1.2"/>
        <circle cx="9" cy="15" r="2" fill="#5030E5" fillOpacity="0.5"/>
        <circle cx="15" cy="15" r="2" fill="#5030E5" fillOpacity="0.5"/>
        <circle cx="21" cy="15" r="2" fill="#5030E5" fillOpacity="0.5"/>
      </svg>
    ),
  },
  {
    step: '02',
    title: 'Your entire team, one view',
    body: 'Track attendance, manage roles and departments, and monitor workloads across every member of your organization.',
    accent: '#5030E5',
    visual: (
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
        <circle cx="32" cy="22" r="9" fill="#F0EDFF" stroke="#5030E5" strokeWidth="1.5"/>
        <path d="M14 54c0-9.941 8.059-18 18-18s18 8.059 18 18" stroke="#5030E5" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
        <circle cx="50" cy="20" r="6" fill="#F0EDFF" stroke="#5030E5" strokeWidth="1.2" strokeOpacity="0.6"/>
        <path d="M56 40c0-6.627-2.686-12-6-12" stroke="#5030E5" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.6" fill="none"/>
        <circle cx="14" cy="20" r="6" fill="#F0EDFF" stroke="#5030E5" strokeWidth="1.2" strokeOpacity="0.6"/>
        <path d="M8 40c0-6.627 2.686-12 6-12" stroke="#5030E5" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.6" fill="none"/>
      </svg>
    ),
  },
  {
    step: '03',
    title: 'Never miss a deadline',
    body: 'Smart filters, priority labels, and due-date tracking keep you ahead of every deadline — not just reacting to them.',
    accent: '#5030E5',
    visual: (
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
        <rect x="8" y="6" width="48" height="52" rx="8" fill="#F0EDFF" stroke="#5030E5" strokeWidth="1.5"/>
        <path d="M20 22l5 5 11-11" stroke="#5030E5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <line x1="20" y1="36" x2="44" y2="36" stroke="#5030E5" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.35"/>
        <line x1="20" y1="44" x2="36" y2="44" stroke="#5030E5" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.35"/>
        <circle cx="50" cy="50" r="10" fill="#5030E5"/>
        <path d="M50 44v6.5l3.5 3.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
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

  const current = steps[step];

  return (
    <div className="fixed inset-0 flex overflow-hidden bg-white">
      <BrandPanel />

      <FormPanel>
        {/* Step counter badge */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-2 mb-10"
        >
          <div className="flex gap-1.5">
            {steps.map((_, i) => (
              <motion.div
                key={i}
                animate={{ width: i === step ? 24 : 6, opacity: i <= step ? 1 : 0.25 }}
                transition={{ duration: 0.3 }}
                className="h-1.5 rounded-full bg-primary-500"
              />
            ))}
          </div>
          <span className="text-xs text-gray-400 font-medium ml-1">{step + 1} / {steps.length}</span>
        </motion.div>

        {/* Step content */}
        <div className="min-h-[320px] flex flex-col justify-center">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={step}
              custom={dir}
              initial={{ opacity: 0, x: dir * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir * -40 }}
              transition={{ duration: 0.32, ease: 'easeOut' }}
              className="flex flex-col gap-7"
            >
              {/* Visual */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="w-24 h-24 rounded-3xl bg-primary-50 border border-primary-100 flex items-center justify-center"
              >
                {current.visual}
              </motion.div>

              {/* Text */}
              <div className="flex flex-col gap-3">
                <div className="text-xs font-bold text-primary-400 tracking-widest uppercase">{current.step}</div>
                <h2 className="text-[1.75rem] font-bold text-gray-900 leading-tight tracking-tight">{current.title}</h2>
                <p className="text-base text-gray-500 leading-relaxed">{current.body}</p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-3 mt-8">
          {step > 0 ? (
            <button
              onClick={goBack}
              className="flex-none w-12 h-12 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:border-gray-300 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M19 12H5M12 5l-7 7 7 7" />
              </svg>
            </button>
          ) : (
            <button
              onClick={onComplete}
              className="flex-none text-sm text-gray-400 hover:text-gray-600 transition-colors px-2"
            >
              Skip
            </button>
          )}

          <motion.button
            onClick={goNext}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex-1 h-12 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 transition-colors shadow-[0_4px_20px_rgba(80,48,229,0.3)]"
          >
            {step === steps.length - 1 ? (
              <>Get started<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></>
            ) : (
              <>Continue<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></>
            )}
          </motion.button>
        </div>

        {/* Skip all */}
        {step === 0 && (
          <p className="text-center mt-6 text-xs text-gray-400">
            Already familiar?{' '}
            <button onClick={onComplete} className="font-semibold text-primary-500 hover:text-primary-600 transition-colors">
              Go straight to login
            </button>
          </p>
        )}
      </FormPanel>
    </div>
  );
};

export default WalkthroughScreen;
